from .agent_utilities import llm
import json
from copy import deepcopy


class GuardAgent:

    def __init__(self):
        pass

    def get_agent_response(self, message: str, history: list = []) -> dict:
        history = deepcopy(history)
        raw = llm(
            system_prompt="""You are a helpful AI assistant for Sufra, a Lebanese restaurant.
            Your task is to determine whether the user's message is relevant to the restaurant.

            The user is allowed to:
            1. Ask questions about the restaurant (location, working hours, menu, general info).
            2. Ask about menu items (ingredients, details, pricing).
            3. Make an order.
            4. Ask for recommendations.
            5. Make or ask about a table reservation.
            6. Ask about their previous or past orders.
            7. Ask about dietary restrictions, allergies, or food preferences.

            The user is NOT allowed to:
            1. Ask about anything unrelated to the restaurant.
            2. Ask about staff or how to cook a menu item.
            3. Send rude or offensive messages.

            Respond with JSON only:
            {
            "chain_of_thought": "brief reasoning",
            "decision": "allowed" or "not allowed",
            "message": "" if allowed, otherwise "Sorry, I can't help with that. Can I help you with your order?"
            }""",
            user=message,
            history=history
        )
        try:
            return json.loads(raw)
        except:
            return {"decision": "allowed", "message": ""}


# standalone function used by router_agent
def guard_agent(message: str, history: list = []) -> dict:
    agent = GuardAgent()
    result = agent.get_agent_response(message, history)
    decision = result.get("decision", "allowed")
    if decision == "not allowed":
        return {"classification": "off_topic", "message": result.get("message", "")}
    return {"classification": "allowed"}
