import os
import mysql.connector
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))

def run_schema():
    """Read schema.sql and apply all statements to the MySQL database.

    Connects directly to MySQL (bypassing the custom TCP server), reads the
    SQL file from the same directory, replaces the hardcoded database name
    with whatever DB_NAME is set to in the environment, then executes each
    semicolon-delimited statement.

    Raises:
        FileNotFoundError: If schema.sql is not found next to this file.
        mysql.connector.Error: If any SQL statement fails to execute.
    """
    db_name = os.getenv("DB_NAME", "sigmas_hub")

    schema_path = os.path.join(BASE_DIR, "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        sql = f.read()

    # If your schema.sql contains "sigmas_hub", this makes it follow DB_NAME
    sql = sql.replace("sigmas_hub", db_name)

    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        autocommit=True,
    )

    cur = conn.cursor()
    try:
        statements = [s.strip() for s in sql.split(";") if s.strip()]
        for stmt in statements:
            cur.execute(stmt)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_schema()
    print("schema applied")
