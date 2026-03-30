import os
import time
import bcrypt
import base64
import uuid
from pathlib import Path
import random
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
from send_email import send_verification_email, send_contact_email
from ai_services import get_gemini_response
from db_client import RemoteDBClient

# Load backend/.env reliably
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_HOST = os.getenv("DB_SERVER_HOST", "localhost")
DB_PORT = int(os.getenv("DB_SERVER_PORT", "5000"))

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

_security = HTTPBearer()


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(_security)) -> int:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def db():
    """Create a RemoteDBClient connected to the DB server."""
    return RemoteDBClient(host=DB_HOST, port=DB_PORT)


def _one(rows):
    return rows[0] if rows else None


app = FastAPI(title="SigmaHub API", version="0.1.0")

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


# -----------------------
# Non-DB helpers
# -----------------------

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def save_base64_image(base64_string: str) -> str:
    if not base64_string or not base64_string.startswith("data:image"):
        return ""
    try:
        header, encoded = base64_string.split(",", 1)
        image_type = header.split("/")[1].split(";")[0]
        filename = f"{uuid.uuid4()}.{image_type}"
        filepath = UPLOAD_DIR / filename
        image_data = base64.b64decode(encoded)
        with open(filepath, "wb") as f:
            f.write(image_data)
        return f"/uploads/avatars/{filename}"
    except Exception as e:
        print(f"Error saving image: {e}")
        return ""


def generate_verification_code() -> str:
    return str(random.randint(100000, 999999))


def save_post_media(base64_string: str) -> str:
    if not base64_string or not base64_string.startswith("data:"):
        return ""
    try:
        header, encoded = base64_string.split(",", 1)
        media_type = header.split("/")[1].split(";")[0]
        filename = f"{uuid.uuid4()}.{media_type}"
        filepath = POSTS_UPLOAD_DIR / filename
        media_data = base64.b64decode(encoded)
        with open(filepath, "wb") as f:
            f.write(media_data)
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
# Login
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
    password = payload.password

    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing email/username or password")

    with db() as client:
        row = _one(client.execute(
            "SELECT id, username, email, password_hash FROM users WHERE username=%s LIMIT 1",
            (username,),
        )['data'])

    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    code = generate_verification_code()
    email = row["email"]
    verification_codes[email] = {
        "code": code,
        "expires_at": datetime.now() + timedelta(minutes=10),
        "user_data": {"id": row["id"], "username": row["username"], "email": row["email"]},
    }

    try:
        send_verification_email(email, code)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send verification email")

    return {
        "ok": True,
        "requires_verification": True,
        "message": "Verification code sent to your email",
        "email": email,
    }


@app.post("/api/login/verify")
def verify_login_code(payload: VerifyCodeRequest):
    email = payload.email.strip().lower()
    code = payload.code.strip()

    if email not in verification_codes:
        raise HTTPException(status_code=400, detail="No verification code found. Please login again.")

    stored_data = verification_codes[email]

    if datetime.now() > stored_data["expires_at"]:
        del verification_codes[email]
        raise HTTPException(status_code=400, detail="Verification code expired. Please login again.")

    if stored_data["code"] != code:
        raise HTTPException(status_code=401, detail="Invalid verification code")

    user_data = stored_data["user_data"]
    del verification_codes[email]

    return {"ok": True, "token": create_access_token(user_data["id"]), "user": user_data}


class ResendCodeRequest(BaseModel):
    email: str


@app.post("/api/login/resend")
def resend_verification_code(payload: ResendCodeRequest):
    email = payload.email.strip().lower()

    if email not in verification_codes:
        raise HTTPException(
            status_code=400,
            detail="No active verification session found. Please login again.",
        )

    stored_data = verification_codes[email]
    code = generate_verification_code()
    verification_codes[email] = {
        "code": code,
        "expires_at": datetime.now() + timedelta(minutes=10),
        "user_data": stored_data["user_data"],
    }

    try:
        send_verification_email(email, code)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send verification email")

    return {"ok": True, "message": "New verification code sent to your email"}


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

    try:
        with db() as client:
            with client.transaction() as tx:
                if tx.execute("SELECT id FROM users WHERE username=%s LIMIT 1", (username,))['data']:
                    raise HTTPException(status_code=409, detail="Username already exists")
                result = tx.execute(
                    "INSERT INTO users (email, username, password_hash) VALUES (%s, %s, %s)",
                    (email, username, pw_hash),
                )
                user_id = result['lastrowid']

        return {"ok": True, "token": create_access_token(user_id), "user": {"id": user_id, "username": username, "email": email}}
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Server error")


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

    if len(username) > 32:
        raise HTTPException(status_code=400, detail="Username must be less than 32 chars")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    with db() as client:
        if client.execute("SELECT id FROM users WHERE username=%s LIMIT 1", (username,))['data']:
            raise HTTPException(status_code=409, detail="Username already exists")

    return {"ok": True, "user": {"username": username, "email": email}}


