import os
import bcrypt
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

_security = HTTPBearer()

# In-memory storage for verification codes (in production, use Redis or DB)
_verification_codes: dict = {}


def create_access_token(user_id: int) -> str:
    """Create a signed JWT token for the given user.

    Args:
        user_id: The ID of the user to encode into the token.

    Returns:
        A signed JWT string valid for 7 days.
    """
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(_security)) -> int:
    """Extract and validate the JWT token from the Authorization header.

    Intended to be used with FastAPI's Depends() in protected endpoints.
    FastAPI automatically reads the Bearer token from the request header and
    passes it here. If the token is valid, the user's ID is returned and
    injected into the endpoint. If not, a 401 error is raised before the
    endpoint runs.

    Args:
        credentials: The Bearer token extracted from the Authorization header by FastAPI.

    Returns:
        The authenticated user's ID as an integer.

    Raises:
        HTTPException(401): If the token is missing, invalid, or expired.
    """
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt.

    Generates a unique random salt each time, so the same password always
    produces a different hash. The original password is never stored.

    Args:
        password: The plain-text password to hash.

    Returns:
        A bcrypt-hashed password string safe to store in the database.
    """
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Check whether a plain-text password matches a stored bcrypt hash.

    Args:
        password: The plain-text password entered by the user.
        password_hash: The bcrypt hash stored in the database.

    Returns:
        True if the password matches the hash, False otherwise.
    """
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def generate_verification_code() -> str:
    """Generate a random 6-digit numeric verification code.

    Returns:
        A 6-digit code as a string (e.g. "483920").
    """
    return str(random.randint(100000, 999999))


MAX_VERIFICATION_ATTEMPTS = 5


def store_verification(email: str, user_data: dict, code: str):
    """Store a verification code in memory for a pending login.

    The entry expires automatically after 10 minutes. If a previous entry
    for the same email exists, it is overwritten.

    Args:
        email: The user's email address (used as the key).
        user_data: A dict containing the user's id, username, and email.
        code: The 6-digit verification code to store.
    """
    _verification_codes[email] = {
        "code": code,
        "expires_at": datetime.now() + timedelta(minutes=10),
        "user_data": user_data,
        "attempts": 0,
    }


def increment_verification_attempts(email: str) -> int:
    """Increment the failed attempt counter for a verification entry.

    Args:
        email: The email address of the verification entry.

    Returns:
        The updated number of failed attempts.
    """
    entry = _verification_codes.get(email)
    if entry:
        entry["attempts"] += 1
        return entry["attempts"]
    return 0


def get_verification(email: str) -> dict | None:
    """Retrieve a stored verification entry by email.

    Args:
        email: The email address to look up.

    Returns:
        The verification entry dict (with 'code', 'expires_at', 'user_data'),
        or None if no entry exists for that email.
    """
    return _verification_codes.get(email)


def delete_verification(email: str):
    """Remove a verification entry from memory.

    Called after successful verification or after expiry to clean up.
    Does nothing if no entry exists for the given email.

    Args:
        email: The email address whose entry should be deleted.
    """
    _verification_codes.pop(email, None)


def is_verification_expired(entry: dict) -> bool:
    """Check whether a verification entry has passed its expiry time.

    Args:
        entry: A verification entry dict containing an 'expires_at' datetime.

    Returns:
        True if the code has expired, False if it is still valid.
    """
    return datetime.now() > entry["expires_at"]
