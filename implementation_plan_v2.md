# 🚀 The Courier — HackMTY 2026 — Infosys Challenge #3
### `v2` — Next.js 14 Full-Stack Webapp

> **⏱️ SPRINT WINDOW: Vie 11-Sep 22:00 → Dom 13-Sep 08:00 = 34 horas**
> **🖥️ CPU Training** — Agent A RL con DQN ligero (~20min CPU) | Docker ✅
> **🔄 v2 CHANGE**: FastAPI eliminado → Next.js 14 API Routes | Python = solo agentes

---

## 🎯 Visión del Proyecto

Un sistema de agentes de IA que optimiza en tiempo real las ganancias de un courier en Monterrey, compitiendo **dos agentes en paralelo** sobre el mismo turno simulado con el mapa real de calles. Demo en vivo: ganancias en tiempo real, mapa de Monterrey, eventos de desastre (surge, cierres, lluvia), y comparativo directo vs app tradicional.

---

## 🏗️ Arquitectura v2 — Next.js Full-Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js 14 App (Puerto 3000)                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  /app        │  │  /api routes │  │  WebSocket (/api/ws)     │  │
│  │  page.tsx    │  │  /sim/start  │  │  (next-ws library)       │  │
│  │  audit/page  │  │  /sim/status │  │  Real-time tick stream   │  │
│  │  layout.tsx  │  │  /audit      │  │                          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │ HTTP (interno)
                        ┌─────────────▼─────────────┐
                        │  Python Agent Service      │
                        │  (puerto 8001 — slim)      │
                        │                            │
                        │  POST /decide/agent-a      │
                        │  POST /decide/agent-b      │
                        │  POST /train               │
                        └─────────────┬──────────────┘
                                      │
                    ┌─────────────────▼──────────────────┐
                    │         AI Models (local)          │
                    │  Agent A: DQN (Stable-Baselines3)  │
                    │  Agent B: OR-Tools + XGBoost       │
                    └────────────────────────────────────┘

