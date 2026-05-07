import json
import os
from dotenv import load_dotenv
import chromadb
from chromadb.utils import embedding_functions

load_dotenv()

# ---------- Setup ChromaDB ----------
client = chromadb.PersistentClient(path="./chroma_db")

embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

menu_collection = client.get_or_create_collection(
    name="menu_items",
    embedding_function=embedding_fn
)

faq_collection = client.get_or_create_collection(
    name="faqs",
    embedding_function=embedding_fn
)

def build_index():
    """Load menu.json and faq.json and embed them into ChromaDB."""

    # --- Menu items ---
    with open("data/menu.json", "r", encoding="utf-8") as f:
        items = json.load(f)

    menu_collection.upsert(
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
    with open("data/faq.json", "r", encoding="utf-8") as f:
        faq_data = json.load(f)

    faqs = faq_data["faqs"]
    faq_collection.upsert(
        ids=[faq["id"] for faq in faqs],
        documents=[f"{faq['question']} {faq['answer']}" for faq in faqs],
        metadatas=[{"question": faq["question"], "answer": faq["answer"]} for faq in faqs]
    )
    print(f"Indexed {len(faqs)} FAQs.")

def query_menu(question: str, n=5) -> list:
    """Find the most relevant menu items for a question."""
    results = menu_collection.query(query_texts=[question], n_results=n)
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
    results = faq_collection.query(query_texts=[question], n_results=n)
    return results["documents"][0]


def query_menu_structured(question: str, n=5) -> list:
    """Structured menu retrieval with metadata for filtering/alternatives."""
    results = menu_collection.query(query_texts=[question], n_results=n)
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