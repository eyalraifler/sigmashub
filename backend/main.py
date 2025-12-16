from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import time

app = FastAPI(title="SigmaHub API", version="0.1.0")

# Allow your React dev server to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True, "ts": int(time.time())}

# ---- Placeholder endpoints (no DB) ----

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
    # In real life: fetch from DB, ranking, pagination, etc.
    return {"items": _FAKE_FEED}

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
def login(payload: LoginRequest):
    # Fake login for now
    if not payload.username or not payload.password:
        return {"ok": False, "message": "Missing username or password"}
    return {"ok": True, "token": "dev-token", "user": {"username": payload.username}}

class SignupRequest(BaseModel):
    username: str
    password: str

@app.post("/api/signup")
def signup(payload: SignupRequest):
    # Fake signup for now
    if len(payload.username) < 3:
        return {"ok": False, "message": "Username too short (min 3)"}
    if len(payload.password) < 6:
        return {"ok": False, "message": "Password too short (min 6)"}
    return {"ok": True, "message": "User created (demo)"}
