import os
import time
import bcrypt
import base64
import uuid
import mysql.connector
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv

# Load backend/.env reliably
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = FastAPI(title="SigmaHub API", version="0.1.0")

# Directory for storing uploaded avatars
UPLOAD_DIR = Path(BASE_DIR) / "uploads" / "avatars"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR.parent)), name="uploads")

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




def save_base64_image(base64_string: str) -> str:
    """
    Save a base64 encoded image to disk and return the relative path.
    Returns empty string if input is invalid.
    """
    if not base64_string or not base64_string.startswith("data:image"):
        return ""
    
    try:
        # Extract the base64 data
        # Format: data:image/png;base64,iVBORw0KGgoAAAANS...
        header, encoded = base64_string.split(",", 1)
        
        # Get image type from header
        image_type = header.split("/")[1].split(";")[0]  # png, jpeg, etc.
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.{image_type}"
        filepath = UPLOAD_DIR / filename
        
        # Decode and save
        image_data = base64.b64decode(encoded)
        with open(filepath, "wb") as f:
            f.write(image_data)
        
        # Return relative path for storage in DB
        return f"/uploads/avatars/{filename}"
    
    except Exception as e:
        print(f"Error saving image: {e}")
        return ""

# -----------------------
# Health
# -----------------------
@app.get("/health")
def health():
    try:
        conn = get_conn()
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


class SignupCompleteRequest(BaseModel):
    email: str
    username: str
    password: str
    avatar_path: str
    bio: str

@app.post("/api/signup/check_user_available")
def check_user_available(payload: SignupRequest):
    email = payload.email.strip().lower()
    username = payload.username.strip()
    password = payload.password

    if len(username) > 32:
        raise HTTPException(status_code=400, detail="Username must be less than 32 chars")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE email=%s LIMIT 1", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Email already exists")

        cur.execute("SELECT id FROM users WHERE username=%s LIMIT 1", (username,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Username already exists")
        
        return {"ok": True,
                "user": {"username": username, "email": email}}
    finally:
        conn.close()
        cur.close()
        






@app.post("/api/signup/complete_signup")
def complete_signup(payload: SignupCompleteRequest):
    email = payload.email.strip().lower()
    username = payload.username.strip()
    password = payload.password
    avatar_base64 = payload.avatar_path
    bio = payload.bio.strip()

    # Validate
    if len(username) > 32:
        raise HTTPException(status_code=400, detail="Username must be less than 32 chars")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    if len(bio) > 200:
        raise HTTPException(status_code=400, detail="Bio must be less than 200 chars")

    # Save avatar if provided
    avatar_path = save_base64_image(avatar_base64) if avatar_base64 else None

    pw_hash = hash_password(password)

    conn = get_conn()
    cur = conn.cursor()
    try:
        # Double-check availability (in case of race condition)
        cur.execute("SELECT id FROM users WHERE email=%s LIMIT 1", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Email already exists")

        cur.execute("SELECT id FROM users WHERE username=%s LIMIT 1", (username,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Username already exists")

        # Insert user with profile data
        cur.execute(
            """
            INSERT INTO users (email, username, password_hash, bio, profile_image_url)
            VALUES (%s, %s, %s, %s, %s)
            """,  # Fixed: 5 placeholders for 5 values
            (email, username, pw_hash, bio, avatar_path),
        )
        user_id = cur.lastrowid
        conn.commit()

        return {
            "ok": True,
            "token": "dev-token",  # later replace with real JWT
            "user": {
                "id": user_id, 
                "username": username, 
                "email": email, 
                "bio": bio, 
                "avatar_path": avatar_path
            },
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        cur.close()
        conn.close()
