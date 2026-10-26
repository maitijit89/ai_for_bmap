# 🧭 B Map AI - Intelligent Navigation & Geospatial AI Platform

An advanced in-drive navigation copilot, multimodal road computer vision analyzer, spatio-temporal traffic optimizer, and big-data geospatial intelligence platform powered by Google DeepMind's **Gemma 3 (1B)** LLM.

---

## 📁 Clean Layered Architecture & Project Structure

The backend is built with a Clean Layered Architecture separating concerns across dedicated layers:

```
b_map_ai/
├── src/
│   ├── config/                     # Environment configuration & Gemma model settings
│   │   └── index.ts
│   ├── controllers/                # HTTP request handlers & API validation
│   │   ├── ai-copilot.controller.ts
│   │   ├── navigation.controller.ts
│   │   └── index.ts
│   ├── middlewares/                # Centralized Express middlewares
│   │   ├── error.middleware.ts     # 404 & global exception error handlers
│   │   ├── logger.middleware.ts    # Request logging with timestamps
│   │   └── index.ts
│   ├── models/                     # Mongoose schemas & data entity interfaces
│   │   ├── ai-copilot-session.model.ts
│   │   ├── ai-vision-incident.model.ts
│   │   ├── master-poi.model.ts
│   │   ├── road-change.model.ts
│   │   └── index.ts
│   ├── routes/                     # Express REST route definitions
│   │   ├── ai-copilot.routes.ts    # All 7 AI Copilot pillar routes (/api/v1/ai-copilot)
│   │   ├── navigation.routes.ts    # Core navigation & route planning (/api)
│   │   └── index.ts
│   ├── services/                   # Business logic & AI algorithms
│   │   ├── activity-recognition.service.ts
│   │   ├── ai-copilot.service.ts
│   │   ├── ai-poi-intelligence.service.ts
│   │   ├── ai-traffic-forecaster.service.ts
│   │   ├── ai-vision-analyzer.service.ts
│   │   ├── ar-walk-cycle.service.ts
│   │   ├── dynamic-recommendation.service.ts
│   │   ├── environment.service.ts
│   │   ├── llm.service.ts
│   │   ├── navigation.service.ts
│   │   ├── poi-resolution.service.ts
│   │   ├── road-production.service.ts
│   │   ├── sr-navigation.service.ts
│   │   ├── trajectory-mining.service.ts
│   │   ├── vernacular.service.ts
│   │   ├── veteran-driver-layer.service.ts
│   │   └── index.ts
│   ├── sockets/                    # WebSockets & real-time bidirectional streaming
│   │   ├── ai-copilot.socket.ts
│   │   └── index.ts
│   ├── types/                      # Shared TypeScript types & interfaces
│   │   └── index.ts
│   └── index.ts                    # Main Application bootstrapper
├── gemma/                          # Google DeepMind Gemma 3 (1B) Inference Subsystem
│   ├── bmap_llm_server.py          # FastAPI high-performance inference engine (port 5005)
│   ├── run_chat.py                 # CLI interactive chat tester
│   ├── pyproject.toml              # Python dependencies & metadata
│   └── gemma/                      # Core Gemma flax/jax model implementation
├── tests/                          # Integration & end-to-end test suites
│   ├── test_client.ts              # General navigation test client
│   └── test_copilot_platform.ts    # Comprehensive 7 pillars verification suite
├── docs/                           # Algorithmic specifications & mathematical formulas
│   └── algorithm.md
├── dist/                           # Compiled production JavaScript bundle
├── package.json
└── tsconfig.json
```

---

## 🏗️ 7 Core Architectural Pillars

