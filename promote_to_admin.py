import os
import sys
import mysql.connector
from dotenv import load_dotenv

USERNAME = "bb"
# ----------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "backend", ".env"))

conn = mysql.connector.connect(
    host=os.getenv("DB_HOST", "127.0.0.1"),
    port=int(os.getenv("DB_PORT", "3306")),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "sigmas_hub"),
    autocommit=False,
)

cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT id, username, is_admin FROM users WHERE username=%s LIMIT 1", (USERNAME,))
user = cursor.fetchone()

if not user:
    print(f"Error: user '{USERNAME}' not found.")
    cursor.close()
    conn.close()
    sys.exit(1)

if user["is_admin"]:
    print(f"'{USERNAME}' is already an admin.")
else:
    cursor.execute("UPDATE users SET is_admin=1 WHERE id=%s", (user["id"],))
    conn.commit()
    print(f"Success: '{USERNAME}' has been promoted to admin.")

cursor.close()
conn.close()
