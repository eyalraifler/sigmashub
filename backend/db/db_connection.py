import os
import mysql.connector
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))

def get_conn():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "sigmas_hub"),
        autocommit=False,
    )


'''
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
'''