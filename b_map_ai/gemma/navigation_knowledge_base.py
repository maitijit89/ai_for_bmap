"""Navigation Domain Knowledge Base and Contextual Grounding Engine for Gemma 3.

Provides high-speed semantic & spatial retrieval over curated navigation knowledge,
interchange topologies, vernacular landmarks, and in-drive copilot tool definitions.
"""

import os
import json
import math
from typing import List, Dict, Any, Optional

DATASET_FILE = os.path.join(os.path.dirname(__file__), "data", "navigation_knowledge_dataset.jsonl")
DEEP_THINKING_FILE = os.path.join(os.path.dirname(__file__), "data", "deep_thinking_dataset.jsonl")


class NavigationKnowledgeBase:
    _instance = None

    def __init__(self, data_file: str = DATASET_FILE, thinking_file: str = DEEP_THINKING_FILE):
        self.data_file = data_file
        self.thinking_file = thinking_file
        self.records: List[Dict[str, Any]] = []
        self.thinking_records: List[Dict[str, Any]] = []
        self._load_knowledge()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_knowledge(self):
        if os.path.exists(self.data_file):
            with open(self.data_file, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        self.records.append(json.loads(line))
            print(f"[KnowledgeBase] Successfully indexed {len(self.records)} deep navigation knowledge items.")

        if os.path.exists(self.thinking_file):
            with open(self.thinking_file, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        self.thinking_records.append(json.loads(line))
            print(f"[KnowledgeBase] Successfully indexed {len(self.thinking_records)} deep thinking reasoning chains.")

        self.sync_with_postgres()

    def sync_with_postgres(self, db_url: Optional[str] = None):
        """Syncs knowledge records with Neon PostgreSQL database."""
        url = db_url or os.environ.get("DATABASE_URL")
        if not url:
            return
        try:
            import psycopg2
            clean_url = url.split("&channel_binding")[0]
            conn = psycopg2.connect(clean_url)
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS navigation_knowledge (
                        id VARCHAR(128) PRIMARY KEY,
                        category VARCHAR(64),
                        prompt TEXT NOT NULL,
                        response TEXT NOT NULL,
                        thinking TEXT,
                        telemetry_context TEXT,
                        classified_intent VARCHAR(64),
                        corridor VARCHAR(128),
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                """)
                cur.execute("SELECT COUNT(*) FROM navigation_knowledge")
                count = cur.fetchone()[0]
                if count == 0 and self.records:
                    for r in self.records:
                        cur.execute(
                            """
                            INSERT INTO navigation_knowledge (
                                id, category, prompt, response, telemetry_context, classified_intent, corridor, created_at
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                            ON CONFLICT (id) DO NOTHING
                            """,
                            (
                                r.get("id", f"nav_{abs(hash(r['prompt']))}"),
                                r.get("category", "general"),
                                r["prompt"],
                                r["response"],
                                r.get("telemetry_context", ""),
                                r.get("classified_intent", ""),
                                r.get("corridor", ""),
                            )
                        )
                    conn.commit()
                    print(f"[KnowledgeBase] Seeded {len(self.records)} knowledge items into Neon PostgreSQL.")
            conn.close()
        except Exception as e:
            print(f"[KnowledgeBase] PostgreSQL sync notice: {e}")

    def search_relevant_knowledge(
        self,
        query: str,
        category: Optional[str] = None,
        top_k: int = 2
    ) -> List[Dict[str, Any]]:
        """Fast keyword/semantic overlap search for navigation context retrieval."""
        query_words = set(query.lower().split())

        scored_records = []
        for rec in self.records:
            if category and rec.get("category") != category:
                continue

            target_text = f"{rec['prompt']} {rec.get('corridor', '')} {rec.get('telemetry_context', '')} {rec['response']}".lower()
            target_words = set(target_text.split())

            overlap = len(query_words.intersection(target_words))
            if rec.get("classified_intent") and rec["classified_intent"].lower() in query.lower():
                overlap += 5

            if overlap > 0:
                scored_records.append((overlap, rec))

        scored_records.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored_records[:top_k]]

    def search_relevant_thinking(
        self,
        query: str,
        top_k: int = 1
    ) -> List[Dict[str, Any]]:
        """Retrieves most relevant deep thinking (Chain-of-Thought) exemplars for in-context reasoning."""
        query_words = set(query.lower().split())

        scored = []
        for rec in self.thinking_records:
            target_text = f"{rec['prompt']} {rec.get('telemetry_context', '')} {rec['response']}".lower()
            target_words = set(target_text.split())

            overlap = len(query_words.intersection(target_words))
            if rec.get("classified_intent") and rec["classified_intent"].lower() in query.lower():
                overlap += 5

            if overlap > 0:
                scored.append((overlap, rec))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]

    def build_grounded_system_prompt(
        self,
        query: str,
        telemetry_context: str = "",
        include_thinking: bool = False
    ) -> str:
        """Injects domain navigation rules, knowledge grounding, and CoT reasoning exemplars."""
        relevant = self.search_relevant_knowledge(f"{query} {telemetry_context}", top_k=2)

        knowledge_snippets = []
        for r in relevant:
            knowledge_snippets.append(
                f"- Scenario: {r['prompt']}\n"
                f"  Guidance: {r['response']}"
            )

        snippets_str = "\n".join(knowledge_snippets) if knowledge_snippets else "No specific prior scenario matched."

        grounded_prompt = (
            "You are B Map AI, an enterprise-grade in-drive navigation copilot trained on deep geospatial reasoning.\n"
            "Core Navigation Rules:\n"
            "1. Give concise, safe, spoken turn-by-turn guidance (1-2 sentences maximum for in-drive clarity).\n"
            "2. For complex interchanges (cloverleafs, flyover splits, roundabouts), always advise exact lane positioning well before the turn.\n"
            "3. Reference visible physical landmarks (metro pillars, overhead boards, footbridges) to disambiguate turns.\n"
            "4. For safety hazards (waterlogging, fog, road closures), recommend immediate evasive/alternate routing.\n"
            "5. Acknowledge executed tool actions clearly (e.g. adding waypoints, rerouting, reserving parking).\n\n"
            f"Relevant Knowledge Grounding:\n{snippets_str}\n"
        )

        if include_thinking:
            thinking_matches = self.search_relevant_thinking(f"{query} {telemetry_context}", top_k=1)
            if thinking_matches:
                t_match = thinking_matches[0]
                grounded_prompt += (
                    "\n[Deep Thinking Spatial Reasoning Protocol]:\n"
                    "You MUST first formulate internal spatial deliberation inside <thinking>...</thinking> tags,\n"
                    "analyzing urgency, spatial kinematics, road hazards, and multi-modal trade-offs.\n"
                    "Then close with </thinking> and provide the spoken in-drive instruction.\n\n"
                    "Exemplar Reasoning Pattern:\n"
                    f"Driver: {t_match['prompt']}\n"
                    f"Copilot:\n{t_match['thinking']}\n\n{t_match['response']}\n"
                )
            else:
                grounded_prompt += (
                    "\n[Deep Thinking Spatial Reasoning Protocol]:\n"
                    "You MUST first formulate internal spatial deliberation inside <thinking>...</thinking> tags,\n"
                    "analyzing: 1. Urgency & Time Budget, 2. Spatial Kinematics & Road Hazards, 3. Strategic Action.\n"
                    "Then close with </thinking> and provide the spoken in-drive instruction.\n\n"
                    "Example:\n"
                    "<thinking>\n"
                    "1. Urgency & Margin: High urgency with impending departure.\n"
                    "2. Kinematics & Hazards: Divergence in 400m; puddle formation on ramp requires speed caution.\n"
                    "3. Action Decision: Take elevated bypass to eliminate 4 surface traffic delays.\n"
                    "</thinking>\n"
                    "Take the elevated toll bypass on your right in 400 meters. Reduce speed to 50 km/h due to rain puddles.\n"
                )

        return grounded_prompt


if __name__ == "__main__":
    kb = NavigationKnowledgeBase()
    sample_query = "Approaching flyover split with heavy traffic below"
    results = kb.search_relevant_knowledge(sample_query)
    print(f"\nSearch results for '{sample_query}':")
    for res in results:
        print(f"[{res['category']}] {res['response'][:100]}...")
