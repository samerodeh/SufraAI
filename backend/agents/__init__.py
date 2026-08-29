"""SufraAI multi-agent package.

`router` is the single entry point used by the API and the CLI; the individual
agents are exported too so they can be exercised in isolation.
"""
from .router_agent import (
    AGENT_REGISTRY,
    AgentSpec,
    RouteDecision,
    RouterAgent,
    classify_only,
    heuristic_route,
    list_agents,
    router,
    router_with_trace,
    score_agents,
)

from .dietary_agent import DietaryAgent, dietary_agent
from .guard_agent import GuardAgent, guard_agent
from .menu_agent import MenuAgent, menu_agent
from .order_agent import OrderAgent, order_agent
from .order_history_agent import OrderHistoryAgent, order_history_agent
from .recommendation_agent import RecommendationAgent, recommendation_agent
from .reservation_agent import ReservationAgent, reservation_agent

__all__ = [
    "AGENT_REGISTRY",
    "AgentSpec",
    "RouteDecision",
    "RouterAgent",
    "classify_only",
    "heuristic_route",
    "list_agents",
    "router",
    "router_with_trace",
    "score_agents",
    "DietaryAgent", "dietary_agent",
    "GuardAgent", "guard_agent",
    "MenuAgent", "menu_agent",
    "OrderAgent", "order_agent",
    "OrderHistoryAgent", "order_history_agent",
    "RecommendationAgent", "recommendation_agent",
    "ReservationAgent", "reservation_agent",
]
