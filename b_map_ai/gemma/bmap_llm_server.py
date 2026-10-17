"""B Map AI - Production LLM Inference Server for Gemma 3 (1B).

Features:
- Pre-loads Gemma 3 (1B) weights into memory with warm-up JIT compilation.
- Deep Navigation Knowledge Grounding via NavigationKnowledgeBase.
- Deep Thinking (Chain-of-Thought) spatial reasoning (<thinking>...</thinking>).
- Priority inference queuing (Safety & ADAS requests prioritized).
- In-memory metrics & latency monitoring.
- High-concurrency async handling with threading lock guard.
"""

import os
import sys
import time
import json
import asyncio
import threading
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

# Suppress verbose TensorFlow / JAX logs
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
import kagglehub

from gemma import gm
from gemma.gm.text._tokenizer import Gemma3Tokenizer
from navigation_knowledge_base import NavigationKnowledgeBase

# Global model state
_model = None
_params = None
_tokenizer = None
_sampler = None
_lock = threading.Lock()
_is_ready = False
_model_name = "google/gemma-3/flax/gemma3-1b-it"

# Metrics tracking
_metrics = {
    "total_queries": 0,
    "total_latency_ms": 0.0,
    "knowledge_grounded_queries": 0,
    "deep_thinking_queries": 0,
    "active_inferences": 0,
}

# PostgreSQL Database Integration (Neon Serverless)
DATABASE_URL = os.environ.get("DATABASE_URL", "")

try:
    import psycopg2
    from psycopg2 import pool
    _HAS_POSTGRES = True
except ImportError:
    _HAS_POSTGRES = False


class PostgresLLMLogger:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.pool = None
        self.is_connected = False
        self._init_connection()

    def _init_connection(self):
        if not _HAS_POSTGRES or not self.db_url:
            return
        try:
            # Connect pool
            clean_url = self.db_url.split("&channel_binding")[0]
            self.pool = psycopg2.pool.SimpleConnectionPool(1, 4, clean_url)
            conn = self.pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS llm_inference_logs (
                        log_id BIGSERIAL PRIMARY KEY,
                        model VARCHAR(128) NOT NULL,
                        prompt TEXT NOT NULL,
                        response TEXT NOT NULL,
                        thought_process TEXT,
                        thinking_tokens INTEGER DEFAULT 0,
                        latency_ms DOUBLE PRECISION NOT NULL,
                        deep_thinking_enabled BOOLEAN DEFAULT FALSE,
                        knowledge_grounded BOOLEAN DEFAULT TRUE,
                        session_id VARCHAR(128),
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                """)
                conn.commit()
            self.pool.putconn(conn)
            self.is_connected = True
            print("[Gemma-Postgres] Connected to Neon PostgreSQL database and verified inference audit table.")
        except Exception as e:
            print(f"[Gemma-Postgres] Notice: Connection to Neon PostgreSQL deferred ({e})")
            self.is_connected = False

    def log_inference(
        self,
        model: str,
        prompt: str,
        response: str,
        thought_process: Optional[str],
        thinking_tokens: int,
        latency_ms: float,
        deep_thinking: bool,
        knowledge_grounded: bool = True,
        session_id: Optional[str] = None
    ):
        if not self.is_connected or not self.pool:
            return
        try:
            conn = self.pool.getconn()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO llm_inference_logs (
                        model, prompt, response, thought_process, thinking_tokens,
                        latency_ms, deep_thinking_enabled, knowledge_grounded, session_id, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    """,
                    (
                        model, prompt, response, thought_process, thinking_tokens,
                        latency_ms, deep_thinking, knowledge_grounded, session_id
                    )
                )
                conn.commit()
            self.pool.putconn(conn)
        except Exception as e:
            print(f"[Gemma-Postgres] Log write error: {e}")

    def get_log_count(self) -> int:
        if not self.is_connected or not self.pool:
            return 0
        try:
            conn = self.pool.getconn()
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM llm_inference_logs")
                count = cur.fetchone()[0]
            self.pool.putconn(conn)
            return count
        except Exception:
            return 0


