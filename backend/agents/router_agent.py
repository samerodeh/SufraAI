"""SufraAI router — the entry point of the multi-agent architecture.

Every customer message goes through three stages:

    1. GuardAgent      safety / scope filter. Off-topic or abusive messages are
                       answered here and never reach a specialist.
    2. Classification  an LLM classifier picks one specialist. Its output is
                       validated against the agent registry, and a deterministic
                       keyword scorer acts as the fallback whenever the model is
                       unavailable, rate limited, or returns something unknown.
    3. Dispatch        the chosen specialist answers, with the conversation
                       history and the user's profile.

The router returns a full trace (guard verdict, chosen agent, which stage chose
it, confidence, reasoning) so the CLI and the API can show *why* a message was
routed the way it was.
"""
import re
from dataclasses import asdict, dataclass, field
from typing import Any, Callable, Dict, List, Optional

from .agent_utilities import (
    LLMUnavailable,
    llm_available,
    llm_json,
    localize,
    resolve_language,
)
from .dietary_agent import dietary_agent
from .guard_agent import guard_agent
from .menu_agent import menu_agent
from .order_agent import order_agent
from .order_history_agent import order_history_agent
from .recommendation_agent import recommendation_agent
from .reservation_agent import reservation_agent


@dataclass
class AgentSpec:
    """One specialist in the registry."""
    name: str
    purpose: str
    handler: Callable[..., str]
    keywords: List[str] = field(default_factory=list)
    strong_keywords: List[str] = field(default_factory=list)
    examples: List[str] = field(default_factory=list)


# Handler signatures differ slightly, so each spec adapts to (message, history, user_id).
AGENT_REGISTRY: Dict[str, AgentSpec] = {
    "menu_agent": AgentSpec(
        name="menu_agent",
        purpose=(
            "Questions about the restaurant itself and about menu items: opening hours, "
            "location, delivery, prices, ingredients, what a dish is, whether something "
            "is in stock."
        ),
        handler=lambda message, history, user_id: menu_agent(message, history, user_id),
        keywords=[
            "menu", "price", "cost", "how much", "ingredient", "ingredients", "contain",
            "open", "hours", "location", "address", "delivery", "deliver", "what is",
            "tell me about", "available", "serve",
            "قائمة", "سعر", "مكونات",
            "عنوان", "دوام", "توصيل",
            "ساعات", "أوقات", "الأسعار",
        ],
        strong_keywords=[
            "opening hours", "what time do you open", "what time do you close",
            "where are you located", "do you deliver", "how much is", "how much does",
        ],
        examples=[
            "What time do you close on Friday?",
            "How much is the falafel wrap?",
            "What's in the fattoush?",
        ],
    ),
    "order_agent": AgentSpec(
        name="order_agent",
        purpose=(
            "The customer wants to place, change, add to, or confirm an order right now. "
            "Anything with quantities of items they want to buy."
        ),
        handler=lambda message, history, user_id: order_agent(message, history, user_id),
        keywords=[
            "order", "buy", "get me", "give me", "i want", "i'd like", "i would like",
            "can i get", "i'll have", "add", "takeaway", "take away",
            "checkout", "cart", "confirm", "place",
            "اطلب", "بدي", "اضف", "أكد",
        ],
        strong_keywords=[
            "i want to order", "can i order", "place my order", "add to my order",
            "confirm my order", "i'll take", "i would like to order", "i'd like",
            "can i get", "i'll have",
        ],
        examples=[
            "I'd like two zaatar manaeesh please",
            "Add a lemonade to that",
            "Yes, confirm my order",
        ],
    ),
    "recommendation_agent": AgentSpec(
        name="recommendation_agent",
        purpose=(
            "The customer wants a suggestion: what is good, what is popular, what pairs "
            "with something they already picked, what they should try."
        ),
        handler=lambda message, history, user_id: recommendation_agent(message, history, user_id),
        keywords=[
            "recommend", "recommends", "recommendation", "recommendations", "suggest",
            "suggestion", "suggestions", "popular", "best", "what should", "goes well",
            "pair", "pairs", "favourite", "favorite", "try",
            "انصحني", "اقترح",
            "أفضل", "مشهور",
        ],
        strong_keywords=[
            "what do you recommend", "what's popular", "whats popular",
            "what should i try", "what goes well with", "any recommendations",
        ],
        examples=[
            "What do you recommend with hummus?",
            "What's your most popular dish?",
        ],
    ),
    "reservation_agent": AgentSpec(
        name="reservation_agent",
        purpose=(
            "The customer wants to book, change, or ask about a table reservation — "
            "dates, times, party size, booking for a group."
        ),
        handler=lambda message, history, user_id: reservation_agent(message, history, user_id),
        keywords=[
            "reserve", "reservation", "reservations", "book", "booking", "table",
            "seats", "party of", "guests",
            "حجز", "احجز", "طاولة",
        ],
        strong_keywords=[
            "book a table", "make a reservation", "reserve a table", "table for",
            "party of",
        ],
        examples=[
            "Can I book a table for 8 on Saturday at 7pm?",
            "I need a reservation for a party of 10",
        ],
    ),
    "dietary_agent": AgentSpec(
        name="dietary_agent",
        purpose=(
            "Allergies, intolerances, and diet constraints: vegan, vegetarian, halal, "
            "gluten free, nut allergy, dairy free, 'is this safe for me'."
        ),
        handler=lambda message, history, user_id: dietary_agent(message, history, user_id),
        keywords=[
            "allergy", "allergies", "allergic", "allergen", "allergens", "gluten",
            "vegan", "vegetarian", "halal", "dairy", "lactose", "nut", "nuts", "peanut",
            "sesame", "intolerant", "intolerance", "diet", "dietary", "celiac", "coeliac",
            "حساسية", "نباتي",
            "حلال", "غلوتين",
        ],
        strong_keywords=[
            "i'm allergic", "im allergic", "gluten free", "dairy free", "nut allergy",
            "is it vegan", "is it halal", "safe for me",
        ],
        examples=[
            "I'm allergic to sesame, what can I eat?",
            "Which dishes are gluten free?",
        ],
    ),
    "order_history_agent": AgentSpec(
        name="order_history_agent",
        purpose=(
            "Questions about the customer's PAST orders: what did I order last time, "
            "my usual, my order history, reorder the same thing."
        ),
        handler=lambda message, history, user_id: order_history_agent(message, user_id),
        keywords=[
            "last order", "previous order", "order history", "my usual", "the usual",
            "reorder", "what did i order", "past orders", "before",
            "طلبي السابق",
            "آخر طلب", "المعتاد",
        ],
        strong_keywords=[
            "my last order", "what did i order", "order history", "my usual",
            "reorder", "previous orders", "same as last time",
        ],
        examples=[
            "What did I order last time?",
            "Show me my order history",
        ],
    ),
}

