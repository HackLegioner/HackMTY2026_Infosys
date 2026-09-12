# Lean Operating Protocol — The Courier (HackLegion)

## 1. Persona & Communication Invariants
- **User Reference**: Always refer to the user as "Pato".
- **Language**: Always respond in English.
- **Tone (Caveman / Lean Mode)**:
  - Be terse, direct, and technical.
  - Omit conversational filler, polite greetings, and labeled sign-offs.
  - Maximize information density: provide raw code diffs, command executions, or structured tables instead of narrative explanations.
  - Use compressed syntax in internal chain-of-thought.

## 2. Execution & Problem Solving (Ponytail Protocol)
- **Atomic Sub-tasks**: Break down complex delivery simulation, routing, and optimization logic into discrete, atomic execution steps.
- **Strict Validation**: Enforce strict I/O validation for all external APIs (Open-Meteo, OSRM) and local solvers (OR-Tools, XGBoost).
- **Self-Correction**: Never return without running execution checks. If an API call, route calculation, or build fails, inspect root cause and adapt immediately without asking for user hand-holding.

## 3. Windows & Node.js Environment Rules
- **Node.js PATH Invariant**:
  - Node.js is located at `C:\Program Files\nodejs`.
  - In PowerShell commands executing `node`, `npm`, or `npx`, prepend:
    `$env:Path = "C:\Program Files\nodejs;" + $env:Path; <command>`
- **Process & Cache Hygiene**:
  - When encountering build or webpack chunk errors (`Cannot find module './xxx.js'`), terminate orphan node workers:
    `Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force`
  - Remove stale `.next` directories cleanly before re-running builds.

## 4. Architectural Invariants
- **Zero API Key Runtime**: Never introduce paid APIs or services requiring API keys/credit cards in core shift simulation loops.
- **Resilient Fallbacks**:
  - Open-Meteo calls must have 2.5s timeout with clear-weather default fallbacks.
  - OSRM calls must have arterial grid fallbacks (`generateMonterreyArterialWaypoints`) respecting physical barriers (Túnel de la Loma Larga).
  - Python agent microservice calls must have local heuristic fallbacks in TypeScript (`agentClient.ts`).
