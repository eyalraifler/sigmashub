import os
import time
import bcrypt
import mysql.connector

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv

# Load backend/.env reliably
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = FastAPI(title="SigmaHub API", version="0.1.0")

# Allow frontend dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------
# DB helpers
# -----------------------
def get_conn():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "sigmas_hub"),
        autocommit=False,
    )


def hash_password(password: str) -> str:
    # cost 12 is a good default for dev/prod starters
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# -----------------------
# Health
# -----------------------
@app.get("/health")
def health():
    try:
        conn = conn.get_conn()
        conn.close()
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {
        "status": "ok" if db_status == "connected" else "error",
        "database": db_status,
        "ts": int(time.time())
        }

# -----------------------
# Feed (demo)
# -----------------------
class Post(BaseModel):
    id: int
    username: str
    caption: str


_FAKE_FEED: List[Post] = [
    Post(id=1, username="noa", caption="first post"),
    Post(id=2, username="uri", caption="hello world"),
    Post(id=3, username="yael", caption="sigma vibe"),
]


@app.get("/api/feed")
def get_feed():
    return {"items": _FAKE_FEED}


# -----------------------
# Login (real DB, returns demo token)
# -----------------------
class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/login")
def login(payload: LoginRequest):
    email = payload.email.strip()
    password = payload.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Missing username or password")

    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT id, username, email, password_hash FROM users WHERE email=%s LIMIT 1",
            (email,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not verify_password(password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # For now: return a dummy token (later replace with JWT)
        
        return {
            "ok": True,
            "token": "dev-token",
            "user": {"id": row["id"], "username": row["username"], "email": row["email"]},
        }
    finally:
        cur.close()
        conn.close()


# -----------------------
# Signup (real DB)
# -----------------------
class SignupRequest(BaseModel):
    email: str
    username: str
    password: str


@app.post("/api/signup")
def signup(payload: SignupRequest):
    email = payload.email.strip().lower()
    username = payload.username.strip()
    password = payload.password

    if len(username) > 32:
        raise HTTPException(status_code=400, detail="Username must be less than 32 chars")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    pw_hash = hash_password(password)

    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE email=%s LIMIT 1", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Email already exists")

        cur.execute("SELECT id FROM users WHERE username=%s LIMIT 1", (username,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Username already exists")

        cur.execute(
            """
            INSERT INTO users (email, username, password_hash)
            VALUES (%s, %s, %s)
            """,
            (email, username, pw_hash),
        )
        user_id = cur.lastrowid
        conn.commit()

        return {
            "ok": True,
            "token": "dev-token",  # later replace with real JWT
            "user": {"id": user_id, "username": username, "email": email},
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        cur.close()
        conn.close()