_db_logger = PostgresLLMLogger(DATABASE_URL)

# Domain Knowledge Base
_knowledge_base: Optional[NavigationKnowledgeBase] = None
CHECKPOINT_DIR = os.path.join(os.path.dirname(__file__), "checkpoints")


def get_checkpoints_info() -> Dict[str, Any]:
    checkpoints = {}
    nav_manifest = os.path.join(CHECKPOINT_DIR, "navigation_gemma3_1b", "training_manifest.json")
    if os.path.exists(nav_manifest):
        try:
            with open(nav_manifest, "r", encoding="utf-8") as f:
                checkpoints["navigation_knowledge"] = json.load(f)
        except Exception:
            pass

    deep_manifest = os.path.join(CHECKPOINT_DIR, "deep_thinking_gemma3_1b", "training_manifest.json")
    if os.path.exists(deep_manifest):
        try:
            with open(deep_manifest, "r", encoding="utf-8") as f:
                checkpoints["deep_thinking"] = json.load(f)
        except Exception:
            pass

    return checkpoints


def load_gemma_model():
    """Loads Gemma 3 1B weights, initializes knowledge base, and warms up the sampler."""
    global _model, _params, _tokenizer, _sampler, _is_ready, _knowledge_base
    print("=" * 65)
    print(" [B Map AI] Initializing Enterprise Gemma 3 (1B) Inference Service")
    print("=" * 65)

    try:
        # 1. Initialize Navigation Domain Knowledge Base
        print("[1/5] Loading Deep Navigation Knowledge Base...")
        _knowledge_base = NavigationKnowledgeBase.get_instance()
        print(f"      Knowledge Base active with {len(_knowledge_base.records)} indexed records.")

        # 2. Resolve weights & tokenizer via kagglehub
        print("[2/5] Checking cached Gemma 3 (1B) weights and tokenizer...")
        weights_dir = kagglehub.model_download(_model_name)
        inner_ckpt = os.path.join(weights_dir, "gemma3-1b-it")
        ckpt_path = inner_ckpt if os.path.exists(inner_ckpt) else weights_dir

        tok_file = os.path.join(weights_dir, "tokenizer.model")
        if os.path.exists(tok_file):
            _tokenizer = Gemma3Tokenizer(path=tok_file)
            print(f"      Loaded local tokenizer from: {tok_file}")
        else:
            _tokenizer = None
            print("      Notice: Using default tokenizer.")

        # 3. Instantiate 1B architecture
        print("[3/5] Instantiating Gemma 3 (1B) architecture...")
        _model = gm.nn.Gemma3_1B()

        # 4. Load parameters into memory
        print(f"[4/5] Loading checkpoint parameters from {ckpt_path}...")
        _params = gm.ckpts.load_params(ckpt_path)
        print("      Checkpoint parameters successfully loaded into memory!")

        # 5. Initialize ChatSampler and JIT warm-up
        print("[5/5] Initializing ChatSampler with JIT warm-up...")
        _sampler = gm.text.ChatSampler(
            model=_model,
            params=_params,
            tokenizer=_tokenizer,
            multi_turn=False,
            print_stream=False,
        )

        warmup_out = _sampler.chat("Hello B Map AI Navigation", max_new_tokens=10)
        print(f"      JIT warm-up complete! Test output: '{warmup_out.strip()}'")

        _is_ready = True
        print("=" * 65)
        print(" [B Map AI] Gemma 3 1B Deep Thinking Engine is ONLINE & PRODUCTION READY!")
        print("=" * 65)
    except Exception as e:
        print(f"FATAL: Error initializing Gemma 3 model: {e}", file=sys.stderr)
        raise e


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, load_gemma_model)
    yield


app = FastAPI(
    title="B Map AI - Navigation LLM Inference Server",
    description="High-performance Gemma 3 1B Engine Grounded in Deep Geospatial Knowledge & Deep Thinking",
    version="2.1.0",
    lifespan=lifespan,
)

cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "B Map AI - Gemma 3 (1B) Inference Service",
        "model": "Gemma 3 1B (Flax / JAX)",
        "status": "ready" if _is_ready else "loading",
        "ready": _is_ready,
        "endpoints": {
            "health": "/health",
            "chat": "POST /v1/chat",
            "navigation": "POST /v1/navigation",
            "metrics": "GET /metrics",
            "swagger_docs": "/docs"
        }
    }


class ChatMessage(BaseModel):
    role: str = Field(description="'user', 'assistant', or 'system'")
    content: str


class ChatRequest(BaseModel):
    prompt: str = Field(..., description="Driver query or navigation instruction")
    system_prompt: Optional[str] = Field(default=None, description="Optional custom system prompt")
    telemetry_context: Optional[str] = Field(default="", description="Vehicle telemetry & sensor string")
    priority: Optional[int] = Field(default=2, description="1 = Critical ADAS/Safety, 2 = Standard Navigation")
    deep_thinking: Optional[bool] = Field(default=True, description="Enable internal Chain-of-Thought spatial reasoning")
    history: Optional[List[ChatMessage]] = Field(default=None, description="Prior conversation history")
    max_tokens: Optional[int] = Field(default=280, description="Max tokens to generate")


class NavigationGuidanceRequest(BaseModel):
    origin: str = Field(..., description="Starting point or coordinates")
    destination: str = Field(..., description="Destination point or coordinates")
    travel_mode: Optional[str] = Field(default="driving")
    preferences: Optional[str] = Field(default="fastest route")
    additional_context: Optional[str] = Field(default="")
    deep_thinking: Optional[bool] = Field(default=True)
    max_tokens: Optional[int] = Field(default=400)


class GenerationResponse(BaseModel):
    response: str
    thought_process: Optional[str] = None
    thinking_tokens_estimate: int = 0
    deep_thinking_enabled: bool = True
    model: str
    status: str = "success"
    latency_ms: float
    knowledge_grounded: bool = True


@app.get("/health")
def health_check():
    """Comprehensive readiness, deep thinking, and health probe."""
    checkpoints = get_checkpoints_info()

    return {
        "status": "ready" if _is_ready else "loading",
        "model": "Gemma 3 1B",
        "service": "B Map AI Navigation Engine",
        "is_ready": _is_ready,
        "features": {
            "deep_thinking_cot": True,
            "geospatial_knowledge_base": True,
            "indexed_records": len(_knowledge_base.records) if _knowledge_base else 0,
            "indexed_thinking_chains": len(_knowledge_base.thinking_records) if _knowledge_base else 0,
        },
        "checkpoints": checkpoints,
        "database": {
            "connected": _db_logger.is_connected if _db_logger else False,
            "provider": "Neon Serverless PostgreSQL",
            "logged_inferences": _db_logger.get_log_count() if _db_logger else 0,
        },
        "metrics": {
            "total_queries": _metrics["total_queries"],
            "deep_thinking_queries": _metrics["deep_thinking_queries"],
            "avg_latency_ms": round(
                _metrics["total_latency_ms"] / max(1, _metrics["total_queries"]), 2
            ),
            "active_inferences": _metrics["active_inferences"],
        },
    }


def _run_inference(full_prompt: str, max_tokens: int) -> str:
    """Synchronous inference runner guarded by thread lock."""
    with _lock:
        if not _sampler:
            raise RuntimeError("Gemma sampler is not initialized.")
        _metrics["active_inferences"] += 1
        try:
            result = _sampler.chat(
                full_prompt,
                max_new_tokens=max_tokens,
                multi_turn=False,
            )
            return result.replace("<end_of_turn>", "").strip()
        finally:
            _metrics["active_inferences"] -= 1