@app.post("/api/signup/complete_signup")
def complete_signup(payload: SignupCompleteRequest):
    email = payload.email.strip().lower()
    username = payload.username.strip()
    password = payload.password
    avatar_base64 = payload.avatar_path
    bio = payload.bio.strip()

    if len(username) > 32:
        raise HTTPException(status_code=400, detail="Username must be less than 32 chars")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    if len(bio) > 200:
        raise HTTPException(status_code=400, detail="Bio must be less than 200 chars")

    if not avatar_base64:
        avatar_path = None
    elif avatar_base64.startswith("data:image"):
        avatar_path = save_base64_image(avatar_base64) or None
    else:
        avatar_path = avatar_base64

    pw_hash = hash_password(password)

    try:
        with db() as client:
            with client.transaction() as tx:
                if tx.execute("SELECT id FROM users WHERE username=%s LIMIT 1", (username,))['data']:
                    raise HTTPException(status_code=409, detail="Username already exists")
                result = tx.execute(
                    "INSERT INTO users (email, username, password_hash, bio, profile_image_url)"
                    " VALUES (%s, %s, %s, %s, %s)",
                    (email, username, pw_hash, bio, avatar_path),
                )
                user_id = result['lastrowid']

        return {
            "ok": True,
            "token": create_access_token(user_id),
            "user": {
                "id": user_id,
                "username": username,
                "email": email,
                "bio": bio,
                "avatar_path": avatar_path,
            },
        }
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


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
    is_following: bool = False
    tags: List[str] = []
    media_items: List[MediaItemResponse] = []


