---
name: deliman-operations
description: >-
  Operational runbook, architecture reference, and deployment procedures for DeliMan.
  Use when starting shifts, testing health endpoints, managing cloud deployments on Render,
  operating the 3-tier audit panel, or debugging connection issues.
---

# DeliMan Operations & Demonstration Runbook

## 1. System Architecture Map
- **Frontend / Full-Stack**: Next.js 14 App Router on Port 3000 (Local) or Port 10000 (Render).
- **Cache Layer**: Upstash Serverless Redis (HTTPS REST API). In-memory fallback if unreachable.
- **Primary Database**: MongoDB Atlas (Cluster `courier-cluster`, database `courier-ai`). In-memory fallback if unreachable.
- **Microservices**:
  - Python Agents (:8001): FastAPI service running DQN and OR-Tools solvers.
  - TS Heuristic Engine (Fallback): Built directly into Next.js (`agentClient.ts`).
  - OSRM Routing (:5000): Real Monterrey road network navigation (Túnel de la Loma Larga corridor).
  - Open-Meteo: Live weather data for Monterrey coordinates (`25.6692, -100.3099`).

## 2. Health Verification Command
Always verify system health before presentations:
```bash
curl http://localhost:3000/api/health
# or
curl https://deliman-app.onrender.com/api/health
```
Expected response: HTTP 200 with `status: "healthy"`, `mongo_db: "ok"`, and `upstash_redis: "ok"`.

## 3. Demo Flow & Presentation Checklist
1. **Arena (`/`)**:
   - Click "Iniciar Turno".
   - Inject disruptions: Click "Lluvia Torrencial" or "Cierre Vial Constitución".
   - Observe Agent A avoiding hazards and Agent B capturing surge while Baseline naively degrades.
   - Click "Instantáneo" to conclude the 480-minute shift.
2. **Fleet Operations (`/driver`)**:
   - Inspect active courier status and telemetry.
   - Click "Exportar Reporte de Turno (JSON)" to download the raw operations log.
3. **Compliance & Audit (`/audit`)**:
   - Ensure target shift ID is loaded (shows "Verificado en Atlas Cloud").
   - Click **[ Público ]**: Shows decision counts and labor fairness overview.
   - Click **[ Empresarial ]**: Injects `courier_biz_2026`, reveals natural-language dispatch reasons.
   - Click **[ Auditor Gob ]**: Injects `courier_gov_2026`, reveals raw cryptographic/algorithmic payloads.

## 4. Troubleshooting Runbook
- **502 Bad Gateway on Render**:
  - Check if `next start` has `-H 0.0.0.0`.
  - Ensure `HOSTNAME="0.0.0.0"` is defined in `render.yaml`.
  - Verify background timers are cleaned up in `shift.ts` to prevent OOM.
- **MongoDB Atlas Degraded / In-Memory Active**:
  - Log in to cloud.mongodb.com -> Network Access -> IP Access List -> Ensure `0.0.0.0/0` is Active.