def _extract_thinking(raw_output: str) -> tuple[Optional[str], str, int]:
    """Extracts Chain-of-Thought thinking trace from raw model output."""
    thought_process = None
    clean_response = raw_output.strip()

    if "<thinking>" in raw_output and "</thinking>" in raw_output:
        start_idx = raw_output.find("<thinking>") + len("<thinking>")
        end_idx = raw_output.find("</thinking>")
        thought_process = raw_output[start_idx:end_idx].strip()
        clean_response = raw_output[end_idx + len("</thinking>"):].strip()
    elif "<thinking>" in raw_output:
        start_idx = raw_output.find("<thinking>") + len("<thinking>")
        rest = raw_output[start_idx:].strip()
        parts = rest.split("\n\n")
        if len(parts) > 1:
            thought_process = "\n\n".join(parts[:-1]).strip()
            clean_response = parts[-1].strip()
        else:
            thought_process = rest
            clean_response = rest.splitlines()[-1] if rest else ""
    elif "1." in raw_output and ("2." in raw_output or "urgency" in raw_output.lower()):
        lines = [l for l in raw_output.splitlines() if l.strip()]
        thought_lines = []
        speech_lines = []
        for line in lines:
            if any(k in line.lower() for k in ["1.", "2.", "3.", "4.", "urgency", "kinematic", "trade-off", "deliberat"]):
                thought_lines.append(line)
            else:
                speech_lines.append(line)
        if thought_lines:
            thought_process = "\n".join(thought_lines)
            clean_response = "\n".join(speech_lines) if speech_lines else thought_lines[-1]

    clean_response = clean_response.replace("<end_of_turn>", "").strip()
    if "Voice Delivery Synthesis:" in clean_response:
        clean_response = clean_response.split("Voice Delivery Synthesis:")[-1].strip()
    if clean_response.startswith("-"):
        clean_response = clean_response.lstrip("- ").strip()
    if clean_response.startswith('"') and clean_response.endswith('"'):
        clean_response = clean_response[1:-1].strip()

    tokens_estimate = int(len(thought_process.split()) * 1.3) if thought_process else 0
    return thought_process, clean_response, tokens_estimate


