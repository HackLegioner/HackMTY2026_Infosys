# DeliMan — HackMTY 2026 (Infosys Challenge #3)

> **Real-time multi-agent AI courier optimization engine for Monterrey, Mexico.**  
> Compares two competing AI agents (**Agent A: The Economist** and **Agent B: The Hustler**) against a traditional delivery app baseline in a simulated real-world shift with live Monterrey geography, surge pricing, and urban disruption scenarios.

> **[Ver Manual de Uso, Flujo de Navegación & Pitch Playbook (DEMO_GUIDE_AND_MANUAL.md)](./DEMO_GUIDE_AND_MANUAL.md)**

---

## System Architecture

```

                    Next.js 14 App (Port 3000)                       
                                                                     
        
    /app            /api routes     WebSocket / SSE (/api/ws  
    page.tsx        /sim/start      Real-time tick stream     
    audit/page      /sim/status                               
    layout.tsx      /audit                                    
        

                                       HTTP internal
                        
                          Python Agent Service      
                          (Port 8001 — FastAPI slim)
                                                    
                          POST /decide/agent-a      
                          POST /decide/agent-b      
                          GET  /health              
                        
                                      
                    
                             AI Models (Local)          
                      Agent A: DQN (Profit-Density)     
                      Agent B: OR-Tools CVRPTW + XGBoost
                    

  
  MongoDB         OSRM (Docker :5000)    
  (Mongoose)      Monterrey routing      
  
```

---

## Tech Stack

- **Full-Stack Webapp**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui design tokens
- **Database / ODM**: MongoDB (Docker / Atlas) via Mongoose (`Shift`, `Decision` models)
- **Agent Microservice**: FastAPI, Uvicorn, Python 3.11/3.14
- **AI / Optimization Engines**:
  - **Agent A**: DQN (Deep Q-Network) via profit-density reward policy
  - **Agent B**: Google OR-Tools CVRPTW solver + XGBoost candidate scorer
  - **Baseline**: FIFO naive queue (standard delivery app algorithm)
- **Routing**: OSRM (Open Source Routing Machine) with Haversine fallback interpolation
- **Audit & Governance**: 3-tiered provenance engine (`Public`, `Business`, `Gov`) with zero-LLM token footprint

---

## Project Structure

```
HackLegion/
 src/
    app/
       api/
          sim/
             start/route.ts       # POST: initiate simulation shift
             stop/[id]/route.ts   # DELETE: terminate active shift
             status/[id]/route.ts # GET: query shift state (memory/DB)
             event/[id]/route.ts  # POST: trigger surge/disaster
          audit/[shiftId]/route.ts # GET: tiered audit logs
          ws/route.ts              # GET: real-time SSE/WS tick stream
       audit/page.tsx               # Compliance audit & reasoning inspector
       driver/page.tsx              # Fleet operations & driver dispatch console
       globals.css                  # Dark theme design tokens
       layout.tsx                   # App shell
       page.tsx                     # Live tri-agent split-screen demo
    components/
       audit/                       # AuditSidebar, ReasoningCard
       dashboard/                   # AgentPanel, ComparisonTable, EarningsCounter, EventBanner
       map/                         # MapView, LeafletMapInner
    hooks/                           # useShiftStream, useShiftControl
    lib/
       agents/agentClient.ts        # HTTP client for Python microservice
       db/                          # Mongoose connection, ShiftModel, DecisionModel
       routing/osrmClient.ts        # OSRM routing client with fallback
       security/                    # In-memory rate limiter & tiered auth check
       simulator/                   # Shift engine, order generator, crisis events
       types.ts                     # Zod schemas & TypeScript types
    middleware.ts                    # Edge rate limiter & audit header injector
 python-agents/                       # Slim Python microservice (:8001)
    agents/
       agent_a/                     # Economist DQN inference, gym env & training
       agent_b/                     # Hustler OR-Tools CVRPTW solver & XGBoost scorer
    Dockerfile
    main.py                          # FastAPI service entrypoint
    requirements.txt
 docker/osrm/                         # OSRM setup guides & configs
 data/osrm/                           # Monterrey road network graph files
 notebooks/                           # EDA & model development notebooks
 docker-compose.yml                   # Container orchestration (Mongo, Python Agents, OSRM)
 .env.example & .env.local            # Environment configuration
 package.json & next.config.mjs
 DEMO_GUIDE_AND_MANUAL.md             # Official Pitch Playbook & Button Catalog
 HOW_IT_WORKS.md                      # Detailed technical operational guide
```

---

## Quickstart

### 1. Start Docker Infrastructure
```powershell
docker-compose up -d mongo python-agents
```
- MongoDB: `mongodb://localhost:27017/courier-ai`
- Python Agents: `http://localhost:8001` (Docs at `/docs`)

### 2. Start Next.js Full-Stack App
```powershell
$env:Path += ";C:\Program Files\nodejs"
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## Audit Tiers & Governance

| Tier | Header | Accessible Data |
|------|--------|-----------------|
|  **Public** | None | Live earnings, total km, active events, positions |
|  **Business** | `X-API-Key: courier_biz_2026` | + Agent reasoning summaries, acceptance rates |
|  **Gov / Auditor** | `X-API-Key: courier_gov_2026` | + Raw decision payloads, full waypoint provenance |
