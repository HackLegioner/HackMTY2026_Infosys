from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import os

app = FastAPI(title="Courier Agents Service", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OrdersBatch(BaseModel):
    orders: List[Dict[str, Any]] = Field(default_factory=list)
    state: Dict[str, Any] = Field(default_factory=dict)
    events: List[Dict[str, Any]] = Field(default_factory=list)

class Decision(BaseModel):
    agent_id: str
    accepted: List[str]
    skipped: List[str]
    earnings_total: float
    reasoning: str
    detailed_reasoning: Dict[str, Any] = Field(default_factory=dict)

@app.get("/health")
async def health():
    return {"ok": True, "service": "courier-python-agents"}

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