┌──────────────┐  ┌─────────────────────────┐
│  SQLite DB   │  │  OSRM (Docker :5000)    │
│  (Prisma)    │  │  Monterrey routing      │
└──────────────┘  └─────────────────────────┘
```

---

## ⚙️ Stack Tecnológico v2

### Frontend + Backend — Un Solo Repo (Next.js 14)
| Tool | Por qué |
|------|---------|
| **Next.js 14 (App Router)** | Full-stack: UI + API Routes + WebSocket en uno |
| **TypeScript** | Tipado fuerte, menos bugs en 34h |
| **Tailwind CSS** | Estilo rápido, dark mode, responsive |
| **shadcn/ui** | Componentes premium sin esfuerzo |
| **Leaflet + React-Leaflet** | Mapa real OSM de Monterrey |
| **Framer Motion** | Animaciones courier, surge zones, contadores |
| **Recharts** | Ganancias en tiempo real, comparativo |
| **next-ws** | WebSocket nativo en Next.js (sin Socket.io) |
| **Mongoose + MongoDB Atlas** | ODM + cloud DB free tier — sin servidor que mantener |
| **Zod** | Validación de schemas en API Routes |

### Python Agent Microservice (slim, solo agentes)
| Tool | Por qué |
|------|---------|
| **FastAPI slim** | Solo 3 endpoints: `/decide/a`, `/decide/b`, `/train` |
| **Stable-Baselines3** | DQN para Agent A |
| **OR-Tools** | CVRPTW solver para Agent B |
| **XGBoost** | Order scorer para Agent B |
| **uvicorn** | ASGI server |

### Infra
| Tool | Por qué |
|------|---------|
| **OSRM (Docker)** | Ruteo local Monterrey |
| **Vercel** | Deploy gratuito Next.js (perfecto) |
| **Railway.app** | Python agent service + OSRM |
| **Docker Compose** | Dev local: OSRM + Python service |

---

## 👥 Roles del Equipo

| Member | Rol | Responsabilidades v2 |
|--------|-----|----------------------|
| **@Hekthor** | Deploy · Research · Git | Vercel deploy (Next.js), Railway (Python), pitch, merge PRs |
| **@FBI** | QA · UX · Bug Hunter | Test API routes, WS, disaster scenarios, UX audit |
| **@Adrián** | Frontend / UI | Next.js UI, Leaflet, Framer Motion, shadcn, páginas |
| **@Patopro** | Backend · Agentes · DB | API Routes, Python microservice, Prisma, agentes RL/OR-Tools |

---

## 📁 Estructura del Repo v2

```
courier-ai/
│
├── 📂 src/                              ← Next.js App
│   ├── app/
│   │   ├── page.tsx                    ← Demo principal (split-screen)
│   │   ├── audit/
│   │   │   └── page.tsx                ← Panel de auditor (tiered)
│   │   ├── layout.tsx                  ← Root layout + fonts
│   │   └── globals.css                 ← Design tokens
│   │
│   ├── app/api/                        ← API Routes (reemplazan FastAPI)
│   │   ├── sim/
│   │   │   ├── start/route.ts          ← POST: iniciar turno
│   │   │   ├── stop/[id]/route.ts      ← DELETE: detener turno
│   │   │   ├── status/[id]/route.ts    ← GET: estado del turno
│   │   │   └── event/[id]/route.ts     ← POST: trigger manual evento
│   │   ├── audit/
│   │   │   └── [shiftId]/route.ts      ← GET: tiered audit data
│   │   └── ws/
│   │       └── route.ts                ← WebSocket handler (next-ws)
│   │
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapView.tsx             ← Leaflet + Monterrey dark tiles
│   │   │   ├── CourierMarker.tsx       ← Animated courier pin
│   │   │   ├── SurgeZone.tsx           ← Circle overlay surge
│   │   │   └── RoutePolyline.tsx       ← Active route lines
│   │   ├── dashboard/
│   │   │   ├── AgentPanel.tsx          ← Panel por agente (A/B/Baseline)
│   │   │   ├── EarningsCounter.tsx     ← Flip animation counter MXN
│   │   │   ├── OrderCard.tsx           ← Orden con accept/skip badge
│   │   │   ├── EventBanner.tsx         ← Surge/Closure alert banner
│   │   │   └── ComparisonTable.tsx     ← Tabla final de ganancias
│   │   └── audit/
│   │       ├── AuditSidebar.tsx        ← Sliding panel (gov/biz/public)
│   │       └── ReasoningCard.tsx       ← Por qué se aceptó/rechazó
│   │
│   ├── hooks/
│   │   ├── useShiftStream.ts           ← WS hook (tick updates)
│   │   └── useShiftControl.ts          ← Start/stop/event API calls
│   │
│   ├── lib/
│   │   ├── simulator/
│   │   │   ├── shift.ts                ← Shift engine (TypeScript)
│   │   │   ├── orderStream.ts          ← Order generator
│   │   │   ├── events.ts               ← Surge, closure, unsafe
│   │   │   └── baseline.ts             ← Dumb app agent
│   │   ├── agents/
│   │   │   └── agentClient.ts          ← HTTP client → Python service
│   │   ├── routing/
│   │   │   └── osrmClient.ts           ← OSRM fetch wrapper
│   │   ├── db/
│   │   │   └── mongoose.ts             ← Mongoose singleton + models
│   │   ├── security/
│   │   │   ├── rateLimiter.ts          ← Upstash Ratelimit / in-memory
│   │   │   └── auth.ts                 ← API key tier check
│   │   └── types.ts                    ← Shared TypeScript types
│   │
│   └── middleware.ts                   ← Rate limiting + CORS global
│
├── 📂 python-agents/                   ← Slim Python microservice
│   ├── main.py                         ← FastAPI slim (3 endpoints)
│   ├── agents/
│   │   ├── agent_a/
│   │   │   ├── model.py               ← DQN inference
│   │   │   ├── env.py                 ← Gym environment
│   │   │   ├── train.py               ← Training script
│   │   │   └── weights/               ← DQN .zip weights
│   │   └── agent_b/
│   │       ├── solver.py              ← OR-Tools CVRPTW
│   │       ├── scorer.py              ← XGBoost scorer
│   │       └── model.pkl              ← XGBoost weights
│   ├── requirements.txt
│   └── Dockerfile
│
├── 📂 lib/db/
│   ├── mongoose.ts                     ← Singleton connection
│   ├── ShiftModel.ts                   ← Shift document schema
│   └── DecisionModel.ts                ← Decision document schema
│
├── 📂 docker/
│   └── osrm/                          ← OSRM Docker config
│
├── 📂 data/
│   └── osrm/                          ← Monterrey .osrm files
│
├── 📂 notebooks/
│   ├── 01_kaggle_eda.ipynb
│   ├── 02_train_agent_a.ipynb
│   └── 03_train_agent_b.ipynb
│
├── docker-compose.yml                  ← OSRM + Python agents
├── .env.local                          ← Variables locales
├── .env.example                        ← Template sin secrets
├── package.json
├── next.config.ts
├── prisma/schema.prisma
└── README.md
```

---

## 🗄️ MongoDB Schemas (Mongoose)

> [!NOTE]
> **MongoDB Atlas Free Tier** — M0 cluster gratuito, 512MB, sin tarjeta de crédito. Perfecto para hackathon.
> Setup: [mongodb.com/atlas](https://www.mongodb.com/atlas) → Create Free Cluster → Get connection string

```typescript
// src/lib/db/mongoose.ts — Singleton connection
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

