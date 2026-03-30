import os
import base64
import uuid
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))

# Paths are relative to backend/, not utils/
_BACKEND_DIR = Path(BASE_DIR).parent
UPLOAD_DIR = _BACKEND_DIR / "uploads" / "avatars"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
POSTS_UPLOAD_DIR = _BACKEND_DIR / "uploads" / "posts"
POSTS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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


def normalize_tags(tags: list) -> list:
    seen = set()
    result = []
    for tag in tags:
        t = tag.lstrip("#").strip().lower()
        if t and t not in seen:
            seen.add(t)
            result.append(t)
        if len(result) == 20:
            break
    return result