@app.post("/api/posts/create")
def create_post(payload: CreatePostRequest, current_user_id: int = Depends(get_current_user)):
    user_id = current_user_id
    caption = payload.caption.strip() if payload.caption else ""
    tags = payload.tags
    media_items = payload.media_items

    if not media_items or len(media_items) > 10:
        raise HTTPException(status_code=400, detail="Provide between 1 and 10 media items")

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

    try:
        with db() as client:
            with client.transaction() as tx:
                actor = _one(tx.execute(
                    "SELECT id, username, profile_image_url FROM users WHERE id=%s LIMIT 1",
                    (user_id,),
                )['data'])
                if not actor:
                    raise HTTPException(status_code=404, detail="User not found")

                post_id = tx.execute(
                    "INSERT INTO posts (user_id, caption, media_url, media_type) VALUES (%s, %s, %s, %s)",
                    (user_id, caption, first["url"], first["type"]),
                )['lastrowid']

                for i, m in enumerate(saved_media):
                    tx.execute(
                        "INSERT INTO post_media (post_id, media_url, media_type, position)"
                        " VALUES (%s, %s, %s, %s)",
                        (post_id, m["url"], m["type"], i),
                    )

                seen = set()
                normalized_tags = []
                for tag in tags:
                    t = tag.lstrip("#").strip().lower()
                    if t and t not in seen:
                        seen.add(t)
                        normalized_tags.append(t)
                    if len(normalized_tags) == 20:
                        break
                for t in normalized_tags:
                    tx.execute(
                        "INSERT INTO post_tags (post_id, tag) VALUES (%s, %s)",
                        (post_id, t),
                    )

            # Notify followers — non-fatal, separate transaction
            try:
                follower_ids = [
                    r['follower_id']
                    for r in client.execute(
                        "SELECT follower_id FROM follows WHERE following_id=%s", (user_id,)
                    )['data']
                ]
                if follower_ids:
                    with client.transaction() as tx:
                        for fid in follower_ids:
                            tx.execute(
                                "INSERT INTO notifications"
                                " (user_id, actor_user_id, actor_username,"
                                "  actor_profile_image_url, post_id, post_media_url)"
                                " VALUES (%s, %s, %s, %s, %s, %s)",
                                (fid, user_id, actor['username'],
                                 actor['profile_image_url'], post_id, first["url"]),
                            )
            except Exception as notif_err:
                print(f"Notification insert error (non-fatal): {notif_err}")

        return {"ok": True, "post_id": post_id, "media_url": first["url"]}

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Create post error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@app.get("/api/posts/feed")
def get_posts_feed(user_id: int, limit: int = 20, offset: int = 0):
    try:
        with db() as client:
            posts = client.execute(
                """
                SELECT
                    p.id, p.user_id, p.caption, p.media_url, p.media_type,
                    p.likes_count, p.comments_count, p.created_at,
                    u.username, u.profile_image_url
                FROM posts p
                JOIN users u ON p.user_id = u.id
                ORDER BY p.created_at DESC
                LIMIT %s OFFSET %s
                """,
                (limit, offset),
            )['data']

            # show to the user the last 5 posts only for demo
            posts = posts[:5]

            tags_map = {}
            media_map = {}
            liked_post_ids = set()
            followed_user_ids = set()

            if posts:
                post_ids = [p["id"] for p in posts]
                ph = ",".join(["%s"] * len(post_ids))

                for row in client.execute(
                    f"SELECT post_id, tag FROM post_tags WHERE post_id IN ({ph})",
                    post_ids,
                )['data']:
                    tags_map.setdefault(row["post_id"], []).append(row["tag"])

                for row in client.execute(
                    f"SELECT post_id, media_url, media_type, position"
                    f" FROM post_media WHERE post_id IN ({ph}) ORDER BY post_id, position",
                    post_ids,
                )['data']:
                    media_map.setdefault(row["post_id"], []).append(
                        MediaItemResponse(
                            media_url=row["media_url"],
                            media_type=row["media_type"],
                            position=row["position"],
                        )
                    )

                if user_id:
                    for row in client.execute(
                        f"SELECT post_id FROM likes WHERE user_id=%s AND post_id IN ({ph})",
                        [user_id] + post_ids,
                    )['data']:
                        liked_post_ids.add(row["post_id"])

                    author_ids = list({p["user_id"] for p in posts})
                    if author_ids:
                        aph = ",".join(["%s"] * len(author_ids))
                        for row in client.execute(
                            f"SELECT following_id FROM follows"
                            f" WHERE follower_id=%s AND following_id IN ({aph})",
                            [user_id] + author_ids,
                        )['data']:
                            followed_user_ids.add(row["following_id"])

        results = []
        for post in posts:
            items = media_map.get(post["id"]) or [
                MediaItemResponse(
                    media_url=post["media_url"],
                    media_type=post["media_type"],
                    position=0,
                )
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
                is_liked_by_user=post["id"] in liked_post_ids,
                is_following=post["user_id"] in followed_user_ids,
            ))
        return {"ok": True, "posts": results}

    except Exception as e:
        print(f"Get posts feed error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@app.get("/api/posts/{post_id}")
def get_post(post_id: int, user_id: int = None):
    with db() as client:
        post = _one(client.execute(
            """
            SELECT
                p.id, p.user_id, p.caption, p.media_url, p.media_type,
                p.likes_count, p.comments_count, p.created_at,
                u.username, u.profile_image_url
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = %s
            LIMIT 1
            """,
            (post_id,),
        )['data'])
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        is_liked = False
        if user_id:
            is_liked = bool(client.execute(
                "SELECT 1 FROM likes WHERE post_id=%s AND user_id=%s LIMIT 1",
                (post_id, user_id),
            )['data'])

        post_tags = [
            r["tag"]
            for r in client.execute(
                "SELECT tag FROM post_tags WHERE post_id=%s", (post_id,)
            )['data']
        ]

        media_rows = client.execute(
            "SELECT media_url, media_type, position FROM post_media"
            " WHERE post_id=%s ORDER BY position",
            (post_id,),
        )['data']
        media_items = [
            MediaItemResponse(
                media_url=r["media_url"], media_type=r["media_type"], position=r["position"]
            )
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
            media_items=media_items,
        ),
    }


# -----------------------
# Likes
# -----------------------

class LikeRequest(BaseModel):
    user_id: int
    post_id: int