let cached = (global as any).mongoose || { conn: null, promise: null }

export async function connectDB() {
  if (cached.conn) return cached.conn
  cached.promise = cached.promise || mongoose.connect(MONGODB_URI)
  cached.conn = await cached.promise
  return cached.conn
}
```

```typescript
// src/lib/db/ShiftModel.ts
import mongoose, { Schema, model, models } from 'mongoose'

const ShiftSchema = new Schema({
  shiftId:         { type: String, required: true, unique: true },
  startedAt:       { type: Date, default: Date.now },
  durationMin:     Number,
  seed:            Number,
  agentAEarnings:  { type: Number, default: 0 },
  agentBEarnings:  { type: Number, default: 0 },
  baselineEarnings:{ type: Number, default: 0 },
  agentAKm:        { type: Number, default: 0 },
  agentBKm:        { type: Number, default: 0 },
  eventsTriggered: { type: Number, default: 0 },
}, { timestamps: true })

export const Shift = models.Shift || model('Shift', ShiftSchema)
```

```typescript
// src/lib/db/DecisionModel.ts
import mongoose, { Schema, model, models } from 'mongoose'

const DecisionSchema = new Schema({
  shiftId:   { type: String, required: true, index: true },
  tick:      Number,
  agentId:   String,   // 'agent_a' | 'agent_b' | 'baseline'
  accepted:  { type: Number, default: 0 },
  skipped:   { type: Number, default: 0 },
  reasoning: String,
  payload:   Schema.Types.Mixed,  // full reasoning JSON (gov audit tier)
}, { timestamps: true })

// Index para queries rápidas de audit
DecisionSchema.index({ shiftId: 1, agentId: 1 })

export const Decision = models.Decision || model('Decision', DecisionSchema)
```

---

## 🤖 Python Agent Microservice — Solo 3 Endpoints

```python
# python-agents/main.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Courier Agents", docs_url="/docs")

class OrdersBatch(BaseModel):
    orders: list[dict]
    state: dict
    events: list[dict]

class Decision(BaseModel):
    agent_id: str
    accepted: list[str]
    skipped: list[str]
    earnings_total: float
    reasoning: str
    detailed_reasoning: dict

@app.post("/decide/agent-a", response_model=Decision)
async def decide_agent_a(body: OrdersBatch):
    from agents.agent_a.model import AgentAEconomist
    agent = AgentAEconomist()
    return agent.decide_raw(body.orders, body.state, body.events)

@app.post("/decide/agent-b", response_model=Decision)
async def decide_agent_b(body: OrdersBatch):
    from agents.agent_b.solver import AgentBHustler
    agent = AgentBHustler()
    return agent.decide_raw(body.orders, body.state, body.events)

@app.get("/health")
async def health():
    return {"ok": True}