DEFAULT_AGENT = "menu_agent"

_ROUTER_SYSTEM_PROMPT = (
    "You are the router for SufraAI, the assistant of a Lebanese restaurant called Sufra.\n"
    "Read the customer's message (and the conversation so far) and decide which ONE "
    "specialist agent should answer it.\n\n"
    "Available agents:\n"
    + "\n".join(
        f"{idx}. {spec.name}: {spec.purpose}\n   Examples: " + " | ".join(spec.examples)
        for idx, spec in enumerate(AGENT_REGISTRY.values(), start=1)
    )
    + "\n\nTie-breakers:\n"
    "- An allergy or diet constraint is mentioned -> dietary_agent, even if an item is named.\n"
    "- Asking about a PAST order -> order_history_agent, not order_agent.\n"
    "- Booking a table -> reservation_agent, even if food is preordered in the same message.\n"
    "- Asking for a suggestion -> recommendation_agent, even if they may order afterwards.\n"
    "- A plain question about an item, a price, or the restaurant -> menu_agent.\n"
    "- If the message continues an order already in progress, stay with order_agent.\n\n"
    "Reply with JSON only, no prose, exactly this shape:\n"
    '{"chain_of_thought": "one short sentence", '
    '"decision": "<one agent name from the list above>", '
    '"confidence": 0.0}'
)


@dataclass
class RouteDecision:
    """Everything the router worked out about a message."""
    message: str
    agent: str
    stage: str                    # guard | llm | heuristic | fallback
    confidence: float
    reasoning: str
    blocked: bool = False
    guard_message: str = ""
    heuristic_agent: Optional[str] = None
    heuristic_scores: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _normalize(text: str) -> str:
    # Curly apostrophes are folded to straight ones so "I’d like" and "I'd like"
    # score identically no matter which keyboard the customer used.
    text = (text or "").lower().replace("’", "'").replace("ʼ", "'")
    return re.sub(r"\s+", " ", text).strip()


def score_agents(message: str) -> Dict[str, float]:
    """Deterministic keyword scoring — the router's offline safety net.

    Multi-word phrases score higher than single words, and whole-word matching
    keeps 'nut' from firing inside 'minute'.
    """
    text = _normalize(message)
    scores: Dict[str, float] = {}
    for name, spec in AGENT_REGISTRY.items():
        score = 0.0
        for phrase in spec.strong_keywords:
            if phrase in text:
                score += 3.0
        for word in spec.keywords:
            if " " in word:
                if word in text:
                    score += 1.5
            elif re.search(rf"(?<!\w){re.escape(word)}(?!\w)", text):
                score += 1.0
        if score:
            scores[name] = round(score, 2)
    return scores


# Safety first: an allergy or diet constraint outranks the ordering / menu /
# recommendation flows, because answering an allergen question from the order
# agent could genuinely harm someone. The LLM classifier is told the same rule.
_YIELDS_TO_DIETARY = {"order_agent", "menu_agent", "recommendation_agent"}


def heuristic_route(message: str):
    """Return (best_agent_or_None, scores)."""
    scores = score_agents(message)
    if not scores:
        return None, scores
    best = max(scores, key=scores.get)
    if "dietary_agent" in scores and best in _YIELDS_TO_DIETARY:
        return "dietary_agent", scores
    return best, scores


