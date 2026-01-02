import os
import mysql.connector
from dotenv import load_dotenv

# Load backend/.env reliably (works no matter where you run from)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def get_conn():
    # 1. Connect to the server WITHOUT specifying a database first
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        autocommit=True, # Use True here just for the creation step
    )
    
    db_name = os.getenv("DB_NAME", "sigmas_hub")
    cur = conn.cursor()
    
    # 2. Create the database if it doesn't exist
    cur.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
    
    # 3. Tell the connection to use this database
    cur.execute(f"USE {db_name}")
    cur.close()
    
    return conn


USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(32) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    bio VARCHAR(200) NULL,
    profile_image_url VARCHAR(512) NULL,

    is_private TINYINT(1) NOT NULL DEFAULT 0,
    is_email_verified TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_username (username),
    INDEX idx_users_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""


def init_users_table(recreate: bool = False) -> None:
    conn = get_conn()
    cur = conn.cursor()
    try:
        if recreate:
            cur.execute("DROP TABLE IF EXISTS users;")
        cur.execute(USERS_TABLE)
        conn.commit()
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    recreate = os.getenv("RECREATE_TABLES", "0") == "1"
    init_users_table(recreate=recreate)
    print(f"users table ready (recreate={recreate})")