```

---

## 🌿 Árbol de Commits y Branches v2

```
main  ← 🔒 Protegido, solo merge via PR
│
└── develop
    │
    ├── feat/nextjs-setup             @Adrián
    │   ├── "init: Next.js 14 + Tailwind + shadcn/ui"
    │   ├── "feat: design tokens, dark theme, globals.css"
    │   └── "feat: root layout + Inter font"
    │
    ├── feat/map-component            @Adrián
    │   ├── "feat: Leaflet map Monterrey dark tiles"
    │   ├── "feat: CourierMarker animated component"
    │   ├── "feat: SurgeZone circle overlay"
    │   └── "feat: RoutePolyline for active routes"
    │
    ├── feat/dashboard-ui             @Adrián
    │   ├── "feat: AgentPanel split-screen x3"
    │   ├── "feat: EarningsCounter flip animation"
    │   ├── "feat: OrderCard accept/skip badges"
    │   ├── "feat: EventBanner surge/closure alerts"
    │   └── "feat: ComparisonTable final earnings"
    │
    ├── feat/audit-ui                 @Adrián
    │   ├── "feat: AuditSidebar sliding panel"
    │   └── "feat: ReasoningCard gov/biz/public tiers"
    │
    ├── feat/api-routes               @Patopro
    │   ├── "feat: POST /api/sim/start"
    │   ├── "feat: GET /api/sim/status/[id]"
    │   ├── "feat: POST /api/sim/event/[id]"
    │   ├── "feat: GET /api/audit/[shiftId] tiered"
    │   └── "feat: WebSocket /api/ws (next-ws)"
    │
    ├── feat/simulator-ts             @Patopro
    │   ├── "feat: shift engine TypeScript port"
    │   ├── "feat: order stream generator (MTY zones)"
    │   ├── "feat: events engine (surge/closure/unsafe)"
    │   └── "feat: baseline agent TS"
    │
    ├── feat/db-mongo                 @Patopro
    │   ├── "init: mongoose singleton + Atlas connection"
    │   ├── "feat: Shift + Decision models (Mongoose)"
    │   └── "feat: indexes for audit queries"
    │
    ├── feat/security                 @Patopro
    │   ├── "feat: rate limiter middleware"
    │   └── "feat: audit API key tier auth"
    │
    ├── feat/python-agents            @Patopro
    │   ├── "init: python-agents slim FastAPI"
    │   ├── "feat: Agent A DQN env + train script"
    │   ├── "feat: Agent A weights trained (CPU)"
    │   ├── "feat: Agent B OR-Tools CVRPTW solver"
    │   ├── "feat: Agent B XGBoost scorer trained"
    │   └── "feat: /decide endpoints + health check"
    │
    ├── feat/routing-osrm             @Patopro
    │   ├── "init: OSRM Docker + Monterrey data"
    │   └── "feat: osrmClient.ts wrapper"
    │
    ├── feat/websocket-integration    @Adrián + @Patopro
    │   ├── "feat: useShiftStream hook"
    │   ├── "feat: useShiftControl hook"
    │   └── "feat: real-time map + counter sync"
    │
    ├── feat/deployment               @Hekthor
    │   ├── "chore: Vercel config (next.js)"
    │   ├── "chore: Railway config (python-agents)"
    │   ├── "ci: GitHub Actions (lint + tests)"
    │   └── "docs: .env.example + deployment guide"
    │
    ├── qa/test-suite                 @FBI
    │   ├── "test: API routes unit tests"
    │   ├── "test: simulator TS unit tests"
    │   ├── "test: disaster scenario integration"
    │   └── "test: audit tier access control"
    │
    └── docs/pitch-demo               @Hekthor
        ├── "docs: demo script 3-min"
        └── "docs: pitch deck PDF"

Tags:
  v0.1  ← Sáb 06:00  Agentes corriendo + API Routes OK
  v0.2  ← Sáb 14:00  Demo end-to-end + mapa funcionando
  v0.3  ← Sáb 22:00  Deploy live (Vercel + Railway)
  v1.0  ← Dom 07:00  Submission final 🏁
