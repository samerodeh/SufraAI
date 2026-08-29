"""Order-taking specialist: walks the customer to a confirmed order."""
import json

from data_store import create_order, get_user_profile
from rag import query_menu

from .agent_utilities import get_menu_items, llm, parse_json, resolve_language


def _menu_text() -> str:
    return "\n".join(
        f"- {item['name_en']} (id: {item['id']}, price: ${item['price']}, "
        f"available: {item['available']})"
        for item in get_menu_items()
    )


def _validate_items(raw_items: list) -> list:
    """Only let real, in-stock menu items reach the database.

    The confirmation step is driven by an LLM, so item ids and prices are
    re-resolved from menu.json instead of being trusted as returned.
    """
    menu = get_menu_items()
    by_id = {item["id"]: item for item in menu}
    by_name = {item["name_en"].lower(): item for item in menu}

    validated = []
    for entry in raw_items or []:
        if not isinstance(entry, dict):
            continue
        item = by_id.get(str(entry.get("itemId", "")).strip())
        if item is None:
            item = by_name.get(str(entry.get("name", "")).strip().lower())
        if item is None or not item.get("available", True):
            continue
        try:
            quantity = int(entry.get("quantity", 1))
        except (TypeError, ValueError):
            quantity = 1
        validated.append({
            "itemId": item["id"],
            "name": item["name_en"],
            "quantity": max(1, quantity),
            "price": item["price"],
        })
    return validated


class OrderAgent:

    def __init__(self):
        pass

    def get_agent_response(self, message: str, history: list = None,
                           user_id: str = "guest") -> str:
        history = history or []
        # Short messages ("yes", "two please") need the recent turns for context.
        user_messages = [m["content"] for m in history if m.get("role") == "user"]
        query = message if len(message.split()) > 2 else " ".join(user_messages[-3:] + [message])
        context = "\n".join(query_menu(query))

        lang = resolve_language(message, user_id)
        dietary = get_user_profile(user_id).get("dietaryProfile", {})

        confirmation = parse_json(
            llm(
                system="""You detect whether a customer is confirming their final order.
Respond with JSON only:
{"confirmed": true, "items": [{"itemId": "...", "name": "...", "quantity": 1}]}
If the order is not confirmed yet, respond: {"confirmed": false, "items": []}
Only set confirmed=true if the user clearly says yes / confirm / place the order / go ahead,
AND the items being confirmed are visible in the conversation.""",
                user=message,
                history=history,
                temperature=0.0,
            ),
            default={"confirmed": False, "items": []},
        )

        if confirmation.get("confirmed"):
            items = _validate_items(confirmation.get("items", []))
            if items:
                order = create_order({
                    "userId": user_id,
                    "items": items,
                    "source": "chatbot",
                })
                summary = ", ".join(f"{i['name']} x{i['quantity']}" for i in items)
                total = sum(i["price"] * i["quantity"] for i in items)
                if lang == "ar":
                    return (
                        "تم تأكيد طلبك "
                        f"({order['orderId']}): {summary}. "
                        f"الإجمالي ${total:.2f}."
                    )
                return (
                    f"Your order is confirmed ({order['orderId']}): {summary}. "
                    f"Total ${total:.2f}. We'll start preparing it shortly."
                )

        return llm(
            system=f"""You are Sufra's order assistant. Help the customer place their order.
Language: {lang}
Dietary profile: {json.dumps(dietary, ensure_ascii=False)}

FULL MENU (only these items exist — do not accept or suggest anything not listed here):
{_menu_text()}

Relevant details for the current request:
{context}

Rules:
- If the requested item is NOT in the full menu, clearly say it's not available and suggest a
  similar item that IS in the menu.
- If the item is listed but available: false, say it's currently sold out.
- Confirm item name and quantity, then ask the customer to confirm the order.
- Keep replies brief — one or two sentences.
- Always respond in language: {lang}.""",
            user=message,
            history=history,
        )


def order_agent(message: str, history: list = None, user_id: str = "guest") -> str:
    return OrderAgent().get_agent_response(message, history, user_id)
