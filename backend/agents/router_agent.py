# ---------- imports ----------
from httpx import Response
from .agent_utilities import llm, localize, detect_language
import json
from data_store import get_user_profile

# ------- import agents ------------
from .dietary_agent import dietary_agent
from .guard_agent import guard_agent
from .order_agent import order_agent
from .order_history_agent import order_history_agent
from .reservation_agent import reservation_agent
from .menu_agent import menu_agent
from .recommendation_agent import recommendation_agent


class RouterAgent: 

    def __init__():
        pass    


    def get_router_agent_response():


        response = llm(
            system_prompt = """
            You are a helpful AI assistant for a sufra restaraunt application.

            Your task is to determine what agent should handle the user input. You have 3 agents to choose from:

            1. details_agent: This agent is responsible for answering questions about the coffee shop, like location, delivery places, working hours, details about menu items.
            2. order_taking_agent: This agent is responsible for taking orders from the user. It's responsible to have a conversation with the user about the order until the order is complete.
            3. recommendation_agent: This agent is responsible for giving recommendations to the user about what to buy. If the user asks for a recommendation, this agent should handle it.

            Your output should be in a structured json format like so. each key is a string and each value is a string. Make sure to follow the format exactly:

            {
            "chain of thought": go over each of the agents above and write some of your thoughts about what agent is this input relevant to.
            "decision": "details_agent" or "order_taking_agent" or "recommendation_agent". Pick one of those. and only write the word.
            "message": leave the message empty.
            }
            """  
        )  