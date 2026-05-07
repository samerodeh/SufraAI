# --------------- imports ------------------
from .agent_utilities import localize, detect_language
from data_store import get_user_profile, get_order_history


class OrderHistoryAgent:

    def __init__(self):
        pass

    def get_agent_response(self, message: str, user_id: str = "guest") -> str:
        profile = get_user_profile(user_id)
        lang = profile.get("languagePreference", "auto")
        if lang == "auto":
            lang = detect_language(message)
        history = get_order_history(user_id)
        if not history:
            return localize("No previous orders found yet.", "لا يوجد سجل طلبات سابق حتى الآن.", lang)

        first = history[0]
        names = []
        for item in first.get("items", []):
            label = item.get("name") or item.get("itemId") or "item"
            names.append(f"{label} x{item.get('quantity', 1)}")
        prefix = localize("Your last order was", "آخر طلب لك كان", lang)
        return f"{prefix}: {', '.join(names)}."


def order_history_agent(message: str, user_id: str = "guest") -> str:
    return OrderHistoryAgent().get_agent_response(message, user_id)