@app.post("/api/posts/like")
def like_post(payload: LikeRequest, current_user_id: int = Depends(get_current_user)):
    user_id = current_user_id
    post_id = payload.post_id

    try:
        with db() as client:
            with client.transaction() as tx:
                if not tx.execute("SELECT id FROM posts WHERE id=%s LIMIT 1", (post_id,))['data']:
                    raise HTTPException(status_code=404, detail="Post not found")

                existing = _one(tx.execute(
                    "SELECT id FROM likes WHERE user_id=%s AND post_id=%s LIMIT 1",
                    (user_id, post_id),
                )['data'])

                if existing:
                    tx.execute("DELETE FROM likes WHERE post_id=%s AND user_id=%s", (post_id, user_id))
                    tx.execute(
                        "UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id=%s",
                        (post_id,),
                    )
                    liked = False
                else:
                    tx.execute("INSERT INTO likes (post_id, user_id) VALUES (%s, %s)", (post_id, user_id))
                    tx.execute(
                        "UPDATE posts SET likes_count = likes_count + 1 WHERE id=%s", (post_id,)
                    )
                    liked = True

        return {"ok": True, "liked": liked, "message": "Post liked" if liked else "Post unliked"}

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Like post error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@app.get("/api/posts/{post_id}/likes")
def get_post_likes(post_id: int, limit: int = 50, offset: int = 0):
    with db() as client:
        if not client.execute("SELECT id FROM posts WHERE id=%s LIMIT 1", (post_id,))['data']:
            raise HTTPException(status_code=404, detail="Post not found")

        likes = client.execute(
            """
            SELECT u.id, u.username, u.profile_image_url, l.created_at
            FROM likes l
            JOIN users u ON l.user_id = u.id
            WHERE l.post_id = %s
            ORDER BY l.created_at DESC
            LIMIT %s OFFSET %s
            """,
            (post_id, limit, offset),
        )['data']

    result = [
        {
            "user_id": like["id"],
            "username": like["username"],
            "profile_image_url": like["profile_image_url"],
            "liked_at": like.get("created_at"),
        }
        for like in likes
    ]
    return {"ok": True, "likes": result}


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
def create_comment(payload: CreateCommentRequest, current_user_id: int = Depends(get_current_user)):
    post_id = payload.post_id
    user_id = current_user_id
    content = payload.content.strip()

    if not content:
        raise HTTPException(status_code=400, detail="Comment content cannot be empty")
    if len(content) > 500:
        raise HTTPException(status_code=400, detail="Comment content must be less than 500 chars")

    try:
        with db() as client:
            with client.transaction() as tx:
                if not tx.execute("SELECT id FROM posts WHERE id=%s LIMIT 1", (post_id,))['data']:
                    raise HTTPException(status_code=404, detail="Post not found")
                if not tx.execute("SELECT id FROM users WHERE id=%s LIMIT 1", (user_id,))['data']:
                    raise HTTPException(status_code=404, detail="User not found")

                comment_id = tx.execute(
                    "INSERT INTO comments (post_id, user_id, comment_text) VALUES (%s, %s, %s)",
                    (post_id, user_id, content),
                )['lastrowid']
                tx.execute(
                    "UPDATE posts SET comments_count = comments_count + 1 WHERE id=%s",
                    (post_id,),
                )

        return {"ok": True, "comment_id": comment_id, "message": "Comment created"}

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Create comment error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@app.get("/api/posts/{post_id}/comments")
def get_post_comments(post_id: int, limit: int = 50, offset: int = 0):
    with db() as client:
        comments = client.execute(
            """
            SELECT
                c.id, c.post_id, c.user_id, c.comment_text, c.created_at,
                u.username, u.profile_image_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = %s
            ORDER BY c.created_at ASC
            LIMIT %s OFFSET %s
            """,
            (post_id, limit, offset),
        )['data']

    result = [
        CommentRequest(
            id=c["id"],
            post_id=c["post_id"],
            user_id=c["user_id"],
            username=c["username"],
            profile_image_url=c["profile_image_url"],
            content=c["comment_text"],
            created_at=c["created_at"],
        )
        for c in comments
    ]
    return {"ok": True, "comments": result}


# -----------------------
# Users
# -----------------------

@app.get("/api/users/{user_id}")
def get_user_profile(user_id: int):
    with db() as client:
        row = _one(client.execute(
            "SELECT id, username, profile_image_url, tour_completed FROM users WHERE id=%s LIMIT 1",
            (user_id,),
        )['data'])
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True, "user": row}


@app.post("/api/users/complete_tour")
async def complete_tour(current_user_id: int = Depends(get_current_user)):
    with db() as client:
        client.execute("UPDATE users SET tour_completed=1 WHERE id=%s", (current_user_id,))
    return {"ok": True, "message": "Tour marked as completed"}

class UpdateProfileRequest(BaseModel):
    user_id: int
    username: str = None
    email: str = None
    bio: str = None
    profile_image: str = None  # base64 data URI or existing path


