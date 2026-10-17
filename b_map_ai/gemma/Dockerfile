# ============================================================================
# Gemma 3 (1B) High-Performance Inference Container
# ============================================================================
FROM python:3.11-slim

WORKDIR /app

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python packages
COPY pyproject.toml README.md ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    fastapi==0.115.6 \
    uvicorn==0.34.0 \
    pydantic==2.10.4 \
    kagglehub==0.3.6 \
    jax[cpu]==0.4.35 \
    flax==0.10.2 \
    sentencepiece==0.2.0

# Copy application files
COPY . .
RUN pip install --no-deps -e .

ENV GEMMA_HOST=0.0.0.0
ENV GEMMA_PORT=5005
ENV TF_ENABLE_ONEDNN_OPTS=0

EXPOSE 5005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5005/health || exit 1

CMD ["python", "bmap_llm_server.py"]
