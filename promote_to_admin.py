import os
import sys

USERNAME = "ggg"
# ----------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

ssl_ca = os.getenv("DB_SSL_CA")
if ssl_ca and not os.path.isabs(ssl_ca):
    os.environ["DB_SSL_CA"] = os.path.normpath(os.path.join(BACKEND_DIR, ssl_ca))

from database import db

with db() as client:
    rows = client.execute(
        "SELECT id, username, is_admin FROM users WHERE username=%s LIMIT 1",
        (USERNAME,),
    )["data"]

    if not rows:
        print(f"Error: user '{USERNAME}' not found.")
        sys.exit(1)

    user = rows[0]
    if user["is_admin"]:
        print(f"'{USERNAME}' is already an admin.")
    else:
        client.execute("UPDATE users SET is_admin=1 WHERE id=%s", (user["id"],))
        print(f"Success: '{USERNAME}' has been promoted to admin.")