@app.put("/api/users/{user_id}/update")
def update_profile(user_id: int, payload: UpdateProfileRequest, current_user_id: int = Depends(get_current_user)):
    if current_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    try:
        with db() as client:
            user = _one(client.execute(
                "SELECT id, username, email FROM users WHERE id=%s LIMIT 1", (user_id,)
            )['data'])
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            updates = {}

            if payload.username is not None:
                username = payload.username.strip()
                if not username:
                    raise HTTPException(status_code=400, detail="Username cannot be empty")
                if len(username) > 32:
                    raise HTTPException(status_code=400, detail="Username must be less than 32 chars")
                if username != user["username"]:
                    if client.execute(
                        "SELECT id FROM users WHERE username=%s AND id != %s LIMIT 1",
                        (username, user_id),
                    )['data']:
                        raise HTTPException(status_code=409, detail="Username already taken")
                updates["username"] = username

            if payload.email is not None:
                email = payload.email.strip().lower()
                if "@" not in email:
                    raise HTTPException(status_code=400, detail="Invalid email")
                updates["email"] = email

            if payload.bio is not None:
                bio = payload.bio.strip()
                if len(bio) > 200:
                    raise HTTPException(status_code=400, detail="Bio must be less than 200 chars")
                updates["bio"] = bio

            if payload.profile_image is not None:
                if payload.profile_image.startswith("data:image"):
                    avatar_path = save_base64_image(payload.profile_image)
                    if avatar_path:
                        updates["profile_image_url"] = avatar_path
                elif payload.profile_image:
                    updates["profile_image_url"] = payload.profile_image

            if updates:
                set_clause = ", ".join([f"{k}=%s" for k in updates.keys()])
                with client.transaction() as tx:
                    tx.execute(
                        f"UPDATE users SET {set_clause} WHERE id=%s",
                        list(updates.values()) + [user_id],
                    )

            updated_user = _one(client.execute(
                "SELECT id, username, email, bio, profile_image_url FROM users WHERE id=%s LIMIT 1",
                (user_id,),
            )['data'])

        return {"ok": True, "user": updated_user}

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Update profile error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@app.delete("/api/posts/{post_id}")
def delete_post(post_id: int, current_user_id: int = Depends(get_current_user)):
    try:
        with db() as client:
            with client.transaction() as tx:
                post = _one(tx.execute(
                    "SELECT id, user_id FROM posts WHERE id=%s LIMIT 1", (post_id,)
                )['data'])
                if not post:
                    raise HTTPException(status_code=404, detail="Post not found")
                if post["user_id"] != current_user_id:
                    raise HTTPException(status_code=403, detail="Not authorized to delete this post")
                tx.execute("DELETE FROM posts WHERE id=%s", (post_id,))

        return {"ok": True}

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Delete post error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@app.get("/api/users/by-username/{username}")
def get_user_by_username(username: str):
    with db() as client:
        user = _one(client.execute(
            "SELECT id, username FROM users WHERE username = %s", (username,)
        )['data'])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True, "user": user}


@app.get("/api/users/{user_id}/profile")
def get_full_profile(user_id: int, viewer_id: int = None):
    with db() as client:
        user = _one(client.execute(
            "SELECT id, username, bio, profile_image_url FROM users WHERE id=%s LIMIT 1",
            (user_id,),
        )['data'])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        posts_count = client.execute(
            "SELECT COUNT(*) AS cnt FROM posts WHERE user_id=%s", (user_id,)
        )['data'][0]['cnt']
        followers_count = client.execute(
            "SELECT COUNT(*) AS cnt FROM follows WHERE following_id=%s", (user_id,)
        )['data'][0]['cnt']
        following_count = client.execute(
            "SELECT COUNT(*) AS cnt FROM follows WHERE follower_id=%s", (user_id,)
        )['data'][0]['cnt']

        is_followed_by_viewer = False
        if viewer_id and viewer_id != user_id:
            is_followed_by_viewer = bool(client.execute(
                "SELECT 1 FROM follows WHERE follower_id=%s AND following_id=%s LIMIT 1",
                (viewer_id, user_id),
            )['data'])

    return {
        "ok": True,
        "profile": {
            **user,
            "posts_count": posts_count,
            "followers_count": followers_count,
            "following_count": following_count,
            "is_followed_by_viewer": is_followed_by_viewer,
        },
    }


@app.get("/api/users/{user_id}/posts")
def get_user_posts(user_id: int, viewer_id: int = None):
    with db() as client:
        posts = client.execute(
            """
            SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type,
                   p.likes_count, p.comments_count, p.created_at,
                   u.username, u.profile_image_url
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = %s
            ORDER BY p.created_at DESC
            """,
            (user_id,),
        )['data']

        if not posts:
            return {"ok": True, "posts": []}

        post_ids = [p["id"] for p in posts]
        ph = ",".join(["%s"] * len(post_ids))

        tags_map = {}
        for row in client.execute(
            f"SELECT post_id, tag FROM post_tags WHERE post_id IN ({ph})", post_ids
        )['data']:
            tags_map.setdefault(row["post_id"], []).append(row["tag"])

        media_map = {}
        for row in client.execute(
            f"SELECT post_id, media_url, media_type, position"
            f" FROM post_media WHERE post_id IN ({ph}) ORDER BY post_id, position",
            post_ids,
        )['data']:
            media_map.setdefault(row["post_id"], []).append(
                {"media_url": row["media_url"], "media_type": row["media_type"], "position": row["position"]}
            )

        liked_post_ids = set()
        if viewer_id:
            for row in client.execute(
                f"SELECT post_id FROM likes WHERE user_id=%s AND post_id IN ({ph})",
                [viewer_id] + post_ids,
            )['data']:
                liked_post_ids.add(row["post_id"])

    results = []
    for post in posts:
        items = media_map.get(post["id"]) or [
            {"media_url": post["media_url"], "media_type": post["media_type"], "position": 0}
        ]
        results.append({
            **post,
            "tags": tags_map.get(post["id"], []),
            "media_items": items,
            "is_liked_by_user": post["id"] in liked_post_ids,
            "created_at": post.get("created_at"),
        })

    return {"ok": True, "posts": results}


