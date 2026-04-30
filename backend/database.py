"""Database connection factory and shared query helpers."""
import os
from dotenv import load_dotenv
from db_client import RemoteDBClient

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_HOST = os.getenv("DB_SERVER_HOST", "localhost")
DB_PORT = int(os.getenv("DB_SERVER_PORT", "5000"))


def db():
    """Create a RemoteDBClient connected to the DB server.

    Returns:
        A RemoteDBClient instance configured from environment variables.
        Intended to be used as: with db() as client:
    """
    return RemoteDBClient(host=DB_HOST, port=DB_PORT)


def _one(rows):
    """Return the first row from a list, or None if the list is empty.

    Args:
        rows: A list of row dicts returned from the DB.

    Returns:
        The first row dict, or None if rows is empty.
    """
    return rows[0] if rows else None
