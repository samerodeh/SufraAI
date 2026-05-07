# files imports
from auth.router import router as auth_router
from routers.chat import router as chat_router
from routers.menu import router as menu_router
from routers.favorites import router as favorites_router
from routers.user import router as user_router
from routers.orders import router as orders_router
from routers.recomendations import router as recomendations_router
from routers.reservations import router as reservations_router
# fastapi imports
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from contextlib import asynccontextmanager
from data_store import seed_promotions, get_promotions
from db.user_db import init_db
from db.orders_db import init_orders_db
from rag import build_index
# other imports
import json

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_orders_db()
    build_index()
    yield

app = FastAPI(title="Sufra API", lifespan=lifespan)

# Allow requests from the mobile app / any origin during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Routes ----------
@app.get("/")
def root():
    return {"status": "Sufra API is running"}


@app.get("/faq")
def get_faq():
    """Return all FAQs."""
    with open("data/faq.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["faqs"]


@app.get("/promos/active")
def get_active_promos():
    seed_promotions()
    return get_promotions()

# ---------- Routers ----------
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(menu_router)
app.include_router(favorites_router)
app.include_router(user_router)
app.include_router(orders_router)
app.include_router(recomendations_router)
app.include_router(reservations_router)
