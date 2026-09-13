# DeliMan Project Invariants & Behavioral Guardrails

> **Project**: DeliMan — Real-Time Multi-Agent AI Courier Optimization Engine for Monterrey, Mexico  
> **Challenge**: HackMTY 2026 (Infosys Challenge #3)  
> **Owner/Lead**: Pato  

## 1. Brand Identity & Naming Invariants
- The application name is **DeliMan**. Never revert to "The Courier", "Devolada", or other legacy working names in user-facing UI, metadata, or documentation.
- Speed controls use **"Instantáneo"** (never "Devolada").
- The three agents are:
  1. **Agent A: The Economist** (DQN RL policy, $/km margin maximization, hazard/flood avoidance).
  2. **Agent B: The Hustler** (Google OR-Tools CVRPTW + XGBoost candidate scorer, multi-drop batching, surge hunter).
  3. **Baseline: Traditional App Baseline** (Naive FIFO queue).

## 2. Zero-LLM Architecture Invariant
- Real-time order dispatching and routing MUST strictly use deterministic mathematical solvers and reinforcement learning policies (DQN / OR-Tools).
- NEVER introduce external LLM calls (e.g. OpenAI/Anthropic/Gemini) into the live tick dispatch loop. Real-time dispatch requires sub-second latency and zero token costs. Explicability is achieved through deterministic rule templates and provenance records.

## 3. Protected Files & Assets (DO NOT DELETE)
The following files are essential for cloud deployment, local simulation, branding, and credentials. Under no circumstances should they be removed or overwritten with empty stubs:
- `.env.local`: Contains local credentials for MongoDB Atlas Cloud, Upstash Redis, and Gov/Biz security keys. (Must remain gitignored).
- `render.yaml`: Cloud deployment Blueprint for Render.com.
- `.node-version`: Specifies Node 20.18.0 for cloud build environments.
- `Dockerfile` & `.dockerignore`: Multi-stage standalone Next.js container build.
- `docker-compose.yml`: Orchestrates local Python agents (:8001), OSRM (:5000), and Mongo (:27017).
- `public/logo.svg`, `public/icon.svg`, `public/favicon.svg`: Official brand vector assets.
- `src/lib/agents/agentClient.ts`: Contains the autonomous TypeScript heuristic fallback engine that enables 100% uptime when external microservices are offline.
- `src/lib/security/redisClient.ts` & `src/lib/db/mongoose.ts`: Contain in-memory fallback stores that prevent the app from crashing if Redis or MongoDB drops.
- `DEMO_GUIDE_AND_MANUAL.md` & `HOW_IT_WORKS.md`: Pitch playbooks and core technical references.

## 4. Server & Cloud Configuration Invariants
- **Host Binding**: Next.js production server MUST always bind to `0.0.0.0` (e.g. `next start -H 0.0.0.0`). Never bind strictly to `127.0.0.1` / `localhost` as Render reverse proxy will fail with a 502 Bad Gateway.
- **Resource Protection (512MB RAM)**:
  - Only ONE active simulation shift can run in server RAM at any time. Any new shift must stop and clean up previous shifts in `getOrCreateShift()`.
  - Frontend polling (`/api/sim/status`) MUST be suppressed while the SSE stream (`/api/ws`) is active to avoid saturating server event loops.
- **Safe JSON Parsing**: All client-side fetch calls to `/api/` must verify `Content-Type: application/json` before calling `res.json()` to avoid crashing on HTML 502/503 responses.
- **MongoDB Atlas Access**: Network Access in MongoDB Atlas must include `0.0.0.0/0` (Allow Access from Anywhere) for Render dynamic IPs to connect.
