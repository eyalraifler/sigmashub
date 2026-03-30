import os
from dotenv import load_dotenv
from db_client import RemoteDBClient

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_HOST = os.getenv("DB_SERVER_HOST", "localhost")
DB_PORT = int(os.getenv("DB_SERVER_PORT", "5000"))


def db():
    """Create a RemoteDBClient connected to the DB server."""
    return RemoteDBClient(host=DB_HOST, port=DB_PORT)


def _one(rows):
    return rows[0] if rows else None
