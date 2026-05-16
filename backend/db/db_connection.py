import os
import mysql.connector
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))

def get_conn():
    """Create and return a new MySQL connection using environment variables.

    Reads DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME from the
    environment (loaded from .env). autocommit is disabled so the caller
    controls when to commit.

    Returns:
        A mysql.connector connection object ready for use.

    Raises:
        mysql.connector.Error: If the connection cannot be established.
    """
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "sigmas_hub"),
        autocommit=False,
    )