### 🗣️ 1. In-Drive Conversational Copilot & Agentic LLM
- **Implementation**:
  - [`ai-copilot.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/ai-copilot.service.ts)
  - [`ai-copilot.controller.ts`](file:///e:/ai_for_bmap/b_map_ai/src/controllers/ai-copilot.controller.ts)
  - [`ai-copilot.socket.ts`](file:///e:/ai_for_bmap/b_map_ai/src/sockets/ai-copilot.socket.ts)
  - [`ai-copilot-session.model.ts`](file:///e:/ai_for_bmap/b_map_ai/src/models/ai-copilot-session.model.ts)
- **Natural Language Intent Classification** (8 specialized intents):
  1. `FIND_ALONG_ROUTE`: En-route amenities with detour delta calculations.
  2. `REROUTE_TRAFFIC_WEATHER`: Checks jams/adverse weather and recommends bypasses.
  3. `FATIGUE_REST_ASSIST`: Proactively locates highway service plazas and rest stops.
  4. `QUERY_PARKING_LAST_METER`: Destination parking facilities, vacant bays, EV chargers.
  5. `NAV_CONTROL`: Hands-free navigation controls (mute voice, switch to 3D, zoom).
  6. `POI_DETAILS_INQUIRY`: Operational hours, phone numbers, ratings, reviews.
  7. `GENERAL_TRAVEL_QNA`: General trip progress, ETA, remaining distance.
  8. `UNKNOWN`: Fallback conversational handling.
- **Vehicle Context Awareness**: Continuously consumes coordinates `[lng, lat]`, speed (`km/h`), heading (`deg`), remaining distance (`m`), ETA, SoC (`%`), active route ID, destination metadata.
- **Agentic Tool Execution & Action Payloads**: Automatically returns `add_waypoint`, `switch_route`, `reserve_parking`, `mute`, `adjust_hud`.
- **Real-Time Streaming over Socket.IO**:
  - Inbound: `copilot_message_stream`
  - Outbound: `copilot_message_response`

---

### 👁️ 2. Multimodal Computer Vision AI & Road Scene Hazard Analyzer
- **Implementation**:
  - [`ai-vision-analyzer.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/ai-vision-analyzer.service.ts)
  - [`ai-vision-incident.model.ts`](file:///e:/ai_for_bmap/b_map_ai/src/models/ai-vision-incident.model.ts)
- **Road Surface Defect & Hazard Detection**:
  - Identifies `pothole_crater`, `flooding_waterlogging`, `construction_barricade`, `fallen_tree_debris`, `disabled_vehicle_shoulder`, `damaged_guardrail`.
  - Normalized bounding boxes `{ x, y, width, height }`, confidence scores, severity (`low`, `medium`, `high`, `critical`).
- **Traffic Sign OCR**: Detects `speed_limit`, `construction`, `yield`, `stop`, `curve_ahead`, `no_entry` and flags discrepancies against digital map limits.
- **Actionable Driver Coaching**: Synthesizes spoken coaching advice for real-time avoidance.
- **CCTV Parking Lot Occupancy**: Computes live occupancy percentages, vacant EV bays, and recommended aisle.
- **Spatial Persistence**: 2dsphere radial search via `GET /api/v1/ai-copilot/vision/incidents/nearby`.

---

### 📈 3. AI Predictive Traffic & Spatio-Temporal Departure Optimizer
- **Implementation**:
  - [`ai-traffic-forecaster.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/ai-traffic-forecaster.service.ts)
- **Neural Spatio-Temporal Flow Modeling**: Compares requested departure time against historical speed profiles.
- **Multi-Slot Departure Optimization**: Evaluates rolling windows ($-15$m, target, $+20$m, $+45$m) with duration, delta minutes, congestion probability %, and tags (`RECOMMENDED_FASTEST`, `AVOID_PEAK_JAM`, `BASELINE`).
- **Bottleneck Corridor Identification**: Pinpoints highway junctions, bottleneck hours, and delay impacts.

---

### 🏨 4. AI POI Intelligence & Destination Arrival Briefing
- **Implementation**:
  - [`ai-poi-intelligence.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/ai-poi-intelligence.service.ts)
- **Review Synthesis & NLP Sentiment**: 0–100 sentiment score, top pros and cons.
- **Logistics Intelligence**: Peak crowd hours, parking difficulty (`easy`, `moderate`, `difficult`), EV charging plug standards and exact deck locations.
- **In-Car Arrival Audio Briefing**: Auto-triggered within 300m of destination with detailed bay and entrance guidance.

---

### 🛰️ 5. Big-Data Trajectory Mining & Map Production AI
- **Implementation**:
  - [`trajectory-mining.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/trajectory-mining.service.ts)
  - [`poi-resolution.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/poi-resolution.service.ts)
  - [`road-production.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/road-production.service.ts)
  - [`master-poi.model.ts`](file:///e:/ai_for_bmap/b_map_ai/src/models/master-poi.model.ts)
  - [`road-change.model.ts`](file:///e:/ai_for_bmap/b_map_ai/src/models/road-change.model.ts)
- **Spatio-Temporal Stay-Point Mining (ST-DBSCAN)**: Bounded $\Delta d \le 50\text{m}$, $\Delta t \ge 300\text{s}$, hotspot clustering ($\epsilon = 40\text{m}, \text{minPts} \ge 2$), curbside PUDO mining (45s–240s).
- **POI Entity Resolution & Golden Record Fusion**:
  $$\text{Score} = 0.45 \cdot \text{TextSim} + 0.40 \cdot \text{GeoSim} + 0.15 \cdot \text{CatSim}$$
  Candidates scoring $\ge 0.70$ are fused into canonical Golden Records.
- **Automated Road Production**: Centerline extraction from GPS traces and zero-flow closure anomaly detection.

---

### 🏃 6. Sensor Machine Learning, Perception & ADAS
- **Implementation**:
  - [`activity-recognition.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/activity-recognition.service.ts)
  - [`sr-navigation.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/sr-navigation.service.ts)
  - [`veteran-driver-layer.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/veteran-driver-layer.service.ts)
  - [`ar-walk-cycle.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/ar-walk-cycle.service.ts)
- **Inertial Sensor Activity Recognition**: `DRIVING`, `CYCLING`, `WALKING`, `RUNNING`, `STILL` with intelligent transitions (arrival confirmation, delay alert, auto-pause).
- **Spatial Reality (SR) Perception & ADAS**: Obstacle tracking, relative speed, Time-To-Collision (TTC) forward collision warning, cut-in detection, and Lane Departure Warning (LDW).
- **Veteran Driver Experience Layer**: Signal trap & jaywalking penalties, shortcut alley discovery.
- **3D Augmented Reality (AR) HUD**: Ray-casting projection based on camera pose onto screen percentages (`screenX%`, `screenY%`, depth scale).

---

### ⚡ 7. Intelligent Route Optimization & Environmental AI
- **Implementation**:
  - [`algorithm.md`](file:///e:/ai_for_bmap/b_map_ai/docs/algorithm.md)
  - [`dynamic-recommendation.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/dynamic-recommendation.service.ts)
  - [`environment.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/environment.service.ts)
  - [`vernacular.service.ts`](file:///e:/ai_for_bmap/b_map_ai/src/services/vernacular.service.ts)
- **BPR Congestion Flow Model**:
  $$w_e = t_{\text{free}} \cdot \left[ 1 + 0.65 \cdot \left( \frac{v_{\text{free}} - v_{\text{actual}}}{v_{\text{free}}} \right)^{2.0} \right]$$
- **Proactive In-Drive Evaluator**: Destination parking alerts ($<2\text{km}$), faster routes ($\ge 5\text{min}$ saved), low energy alerts ($\le 20\%$), fatigue breaks ($>2\text{h}$).
- **Green Eco-Routing**: Elevation climbing energy, regenerative braking recovery, and real-time AQI integration.
- **Vernacular Voice Guidance**: Natural voice guidance across **12 Indian languages** (Hindi, Bengali, Tamil, Telugu, Kannada, Marathi, Gujarati, Malayalam, Punjabi, Assamese, Odia, Indian English) with culturally adapted landmark phrasing.

---

### 🛡️ 8. Zero-Trust Security Perimeter & Cryptographic Attestation (Patch v2.1.0)
- **Runtime Anti-Tamper Sentinel**:
  - Deep JavaScript prototype freezing across 12 built-in prototypes (`Object.prototype`, `Array.prototype`, `Function.prototype`, etc.) to eliminate prototype pollution gadget chains (Rule 11.1).
  - Traps and prohibits dynamic code execution (`eval` and `Function` constructor) (Rule 11.2).
  - Production V8 debugger / inspector trap terminating execution on memory inspection attacks (Rule 11.3).
- **Anti-Reconnaissance & Scanner Trap**: Intercepts automated exploit bots targeting `/.env`, `/.git`, `/wp-admin`, `/phpmyadmin`, `/actuator` with zero internal disclosure (Rule 2.4).
- **NoSQL Injection Sanitizer**: Recursively strips MongoDB operator keys (`$gt`, `$ne`, `$where`, etc.) and nested dot notation (Rule 2.5).
- **Cryptographic Telemetry Signer & Anti-Replay Guard**: HMAC-SHA256 signature verification (`X-BMap-Signature`) with 45-second timestamp freshness window and sliding nonce deduplication cache (Rule 3.1 & 3.2).
- **Anti-GPS Spoofing & Kinematics Plausibility**: Enforces $a \le 6.5 \text{ m/s}^2$ acceleration ceiling, $220 \text{ km/h}$ max speed, bearing concordance, and Android `isFromMockProvider` detection (Rule 4.1).
- **Cryptographic Spatial Proof-of-Presence**: HMAC-SHA256 geofence attestation certificates with 30-minute expiry (Rule 10.1 & 10.2).
- **App Version & Patch Advisory Endpoints**:
  - `GET /api/v1/app-version/check`: Enforces mandatory client patch level and compatibility.
  - `GET /api/v1/security/advisories`: Publishes active security mitigations and CVE remediation status.
- **Vulnerability Remediation**: Resolved high-severity `body-parser` DoS vulnerability (GHSA-27r3-jxmh-p828) via `body-parser@2.4.0` upgrade; patched `mongoose@9.11.4`; configured Neon PostgreSQL with explicit `sslmode=verify-full`.

---

## 🚀 Quick Start

### 1. Build TypeScript
```powershell
cd e:\ai_for_bmap\b_map_ai
npm run build
```

### 2. Start Platform
```powershell
npm run dev
# or in production:
npm start
```
*(Automatically verifies and launches the Gemma 3 1B inference engine in the background).*

### 3. Run Test Suites
```powershell
# Enterprise Zero-Trust Security & Patch verification:
npm run test:security

# Full 7 pillars verification test:
npm run test:copilot

# General navigation endpoints test:
npm run test:e2e
```

