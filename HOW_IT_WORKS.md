# How It Works — The Courier Engine

> **Real-Time Multi-Agent AI Courier Optimization Engine for Monterrey, Mexico**  
> Built for HackMTY 2026 (Infosys Challenge #3)

---

## Executive Summary & Concept

In modern gig-economy delivery platforms (Uber Eats, Rappi, DiDi Food), couriers suffer from naive First-In, First-Out (FIFO) order dispatching that ignores real-world urban physics:
- Getting stuck in heavy traffic bottlenecks (e.g., Av. Gonzalitos, Par Vial Morones Prieto) during peak rush hours.
- Waiting idle in kitchens for slow meals (25+ minutes for buffet or gourmet dishes) while earning zero revenue.
- Traveling across mountains without accounting for natural topographical barriers (e.g., Loma Larga).

**The Courier** demonstrates how specialized AI agents optimize delivery operations in real time using **empirical datasets (Kaggle Food Delivery Dataset)**, **live weather conditions (Open-Meteo API)**, and **realistic street-level routing (OSRM)** over the actual urban road network of Monterrey, Nuevo León.

---

## End-to-End System Architecture

```

                       Next.js 14 Webapp (Port 3000)                     
                                                                         
          
     Frontend Views                 API Routes & SSE Stream          
     / (Tri-Agent Split Demo)       POST /api/sim/start              
     /driver (Fleet Console)        DELETE /api/sim/stop/[id]        
     /audit (Compliance Tier)       GET  /api/ws (Live SSE ticks)    
          

                                                     
                
        Open-Meteo Live API               Python Agent Service 
        (Weather & Disruption)            (Port 8001 — FastAPI)
                  POST /decide/agent-a 
                                            POST /decide/agent-b 
                                          
                                                      
                                      
                                        AI Optimization Models       
                                        Agent A: DQN (Profit Margin) 
                                        Agent B: OR-Tools + XGBoost  
                                      

  OSRM Monterrey Routing Graph     (Docker :5000 / Public OSRM fallback)
  Loma Larga Tunnel Navigation     Real-time waypoint physics

```

---

## Core Operational Pillars

### 1.  Live Weather Ingestion (Open-Meteo API)
- **Zero API Key / Zero Credit Card**: Integrated with the public Open-Meteo forecast API for Monterrey coordinates (`25.6692, -100.3099`).
- **Dynamic Event Injection**:
  - At shift launch, the simulator queries current meteorological parameters (temperature, rain, showers, WMO weather codes, wind speed).
  - **Rain Detected** (`rain > 0` or WMO rain/storm codes):
    - Automatically injects a `rain` disruption event.
    - Activates customer surge pricing ($1.5\times - 1.8\times$).
    - Applies a speed penalty multiplier ($0.64\times \rightarrow 16\text{ km/h}$).
  - **Extreme Heatwave** ($>36^\circ\text{C}$):
    - Automatically injects an `extreme_heat` event.
    - Activates heatwave surge pricing ($1.35\times$).
  - **Zero-Downtime Fallback**: If the network times out, the engine defaults gracefully to standard Monterrey clear conditions ($28.5^\circ\text{C}$).

---

### 2.  IRL Monterrey Rush-Hour & Congestion Physics
Instead of assuming static travel speeds, the simulator models Monterrey's empirical congestion curves:
- **Peak Rush-Hour Schedules**:
  - **Morning Rush**: $07:30 - 09:30$ (peaking at $08:15$, speed multiplier $0.58\times$).
  - **Evening Rush**: $18:00 - 20:30$ (peaking at $19:00$, speed multiplier $0.54\times$).
  - **Off-Peak Traffic**: $20.0 - 25.0\text{ km/h}$ free flow.
- **Corridor Bottlenecks**:
  - **Av. Gonzalitos**: Main north-south artery; rush-hour speeds drop to **$10.8\text{ km/h}$**.
  - **Par Vial Constitución / Morones Prieto**: Along the Santa Catarina riverbed; rush-hour speeds drop to **$10.8\text{ km/h}$**.
  - **Centro de Monterrey**: High pedestrian and traffic signal density; rush-hour speeds drop to **$11.1\text{ km/h}$**.
  - **Túnel de la Loma Larga**: Natural pass between Monterrey and San Pedro; speeds drop to **$10.5\text{ km/h}$**.
- **Dynamic Physics Integration**:
  - Each courier’s position is sampled tick-by-tick. The effective speed is computed individually:
    $$\text{EffectiveSpeed} = \text{BaseSpeed (25 km/h)} \times \text{ZoneFactor} \times \text{RushHourFactor} \times \text{WeatherFactor}$$
  - The courier advances along OSRM street waypoints based on their exact local speed.

---

### 3.  OSRM Real Street Waypoint Routing
- **Eliminating "Mountain Cutting"**:
  - Monterrey is surrounded by mountains (Cerro de la Silla, Sierra Madre Oriental, Loma Larga). Traditional mock simulations draw diagonal lines straight across mountains and buildings.
  - **The Courier** computes real street geometry using OSRM. When routing between San Pedro and Monterrey Centro, couriers are strictly navigated through the **Túnel de la Loma Larga** or arterial freeway corridors.
- **Three-Phase Delivery State Machine**:
  1. `to_pickup`: Courier navigates along street waypoints to the restaurant.
  2. `waiting_at_pickup`: Courier waits at kitchen for order preparation.
  3. `to_dropoff`: Courier carries order and follows street waypoints to customer location.

---

### 4.  Kaggle Food Delivery Dataset Calibration
Parameters are not arbitrary; they are calibrated using distributions from the standard Kaggle Food Delivery Dataset:
- **Kitchen Preparation Wait Times by Food Type**:
  - `snack` (beverages, bakeries): $5 - 8\text{ minutes}$ (1 tick wait)
  - `fast_food` (tacos, burgers): $10 - 16\text{ minutes}$ (2 ticks wait)
  - `casual_dining` (Mexican dishes, Italian): $18 - 26\text{ minutes}$ (3 ticks wait)
  - `groceries` (convenience, OXXO): $8 - 14\text{ minutes}$ (2 ticks wait)
  - `buffet_gourmet` (fine dining): $25 - 35\text{ minutes}$ (3 ticks wait)
- **Traffic Density Categories**:
  - `jam`: $2.1\times$ transit delay
  - `high`: $1.6\times$ transit delay
  - `medium`: $1.25\times$ transit delay
  - `low`: $1.0\times$ transit delay
- **Tip Distributions (MXN)**:
  - Standard baseline: $55\%$ no tip, $25\%$ $\$10-\$20$, $15\%$ $\$25-\$40$, $5\%$ $\$50+$.
  - Weather surge (rain / extreme heat): customers tip higher (up to $\$70-\$100\text{ MXN}$).

---

## The Competing Agent Architectures

| Parameter | Agent A: The Economist  | Agent B: The Hustler  | Baseline: Traditional App  |
| :--- | :--- | :--- | :--- |
| **Strategy** | Profit Margin Maximizer | Volume & Batch Clustering | Naive FIFO |
| **Engine** | Deep Q-Network (DQN) | Google OR-Tools CVRPTW + XGBoost | Unoptimized Single Queue |
| **Bag Capacity** | 1 order (selective high-yield) | Up to 3 orders (multi-drop cluster) | 1 order (accepts first match) |
| **Scoring Formula** | $\text{PayPerKm} \ge \$16 \text{ \& TotalPay} \ge \$38$ | Net Hourly Earning Density ($\text{MXN/hour}$) | First available order in queue |
| **Rush-Hour Behavior** | Rejects slow-prep orders in jam corridors | Groups orders from adjacent restaurants | Gets trapped in Gonzalitos with $\$30$ orders |
| **Typical Hourly Yield** | $\$130 - \$175\text{ MXN/hr}$ | $\$160 - \$220\text{ MXN/hr}$ | $\$70 - \$95\text{ MXN/hr}$ |

### Agent B's XGBoost Scorer Formula:
$$\text{Score} = \left( \frac{\text{Payout} + \text{ExpectedTip}}{\text{TransitMin}(\text{Traffic}) + \text{PrepWaitMin} \times 0.45} \right) \times 60$$

---

## User Interface & Views

1. **Split-Screen Live Arena (`/`)**:
   - Split-screen comparison cards with real-time earnings flip counters, km traversed, and completed order tallies.
   - Live Leaflet map with CartoDB Dark Matter tiles, animated courier pins, surge overlays, and live route polylines.
   - Live order dispatch feed displaying incoming orders and accept/skip decisions.
   - Weather & Rush-Hour status pill displaying live Monterrey temperature and traffic speed.

2. **Fleet Operations Panel (`/driver`)**:
   - Monochrome dispatcher console designed for fleet operations.
   - Real-time courier availability states (`Disponible` $\leftrightarrow$ `En Ruta`).
   - "Entregas Hoy" KPI counter with daily growth calculations.
   - Active orders queue and vehicle distribution donut chart.

3. **Audit & Compliance Panel (`/audit`)**:
   - 3-Tier access control (`Public`, `Business`, `Gov`).
   - Transparent inspection of every AI decision with full natural-language reasoning and provenance payloads.
   - Zero LLM token footprint during runtime.

---

## Pitch Takeaways for Judges

1. **Defensible Economics**: Decisions are driven by empirical data distributions from Kaggle, avoiding synthetic "toy" metrics.
2. **True Urban Geography**: Real Monterrey road network via OSRM avoids naive straight-line simulations and respects natural topography.
3. **Resilience**: Integrated zero-key public APIs (Open-Meteo) and deterministic mathematical solvers ensure zero failure rate during live judging demonstrations.
