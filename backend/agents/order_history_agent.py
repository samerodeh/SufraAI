"""Answers questions about the customer's past orders."""
from data_store import get_order_history

from .agent_utilities import localize, resolve_language


class OrderHistoryAgent:

    def __init__(self):
        pass

    def get_agent_response(self, message: str, user_id: str = "guest") -> str:
        lang = resolve_language(message, user_id)
        orders = get_order_history(user_id)
        if not orders:
            return localize(
                "No previous orders found yet.",
                "لا يوجد سجل طلبات سابق حتى الآن.",
                lang,
            )

        last = orders[0]
        names = []
        for item in last.get("items", []):
            label = item.get("name") or item.get("itemId") or "item"
            names.append(f"{label} x{item.get('quantity', 1)}")
        summary = ", ".join(names) if names else localize("no items", "لا توجد أصناف", lang)
        prefix = localize("Your last order was", "آخر طلب لك كان", lang)
        tail = localize(
            f" You have {len(orders)} order(s) in total.",
            f" لديك {len(orders)} طلب في المجمل.",
            lang,
        )
        return f"{prefix}: {summary}.{tail}"


def order_history_agent(message: str, user_id: str = "guest") -> str:
    return OrderHistoryAgent().get_agent_response(message, user_id)
