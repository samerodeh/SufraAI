# --------------- imports ------------------
from .agent_utilities import llm, detect_language
import json
from rag import query_menu, query_faq
from data_store import get_user_profile


class MenuAgent:

    def __init__(self):
        pass

    def get_agent_response(self, message: str, history: list = [], user_id: str = "guest") -> str:
        menu_results = query_menu(message)
        faq_results = query_faq(message)
        profile = get_user_profile(user_id)
        lang = profile.get("languagePreference", "auto")
        if lang == "auto":
            lang = detect_language(message)
        dietary = profile.get("dietaryProfile", {})
        context = "\n".join([*menu_results, *faq_results])
        return llm(
            system=f"""You are Sufra's menu expert. Answer using ONLY this data.
User language: {lang}
User dietary profile: {json.dumps(dietary, ensure_ascii=False)}
If requested item is unavailable, suggest alternatives.
Data:
{context}
Be concise and friendly. Don't make up items or prices.
Always respond in language: {lang}.""",
            user=message,
            history=history
        )


def menu_agent(message: str, history: list = [], user_id: str = "guest") -> str:
    return MenuAgent().get_agent_response(message, history, user_id)