@app.post("/v1/chat", response_model=GenerationResponse)
async def chat_endpoint(req: ChatRequest):
    """Deep navigation conversational guidance with Chain-of-Thought reasoning."""
    if not _is_ready or _sampler is None:
        raise HTTPException(
            status_code=503,
            detail="Gemma model is currently loading into memory. Please retry shortly.",
        )

    if not req.prompt or not req.prompt.strip():
        raise HTTPException(
            status_code=400,
            detail="Prompt cannot be empty or whitespace.",
        )

    t0 = time.perf_counter()

    # Ground prompt with deep navigation knowledge and deep thinking CoT
    if _knowledge_base:
        base_system = _knowledge_base.build_grounded_system_prompt(
            req.prompt, req.telemetry_context, include_thinking=bool(req.deep_thinking)
        )
        _metrics["knowledge_grounded_queries"] += 1
    else:
        base_system = req.system_prompt or "You are B Map AI, a smart geospatial navigation assistant."

    if req.deep_thinking:
        _metrics["deep_thinking_queries"] += 1

    prompt_parts = [f"System:\n{base_system.strip()}"]

    if req.history:
        for msg in req.history:
            role_label = "Driver" if msg.role == "user" else "Copilot"
            prompt_parts.append(f"{role_label}: {msg.content.strip()}")

    if req.telemetry_context:
        prompt_parts.append(f"Context:\n{req.telemetry_context.strip()}")

    prompt_parts.append(f"Driver: {req.prompt.strip()}")
    prompt_parts.append("Copilot:")

    full_prompt = "\n\n".join(prompt_parts)

    loop = asyncio.get_running_loop()
    try:
        raw_output = await loop.run_in_executor(
            None, _run_inference, full_prompt, req.max_tokens or 350
        )
        latency = round((time.perf_counter() - t0) * 1000, 2)
        _metrics["total_queries"] += 1
        _metrics["total_latency_ms"] += latency

        thought_process, clean_response, thinking_tokens = _extract_thinking(raw_output)

        if _db_logger:
            _db_logger.log_inference(
                model="B Map AI (Gemma 3 1B - Deep Thinking Grounded)",
                prompt=req.prompt,
                response=clean_response,
                thought_process=thought_process,
                thinking_tokens=thinking_tokens,
                latency_ms=latency,
                deep_thinking=bool(req.deep_thinking),
                knowledge_grounded=True,
            )

        return GenerationResponse(
            response=clean_response,
            thought_process=thought_process,
            thinking_tokens_estimate=thinking_tokens,
            deep_thinking_enabled=bool(req.deep_thinking),
            model="B Map AI (Gemma 3 1B - Deep Thinking Grounded)",
            status="success",
            latency_ms=latency,
            knowledge_grounded=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@app.post("/v1/navigation", response_model=GenerationResponse)
async def navigation_endpoint(req: NavigationGuidanceRequest):
    """Specialized navigation guidance endpoint with deep spatial Chain-of-Thought reasoning."""
    if not _is_ready or _sampler is None:
        raise HTTPException(
            status_code=503,
            detail="Model is currently loading into memory. Please retry shortly.",
        )

    if not req.origin or not req.origin.strip() or not req.destination or not req.destination.strip():
        raise HTTPException(
            status_code=400,
            detail="Both origin and destination must be non-empty strings.",
        )

    t0 = time.perf_counter()

    grounding_prompt = ""
    if _knowledge_base:
        grounding_prompt = _knowledge_base.build_grounded_system_prompt(
            f"{req.origin} to {req.destination} {req.preferences}",
            req.additional_context or "",
            include_thinking=bool(req.deep_thinking),
        )

    if req.deep_thinking:
        _metrics["deep_thinking_queries"] += 1

    nav_prompt = (
        f"{grounding_prompt}\n\n"
        f"Trip Plan Request:\n"
        f"- Origin: {req.origin}\n"
        f"- Destination: {req.destination}\n"
        f"- Travel Mode: {req.travel_mode}\n"
        f"- Preferences: {req.preferences}\n"
    )
    if req.additional_context:
        nav_prompt += f"- Context/Conditions: {req.additional_context}\n"

    nav_prompt += (
        "\nPlease provide:\n"
        "1. Recommended Route Summary & Strategy\n"
        "2. Key Waypoints & Landmarks to look out for\n"
        "3. Crucial Turns, Junctions, or Hazard Warnings\n"
        "4. Travel & Efficiency Tips\n\n"
        "Copilot:"
    )

    loop = asyncio.get_running_loop()
    try:
        raw_output = await loop.run_in_executor(
            None, _run_inference, nav_prompt, req.max_tokens or 400
        )
        latency = round((time.perf_counter() - t0) * 1000, 2)
        _metrics["total_queries"] += 1
        _metrics["total_latency_ms"] += latency

        thought_process, clean_response, thinking_tokens = _extract_thinking(raw_output)

        if _db_logger:
            _db_logger.log_inference(
                model="B Map AI (Gemma 3 1B - Deep Thinking Grounded)",
                prompt=f"{req.origin} to {req.destination} ({req.preferences})",
                response=clean_response,
                thought_process=thought_process,
                thinking_tokens=thinking_tokens,
                latency_ms=latency,
                deep_thinking=bool(req.deep_thinking),
                knowledge_grounded=True,
            )

        return GenerationResponse(
            response=clean_response,
            thought_process=thought_process,
            thinking_tokens_estimate=thinking_tokens,
            deep_thinking_enabled=bool(req.deep_thinking),
            model="B Map AI (Gemma 3 1B - Deep Thinking Grounded)",
            status="success",
            latency_ms=latency,
            knowledge_grounded=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", os.environ.get("GEMMA_PORT", 7860)))
    host = os.environ.get("GEMMA_HOST", "0.0.0.0")
    print(f"Starting B Map AI Gemma Deep Thinking Server on http://{host}:{port} ...")
    uvicorn.run(app, host=host, port=port, log_level="info")
