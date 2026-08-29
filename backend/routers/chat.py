# files imports
from schemas.llm_reponse import llm_response
from rag import query_menu, query_faq
# fastapi imports
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from agents import classify_only, list_agents, router_with_trace
# other imports
import json
import os
from groq import Groq
from dotenv import load_dotenv


router = APIRouter(tags=["chat"])


@router.post("/chat")
def chat(body: llm_response):
    """Run the full multi-agent pipeline and return the reply plus its routing trace."""
    result = router_with_trace(body.message, body.history, body.user_id)
    return {"response": result["response"], "routing": result["routing"]}


@router.post("/chat/route")
def chat_route(body: llm_response):
    """Classify a message without calling the specialist — useful for debugging routing."""
    return classify_only(body.message, body.history, body.user_id).to_dict()


@router.get("/chat/agents")
def chat_agents():
    """The agent registry the router chooses from."""
    return [
        {"name": spec.name, "purpose": spec.purpose, "examples": spec.examples}
        for spec in list_agents()
    ]


@router.post("/chat/stream")
async def chat_stream(body: llm_response):
    """SSE streaming endpoint — streams the response token by token."""
    load_dotenv()
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    menu_results = query_menu(body.message)
    faq_results = query_faq(body.message)
    context = "\n".join([*menu_results, *faq_results])

    messages = [
        {
            "role": "system",
            "content": f"""You are Sufra's friendly restaurant assistant.
Answer the customer's question using ONLY the context below.
If the answer isn't in the context, say you don't know and suggest they call us.
Be concise, warm, and helpful. Do not make up menu items or prices.

{context}"""
        },
        *body.history,
        {"role": "user", "content": body.message}
    ]

    def generate():
        stream = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            messages=messages,
            stream=True
        )
        for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
