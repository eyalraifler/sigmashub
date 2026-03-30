from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import db
from utils.auth import (
    hash_password, verify_password, create_access_token,
    generate_verification_code, store_verification, get_verification,
    delete_verification, is_verification_expired,
)
from utils.media import save_base64_image
from db.queries.users import get_user_auth_row, check_username_taken, create_user
from send_email import send_verification_email

router = APIRouter(prefix="/api")


class LoginRequest(BaseModel):
    username: str
    password: str


class VerifyCodeRequest(BaseModel):
    email: str
    code: str


class ResendCodeRequest(BaseModel):
    email: str


class SignupRequest(BaseModel):
    email: str
    username: str
    password: str


class SignupCompleteRequest(BaseModel):
    email: str
    username: str
    password: str
    avatar_path: str
    bio: str


@router.post("/login")
def login(payload: LoginRequest):
    username = payload.username.strip().lower()
    password = payload.password

    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing email/username or password")

    with db() as client:
        row = get_user_auth_row(client, username)

    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    code = generate_verification_code()
    store_verification(row["email"], {"id": row["id"], "username": row["username"], "email": row["email"]}, code)

    try:
        send_verification_email(row["email"], code)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send verification email")

    return {
        "ok": True,
        "requires_verification": True,
        "message": "Verification code sent to your email",
        "email": row["email"],
    }


@router.post("/login/verify")
def verify_login_code(payload: VerifyCodeRequest):
    email = payload.email.strip().lower()
    code = payload.code.strip()

    entry = get_verification(email)
    if not entry:
        raise HTTPException(status_code=400, detail="No verification code found. Please login again.")
    if is_verification_expired(entry):
        delete_verification(email)
        raise HTTPException(status_code=400, detail="Verification code expired. Please login again.")
    if entry["code"] != code:
        raise HTTPException(status_code=401, detail="Invalid verification code")

    user_data = entry["user_data"]
    delete_verification(email)
    return {"ok": True, "token": create_access_token(user_data["id"]), "user": user_data}


@router.post("/login/resend")
def resend_verification_code(payload: ResendCodeRequest):
    email = payload.email.strip().lower()

    entry = get_verification(email)
    if not entry:
        raise HTTPException(status_code=400, detail="No active verification session found. Please login again.")

    code = generate_verification_code()
    store_verification(email, entry["user_data"], code)

    try:
        send_verification_email(email, code)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send verification email")

    return {"ok": True, "message": "New verification code sent to your email"}


@router.post("/signup/check_user_available")
def check_user_available(payload: SignupRequest):
    email = payload.email.strip().lower()
    username = payload.username.strip()

    if len(username) > 32:
        raise HTTPException(status_code=400, detail="Username must be less than 32 chars")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    with db() as client:
        if check_username_taken(client, username):
            raise HTTPException(status_code=409, detail="Username already exists")

    return {"ok": True, "user": {"username": username, "email": email}}


@router.post("/signup")
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
                if check_username_taken(tx, username):
                    raise HTTPException(status_code=409, detail="Username already exists")
                user_id = create_user(tx, email, username, pw_hash)

        return {"ok": True, "token": create_access_token(user_id), "user": {"id": user_id, "username": username, "email": email}}
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/signup/complete_signup")
def complete_signup(payload: SignupCompleteRequest):
    email = payload.email.strip().lower()
    username = payload.username.strip()
    password = payload.password
    bio = payload.bio.strip()

    if len(username) > 32:
        raise HTTPException(status_code=400, detail="Username must be less than 32 chars")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    if len(bio) > 200:
        raise HTTPException(status_code=400, detail="Bio must be less than 200 chars")

    avatar_base64 = payload.avatar_path
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
                if check_username_taken(tx, username):
                    raise HTTPException(status_code=409, detail="Username already exists")
                user_id = create_user(tx, email, username, pw_hash, bio, avatar_path)

        return {
            "ok": True,
            "token": create_access_token(user_id),
            "user": {"id": user_id, "username": username, "email": email, "bio": bio, "avatar_path": avatar_path},
        }
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