@app.get("/api/users/{user_id}/liked_posts")
def get_user_liked_posts(user_id: int):
    with db() as client:
        posts = client.execute(
            """
            SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type,
                   p.likes_count, p.comments_count, p.created_at,
                   u.username, u.profile_image_url
            FROM likes l
            JOIN posts p ON l.post_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE l.user_id = %s
            ORDER BY l.created_at DESC
            """,
            (user_id,),
        )['data']

        if not posts:
            return {"ok": True, "posts": []}

        post_ids = [p["id"] for p in posts]
        ph = ",".join(["%s"] * len(post_ids))

        media_map = {}
        for row in client.execute(
            f"SELECT post_id, media_url, media_type, position"
            f" FROM post_media WHERE post_id IN ({ph}) ORDER BY post_id, position",
            post_ids,
        )['data']:
            media_map.setdefault(row["post_id"], []).append(
                {"media_url": row["media_url"], "media_type": row["media_type"], "position": row["position"]}
            )

    results = []
    for post in posts:
        items = media_map.get(post["id"]) or [
            {"media_url": post["media_url"], "media_type": post["media_type"], "position": 0}
        ]
        results.append({
            **post,
            "tags": [],
            "media_items": items,
            "is_liked_by_user": True,
            "created_at": post.get("created_at"),
        })

    return {"ok": True, "posts": results}


@app.get("/api/users/{user_id}/followers")
def get_followers(user_id: int, viewer_id: int = None):
    with db() as client:
        followers = client.execute(
            """
            SELECT u.id AS user_id, u.username, u.profile_image_url
            FROM follows f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = %s
            ORDER BY f.created_at DESC
            """,
            (user_id,),
        )['data']

        if viewer_id and followers:
            fids = [f["user_id"] for f in followers]
            fp = ",".join(["%s"] * len(fids))
            viewer_following = {
                row["following_id"]
                for row in client.execute(
                    f"SELECT following_id FROM follows WHERE follower_id=%s AND following_id IN ({fp})",
                    [viewer_id] + fids,
                )['data']
            }
            for f in followers:
                f["is_following"] = f["user_id"] in viewer_following
        else:
            for f in followers:
                f["is_following"] = False

    return {"ok": True, "followers": followers}


@app.get("/api/users/{user_id}/following")
def get_following(user_id: int, viewer_id: int = None):
    with db() as client:
        following = client.execute(
            """
            SELECT u.id AS user_id, u.username, u.profile_image_url
            FROM follows f
            JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = %s
            ORDER BY f.created_at DESC
            """,
            (user_id,),
        )['data']

        if viewer_id and following:
            fids = [f["user_id"] for f in following]
            fp = ",".join(["%s"] * len(fids))
            viewer_following = {
                row["following_id"]
                for row in client.execute(
                    f"SELECT following_id FROM follows WHERE follower_id=%s AND following_id IN ({fp})",
                    [viewer_id] + fids,
                )['data']
            }
            for f in following:
                f["is_following"] = f["user_id"] in viewer_following
        else:
            for f in following:
                f["is_following"] = False

    return {"ok": True, "following": following}


def get_tier(aura: int) -> dict:
    if aura >= 300:
        return {"name": "Gigachad"}
    elif aura >= 200:
        return {"name": "Certified Sigma"}
    elif aura >= 100:
        return {"name": "Rising Sigma"}
    elif aura >= 20:
        return {"name": "Sigma Wannabe"}
    else:
        return {"name": "Normie"}


