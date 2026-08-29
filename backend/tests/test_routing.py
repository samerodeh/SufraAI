"""Tests for the SufraAI multi-agent router.

Stdlib only — run with:

    python -m unittest discover -s tests -v

The LLM is mocked throughout, so the suite is deterministic and needs no API key.
"""
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents import agent_utilities, router_agent  # noqa: E402
from agents.agent_utilities import LLMUnavailable, parse_json  # noqa: E402
from agents.router_agent import RouterAgent, score_agents  # noqa: E402


class ParseJsonTests(unittest.TestCase):

    def test_plain_json(self):
        self.assertEqual(parse_json('{"decision": "menu_agent"}')["decision"], "menu_agent")

    def test_fenced_json(self):
        raw = '```json\n{"decision": "order_agent"}\n```'
        self.assertEqual(parse_json(raw)["decision"], "order_agent")

    def test_json_wrapped_in_prose(self):
        raw = 'Sure! Here you go:\n{"decision": "dietary_agent"}\nHope that helps.'
        self.assertEqual(parse_json(raw)["decision"], "dietary_agent")

    def test_garbage_returns_default(self):
        self.assertEqual(parse_json("not json at all", {"decision": "x"}), {"decision": "x"})

    def test_empty_returns_default(self):
        self.assertEqual(parse_json("", {"a": 1}), {"a": 1})


class HistoryCleaningTests(unittest.TestCase):

    def test_malformed_turns_are_dropped(self):
        history = [
            {"role": "user", "content": "hi"},
            {"role": "user"},                       # missing content
            "not a dict",                           # wrong type
            {"role": "bogus", "content": "x"},      # unknown role
            {"role": "assistant", "content": "hello"},
        ]
        cleaned = agent_utilities._clean_history(history)
        self.assertEqual(cleaned, [
            {"role": "user", "content": "hi"},
            {"role": "assistant", "content": "hello"},
        ])


class HeuristicRouterTests(unittest.TestCase):
    """The offline path — no LLM involved at all."""

    def setUp(self):
        self.router = RouterAgent(use_guard=False)
        patcher = patch.object(router_agent, "llm_available", return_value=False)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_every_labelled_case_routes_correctly(self):
        from cli import ROUTING_SUITE

        failures = []
        for message, expected in ROUTING_SUITE:
            actual = self.router.classify(message).agent
            if actual != expected:
                failures.append(f"{message!r}: expected {expected}, got {actual}")
        self.assertEqual(failures, [], "\n".join(failures))

    def test_no_keyword_match_defaults_to_menu_agent(self):
        decision = self.router.classify("hello there")
        self.assertEqual(decision.agent, "menu_agent")
        self.assertEqual(decision.stage, "fallback")

    def test_whole_word_matching(self):
        # 'nut' must not fire inside 'minute'
        self.assertNotIn("dietary_agent", score_agents("how many minutes for delivery"))

    def test_allergy_beats_ordering(self):
        decision = self.router.classify("I want to order but I'm allergic to nuts")
        self.assertEqual(decision.agent, "dietary_agent")


class LLMRouterTests(unittest.TestCase):
    """The primary path — the classifier decides, but its output is validated."""

    def setUp(self):
        self.router = RouterAgent(use_guard=False)
        patcher = patch.object(router_agent, "llm_available", return_value=True)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_valid_decision_is_used(self):
        with patch.object(router_agent, "llm_json", return_value={
            "decision": "reservation_agent",
            "chain_of_thought": "they want a table",
            "confidence": 0.93,
        }):
            decision = self.router.classify("something ambiguous")
        self.assertEqual(decision.agent, "reservation_agent")
        self.assertEqual(decision.stage, "llm")
        self.assertAlmostEqual(decision.confidence, 0.93)

    def test_unknown_agent_falls_back_to_keywords(self):
        with patch.object(router_agent, "llm_json", return_value={"decision": "chef_agent"}):
            decision = self.router.classify("Can I book a table for 6?")
        self.assertEqual(decision.agent, "reservation_agent")
        self.assertEqual(decision.stage, "heuristic")
        self.assertIn("unknown agent", decision.reasoning)

    def test_llm_error_falls_back_to_keywords(self):
        with patch.object(router_agent, "llm_json", side_effect=LLMUnavailable("401")):
            decision = self.router.classify("Which dishes are gluten free?")
        self.assertEqual(decision.agent, "dietary_agent")
        self.assertEqual(decision.stage, "heuristic")

    def test_confidence_is_clamped(self):
        with patch.object(router_agent, "llm_json", return_value={
            "decision": "menu_agent", "confidence": "not a number",
        }):
            self.assertEqual(self.router.classify("hi").confidence, 0.8)

        with patch.object(router_agent, "llm_json", return_value={
            "decision": "menu_agent", "confidence": 42,
        }):
            self.assertEqual(self.router.classify("hi").confidence, 1.0)


