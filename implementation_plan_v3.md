# 🚀 The Courier — Market Edition (Implementation Plan v3)
### Multi-Agent Courier Optimization Engine for Monterrey, Mexico
> **HackMTY 2026 — Infosys Challenge #3 | Production Market Architecture**

---

## 🎯 Executive Overview & Value Proposition

In food and parcel delivery platforms (Uber Eats, Rappi, DiDi Food), couriers currently suffer from naive First-In, First-Out (FIFO) order dispatching that ignores real-world urban physics:
- Getting trapped in severe rush-hour bottlenecks (Av. Gonzalitos, Par Vial Morones Prieto / Constitución, Túnel de la Loma Larga).
- Waiting idle in kitchens for slow meals (25+ minutes for buffet or gourmet dishes) while earning zero revenue.
- Traveling across mountains without accounting for natural topographical barriers (Loma Larga).

**The Courier** demonstrates how specialized AI agents optimize delivery operations in real time using **empirical datasets (Kaggle Food Delivery Dataset)**, **live weather conditions (Open-Meteo API)**, and **realistic street-level routing (OSRM)** over the actual road network of Monterrey, Nuevo León.

Two intelligent agents compete side-by-side with a traditional baseline:
1. **Agent A — The Economist 🧊**: Deep Q-Network (DQN) reinforcement learning policy maximizing net profit margin per kilometer ($MXN/km$), rejecting low-margin single orders and targeting surge hotspots.
2. **Agent B — The Hustler ⚡**: Google OR-Tools CVRPTW solver + XGBoost hourly yield model, batching up to 3 compatible orders, optimizing dropoff sequences, and clustering deliveries.
3. **Traditional App Baseline 📱**: Naive FIFO queue that takes the first order presented, frequently trapped in rush-hour bottlenecks.

---

## 🏗️ Multi-Cloud Architecture v3

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          VERCEL (Edge & Serverless)                         │
│                                                                             │
│   Frontend Views (Next.js 14 App Router):                                   │
│   ├── /                 → Tri-Agent Split-Screen Arena + Leaflet CartoDB    │
│   ├── /driver           → Fleet Operations Console & Availability Toggles   │
│   └── /audit            → 3-Tier Compliance Panel (Public / Biz / Gov)      │
│                                                                             │
│   Serverless API Routes (maxDuration: 60s):                                 │
│   ├── /api/sim/start    → Initialize & kick off shift                       │
│   ├── /api/sim/status   → Sub-5ms status from Redis / Mongo fallback       │
│   ├── /api/sim/event    → Cross-lambda disaster injection queue             │
│   ├── /api/sim/stop     → Stop simulation & persist final summary           │
│   ├── /api/ws           → Real-time tick stream (SSE) with auto-resume      │
│   ├── /api/audit        → Tiered audit queries                              │
│   ├── /api/analytics    → Fleet-wide MongoDB aggregation                    │
│   └── /api/health       → Multi-cloud health diagnostic                     │
└───────────────────────┬───────────────────────────────┬─────────────────────┘
                        │                               │
                        ▼ Read / Write                  ▼ Sub-5ms Cache & Queue
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│         MONGODB ATLAS (Cloud)        │  │       UPSTASH REDIS (Cloud)       │
│   • M0 Free Cluster (courier-cluster)│  │   • Serverless REST Pipeline      │
│   • Shifts Collection                │  │   • Distributed Shift State Store │
│   • Decisions Collection             │  │   • Cross-Lambda Event Queue      │
│   • Historical Aggregation Pipelines │  │   • Global IP Rate Limiter        │
│   • Permanent Compliance Records     │  │   • Zero Cold-Start Synchronization│
└──────────────────────────────────────┘  └───────────────────────────────────┘
                                                            │
                                                            ▼ REST HTTP
                                          ┌───────────────────────────────────┐
                                          │        RAILWAY.APP (PaaS)         │
                                          │   • Python 3.11 Slim Container    │
                                          │   • FastAPI Microservice (:8001)  │
                                          │   • Agent A: DQN RL Model         │
                                          │   • Agent B: OR-Tools + XGBoost   │
                                          │   • Dynamic $PORT Binding         │
                                          │   • CORS Enabled for Vercel       │
                                          └───────────────────────────────────┘
