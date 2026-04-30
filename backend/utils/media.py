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
    """Decode a base64 image string and save it as a profile avatar.

    Args:
        base64_string: A base64-encoded image with a data URI header
                       (e.g. "data:image/png;base64,...").

    Returns:
        The public URL path to the saved file (e.g. "/uploads/avatars/abc.png"),
        or an empty string if the input is invalid or saving fails.
    """
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
    """Decode a base64 media string and save it as post media (image or video).

    Args:
        base64_string: A base64-encoded media file with a data URI header
                       (e.g. "data:image/jpeg;base64,..." or "data:video/mp4;base64,...").

    Returns:
        The public URL path to the saved file (e.g. "/uploads/posts/abc.mp4"),
        or an empty string if the input is invalid or saving fails.
    """
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
    """Clean and deduplicate a list of hashtag strings.

    Strips leading '#' characters, lowercases each tag, removes duplicates
    while preserving order, and limits the result to 20 tags.

    Args:
        tags: A list of raw tag strings (may include '#', uppercase, duplicates).

    Returns:
        A cleaned list of unique lowercase tag strings, up to 20 items.
    """
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