@app.get("/api/users/{user_id}/aura")
def get_user_aura(user_id: int):
    try:
        with db() as client:
            components = client.execute(
                """
                SELECT
                    (SELECT COUNT(*) FROM posts WHERE user_id=%s) AS posts_count,
                    (SELECT COUNT(*) FROM follows WHERE following_id=%s) AS followers_count,
                    (SELECT COALESCE(SUM(likes_count), 0) AS total_likes FROM posts WHERE user_id = %s) AS total_likes,
                    (SELECT COALESCE(SUM(comments_count), 0) AS total_comments FROM posts WHERE user_id = %s) AS total_comments
                """,
                (user_id, user_id, user_id, user_id),
            )['data'][0]
            components = {k: int(v) for k, v in components.items()}
            aura = components["posts_count"] * 2 + components["followers_count"] * 10 + components["total_likes"] * 3 + components["total_comments"] * 5
        return {"ok": True, "aura": aura, "tier": get_tier(aura), "breakdown": components}
            
    except Exception as e:
        print(f"Get user aura error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


class FollowRequest(BaseModel):
    follower_id: int
    following_id: int


@app.post("/api/users/follow")
def toggle_follow(payload: FollowRequest, current_user_id: int = Depends(get_current_user)):
    follower_id = current_user_id
    following_id = payload.following_id

    if follower_id == following_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    try:
        with db() as client:
            with client.transaction() as tx:
                if not tx.execute(
                    "SELECT id FROM users WHERE id=%s LIMIT 1", (following_id,)
                )['data']:
                    raise HTTPException(status_code=404, detail="User not found")

                existing = _one(tx.execute(
                    "SELECT id FROM follows WHERE follower_id=%s AND following_id=%s LIMIT 1",
                    (follower_id, following_id),
                )['data'])

                if existing:
                    tx.execute(
                        "DELETE FROM follows WHERE follower_id=%s AND following_id=%s",
                        (follower_id, following_id),
                    )
                    result = {"ok": True, "following": False}
                else:
                    tx.execute(
                        "INSERT INTO follows (follower_id, following_id) VALUES (%s, %s)",
                        (follower_id, following_id),
                    )
                    result = {"ok": True, "following": True}

        return result

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Follow toggle error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@app.get("/api/comments/{comment_id}")
def delete_comment(comment_id: int, current_user_id: int = Depends(get_current_user)):
    try:
        with db() as client:
            with client.transaction() as tx:
                comment = _one(tx.execute(
                    "SELECT id, post_id, user_id FROM comments WHERE id=%s LIMIT 1",
                    (comment_id,),
                )['data'])
                if not comment:
                    raise HTTPException(status_code=404, detail="Comment not found")
                if comment["user_id"] != current_user_id:
                    raise HTTPException(status_code=403, detail="You can only delete your own comments")

                tx.execute("DELETE FROM comments WHERE id=%s", (comment_id,))
                tx.execute(
                    "UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id=%s",
                    (comment["post_id"],),
                )

        return {"ok": True, "message": "Comment deleted"}

    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Delete comment error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


# -----------------------
# Tags
# -----------------------

@app.get("/api/tags/suggestions")
def tag_suggestions(q: str, limit: int = 8):
    q = q.strip().lstrip("#").lower()
    if not q:
        return {"ok": True, "tags": []}
    try:
        with db() as client:
            tags = client.execute(
                """
                SELECT tag, COUNT(*) AS post_count
                FROM post_tags
                WHERE tag LIKE %s
                GROUP BY tag
                ORDER BY post_count DESC, tag
                LIMIT %s
                """,
                (f"{q}%", limit),
            )['data']
        return {"ok": True, "tags": tags}
    except Exception as e:
        print(f"Tag suggestions error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


# -----------------------
# Search
# -----------------------

@app.get("/api/search")
def search(q: str, user_id: int = None, limit: int = 20):
    q = q.strip()
    if not q:
        return {"ok": True, "users": [], "posts": []}

    like_q = f"%{q}%"
    tag_q = q.lstrip("#").lower()

    try:
        with db() as client:
            # Search users by username or bio
            users = client.execute(
                """
                SELECT id, username, bio, profile_image_url
                FROM users
                WHERE username LIKE %s OR bio LIKE %s
                ORDER BY username
                LIMIT %s
                """,
                (like_q, like_q, limit),
            )['data']

            # Check which users the viewer is already following
            if user_id and users:
                uids = [u["id"] for u in users]
                up = ",".join(["%s"] * len(uids))
                viewer_following = {
                    row["following_id"]
                    for row in client.execute(
                        f"SELECT following_id FROM follows WHERE follower_id=%s AND following_id IN ({up})",
                        [user_id] + uids,
                    )['data']
                }
                for u in users:
                    u["is_following"] = u["id"] in viewer_following
            else:
                for u in users:
                    u["is_following"] = False

            # Search posts by caption or tags
            posts_by_caption = client.execute(
                """
                SELECT DISTINCT p.id, p.user_id, p.caption, p.media_url, p.media_type,
                       p.likes_count, p.comments_count, p.created_at,
                       u.username, u.profile_image_url
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.caption LIKE %s
                ORDER BY p.created_at DESC
                LIMIT %s
                """,
                (like_q, limit),
            )['data']

            posts_by_tag = client.execute(
                """
                SELECT DISTINCT p.id, p.user_id, p.caption, p.media_url, p.media_type,
                       p.likes_count, p.comments_count, p.created_at,
                       u.username, u.profile_image_url
                FROM posts p
                JOIN users u ON p.user_id = u.id
                JOIN post_tags pt ON pt.post_id = p.id
                WHERE pt.tag LIKE %s
                ORDER BY p.created_at DESC
                LIMIT %s
                """,
                (f"%{tag_q}%", limit),
            )['data']

            # Merge and deduplicate posts
            seen_ids = set()
            posts = []
            for post in posts_by_caption + posts_by_tag:
                if post["id"] not in seen_ids:
                    seen_ids.add(post["id"])
                    posts.append(post)
            posts = posts[:limit]

            if posts:
                post_ids = [p["id"] for p in posts]
                ph = ",".join(["%s"] * len(post_ids))

                tags_map = {}
                for row in client.execute(
                    f"SELECT post_id, tag FROM post_tags WHERE post_id IN ({ph})", post_ids
                )['data']:
                    tags_map.setdefault(row["post_id"], []).append(row["tag"])

                media_map = {}
                for row in client.execute(
                    f"SELECT post_id, media_url, media_type, position"
                    f" FROM post_media WHERE post_id IN ({ph}) ORDER BY post_id, position",
                    post_ids,
                )['data']:
                    media_map.setdefault(row["post_id"], []).append(
                        {"media_url": row["media_url"], "media_type": row["media_type"], "position": row["position"]}
                    )

                liked_post_ids = set()
                followed_user_ids = set()
                if user_id:
                    for row in client.execute(
                        f"SELECT post_id FROM likes WHERE user_id=%s AND post_id IN ({ph})",
                        [user_id] + post_ids,
                    )['data']:
                        liked_post_ids.add(row["post_id"])

                    author_ids = list({p["user_id"] for p in posts})
                    if author_ids:
                        aph = ",".join(["%s"] * len(author_ids))
                        for row in client.execute(
                            f"SELECT following_id FROM follows"
                            f" WHERE follower_id=%s AND following_id IN ({aph})",
                            [user_id] + author_ids,
                        )['data']:
                            followed_user_ids.add(row["following_id"])

                post_results = []
                for post in posts:
                    items = media_map.get(post["id"]) or [
                        {"media_url": post["media_url"], "media_type": post["media_type"], "position": 0}
                    ]
                    post_results.append({
                        **post,
                        "tags": tags_map.get(post["id"], []),
                        "media_items": items,
                        "is_liked_by_user": post["id"] in liked_post_ids,
                        "is_following": post["user_id"] in followed_user_ids,
                    })
            else:
                post_results = []

        return {"ok": True, "users": users, "posts": post_results}

    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


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


class GeminiRequest(BaseModel):
    prompt: str
    existing_tags: list[str] = []


@app.post("/ask_ai")
def ask_ai(data: GeminiRequest):
    prompt = data.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    try:
        response = get_gemini_response(prompt, data.existing_tags)
        return {"ok": True, "response": response}
    except Exception as e:
        print(f"Gemini API error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get response from AI service")


# -----------------------
# Notifications
# -----------------------

@app.get("/api/notifications")
def get_notifications(user_id: int):
    try:
        with db() as client:
            notifications = client.execute(
                """
                SELECT id, actor_user_id, actor_username, actor_profile_image_url,
                       post_id, post_media_url, is_read, created_at
                FROM notifications
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 50
                """,
                (user_id,),
            )['data']

        unread_count = sum(1 for n in notifications if not n["is_read"])
        return {"ok": True, "notifications": notifications, "unread_count": unread_count}

    except Exception as e:
        print(f"Get notifications error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@app.post("/api/notifications/read")
def mark_notifications_read(payload: dict, current_user_id: int = Depends(get_current_user)):
    user_id = current_user_id
    try:
        with db() as client:
            with client.transaction() as tx:
                tx.execute(
                    "UPDATE notifications SET is_read=1 WHERE user_id=%s AND is_read=0",
                    (user_id,),
                )
        return {"ok": True}
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Mark notifications read error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


# -----------------------
# chats and messages
# -----------------------

@app.get("/api/{user_id}/chats")
def get_user_chats(user_id: int):
    try:
        with db() as client:
            chats = client.execute(
                """
                SELECT c.id AS chat_id, c.is_group, c.name AS chat_name, c.created_at,
                       u.id AS other_user_id, u.username AS other_username, u.profile_image_url AS other_profile_image_url,
                       (SELECT m.message_text FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
                       (SELECT m.created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_time
                FROM chats c
                JOIN chat_participants cp ON c.id = cp.chat_id
                JOIN users u ON (c.is_group = FALSE AND ((cp.user_id = %s AND u.id = cp.other_user_id) OR (cp.other_user_id = %s AND u.id = cp.user_id)))
                WHERE cp.user_id = %s OR cp.other_user_id = %s
                GROUP BY c.id
                ORDER BY last_message_time DESC
                """,
                (user_id, user_id, user_id, user_id),
            )['data']
        return {"ok": True, "chats": chats}
    except Exception as e:
        print(f"Get user chats error: {e}")
        raise HTTPException(status_code=500, detail="Server error")