```

---

## ⚙️ The Four Production Pillars

### 1. Vercel (Frontend & Serverless API Routes)
- **Framework**: Next.js 14 with App Router, TypeScript, and Tailwind CSS.
- **Components**:
  - `MapView.tsx` & `LeafletMapInner.tsx`: Leaflet CartoDB dark matter tiles, animated courier markers, surge rings, and active street polylines.
  - `AgentPanel.tsx`: Glassmorphism cards with real-time flip counters and metric badges.
  - `ComparisonTable.tsx`: Live Delta $ comparisons vs traditional app baseline.
  - `RouteNetworkMap.tsx` & `VehicleDonutChart.tsx`: Fleet operations console.
- **Serverless Resilience**:
  - `vercel.json` configures 60s max execution duration for all API routes.
  - `src/lib/security/redisClient.ts` eliminates Lambda memory isolation issues by storing active state in Upstash Redis.
  - Polling fallback in `useShiftStream.ts` guarantees seamless updates even during network disruptions.

### 2. MongoDB Atlas (Persistent Document of Record)
- **Cluster**: M0 Free Tier (`courier-cluster.942dmwx.mongodb.net/courier-ai`).
- **Collections**:
  - `shifts`: Records start time, duration, final earnings, km traveled, and completion status.
  - `decisions`: Granular tick-by-tick decisions with natural language reasoning and full telemetry payloads for compliance audits.
- **Aggregations**: `/api/analytics/summary` performs aggregation pipelines calculating average earnings, km efficiency, and acceptance rates.

### 3. Upstash Redis (Serverless Fast State & Event Bus)
- **Role**: High-speed, zero-cold-start state coordinator across ephemeral Vercel Lambdas.
- **Key Schemas**:
  - `courier:shift:<id>:state`: JSON snapshot of `ShiftState`, updated every tick (TTL 2h).
  - `courier:shift:<id>:events`: RPUSH queue for manual disaster events injected by any Lambda.
  - `courier:shift:<id>:status`: Current lifecycle state (`running` | `stopped` | `completed`).
  - `ratelimit:<ip>`: Global sliding window rate limiter (120 req/min).

### 4. Railway (Python AI Agents Microservice)
- **Image**: Python 3.11 Slim Docker container.
- **Endpoints**:
  - `GET /health`: Microservice health check.
  - `POST /decide/agent-a`: DQN profit-density decision endpoint.
  - `POST /decide/agent-b`: OR-Tools CVRPTW batch solver endpoint.
- **Deployment Features**:
  - Dynamic `${PORT:-8001}` evaluation supporting Railway's dynamic port assignment.
  - `railway.json` schema manifest with automated `/health` probes.
  - `CORSMiddleware` allowing secure cross-origin requests from Vercel.
  - TypeScript fallback in `agentClient.ts` ensuring the app continues operating if the container cold-starts.

---

## 🚦 Monterrey Real-World Simulation Physics

1. **Topographical Integrity (Loma Larga Tunnel)**:
   Couriers never cut diagonals through mountains. Crossing between San Pedro and Monterrey Centro strictly routes through the **Túnel de la Loma Larga** corridor or arterial freeways.
2. **Monterrey Congestion Curves**:
   Models peak rush hours ($07:30 - 09:30$ and $18:00 - 20:30$) with localized corridor bottlenecks:
   - Av. Gonzalitos: $10.8\text{ km/h}$
   - Par Vial Morones Prieto / Constitución: $10.8\text{ km/h}$
   - Centro de Monterrey: $11.1\text{ km/h}$
3. **Open-Meteo Live API Ingestion**:
   Queries live weather at coordinates `25.6692, -100.3099`. Rain injects speed penalties ($0.64\times$) and customer surge multipliers ($1.5\times - 1.8\times$).
4. **Kaggle Food Delivery Calibration**:
   Kitchen preparation wait times ($1-3$ ticks) vary by meal complexity (`snack`, `fast_food`, `casual_dining`, `buffet_gourmet`), penalizing slow kitchens during peak hours.

---

## 📋 Environment Variables Reference

### Next.js (Vercel & Local `.env.local`)
```bash
# MongoDB Atlas
MONGODB_URI="mongodb+srv://<user>:<password>@courier-cluster.942dmwx.mongodb.net/courier-ai?retryWrites=true&w=majority&appName=courier-cluster"

# Upstash Redis REST
UPSTASH_REDIS_REST_URL="https://pleasant-boar-35207.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AYmHAAIgcDE1ZGVmNjg5MmMyMTY0OTg0YTg4YjNkNzY1MDExYjdmMQ"

# Microservices
PYTHON_AGENT_URL="http://localhost:8001"   # Set to Railway public URL in Vercel
OSRM_URL="http://localhost:5000"           # Set to Railway OSRM URL or let fallback route

# Security & Compliance API Keys
GOV_API_KEY="courier_gov_2026"
BIZ_API_KEY="courier_biz_2026"
NEXT_PUBLIC_WS_URL="ws://localhost:3000"
```

### Python Microservice (Railway)
```bash
PORT=8001
```

---

## 🚀 Step-by-Step Deployment Guide

### A. Deploy Python Agents to Railway (5 min)
1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select repository `HackLegion`.
3. Set **Root Directory** to `/python-agents`.
4. Railway will detect `railway.json` and `Dockerfile`.
5. Once deployed, click **Settings** → **Generate Domain** (e.g. `https://courier-agents.up.railway.app`).
6. Test in browser: `https://courier-agents.up.railway.app/health` $\rightarrow$ `{"ok": true}`.

### B. Deploy Next.js to Vercel (3 min)
1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Import repository `HackLegion`.
3. In **Environment Variables**, add:
   - `MONGODB_URI`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `PYTHON_AGENT_URL` (set to your Railway URL from step A)
   - `GOV_API_KEY`
   - `BIZ_API_KEY`
4. Click **Deploy**. Vercel will build and publish the live production site!

### C. Verify Cloud Health
Visit `https://your-app.vercel.app/api/health` to confirm all four services are connected:
```json
{
  "status": "healthy",
  "app": "The Courier — Next.js 14 Full-Stack",
  "version": "2.0.0-market",
  "checks": {
    "mongo_db": { "status": "ok", "provider": "MongoDB Atlas" },
    "upstash_redis": { "status": "ok", "provider": "Upstash Serverless Redis" },
    "railway_python_agents": { "status": "ok", "provider": "Railway / Local Container" },
    "open_meteo": { "status": "ok", "provider": "Open-Meteo Monterrey Coordinates" }
  }
}
```
