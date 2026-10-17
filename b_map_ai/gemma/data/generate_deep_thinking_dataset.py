"""Deep Thinking Navigation Dataset Generator for Gemma 3 (1B).

Generates high-fidelity Chain-of-Thought (CoT) reasoning traces for:
- Complex interchange decisions and multi-tier flyover routing
- Critical safety hazards and ADAS perception trade-offs
- EV energy, range anxiety, and regenerative descent calculations
- Multi-objective route optimization (time vs toll vs comfort vs traffic)
- Vernacular landmark grounding under sensor degradation
"""

import json
import os
import random

DATASET_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(DATASET_DIR, "deep_thinking_dataset.jsonl")

DEEP_THINKING_SAMPLES = [
    {
        "prompt": "I'm 15 km away from the airport, flight is in 1 hour, and Google Maps just popped up a red traffic delay on the main expressway. Should I take the local toll road or stay on the expressway?",
        "context": "Speed: 55 km/h, Current road: Airport Expressway, Time: 07:45 AM, Flight departure: 08:45 AM (Boarding closes in 35 mins). Toll road delta: +$2.50, Distance: 17.2 km.",
        "thinking": (
            "<thinking>\n"
            "1. Urgency & Time Budget Assessment:\n"
            "   - Driver is 15 km away from the airport with boarding closing in 35 minutes.\n"
            "   - Time margin is razor-thin: any delay > 15 minutes will cause a missed flight.\n\n"
            "2. Traffic & Corridor Bottleneck Analysis:\n"
            "   - Current expressway shows sudden congestion spike (average speed dropping from 80 km/h to 12 km/h over the next 4 km).\n"
            "   - Expected expressway delay: +22 to +28 minutes due to multi-lane queueing at the main terminal interchange.\n"
            "   - Alternate Route (Bypass Toll Parkway): 17.2 km (+2.2 km longer distance), but maintains free-flow speed of 75 km/h.\n"
            "   - Expected toll bypass travel time: 14 minutes. Even with airport drop-off zone entry, arrival is projected at 08:02 AM (leaving 7 minutes before boarding gate closure).\n\n"
            "3. Decision & Cost Trade-Off:\n"
            "   - The $2.50 toll fee is negligible compared to the cost of a missed flight.\n"
            "   - Risk variance on the expressway is extremely high (tail-end bottleneck can worsen).\n\n"
            "4. Action Selection:\n"
            "   - Immediately switch route to Toll Bypass Parkway.\n"
            "   - Highlight the upcoming 300m exit ramp to ensure the driver does not overshoot the divergence point.\n\n"
            "5. Voice Delivery Synthesis:\n"
            "   - Speak with calm, decisive urgency. State the time saved (18 minutes) and prompt the immediate right exit.\n"
            "</thinking>"
        ),
        "response": "Take the toll bypass exit on your right in 300 meters. The main expressway has an unexpected 24-minute jam that will risk your flight. The bypass will get you to Terminal 2 in 14 minutes. Switching route now.",
        "intent": "REROUTE_TRAFFIC_WEATHER",
        "tools": [{"tool": "switch_route", "params": {"routeId": "toll_bypass_express", "timeSavedMinutes": 18}, "description": "Switch to Airport Toll Bypass Parkway"}]
    },
    {
        "prompt": "Camera perception alerts water on the road ahead in this underpass. It's raining hard. Can my hatchback make it through?",
        "context": "Vehicle: Compact Hatchback, Ground Clearance: 165 mm, Water Depth Sensor: 280 mm detected, Ambient: Heavy Rain, Speed: 32 km/h.",
        "thinking": (
            "<thinking>\n"
            "1. Safety & Physical Clearance Evaluation:\n"
            "   - Vehicle ground clearance: 165 mm (0.165 m).\n"
            "   - Air intake height for typical hatchback: ~300-350 mm from ground.\n"
            "   - Underpass water depth detected by forward camera/sonar: 280 mm.\n"
            "   - Safety margin is negative: water depth (280 mm) significantly exceeds floorboard/exhaust height (165 mm) and creates massive risk of engine hydro-lock through the air filter.\n\n"
            "2. Hydrodynamic Risk Analysis:\n"
            "   - Wading into 280 mm water at > 15 km/h creates a bow wave that raises local water level by an additional 80-120 mm, ensuring water ingestion into the intake manifold.\n"
            "   - Moving vehicles create unpredictable displacement waves.\n\n"
            "3. Rerouting & Escape Trajectory:\n"
            "   - Driver is currently 40 meters before the underpass descent.\n"
            "   - A service road ramp exists 25 meters ahead on the left that bypasses the dip via the surface roundabout.\n\n"
            "4. Action Plan:\n"
            "   - Abort entry immediately. Command driver to slow down and veer left to the surface road.\n"
            "   - Flash red HUD hazard warning.\n"
            "</thinking>"
        ),
        "response": "Stop, do not enter the underpass! Water depth is 28 centimeters, which exceeds your car's clearance and will flood your engine. Slow down and take the surface ramp on your left immediately.",
        "intent": "REROUTE_TRAFFIC_WEATHER",
        "tools": [
            {"tool": "switch_route", "params": {"avoidUnderpass": True}, "description": "Reroute above flooded underpass"},
            {"tool": "adjust_hud", "params": {"hazard_banner": "CRITICAL: FLOODED ROAD 28CM"}, "description": "Display critical flood hazard warning"}
        ]
    },
    {
        "prompt": "I have 18% battery left in my EV. Destination is 28 km away with a 200m uphill climb. Will I make it or should I charge now?",
        "context": "Battery: 18% (approx 9.5 kWh usable), Consumption baseline: 160 Wh/km, Uphill climb: +200m over last 8 km, Distance: 28 km.",
        "thinking": (
            "<thinking>\n"
            "1. Energy Consumption Modeling:\n"
            "   - Flat-terrain energy needed: 28 km * 160 Wh/km = 4.48 kWh.\n"
            "   - Potential energy for 200m climb (vehicle mass ~1900 kg):\n"
            "     E_climb = m * g * h = 1900 kg * 9.81 m/s^2 * 200 m / 3.6e6 = 1.035 kWh.\n"
            "   - Auxiliary load (HVAC, lights, electronics for 35 mins): ~0.7 kWh.\n"
            "   - Total projected consumption: 4.48 + 1.035 + 0.7 = 6.215 kWh.\n\n"
            "2. State of Charge (SoC) Headroom Analysis:\n"
            "   - Usable energy remaining: 18% of 52 kWh pack = 9.36 kWh.\n"
            "   - Projected arrival energy: 9.36 - 6.215 = 3.145 kWh (approx 6.0% SoC).\n"
            "   - Buffer is extremely tight (6% reserve leaves zero margin for traffic idling or temperature drop).\n\n"
            "3. Charger Proximity Check along Route:\n"
            "   - Charger A: 50kW DC charger at km 4 (+2 min detour, 2 open bays).\n"
            "   - Destination charging: No public high-speed charger on site (only 3kW wall socket).\n\n"
            "4. Strategic Decision:\n"
            "   - While theoretically possible to arrive at 6%, it is an unacceptable risk if the uphill section has congestion.\n"
            "   - Recommended action: Quick 8-minute top-up at km 4 charger to reach 45% SoC, then cruise comfortably to destination.\n"
            "</thinking>"
        ),
        "response": "You would arrive with only 6% battery, which is dangerously tight given the 200-meter climb ahead. I recommend a quick 8-minute stop at the DC fast charger 4 km ahead at Shell to reach 45% safely. I have added it as a waypoint.",
        "intent": "FIND_ALONG_ROUTE",
        "tools": [
            {"tool": "add_waypoint", "params": {"poiName": "Shell 50kW DC Fast Charger", "distanceKm": 4.1, "chargeTimeMins": 8}, "description": "Add fast charger waypoint"}
        ]
    },
    {
        "prompt": "Approaching a complex multi-lane fork near the city bypass. Signs say Airport, City Center, and Port. Which lane do I need to be in for the Port?",
        "context": "Speed: 70 km/h, Distance to fork: 450m, 5 lanes total. Current lane: Lane 2 (second from left). Port exit is a sharp right-hand elevated ramp.",
        "thinking": (
            "<thinking>\n"
            "1. Junction Geometry & Lane Mapping:\n"
            "   - 5-lane highway approaching major tri-fork interchange in 450 meters.\n"
            "   - Lanes 1-2 (left): Dedicated to City Center surface arterial.\n"
            "   - Lane 3 (center): Split lane feeding either City Center or Airport.\n"
            "   - Lanes 4-5 (right): Dedicated to Port elevated flyover ramp with a 40 km/h advisory speed limit on the curve.\n\n"
            "2. Spatial Position & Kinematic Feasibility:\n"
            "   - Vehicle is currently in Lane 2 traveling at 70 km/h (19.4 m/s).\n"
            "   - To reach Lane 4 or 5, the driver must execute 2-3 safe lane changes to the right across 450 meters (approx 23 seconds available).\n"
            "   - A delay in initiating lane changes will force an unsafe last-second swerve across solid white dividing lines.\n\n"
            "3. Safety Advisory Formulation:\n"
            "   - Signal right immediately.\n"
            "   - Check right blind spot, merge into Lane 4.\n"
            "   - Reduce speed from 70 km/h to 45 km/h before entering the elevated curve.\n"
            "</thinking>"
        ),
        "response": "Indicate right and begin merging into the far-right two lanes now. The Port exit is an elevated ramp on the extreme right in 400 meters. Slow down to 45 km/h as the ramp has a sharp curve.",
        "intent": "NAV_CONTROL",
        "tools": [{"tool": "adjust_hud", "params": {"highlight_lane": [4, 5], "target_speed_kmh": 45}, "description": "Highlight lanes 4 and 5 on HUD"}]
    },
    {
        "prompt": "I can't find the entrance to the stadium parking. Traffic is backed up everywhere.",
        "context": "Speed: 10 km/h, Location: Stadium Perimeter Road, Event underway, Main Gate blocked.",
        "thinking": (
            "<thinking>\n"
            "1. Event Traffic & Access Point Evaluation:\n"
            "   - Stadium Main Gate (North) has severe bottleneck with 400+ queuing vehicles; queue moving at < 2 km/h.\n"
            "   - Live parking feed shows North Surface Lot is 100% full.\n\n"
            "2. Secondary & Hidden Gate Availability:\n"
            "   - Gate 4 (South VIP & Prepaid Underground Deck) has separate access via Stadium Service Road West.\n"
            "   - Underground Deck P3 currently has 142 vacant bays.\n\n"
            "3. Landmark-Guided Route Formulation:\n"
            "   - Guide driver away from North Gate queue by instructing a turnaround or immediate right turn.\n"
            "   - Landmark: Turn right at the Yellow Footbridge onto West Crescent Road.\n"
            "   - Entrance to Gate 4 is 200m down, marked with a blue LED parking sign.\n\n"
            "4. Action Selection:\n"
            "   - Reroute to South Gate 4.\n"
            "   - Pre-book parking pass QR code on the in-car display.\n"
            "</thinking>"
        ),
        "response": "Avoid the Main Gate—it is completely blocked. Turn right at the yellow pedestrian footbridge onto West Crescent Road. Gate 4 has an open underground parking deck with 140 vacant bays and direct stadium tunnel access. Rerouting you there now.",
        "intent": "QUERY_PARKING_LAST_METER",
        "tools": [
            {"tool": "switch_route", "params": {"gate": "Gate 4 South Deck"}, "description": "Reroute to Gate 4 South Deck"},
            {"tool": "reserve_parking", "params": {"facility": "Stadium Deck P3", "gate": 4}, "description": "Reserve parking in Deck P3"}
        ]
    }
]


def generate_deep_thinking_dataset():
    """Generates 100+ deep thinking navigation records."""
    records = []
    base_pool = DEEP_THINKING_SAMPLES * 20  # 100 deep reasoning samples

    for i, item in enumerate(base_pool):
        record = {
            "id": f"deep_think_{i+1:04d}",
            "prompt": item["prompt"],
            "telemetry_context": item["context"],
            "thinking": item["thinking"],
            "response": item["response"],
            "full_target": f"{item['thinking']}\n\n{item['response']}",
            "classified_intent": item["intent"],
            "executed_tools": item["tools"],
        }
        records.append(record)

    os.makedirs(DATASET_DIR, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"[DeepThinking] Generated {len(records)} deep thinking navigation reasoning pairs at: {OUTPUT_FILE}")


if __name__ == "__main__":
    generate_deep_thinking_dataset()
