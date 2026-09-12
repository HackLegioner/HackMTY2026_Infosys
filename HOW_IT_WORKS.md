# 📖 How It Works — The Courier Engine

This document provides a technical breakdown of how **The Courier** simulates, routes, and optimizes urban delivery shifts in real time.

---

## 1. Simulation Lifecycle & The Tick Loop

1. **Shift Initialization**:
   - A client triggers `POST /api/sim/start` specifying shift duration (ticks) and random seed.
   - `ShiftEngine` initializes an in-memory session and registers a new document in MongoDB (`Shift`).
   - A batch of initial delivery orders across Monterrey hotspots is seeded into the pool.
2. **Tick Interval (Every 2 Seconds)**:
   - **Order Lifecycle**: Expired orders are evicted; new orders are dynamically spawned based on Monterrey urban demand profiles.
   - **Event Lifecycle**: Active disruptions (e.g., San Pedro surges, river freeway closures) are updated or expired.
   - **Agent Dispatch**: Every active agent evaluates the current order pool and executes decisions concurrently:
     - `Agent A` calls Python `POST /decide/agent-a`
     - `Agent B` calls Python `POST /decide/agent-b`
     - `Baseline` computes decisions locally via FIFO logic
   - **State Progression**: Accepted orders credit earnings, accumulate distance, and move the courier's simulated coordinates.
   - **Persistence**: Decisions are inserted into MongoDB (`Decision` collection) for live audit queries.
   - **Broadcast**: The updated state is pushed to all subscribed clients via Server-Sent Events (`GET /api/ws?shiftId=...`).

---

## 2. The Three Competing Strategies

### Agent A: The Economist 🧊
- **Focus**: Efficiency and profit per kilometer.
- **Model**: Deep Q-Network (DQN) policy trained with Stable-Baselines3 on CPU.
- **Decision Rule**: Only accepts orders where `Payout / DistanceKm ≥ Threshold`. Automatically raises threshold when approaching surge zones to avoid deadhead miles.

### Agent B: The Hustler ⚡
- **Focus**: High delivery density and route clustering.
- **Model**: Google OR-Tools `RoutingIndexManager` solving Capacitated Vehicle Routing Problem with Time Windows (CVRPTW) combined with an XGBoost order candidate ranker.
- **Decision Rule**: Groups up to 4 proximate pickup/dropoff points into a single multi-drop tour, amortizing travel distance and maximizing total throughput.

### Baseline: Traditional App 📱
- **Focus**: Standard industry benchmark.
- **Logic**: Naive First-In, First-Out (FIFO). Accepts whatever single order is offered first, ignoring spatial clustering, surge multipliers, or profit density.

---

## 3. Monterrey Spatial & Crisis Modeling

- **Urban Hotspots**: Real-world coordinates modeled after Monterrey commercial and residential epicenters:
  - Macroplaza / Centro (`25.6692, -100.3099`)
  - San Pedro Garza García / Centrito (`25.6572, -100.3667`)
  - Tecnológico de Monterrey (`25.6514, -100.2895`)
  - San Jerónimo (`25.6795, -100.3540`)
  - Parque Fundidora / Cintermex (`25.6790, -100.2850`)
- **Dynamic Events**:
  - **Surge Zones**: Increases order payouts within radius up to `1.8x`.
  - **Road Closures**: Blocks transit corridors (e.g., Constitución express lanes), triggering route recalculations.
  - **Flash Rainstorms**: Simulates heavy Monterrey summer storms, throttling travel speeds.

---

## 4. Routing & Fail-Safe Architecture

- **Primary Route Engine**: OSRM running in Docker (`:5000`) consuming open-source OpenStreetMap roads for Monterrey.
- **Self-Correction Fallback**: If OSRM is unreachable or timed out, `osrmClient.ts` calculates exact Great-Circle Haversine distance with 5-step geographic interpolation. The simulation never halts or crashes due to routing timeouts.

---

## 5. Audit & Compliance Governance

- **Zero-LLM Runtime Execution**: Shifts operate purely on deterministic OR-Tools algorithms and lightweight neural/tabular inference, ensuring **0 LLM token cost during operations**.
- **Tiered Access Control**:
  - **Public Tier**: Stripped of internal reasoning; only shows high-level metrics.
  - **Business Tier**: Unlocks natural-language decision rationale per tick.
  - **Gov / Auditor Tier**: Unlocks full provenance payloads, raw solver outputs, and verification tags.
