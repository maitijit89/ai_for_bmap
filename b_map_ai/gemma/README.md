---
title: B Map AI Gemma 3 Inference Service
emoji: 🗺️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
---

# B Map AI - Gemma 3 (1B) Inference Service

High-performance geospatial LLM inference engine grounded in deep navigation knowledge and chain-of-thought spatial reasoning.

## Hardware Profile
- **Platform**: Hugging Face Spaces
- **Tier**: Free Tier (2 vCPU, 16 GB RAM)
- **Model**: `google/gemma-3/flax/gemma3-1b-it` (Flax/JAX)
- **Container Port**: 7860

## REST Endpoints
- `GET /` - Root dashboard and service summary
- `GET /health` - Comprehensive readiness and feature probe
- `POST /v1/chat` - Conversational driver copilot inference
- `POST /v1/navigation` - Structured geospatial route and navigation synthesis
- `GET /metrics` - Internal latency and query execution statistics
- `GET /docs` - Interactive Swagger OpenAPI documentation

## Space Secrets (Settings -> Variables and secrets)
- `DATABASE_URL`: *(Optional)* Neon PostgreSQL connection string for inference auditing.
- `KAGGLE_USERNAME`: *(Optional)* Kaggle username if authenticating weight downloads.
- `KAGGLE_KEY`: *(Optional)* Kaggle API key.
- `CORS_ORIGINS`: *(Optional)* Comma-separated list of allowed frontend/backend origins (defaults to `*`).
