# --------------- imports ------------------
from data_store import get_order_history


class OrderHistoryAgent:

    def __init__(self):
        pass

    def get_agent_response(self, message: str, user_id: str = "guest") -> str:
        history = get_order_history(user_id)
        if not history:
            return "No previous orders found yet."

        first = history[0]
        names = []
        for item in first.get("items", []):
            label = item.get("name") or item.get("itemId") or "item"
            names.append(f"{label} x{item.get('quantity', 1)}")
        return f"Your last order was: {', '.join(names)}."


def order_history_agent(message: str, user_id: str = "guest") -> str:
    return OrderHistoryAgent().get_agent_response(message, user_id)
