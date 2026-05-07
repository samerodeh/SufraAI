from .agent_utilities import llm_json
from copy import deepcopy

from .dietary_agent import dietary_agent
from .guard_agent import guard_agent
from .order_agent import order_agent
from .order_history_agent import order_history_agent
from .reservation_agent import reservation_agent
from .menu_agent import menu_agent
from .recommendation_agent import recommendation_agent


class RouterAgent:

    def __init__(self):
        pass

    def get_router_agent_response(self, message: str, history: list = [], user_id: str = "guest") -> str:
        history = deepcopy(history)

        guard_result = guard_agent(message, history)
        if guard_result.get("classification") == "off_topic":
            return guard_result.get("message", "Sorry, I can't help with that.")

        result = llm_json(
            system_prompt="""You are a router for Sufra, a Lebanese restaurant chatbot.

                Determine which agent should handle the user's message. Choose from:

                1. menu_agent: Questions about menu items, ingredients, prices, restaurant location, working hours, or general restaurant info.
                2. order_agent: The user wants to place, modify, or confirm an order.
                3. recommendation_agent: The user asks for recommendations or suggestions on what to eat.
                4. reservation_agent: The user wants to make a table reservation.
                5. dietary_agent: The user asks about dietary restrictions, allergies, halal, vegan, or specific food preferences.
                6. order_history_agent: The user asks about their previous or past orders.

                Respond with JSON only:
                {
                    "chain_of_thought": "brief reasoning about which agent fits",
                    "decision": "menu_agent" or "order_agent" or "recommendation_agent" or "reservation_agent" or "dietary_agent" or "order_history_agent"
                }""",
            user=message,
            history=history,
            fallback={"decision": "menu_agent"}
        )

        decision = result.get("decision", "menu_agent")

        if decision == "order_agent":
            return order_agent(message, history, user_id)
        elif decision == "recommendation_agent":
            return recommendation_agent(message, history, user_id)
        elif decision == "reservation_agent":
            return reservation_agent(message, history, user_id)
        elif decision == "dietary_agent":
            return dietary_agent(message, history, user_id)
        elif decision == "order_history_agent":
            return order_history_agent(message, user_id)
        else:
            return menu_agent(message, history, user_id)


def router_agent(message: str, history: list = [], user_id: str = "guest") -> str:
    return RouterAgent().get_router_agent_response(message, history, user_id)

router = router_agent
