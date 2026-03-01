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
POSTS_UPLOAD_DIR = Path(BASE_DIR) / "uploads" / "posts"
POSTS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR.parent)), name="uploads")

ICONS_DIR = Path(BASE_DIR).parent / "frontend" / "public" / "icons"
app.mount("/icons", StaticFiles(directory=str(ICONS_DIR)), name="icons")

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

def save_post_media(base64_string: str) -> str:
    """
    Save a base64 encoded post media (image/video) to disk and return the relative path.
    Returns empty string if input is invalid.
    """
    if not base64_string or not base64_string.startswith("data:"):
        return ""
    
    try:
        # Extract the base64 data
        # Format: data:image/png;base64,iVBORw0KGgoAAAANS...
        header, encoded = base64_string.split(",", 1)
        
        # Get media type from header
        media_type = header.split("/")[1].split(";")[0]  # png, jpeg, mp4, etc.
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.{media_type}"
        filepath = POSTS_UPLOAD_DIR / filename
        
        # Decode and save
        media_data = base64.b64decode(encoded)
        with open(filepath, "wb") as f:
            f.write(media_data)
        
        # Return relative path for storage in DB
        return f"/uploads/posts/{filename}"
    
    except Exception as e:
        print(f"Error saving post media: {e}")
        return ""

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
# Login (real DB, returns demo token)
# -----------------------
class LoginRequest(BaseModel):
    username: str
    password: str


class VerifyCodeRequest(BaseModel):
    email: str
    code: str


