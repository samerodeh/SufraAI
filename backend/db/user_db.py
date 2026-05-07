"""
Runtime database layer for user profiles and auth records.
"""
import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

DB_FILE = os.path.join(os.path.dirname(__file__), "..", "db_files", "user_auth.db")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS auth (
                user_id          TEXT PRIMARY KEY,
                name             TEXT NOT NULL,
                email            TEXT UNIQUE NOT NULL,
                hashed_password  TEXT NOT NULL,
                created_at       TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id              TEXT PRIMARY KEY,
                language_preference  TEXT NOT NULL DEFAULT 'auto',
                dietary_profile      TEXT NOT NULL DEFAULT '{"halal":false,"vegan":false,"allergies":[]}',
                theme                TEXT NOT NULL DEFAULT 'system',
                voice_enabled        INTEGER NOT NULL DEFAULT 0,
                favorites            TEXT NOT NULL DEFAULT '[]',
                usual_order_preset   TEXT NOT NULL DEFAULT '[]',
                order_history        TEXT NOT NULL DEFAULT '[]',
                updated_at           TEXT NOT NULL
            )
        """)
        conn.commit()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Auth ──────────────────────────────────────────────────────────────────────

def db_email_exists(email: str) -> bool:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT 1 FROM auth WHERE email = ?", (email.lower(),)
        ).fetchone()
    return row is not None


def db_get_auth_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM auth WHERE email = ?", (email.lower(),)
        ).fetchone()
    if row is None:
        return None
    return {
        "userId": row["user_id"],
        "name": row["name"],
        "email": row["email"],
        "hashedPassword": row["hashed_password"],
    }


def db_create_auth_record(
    user_id: str, name: str, email: str, hashed_password: str
) -> Dict[str, Any]:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO auth (user_id, name, email, hashed_password, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, name, email.lower(), hashed_password, _now_iso()),
        )
        conn.commit()
    return {
        "userId": user_id,
        "name": name,
        "email": email.lower(),
        "hashedPassword": hashed_password,
    }


# ── User profiles ─────────────────────────────────────────────────────────────

def _row_to_profile(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "userId": row["user_id"],
        "languagePreference": row["language_preference"],
        "dietaryProfile": json.loads(row["dietary_profile"]),
        "theme": row["theme"],
        "voiceEnabled": bool(row["voice_enabled"]),
        "favorites": json.loads(row["favorites"]),
        "usualOrderPreset": json.loads(row["usual_order_preset"]),
        "orderHistory": json.loads(row["order_history"]),
        "updatedAt": row["updated_at"],
    }


def db_get_user_profile(user_id: str) -> Dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        if row is None:
            now = _now_iso()
            conn.execute(
                """INSERT INTO users
                   (user_id, language_preference, dietary_profile, theme,
                    voice_enabled, favorites, usual_order_preset, order_history, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    user_id, "auto",
                    '{"halal":false,"vegan":false,"allergies":[]}',
                    "system", 0, "[]", "[]", "[]", now,
                ),
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM users WHERE user_id = ?", (user_id,)
            ).fetchone()
    return _row_to_profile(row)


def db_update_user_profile(user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    profile = db_get_user_profile(user_id)
    profile.update(payload)
    profile["updatedAt"] = _now_iso()
    with get_conn() as conn:
        conn.execute(
            """UPDATE users SET
               language_preference = ?,
               dietary_profile     = ?,
               theme               = ?,
               voice_enabled       = ?,
               favorites           = ?,
               usual_order_preset  = ?,
               order_history       = ?,
               updated_at          = ?
               WHERE user_id = ?""",
            (
                profile["languagePreference"],
                json.dumps(profile["dietaryProfile"]),
                profile["theme"],
                int(profile["voiceEnabled"]),
                json.dumps(profile["favorites"]),
                json.dumps(profile["usualOrderPreset"]),
                json.dumps(profile["orderHistory"]),
                profile["updatedAt"],
                user_id,
            ),
        )
        conn.commit()
    return profile


def db_add_favorite(user_id: str, item_id: str) -> List[str]:
    profile = db_get_user_profile(user_id)
    favorites = profile.get("favorites", [])
    if item_id not in favorites:
        favorites.append(item_id)
    db_update_user_profile(user_id, {"favorites": favorites})
    return favorites


def db_remove_favorite(user_id: str, item_id: str) -> List[str]:
    profile = db_get_user_profile(user_id)
    favorites = [x for x in profile.get("favorites", []) if x != item_id]
    db_update_user_profile(user_id, {"favorites": favorites})
    return favorites


def db_set_favorites(user_id: str, favorites: List[str]) -> List[str]:
    deduped = list(dict.fromkeys(favorites))
    db_update_user_profile(user_id, {"favorites": deduped})
    return deduped


def db_append_order_to_history(user_id: str, order_id: str) -> None:
    profile = db_get_user_profile(user_id)
    history = profile.get("orderHistory", [])
    history.append(order_id)
    db_update_user_profile(user_id, {"orderHistory": history})


def db_set_usual_order(user_id: str, usual_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    return db_update_user_profile(user_id, {"usualOrderPreset": usual_items})
