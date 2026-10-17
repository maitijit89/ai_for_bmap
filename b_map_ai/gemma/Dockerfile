# ============================================================================
# B Map AI - Gemma 3 (1B) Inference Container for Hugging Face Spaces & Docker
# Hardware Profile: 2 vCPU, 16 GB RAM (Free Tier Compatible)
# ============================================================================
FROM python:3.11-slim

# Install system build utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set up standard Hugging Face Spaces non-root user (UID 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    GEMMA_PORT=7860 \
    GEMMA_HOST=0.0.0.0 \
    TF_ENABLE_ONEDNN_OPTS=0

WORKDIR $HOME/app

# Pre-create cache directories with proper permissions for model downloads
RUN mkdir -p $HOME/.cache/kagglehub

# Copy dependency specifications first for Docker layer caching
COPY --chown=user:user pyproject.toml README.md ./

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    fastapi==0.115.6 \
    uvicorn==0.34.0 \
    pydantic==2.10.4 \
    kagglehub==0.3.6 \
    jax[cpu]==0.4.35 \
    flax==0.10.2 \
    sentencepiece==0.2.0 \
    psycopg2-binary==2.9.10

# Copy application source code
COPY --chown=user:user . .
RUN pip install --no-deps -e .

EXPOSE 7860

# Container health probe
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:7860/health || exit 1

CMD ["python", "bmap_llm_server.py"]