@app.post("/api/login")
def login(payload: LoginRequest):
    username = payload.username.strip().lower()

    #email = payload.email.strip().lower()
    password = payload.password

    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing email/username or password")
    

    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT id, username, email, password_hash FROM users WHERE username=%s LIMIT 1",
            (username,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not verify_password(password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Generate verification code
        code = generate_verification_code()
        email = row["email"]
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
            "message": "Verification code sent to your email",
            "email": email
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
# Signup
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
    if not avatar_base64:
        avatar_path = None
    elif avatar_base64.startswith("data:image"):
        avatar_path = save_base64_image(avatar_base64) or None
    else:
        # Already a path (default avatar selected)
        avatar_path = avatar_base64

    pw_hash = hash_password(password)

    conn = get_conn()
    cur = conn.cursor()
    try:
        # Double-check availability (in case of race condition)
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

# -----------------------
# Posts
# -----------------------

class MediaItemRequest(BaseModel):
    media_base64: str
    media_type: str  # "image" or "video"

class MediaItemResponse(BaseModel):
    media_url: str
    media_type: str
    position: int

class CreatePostRequest(BaseModel):
    user_id: int
    caption: str = ""
    tags: List[str] = []
    media_items: List[MediaItemRequest]  # 1–10 items

class PostResponse(BaseModel):
    id: int
    user_id: int
    username: str
    profile_image_url: str | None
    caption: str
    media_url: str
    media_type: str
    likes_count: int
    comments_count: int
    created_at: datetime
    is_liked_by_user: bool = False
    tags: List[str] = []
    media_items: List[MediaItemResponse] = []

@app.post("/api/posts/create")
def create_post(payload: CreatePostRequest):
    user_id = payload.user_id
    caption = payload.caption.strip() if payload.caption else ""
    tags = payload.tags
    media_items = payload.media_items

    if not media_items or len(media_items) > 10:
        raise HTTPException(status_code=400, detail="Provide between 1 and 10 media items")

    #validate and save all media files before touching the DB
    saved_media = []
    for item in media_items:
        mt = item.media_type.lower()
        if mt not in ["image", "video"]:
            raise HTTPException(status_code=400, detail=f"Invalid media type: {mt}")
        url = save_post_media(item.media_base64)
        if not url:
            raise HTTPException(status_code=400, detail="Invalid media data")
        saved_media.append({"url": url, "type": mt})

    first = saved_media[0]

    conn = get_conn()
    cur = conn.cursor()
    try:
        #verify user exists
        cur.execute("SELECT id FROM users WHERE id=%s LIMIT 1", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")

        #insert post (first media stored directly for backward compat)
        cur.execute(
            """
            INSERT INTO posts (user_id, caption, media_url, media_type)
            VALUES (%s, %s, %s, %s)
            """,
            (user_id, caption, first["url"], first["type"])
        )
        post_id = cur.lastrowid

        #insert all media into post_media
        cur.executemany(
            "INSERT INTO post_media (post_id, media_url, media_type, position) VALUES (%s, %s, %s, %s)",
            [(post_id, m["url"], m["type"], i) for i, m in enumerate(saved_media)]
        )

        #insert tags (normalize: strip #, lowercase, deduplicate, max 20)
        seen = set()
        normalized_tags = []
        for tag in tags:
            t = tag.lstrip("#").strip().lower()
            if t and t not in seen:
                seen.add(t)
                normalized_tags.append(t)
            if len(normalized_tags) == 20:
                break
        if normalized_tags:
            cur.executemany(
                "INSERT INTO post_tags (post_id, tag) VALUES (%s, %s)",
                [(post_id, t) for t in normalized_tags]
            )

        conn.commit()

        return {
            "ok": True,
            "post_id": post_id,
            "media_url": first["url"]
        }
    
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Create post error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        cur.close()
        conn.close()

@app.get("/api/posts/feed")
def get_posts_feed(user_id: int, limit: int = 20, offset: int = 0):
    """
    Get posts feed with user info
    """
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT
                p.id,
                p.user_id,
                p.caption,
                p.media_url,
                p.media_type,
                p.likes_count,
                p.comments_count,
                p.created_at,
                u.username,
                u.profile_image_url
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT %s OFFSET %s
        """
        cur.execute(query, (limit, offset))
        posts = cur.fetchall()
        
        #show to the user the last 5 posts only for demo
        posts = posts[:5]

        tags_map = {}
        media_map = {}
        liked_post_ids = set()
        if posts:
            post_ids = [p["id"] for p in posts]
            placeholders = ",".join(["%s"] * len(post_ids))

            #fetch tags
            cur.execute(
                f"SELECT post_id, tag FROM post_tags WHERE post_id IN ({placeholders})",
                post_ids
            )
            for row in cur.fetchall():
                tags_map.setdefault(row["post_id"], []).append(row["tag"])

            #fetch media items
            cur.execute(
                f"SELECT post_id, media_url, media_type, position FROM post_media WHERE post_id IN ({placeholders}) ORDER BY post_id, position",
                post_ids
            )
            for row in cur.fetchall():
                media_map.setdefault(row["post_id"], []).append(
                    MediaItemResponse(media_url=row["media_url"], media_type=row["media_type"], position=row["position"])
                )

            #fetch which posts the current user has liked
            if user_id:
                cur.execute(
                    f"SELECT post_id FROM likes WHERE user_id=%s AND post_id IN ({placeholders})",
                    [user_id] + post_ids
                )
                liked_post_ids = {row["post_id"] for row in cur.fetchall()}

        results = []
        for post in posts:
            #fall back to posts.media_url for old posts without post_media rows
            items = media_map.get(post["id"]) or [
                MediaItemResponse(media_url=post["media_url"], media_type=post["media_type"], position=0)
            ]
            results.append(PostResponse(
                id=post["id"],
                user_id=post["user_id"],
                username=post["username"],
                profile_image_url=post["profile_image_url"],
                caption=post["caption"],
                media_url=post["media_url"],
                media_type=post["media_type"],
                likes_count=post["likes_count"],
                comments_count=post["comments_count"],
                created_at=post["created_at"],
                tags=tags_map.get(post["id"], []),
                media_items=items,
                is_liked_by_user=post["id"] in liked_post_ids
            ))
        return {"ok": True, "posts": results}
    
    except Exception as e:
        print(f"Get posts feed error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        cur.close()
        conn.close()
        
        
@app.get("/api/posts/{post_id}")
def get_post(post_id: int, user_id: int = None):
    """
    Get single post by id with user info
    """
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT
                p.id,
                p.user_id,
                p.caption,
                p.media_url,
                p.media_type,
                p.likes_count,
                p.comments_count,
                p.created_at,
                u.username,
                u.profile_image_url
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = %s
            LIMIT 1
        """
        cur.execute(query, (post_id,))
        post = cur.fetchone()
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        #check if user liked this post
        is_liked = False
        if user_id:
            cur.execute(
                "SELECT 1 FROM likes WHERE post_id=%s AND user_id=%s LIMIT 1",
                (post_id, user_id)
            )
            is_liked = bool(cur.fetchone())

        #fetch tags
        cur.execute("SELECT tag FROM post_tags WHERE post_id=%s", (post_id,))
        post_tags = [row["tag"] for row in cur.fetchall()]

        #fetch media items
        cur.execute(
            "SELECT media_url, media_type, position FROM post_media WHERE post_id=%s ORDER BY position",
            (post_id,)
        )
        media_rows = cur.fetchall()
        media_items = [
            MediaItemResponse(media_url=r["media_url"], media_type=r["media_type"], position=r["position"])
            for r in media_rows
        ] or [MediaItemResponse(media_url=post["media_url"], media_type=post["media_type"], position=0)]

        return {
            "ok": True,
            "post": PostResponse(
                id=post["id"],
                user_id=post["user_id"],
                username=post["username"],
                profile_image_url=post["profile_image_url"],
                caption=post["caption"],
                media_url=post["media_url"],
                media_type=post["media_type"],
                likes_count=post["likes_count"],
                comments_count=post["comments_count"],
                created_at=post["created_at"],
                is_liked_by_user=is_liked,
                tags=post_tags,
                media_items=media_items
            )
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get post error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        cur.close()
        conn.close()
        


# -----------------------
# Likes
# -----------------------

class LikeRequest(BaseModel):
    user_id: int
    post_id: int


@app.post("/api/posts/like")
def like_post(payload: LikeRequest):
    """
    Like a post. If already liked, unlike it (toggle behavior)
    """
    user_id = payload.user_id
    post_id = payload.post_id
    
    conn = get_conn()
    cur = conn.cursor()
    try:
        #check if post exists
        cur.execute("SELECT id FROM posts WHERE id=%s LIMIT 1", (post_id,))
        if not cur.fetchall():
            raise HTTPException(status_code=404, detail="Post not found")
        
        #check if already liked
        cur.execute("SELECT id FROM likes WHERE user_id=%s AND post_id=%s LIMIT 1", (user_id, post_id))
        existing_like = cur.fetchone()
        
        if existing_like:
            #unlike: Remove the like and decrement count
            cur.execute(
                "DELETE FROM likes WHERE post_id=%s AND user_id=%s", 
                (post_id, user_id)
            )
            cur.execute(
                "UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id=%s",
                (post_id,)
            )
            conn.commit()
            return {"ok": True, "liked": False, "message": "Post unliked"}
        else:
            #like: Add the like and increment count
            cur.execute(
                "INSERT INTO likes (post_id, user_id) VALUES (%s, %s)", 
                (post_id, user_id)
            )
            cur.execute(
                "UPDATE posts SET likes_count = likes_count + 1 WHERE id=%s",
                (post_id,)
            )
            conn.commit()
            return {"ok": True, "liked": True, "message": "Post liked"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Like post error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        cur.close()
        conn.close()

@app.get("/api/posts/{post_id}/likes")
def get_post_likes(post_id: int, limit: int = 50, offset: int = 0):
    """
    Get list of users who liked a post
    """
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        #check if post exists
        cur.execute("SELECT id FROM posts WHERE id=%s LIMIT 1", (post_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Post not found")
        
        query = """
            SELECT 
                u.id, 
                u.username, 
                u.profile_image_url, 
                l.created_at
            FROM likes l
            JOIN users u ON l.user_id = u.id
            WHERE l.post_id = %s
            ORDER BY l.created_at DESC
            LIMIT %s OFFSET %s
        """
        cur.execute(query, (post_id, limit, offset))
        likes = cur.fetchall()
        
        result = []
        for like in likes:
            result.append({
                "user_id": like["id"],
                "username": like["username"],
                "profile_image_url": like["profile_image_url"],
                "liked_at": like["created_at"].isoformat() if like.get("created_at") else None
            })
        
        return {"ok": True, "likes": result}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get post likes error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        cur.close()
        conn.close()


# -----------------------
# Comments
# -----------------------

class CreateCommentRequest(BaseModel):
    user_id: int
    post_id: int
    content: str
    
class CommentRequest(BaseModel):
    id: int
    post_id: int
    user_id: int
    username: str
    profile_image_url: str | None
    content: str
    created_at: datetime

@app.post("/api/posts/comment")
def create_comment(payload: CreateCommentRequest):
    post_id = payload.post_id
    user_id = payload.user_id
    content = payload.content.strip()
    
    if not content:
        raise HTTPException(status_code=400, detail="Comment content cannot be empty")
    
    if len(content) > 500: #arbitrary limit to prevent abuse
        raise HTTPException(status_code=400, detail="Comment content must be less than 500 chars")
    
    conn = get_conn()
    cur = conn.cursor()
    try:
        #check if post exists
        cur.execute("SELECT id FROM posts WHERE id=%s LIMIT 1", (post_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Post not found")
        
        #check if user exists
        cur.execute("SELECT id FROM users WHERE id=%s LIMIT 1", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        
        #insert comment
        cur.execute(
            """
            INSERT INTO comments (post_id, user_id, comment_text)
            VALUES (%s, %s, %s)
            """,
            (post_id, user_id, content)
        )
        comment_id = cur.lastrowid
        
        #increment comments count
        cur.execute(
            "UPDATE posts SET comments_count = comments_count + 1 WHERE id=%s",
            (post_id,)
        )
        
        conn.commit()
        
        return {
            "ok": True,
            "comment_id": comment_id,
            "message": "Comment created"
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Create comment error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        cur.close()
        conn.close()

@app.get("/api/posts/{post_id}/comments")
def get_post_comments(post_id: int, limit: int = 50, offset: int = 0):
    """
    Get comments for a post
    """
    
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT 
                c.id, 
                c.post_id, 
                c.user_id, 
                c.comment_text,
                c.created_at,
                u.username,
                u.profile_image_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = %s
            ORDER BY c.created_at ASC
            LIMIT %s OFFSET %s
        """
        cur.execute(query, (post_id, limit, offset))
        comments = cur.fetchall()
        
        result = []
        for comment in comments:
            result.append(CommentRequest(
                id=comment["id"],
                post_id=comment["post_id"],
                user_id=comment["user_id"],
                username=comment["username"],
                profile_image_url=comment["profile_image_url"],
                content=comment["comment_text"],
                created_at=comment["created_at"]
            ))
        
        return {"ok": True, "comments": result}
    except Exception as e:
        print(f"Get post comments error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        cur.close()
        conn.close()
    


@app.get("/api/users/{user_id}")
def get_user_profile(user_id: int):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT id, username, profile_image_url FROM users WHERE id=%s LIMIT 1",
            (user_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return {"ok": True, "user": row}
    finally:
        cur.close()
        conn.close()


@app.get("/api/comments/{comment_id}")
def delete_comment(comment_id: int, user_id: int):
    """
    Delete a comment. Only the comment owner can delete their comment.
    """
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        #check if comment exists
        cur.execute("SELECT id, post_id, user_id FROM comments WHERE id=%s LIMIT 1", (comment_id,))
        comment = cur.fetchone()
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        #check if user is the owner of the comment
        if comment["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own comments")
        
        #delete comment
        cur.execute("DELETE FROM comments WHERE id=%s", (comment_id,))
        
        #decrement comments count
        cur.execute(
            "UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id=%s",
            (comment["post_id"],)
        )
        
        conn.commit()
        
        return {
            "ok": True,
            "message": "Comment deleted"
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Delete comment error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        cur.close()
        conn.close()