```

---

## 🔐 Seguridad + Protección de Datos v2

### Middleware global (`src/middleware.ts`)
```typescript
// Rate limiting en todas las rutas /api/*
// Audit tier check en /api/audit/*
// CORS restrictivo en producción
```

### Audit Tiers (sin cambios)
| Tier | Header | Datos visibles |
|------|--------|----------------|
| 🟢 **Public** | ninguno | Earnings, mapa, eventos activos |
| 🟡 **Business** | `X-API-Key: biz_key` | + Reasoning de agentes, historial |
| 🔴 **Gov** | `X-API-Key: gov_key` | + Raw decisions, provenance, token budget = 0 LLM |

### Data Minimization
- **Coordenadas anonimizadas** — nunca PII
- **Prisma queries** — solo lo necesario por tier
- **Python service** — no guarda nada, solo decide
- **No LLMs en prod** — cero llamadas a APIs externas durante el shift

---

## 📅 Timeline v2 — 34 Horas Reales

| Bloque | Hora Real | Duración | Quién | Entregable |
|--------|-----------|----------|-------|------------|
| **0 — Bootstrap** | Vie 22:00–00:00 | 2h | ALL | Repo, Next.js init, Prisma setup, docker OSRM |
| **1 — Simulator TS** | Vie 23:00–Sáb 03:00 | 4h | @Patopro | Order stream, shift engine, events en TypeScript |
| **2 — API Routes** | Sáb 00:00–04:00 | 4h | @Patopro | /sim/start, /ws, /audit — todas funcionando |
| **3 — Python Agents** | Sáb 02:00–06:00 | 4h | @Patopro | DQN train + OR-Tools + XGBoost + /decide endpoints |
| **4 — Frontend Base** | Sáb 00:00–06:00 | 6h | @Adrián | Next.js setup, mapa Leaflet, dark theme, AgentPanel |
| **5 — OSRM Routing** | Sáb 04:00–06:00 | 2h | @Hekthor | Docker OSRM Monterrey, osrmClient.ts |
| **6 — WS Integration** | Sáb 06:00–10:00 | 4h | @Adrián + @Patopro | Real-time hook, mapa live, earnings counter |
| **7 — Full Integration** | Sáb 10:00–16:00 | 6h | ALL | End-to-end demo, disasters, audit sidebar |
| **8 — QA + Bugs** | Sáb 14:00–20:00 | 6h | @FBI | Tests, scenarios, UX fixes |
| **9 — Polish** | Sáb 18:00–22:00 | 4h | @Adrián + @FBI | Animaciones, gráfica comparativa, responsive |
| **10 — Deploy** | Sáb 20:00–22:00 | 2h | @Hekthor | Vercel (Next.js) + Railway (Python) |
| **11 — Rehearsal** | Sáb 22:00–Dom 02:00 | 4h | ALL | Demo cronometrado x3, pitch deck |
| **🔴 Buffer** | Dom 02:00–07:00 | 5h | — | Hotfixes, descanso |

---

## 🌍 Deploy v2 — Vercel + Railway

```
Vercel (gratis)          Railway (gratis)       MongoDB Atlas (gratis)
─────────────────        ─────────────────      ──────────────────────
Next.js App              Python Agent Service   M0 Free Cluster
  /api/sim/*     ──────▶   :8001/decide/a  ◀──  courier-ai DB
  /api/audit/*             :8001/decide/b       Shift collection
  WebSocket                :8001/health         Decision collection
  (conecta a Atlas)
                           OSRM Container
                             :5000/route
```

> [!TIP]
> **MongoDB Atlas setup** (5 min, gratis):
> 1. [mongodb.com/atlas](https://www.mongodb.com/atlas) → Sign up → Create Free Cluster (M0)
> 2. Database Access → Add user (courier_user / password)
> 3. Network Access → Allow from anywhere (0.0.0.0/0) para el hackathon
> 4. Connect → Drivers → Copiar connection string → pegar en `MONGODB_URI`

### Variables de entorno (`.env.local`)
```bash
# MongoDB Atlas — obtener en mongodb.com/atlas → Connect → Drivers
MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/courier-ai"

PYTHON_AGENT_URL="http://localhost:8001"   # Railway URL en prod
OSRM_URL="http://localhost:5000"           # Railway URL en prod
GOV_API_KEY="courier_gov_2026"
BIZ_API_KEY="courier_biz_2026"
NEXT_PUBLIC_WS_URL="ws://localhost:3000"
```

---

## 📊 Judging Criteria — Cómo Ganamos

| Criterio | Nuestra Respuesta |
|----------|------------------|
| **Results** | Delta $ visible en pantalla: Agent A vs B vs Traditional App en tiempo real |
| **Judgment** | Audit panel: juez puede ver el reasoning de cada decisión al instante |
| **Feasibility** | Stack real, deployado en Vercel/Railway, URL pública funcionando |
| **Clarity** | Split-screen + mapa + earnings counter = máxima claridad visual |

---

## 🎨 Diseño Visual

- **Background**: `#0A0E1A` (dark navy)
- **Cards**: `#111827` glassmorphism con `backdrop-blur`
- **Agent A**: `#3B82F6` azul — "The Economist 🧊"
- **Agent B**: `#10B981` verde neón — "The Hustler ⚡"
- **Baseline**: `#6B7280` gris — "Traditional App 📱"
- **Surge zones**: `#F59E0B` amarillo pulsante
- **Road closure**: `#EF4444` rojo
- **Tipografía**: Inter (Google Fonts)
- **Mapa tiles**: CartoDB Dark Matter
