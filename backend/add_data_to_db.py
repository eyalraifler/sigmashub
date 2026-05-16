"""Seed the database with 120 fake users and 1000 posts via the db_server."""
import random
import shutil
import sys
import os
import uuid

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_DIR = os.path.dirname(_BACKEND_DIR)
_IMAGES_SOURCE_DIR = os.path.join(_PROJECT_DIR, "images_for_posts")
_POSTS_UPLOAD_DIR = os.path.join(_BACKEND_DIR, "uploads", "posts")

sys.path.insert(0, _BACKEND_DIR)

# DB_SSL_CA in .env is relative to backend/ — resolve to absolute before any import
# that triggers load_dotenv, so RemoteDBClient finds the cert file.
def _fix_ssl_env():
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_BACKEND_DIR, ".env"))
    ssl_ca = os.getenv("DB_SSL_CA")
    if ssl_ca and not os.path.isabs(ssl_ca):
        os.environ["DB_SSL_CA"] = os.path.normpath(os.path.join(_BACKEND_DIR, ssl_ca))

_fix_ssl_env()

from db_client import RemoteDBClient
from utils.auth import hash_password
from db.queries.users import create_user, update_user_fields
from db.queries.posts import insert_post, insert_post_tags

HASHTAGS = [
    "fitness", "travel", "food", "hamster", "nature",
    "music", "art", "fashion", "technology", "gaming",
    "sports", "health", "lifestyle", "motivation", "humor",
    "beauty", "pets", "triple_t", "science", "books",
    "cooking", "cars", "hiking", "skibidi", "labubu",
    "coding", "movies", "67", "space", "business",
]

FIRST_NAMES = [
    "Alex", "Eliran", "Elior", "Amit", "Asaf",
    "Arial", "Jamie", "Yael", "Shimon", "Blake",
    "Cameron", "Aviv", "Emery", "Finley", "Harper",
    "Yuval", "Hunter", "Yoel", "Jesse", "Kai",
    "Lane", "Logan", "Roi", "Max", "Micah",
    "Nadav", "Meir", "Parker", "Eli", "Phoenix",
    "Itai", "Omer", "Yotam", "Robin", "Yair",
    "Ryan", "Ofek", "Sam", "Sawyer", "Matan",
    "Shawn", "Skyler", "Sterling", "Storm", "Eliyahu",
    "Ilay", "Terry", "Guy", "Tyler", "Ido",
]

LAST_NAMES = [
    "Adams", "Baker", "Brooks", "Carter", "Clark",
    "Collins", "Cook", "Cooper", "Davis", "Evans",
    "Foster", "Garcia", "Gray", "Green", "Hall",
    "Harris", "Hill", "Jackson", "James", "Johnson",
    "Jones", "Kelly", "King", "Lee", "Lewis",
    "Martin", "Martinez", "Miller", "Mitchell", "Moore",
    "Morgan", "Morris", "Nelson", "Parker", "Perez",
    "Phillips", "Reed", "Roberts", "Robinson", "Ross",
    "Scott", "Smith", "Stewart", "Taylor", "Thomas",
    "Thompson", "Turner", "Walker", "White", "Wilson",
]

CAPTIONS = [
    "Loving every moment of this! {}",
    "Can't get enough of {} lately.",
    "This is what {} looks like to me.",
    "My take on {} — what do you think?",
    "Obsessed with {} right now.",
    "A little {} to brighten your day.",
    "No better way to spend the day than with {}.",
    "Deep in my {} era.",
    "For everyone who loves {} as much as I do.",
    "Just another day exploring {}.",
    "Life is better with {}.",
    "Sharing my passion for {}.",
    "The {} grind never stops.",
    "Always inspired by {}.",
    "Found this gem while exploring {}.",
]

DEFAULT_PASSWORD = "jidvjivjidv892384782439!##@$#@"


def _build_tag_images() -> dict:
    """Scan images_for_posts/ and return {tag: [abs_path, ...]} for each folder that has images."""
    result = {}
    if not os.path.isdir(_IMAGES_SOURCE_DIR):
        print(f"  Warning: images folder not found at {_IMAGES_SOURCE_DIR}")
        return result
    for folder in os.listdir(_IMAGES_SOURCE_DIR):
        folder_path = os.path.join(_IMAGES_SOURCE_DIR, folder)
        if not os.path.isdir(folder_path):
            continue
        images = [
            os.path.join(folder_path, f)
            for f in os.listdir(folder_path)
            if f.lower().endswith((".jpeg", ".jpg", ".png", ".webp"))
        ]
        if images:
            result[folder] = images
    return result


def _copy_image_for_tag(tag: str, tag_images: dict) -> str:
    """Copy a random image from the given tag's folder into uploads/posts/ and return its URL."""
    os.makedirs(_POSTS_UPLOAD_DIR, exist_ok=True)
    src = random.choice(tag_images[tag])
    ext = os.path.splitext(src)[1].lower() or ".jpeg"
    dest_name = f"{uuid.uuid4()}{ext}"
    shutil.copy2(src, os.path.join(_POSTS_UPLOAD_DIR, dest_name))
    return f"/uploads/posts/{dest_name}"


def seed():
    tag_images = _build_tag_images()
    if not tag_images:
        print("No images found — aborting.")
        return
    available_tags = list(tag_images.keys())
    print(f"Found images for {len(available_tags)} topics: {available_tags}")

    pw_hash = hash_password(DEFAULT_PASSWORD)

    with RemoteDBClient() as client:
        # --- Insert 120 users ---
        user_ids = []
        print("Inserting users...")
        with client.transaction() as tx:
            for i in range(120):
                first = random.choice(FIRST_NAMES)
                last = random.choice(LAST_NAMES)
                username = f"{first.lower()}_{last.lower()}{i}"
                email = f"{username}@seedmail.dev"
                bio = f"Hi, I'm {first}. I love {random.choice(available_tags)} and {random.choice(available_tags)}."
                user_id = create_user(tx, email, username, pw_hash, bio=bio)
                update_user_fields(tx, user_id, {"onboarding_completed": 1, "is_email_verified": 1})
                user_ids.append(user_id)
        print(f"  Created {len(user_ids)} users.")

        # --- Insert 1000 posts ---
        print("Inserting posts...")
        with client.transaction() as tx:
            for _ in range(1000):
                user_id = random.choice(user_ids)
                tag = random.choice(available_tags)
                caption = random.choice(CAPTIONS).format(f"#{tag}") + f" #{tag}"
                media_url = _copy_image_for_tag(tag, tag_images)
                post_id = insert_post(tx, user_id, caption, media_url, "image")
                insert_post_tags(tx, post_id, [tag])
        print("  Created 1000 posts.")

    print("Done. All seed data committed.")
    print(f"Default password for all seed users: {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    seed()