class GuardTests(unittest.TestCase):

    def test_off_topic_message_never_reaches_a_specialist(self):
        router = RouterAgent(use_guard=True)
        with patch.object(router_agent, "llm_available", return_value=True), \
             patch.object(router_agent, "guard_agent", return_value={
                 "classification": "off_topic", "message": "Sorry, I can't help with that.",
             }):
            result = router.get_agent_response("Who won the world cup?")
        self.assertTrue(result["routing"]["blocked"])
        self.assertEqual(result["routing"]["agent"], "guard_agent")
        self.assertIn("Sorry", result["response"])

    def test_guard_failure_does_not_block_the_conversation(self):
        router = RouterAgent(use_guard=True)
        with patch.object(router_agent, "llm_available", return_value=True), \
             patch.object(router_agent, "guard_agent", side_effect=LLMUnavailable("down")), \
             patch.object(router_agent, "llm_json", return_value={"decision": "menu_agent"}):
            decision = router.route("what are your hours?")
        self.assertFalse(decision.blocked)
        self.assertEqual(decision.agent, "menu_agent")


class DispatchTests(unittest.TestCase):

    def test_selected_handler_receives_the_message(self):
        router = RouterAgent(use_guard=False)
        calls = []

        def fake_handler(message, history, user_id):
            calls.append((message, history, user_id))
            return "handled"

        spec = router_agent.AGENT_REGISTRY["menu_agent"]
        with patch.object(router_agent, "llm_available", return_value=False), \
             patch.object(spec, "handler", fake_handler):
            result = router.get_agent_response("what are your opening hours?",
                                               [{"role": "user", "content": "hi"}],
                                               "user_42")

        self.assertEqual(result["response"], "handled")
        self.assertEqual(calls[0][0], "what are your opening hours?")
        self.assertEqual(calls[0][2], "user_42")

    def test_handler_failure_returns_a_friendly_message(self):
        router = RouterAgent(use_guard=False)
        spec = router_agent.AGENT_REGISTRY["menu_agent"]

        def boom(message, history, user_id):
            raise LLMUnavailable("rate limited")

        with patch.object(router_agent, "llm_available", return_value=False), \
             patch.object(spec, "handler", boom):
            result = router.get_agent_response("what are your opening hours?")

        self.assertIn("trouble", result["response"])
        self.assertIn("rate limited", result["routing"]["reasoning"])


class OrderValidationTests(unittest.TestCase):

    def test_hallucinated_items_are_rejected(self):
        from agents.order_agent import _validate_items

        items = _validate_items([
            {"itemId": "not-a-real-id", "name": "Dragon Pizza", "quantity": 2},
        ])
        self.assertEqual(items, [])

    def test_price_is_taken_from_the_menu_not_the_model(self):
        from agents.agent_utilities import get_menu_items
        from agents.order_agent import _validate_items

        real = next(i for i in get_menu_items() if i.get("available", True))
        items = _validate_items([
            {"itemId": real["id"], "name": "whatever", "quantity": 3, "price": 0.01},
        ])
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["price"], real["price"])
        self.assertEqual(items[0]["name"], real["name_en"])
        self.assertEqual(items[0]["quantity"], 3)


if __name__ == "__main__":
    unittest.main(verbosity=2)