class RouterAgent:
    """Guard -> classify -> dispatch."""

    def __init__(self, use_guard: bool = True):
        self.use_guard = use_guard

    # ---------- stage 1: guard ----------
    def run_guard(self, message: str, history: List[dict]) -> dict:
        if not self.use_guard or not llm_available():
            return {"classification": "allowed"}
        try:
            return guard_agent(message, history)
        except LLMUnavailable:
            # Never fail closed on a network blip — let the specialist answer.
            return {"classification": "allowed"}

    # ---------- stage 2: classification ----------
    def classify(self, message: str, history: List[dict] = None) -> RouteDecision:
        """Pick a specialist without calling it."""
        heuristic_agent, scores = heuristic_route(message)

        if llm_available():
            try:
                raw = llm_json(
                    system=_ROUTER_SYSTEM_PROMPT,
                    user=message,
                    history=history,
                    default={},
                )
                decision = str(raw.get("decision", "")).strip()
                if decision in AGENT_REGISTRY:
                    try:
                        confidence = float(raw.get("confidence", 0.8))
                    except (TypeError, ValueError):
                        confidence = 0.8
                    return RouteDecision(
                        message=message,
                        agent=decision,
                        stage="llm",
                        confidence=round(max(0.0, min(confidence, 1.0)), 2),
                        reasoning=str(raw.get("chain_of_thought", "")).strip(),
                        heuristic_agent=heuristic_agent,
                        heuristic_scores=scores,
                    )
                reason = f"classifier returned an unknown agent {decision!r}"
            except LLMUnavailable as exc:
                reason = f"classifier unavailable ({exc})"
        else:
            reason = "no GROQ_API_KEY configured"

        if heuristic_agent:
            top = scores[heuristic_agent]
            runner_up = max([v for k, v in scores.items() if k != heuristic_agent], default=0.0)
            confidence = 0.5 + min(0.4, (top - runner_up) / 10)
            return RouteDecision(
                message=message,
                agent=heuristic_agent,
                stage="heuristic",
                confidence=round(confidence, 2),
                reasoning=f"{reason}; keyword match on {heuristic_agent}",
                heuristic_agent=heuristic_agent,
                heuristic_scores=scores,
            )

        return RouteDecision(
            message=message,
            agent=DEFAULT_AGENT,
            stage="fallback",
            confidence=0.3,
            reasoning=f"{reason}; no keyword match, defaulting to {DEFAULT_AGENT}",
            heuristic_agent=None,
            heuristic_scores=scores,
        )

    def route(self, message: str, history: List[dict] = None,
              user_id: str = "guest") -> RouteDecision:
        """Guard + classify, without dispatching to the specialist."""
        history = history or []
        verdict = self.run_guard(message, history)
        if verdict.get("classification") == "off_topic":
            lang = resolve_language(message, user_id)
            fallback = localize(
                "Sorry, I can't help with that. Can I help you with your order?",
                "عذراً، لا أستطيع "
                "المساعدة في ذلك. "
                "هل أساعدك في طلبك؟",
                lang,
            )
            return RouteDecision(
                message=message,
                agent="guard_agent",
                stage="guard",
                confidence=1.0,
                reasoning="guard agent blocked the message as out of scope",
                blocked=True,
                guard_message=verdict.get("message") or fallback,
            )
        return self.classify(message, history)

    # ---------- stage 3: dispatch ----------
    def get_agent_response(self, message: str, history: List[dict] = None,
                           user_id: str = "guest") -> Dict[str, Any]:
        """Full pipeline. Returns the reply plus the routing trace."""
        history = history or []
        decision = self.route(message, history, user_id)

        if decision.blocked:
            return {"response": decision.guard_message, "routing": decision.to_dict()}

        spec = AGENT_REGISTRY[decision.agent]
        try:
            reply = spec.handler(message, history, user_id)
        except LLMUnavailable as exc:
            lang = resolve_language(message, user_id)
            reply = localize(
                "Sorry, I'm having trouble reaching the assistant right now. Please try again.",
                "عذراً، لا أستطيع "
                "الوصول إلى المساعد "
                "حالياً. يرجى المحاولة "
                "مرة أخرى.",
                lang,
            )
            decision.reasoning = f"{decision.reasoning}; handler failed: {exc}"
        return {"response": reply, "routing": decision.to_dict()}


_DEFAULT_ROUTER = RouterAgent()


def router(message: str, history: List[dict] = None, user_id: str = "guest") -> str:
    """Backwards-compatible entry point: message in, reply text out."""
    return _DEFAULT_ROUTER.get_agent_response(message, history, user_id)["response"]


def router_with_trace(message: str, history: List[dict] = None,
                      user_id: str = "guest") -> Dict[str, Any]:
    """Same pipeline, but keeps the routing trace attached."""
    return _DEFAULT_ROUTER.get_agent_response(message, history, user_id)


def classify_only(message: str, history: List[dict] = None,
                  user_id: str = "guest") -> RouteDecision:
    """Guard + classification with no specialist call — cheap enough for a test sweep."""
    return _DEFAULT_ROUTER.route(message, history, user_id)


def list_agents() -> List[AgentSpec]:
    return list(AGENT_REGISTRY.values())
