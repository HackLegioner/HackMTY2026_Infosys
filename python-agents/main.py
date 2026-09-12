from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Dict, Any

app = FastAPI(title="Courier Agents Service", docs_url="/docs")

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
    uvicorn.run(app, host="0.0.0.0", port=8001)
