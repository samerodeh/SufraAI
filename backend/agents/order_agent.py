# --------------- imports ------------------
from .agent_utilities import llm
from rag import query_menu
import json
import os
from data_store import get_user_profile
from db.orders_db import add_order_to_db

_MENU_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "menu.json")

with open(_MENU_FILE, "r", encoding="utf-8") as f:
    _MENU_ITEMS = json.load(f)

_MENU_TEXT = "\n".join([
    f"- {item['name_en']} (id: {item['id']}, price: ${item['price']}, available: {item['available']})"
    for item in _MENU_ITEMS
])


class OrderAgent:

    def __init__(self):
        pass

    def get_agent_response(self, message: str, history: list = [], user_id: str = "guest") -> str:
        user_messages = [m["content"] for m in history if m.get("role") == "user"]
        query = message if len(message.split()) > 2 else " ".join(user_messages[-3:] + [message])
        menu_results = query_menu(query)
        profile = get_user_profile(user_id)
        dietary = profile.get("dietaryProfile", {})
        context = "\n".join(menu_results)

        confirmation_check = llm(
            system_prompt="""You are detecting if a customer is confirming their final order.
Respond with JSON only: {"confirmed": true, "items": [{"itemId": "...", "name": "...", "quantity": 1, "price": 0.0}]}
If not confirmed yet, respond: {"confirmed": false, "items": []}
Only set confirmed=true if the user clearly says yes/confirm/place order/go ahead.""",
            user=message,
            history=history
        )

        try:
            answer = json.loads(confirmation_check)
        except:
            answer = {"confirmed": False, "items": []}

        if answer.get("confirmed") and answer.get("items"):
            add_order_to_db(user_id, answer["items"])
            return "Your order has been placed! We'll start preparing it shortly."

        return llm(
            system_prompt=f"""You are Sufra's order assistant. Help the customer place their order.
Dietary profile: {json.dumps(dietary, ensure_ascii=False)}

FULL MENU (only these items exist — do not accept or suggest anything not listed here):
{_MENU_TEXT}

Relevant details for the current request:
{context}

Rules:
- If the requested item is NOT in the full menu, clearly say it's not available and suggest a similar item that IS in the menu.
- If the item is listed but available: false, say it's currently sold out.
- Confirm item name and quantity before asking the customer to confirm the order.
- Keep replies brief — one sentence maximum.""",
            user=message,
            history=history
        )


def order_agent(message: str, history: list = [], user_id: str = "guest") -> str:
    return OrderAgent().get_agent_response(message, history, user_id)
