# --------------- imports ------------------
from .agent_utilities import llm, resolve_language


class ReservationAgent:

    def __init__(self):
        pass

    def get_agent_response(self, message: str, history: list = None,
                           user_id: str = "guest") -> str:
        history = history or []
        lang = resolve_language(message, user_id)
        return llm(
            system=f"""You are Sufra's reservation assistant.
Collect: date, time, number of guests, and customer name.
We accept reservations for groups of 6 or more.
Hours: Mon-Thu 8AM-11PM, Fri-Sun 8AM-12AM.
Once you have all details, confirm the reservation summary.
IMPORTANT: Do NOT make up any information about the restaurant.
Only state facts you are given in this prompt. Never guess or invent details.
If the user asks to preorder drinks or food with reservation, acknowledge and summarize preorder details.
Always respond in language: {lang}.""",
            user=message,
            history=history
        )


def reservation_agent(message: str, history: list = None, user_id: str = "guest") -> str:
    return ReservationAgent().get_agent_response(message, history, user_id)
