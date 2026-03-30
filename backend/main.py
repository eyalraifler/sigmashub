import os
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

from database import db
from send_email import send_contact_email
from routers import auth, posts, users, notifications, chats, search, ai

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = FastAPI(title="SigmaHub API", version="0.1.0")

# Static files
UPLOAD_DIR = Path(BASE_DIR) / "uploads" / "avatars"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
POSTS_UPLOAD_DIR = Path(BASE_DIR) / "uploads" / "posts"
POSTS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR.parent)), name="uploads")

ICONS_DIR = Path(BASE_DIR).parent / "frontend" / "public" / "icons"
app.mount("/icons", StaticFiles(directory=str(ICONS_DIR)), name="icons")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(users.router)
app.include_router(notifications.router)
app.include_router(chats.router)
app.include_router(search.router)
app.include_router(ai.router)


# -----------------------
# Health
# -----------------------

@app.get("/health")
def health():
    try:
        with db() as client:
            client.execute("SELECT 1")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {
        "status": "ok" if db_status == "connected" else "error",
        "database": db_status,
        "ts": int(time.time()),
    }


# -----------------------
# Contact
# -----------------------

class ContactRequest(BaseModel):
    name: str
    email: str
    message: str


@app.post("/api/contact")
def contact(req: ContactRequest):
    name = req.name.strip()
    email = req.email.strip()
    message = req.message.strip()
    if not name or not email or not message:
        raise HTTPException(status_code=400, detail="All fields are required.")
    try:
        send_contact_email(name, email, message)
    except Exception as e:
        print(f"Contact email error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message. Please try again later.")
    return {"ok": True}

