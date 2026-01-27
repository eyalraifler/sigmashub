import os
import time
import bcrypt
import base64
import uuid
import mysql.connector
from pathlib import Path
import random
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
from send_email import send_verification_email


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

def generate_verification_code() -> str:
    """Generate a 6-digit verification code"""
    return str(random.randint(100000, 999999))

# In-memory storage for verification codes (in production, use Redis or DB)
verification_codes = {}

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


class VerifyCodeRequest(BaseModel):
    email: str
    code: str


@app.post("/api/login")
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    password = payload.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Missing email or password")

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

        # Generate verification code
        code = generate_verification_code()
        
        # Store code with expiration (10 minutes)
        verification_codes[email] = {
            "code": code,
            "expires_at": datetime.now() + timedelta(minutes=10),
            "user_data": {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"]
            }
        }

        # Send verification email
        try:
            send_verification_email(email, code)
        except Exception as e:
            print(f"Error sending email: {e}")
            raise HTTPException(status_code=500, detail="Failed to send verification email")

        return {
            "ok": True,
            "requires_verification": True,
            "message": "Verification code sent to your email"
        }
    finally:
        cur.close()
        conn.close()


@app.post("/api/login/verify")
def verify_login_code(payload: VerifyCodeRequest):
    email = payload.email.strip().lower()
    code = payload.code.strip()

    if email not in verification_codes:
        raise HTTPException(status_code=400, detail="No verification code found. Please login again.")

    stored_data = verification_codes[email]

    # Check if code expired
    if datetime.now() > stored_data["expires_at"]:
        del verification_codes[email]
        raise HTTPException(status_code=400, detail="Verification code expired. Please login again.")

    # Check if code matches
    if stored_data["code"] != code:
        raise HTTPException(status_code=401, detail="Invalid verification code")

    # Code is valid, clean up and return token
    user_data = stored_data["user_data"]
    del verification_codes[email]

    return {
        "ok": True,
        "token": "dev-token",
        "user": user_data
    }


class ResendCodeRequest(BaseModel):
    email: str


@app.post("/api/login/resend")
def resend_verification_code(payload: ResendCodeRequest):
    email = payload.email.strip().lower()

    if email not in verification_codes:
        raise HTTPException(status_code=400, detail="No active verification session found. Please login again.")

    stored_data = verification_codes[email]

    # Generate new verification code
    code = generate_verification_code()
    
    # Update stored code with new expiration
    verification_codes[email] = {
        "code": code,
        "expires_at": datetime.now() + timedelta(minutes=10),
        "user_data": stored_data["user_data"]
    }

    # Send verification email
    try:
        send_verification_email(email, code)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send verification email")

    return {
        "ok": True,
        "message": "New verification code sent to your email"
    }

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
