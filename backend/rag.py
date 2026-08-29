"""Retrieval layer: menu items and FAQs embedded in a local Chroma store.

The Chroma client and the sentence-transformer model are created lazily. Importing
this module is therefore cheap, which keeps `cli.py route` and the routing test
sweep fast — they never touch retrieval.
"""
import json
import os

import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

load_dotenv()

# Paths are anchored to this file so the API, the CLI and the notebook all read
# the same data regardless of the working directory they were started from.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_db")

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

_client = None
_collections = {}


def _get_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_DIR)
    return _client


def _get_collection(name: str):
    if name not in _collections:
        embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL
        )
        _collections[name] = _get_client().get_or_create_collection(
            name=name, embedding_function=embedding_fn
        )
    return _collections[name]


def menu_collection():
    return _get_collection("menu_items")


def faq_collection():
    return _get_collection("faqs")


def build_index():
    """Load menu.json and faq.json and embed them into ChromaDB."""

    # --- Menu items ---
    with open(os.path.join(DATA_DIR, "menu.json"), "r", encoding="utf-8") as f:
        items = json.load(f)

    menu_collection().upsert(
        ids=[item["id"] for item in items],
        documents=[
            f"{item['name_en']} - {item['description_en']} - "
            f"Category: {item['category']} - Price: ${item['price']} - "
            f"Diet tags: {', '.join(item['diet_tags'])} - "
            f"Allergens: {', '.join(item['allergens'])}"
            for item in items
        ],
        metadatas=[{
            "name_en": item["name_en"],
            "name_ar": item["name_ar"],
            "category": item["category"],
            "price": item["price"],
            "diet_tags": ", ".join(item["diet_tags"]),
            "allergens": ", ".join(item["allergens"]),
            "meal_period": item["meal_period"],
            "available": str(item["available"])
        } for item in items]
    )
    print(f"Indexed {len(items)} menu items.")

    # --- FAQs ---
    with open(os.path.join(DATA_DIR, "faq.json"), "r", encoding="utf-8") as f:
        faq_data = json.load(f)

    faqs = faq_data["faqs"]
    faq_collection().upsert(
        ids=[faq["id"] for faq in faqs],
        documents=[f"{faq['question']} {faq['answer']}" for faq in faqs],
        metadatas=[{"question": faq["question"], "answer": faq["answer"]} for faq in faqs]
    )
    print(f"Indexed {len(faqs)} FAQs.")


def query_menu(question: str, n=5) -> list:
    """Find the most relevant menu items for a question."""
    results = menu_collection().query(query_texts=[question], n_results=n)
    docs = results["documents"][0]
    metas = results.get("metadatas", [[]])[0]
    merged = []
    for idx, doc in enumerate(docs):
        meta = metas[idx] if idx < len(metas) else {}
        available = str(meta.get("available", "true")).lower() == "true"
        availability_note = "Available" if available else "Unavailable"
        merged.append(f"{doc} | Availability: {availability_note}")
    return merged


def query_faq(question: str, n=3) -> list:
    """Find the most relevant FAQs for a question."""
    results = faq_collection().query(query_texts=[question], n_results=n)
    return results["documents"][0]


def query_menu_structured(question: str, n=5) -> list:
    """Structured menu retrieval with metadata for filtering/alternatives."""
    results = menu_collection().query(query_texts=[question], n_results=n)
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    rows = []
    for idx, doc in enumerate(docs):
        meta = metas[idx] if idx < len(metas) else {}
        rows.append({"document": doc, "metadata": meta})
    return rows


if __name__ == "__main__":
    build_index()
    print("\nTest query: 'vegan options'")
    for doc in query_menu("vegan options"):
        print(" -", doc[:80])
    print("\nTest query: 'opening hours'")
    for doc in query_faq("opening hours"):
        print(" -", doc[:80])
