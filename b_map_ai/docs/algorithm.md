# ⚡ B Map AI - Intelligent Route Optimization & Environmental Algorithms

## 1. Dynamic Congestion Re-Weighting (BPR Flow Model)

Base edge traversal times in the road graph are dynamically updated using real-time telematics:

$$w_e = t_{\text{free}} \cdot \left[ 1 + \alpha \cdot \left( \frac{v_{\text{free}} - v_{\text{actual}}}{v_{\text{free}}} \right)^\beta \right]$$

### Parameters:
- $t_{\text{free}}$: Free-flow traversal duration of the road segment (seconds).
- $v_{\text{free}}$: Legal or nominal free-flow speed limit (km/h).
- $v_{\text{actual}}$: Observed real-time vehicle speed from fleet telemetry (km/h).
- $\alpha = 0.65$: Empirical congestion inflation coefficient.
- $\beta = 2.0$: Non-linear queuing exponent reflecting exponential shockwaves in heavy traffic.

---

## 2. Proactive In-Drive Dynamic Evaluator

The autonomous background evaluator runs every 30 seconds across active driving sessions:

| Trigger Condition | Threshold | Proactive Action |
|---|---|---|
| **Destination Parking** | Distance $\le 2.0\text{ km}$ | Scans vacant bays & highlights closest entrance deck |
| **Faster Route Discovery** | Time Saved $\ge 5\text{ mins}$ | Evaluates bypass corridor & prompts driver with detour savings |
| **Low Energy Replenishment** | Battery/Fuel $\le 20\%$ | Filters & ranks closest high-speed DC chargers / fuel stations |
| **Driver Fatigue Monitor** | Continuous Drive $\ge 7,200\text{ s}$ (2h) | Flags upcoming highway oasis rest plaza with amenities |

---

## 3. Green Eco-Routing & EV Regenerative Braking

Route cost incorporates elevation change ($\Delta h$), rolling resistance, and regenerative recovery:

$$E_{\text{segment}} = m \cdot g \cdot \Delta h \cdot (1 - \eta_{\text{regen}}) + \mu \cdot m \cdot g \cdot d + \frac{1}{2} \cdot \rho \cdot C_d \cdot A \cdot v^2 \cdot d$$

Routes are adjusted to avoid severe pollution hot-spots using real-time AQI weights (PM2.5, PM10, $\text{NO}_2$).

---

## 4. Multi-Lingual Vernacular Voice Synthesis

Provides natural localized voice synthesis across 12 Indian languages:
1. Hindi (हिंदी)
2. Bengali (বাংলা)
3. Tamil (தமிழ்)
4. Telugu (తెలుగు)
5. Kannada (ಕನ್ನಡ)
6. Marathi (मराठी)
7. Gujarati (ગુજરાતી)
8. Malayalam (മലയാളം)
9. Punjabi (ਪੰਜਾਬੀ)
10. Assamese (অসমীয়া)
11. Odia (ଓଡ଼ିଆ)
12. Indian English
