import os
import socket
import json
import struct
import datetime
import threading
from decimal import Decimal
from dotenv import load_dotenv
from db_connection import get_conn  # pylint: disable=import-error

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '..', '.env'))


class _DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return int(obj)
        return super().default(obj)


def _send(sock, payload: dict):
    data = json.dumps(payload, cls=_DateTimeEncoder).encode('utf-8')
    sock.sendall(struct.pack('>I', len(data)) + data)


def _recv(sock) -> dict | None:
    raw_len = _recvall(sock, 4)
    if not raw_len:
        return None
    length = struct.unpack('>I', raw_len)[0]
    data = _recvall(sock, length)
    if not data:
        return None
    return json.loads(data.decode('utf-8'))


def _recvall(sock, n: int) -> bytes | None:
    buf = b''
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return buf


def _serve_connection(conn_socket, addr):
    print(f"Connected by {addr}")
    db = None
    cursor = None
    in_transaction = False

    try:
        db = get_conn()
        cursor = db.cursor(dictionary=True)
    except Exception as e:
        print(f"[ERROR] MySQL connection failed for {addr}: {e}")
        try:
            _send(conn_socket, {'status': 'error', 'message': f"DB server cannot connect to MySQL: {e}"})
        except Exception:
            pass
        try:
            conn_socket.close()
        except Exception:
            pass
        return

    try:

        while True:
            request = _recv(conn_socket)
            if request is None:
                print(f"Connection closed by {addr}")
                break

            raw_query = request.get('query', '').strip()
            query_upper = raw_query.upper()
            params = request.get('params', [])

            try:
                if query_upper == 'BEGIN':
                    in_transaction = True
                    _send(conn_socket, {'status': 'success', 'data': []})
                    continue

                if query_upper == 'COMMIT':
                    db.commit()
                    in_transaction = False
                    _send(conn_socket, {'status': 'success', 'data': []})
                    continue

                if query_upper == 'ROLLBACK':
                    db.rollback()
                    in_transaction = False
                    _send(conn_socket, {'status': 'success', 'data': []})
                    continue

                print(f"[{addr}] {raw_query[:80]}")
                cursor.execute(raw_query, params if params else None)

                if query_upper.startswith(('SELECT', 'SHOW', 'DESCRIBE')):
                    rows = cursor.fetchall()
                    response = {'status': 'success', 'data': rows}
                else:
                    response = {
                        'status': 'success',
                        'data': [],
                        'rowcount': cursor.rowcount,
                        'lastrowid': cursor.lastrowid,
                    }

                if not in_transaction:
                    db.commit()

                _send(conn_socket, response)

            except Exception as e:
                try:
                    db.rollback()
                except Exception:
                    pass
                in_transaction = False
                _send(conn_socket, {'status': 'error', 'message': str(e)})

    except Exception as e:
        print(f"Connection error from {addr}: {e}")
    finally:
        if in_transaction and db:
            try:
                db.rollback()
            except Exception:
                pass
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if db:
            try:
                db.close()
            except Exception:
                pass
        try:
            conn_socket.close()
        except Exception:
            pass
        print(f"Cleaned up connection from {addr}")


def start_db_server(host='0.0.0.0', port=5000):
    print(f"Starting DB server on {host}:{port}...")
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((host, port))
        server_socket.listen()

        while True:
            print("Waiting for a connection...")
            conn, addr = server_socket.accept()
            thread = threading.Thread(target=_serve_connection, args=(conn, addr), daemon=True)
            thread.start()


def _get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


if __name__ == '__main__':
    port = int(os.getenv('DB_SERVER_PORT', '5000'))
    lan_ip = _get_lan_ip()
    print(f"LAN IP of this machine: {lan_ip}")
    print(f"On the API server machine, set: DB_SERVER_HOST={lan_ip}")

    print("Testing MySQL connection...")
    try:
        test_conn = get_conn()
        test_conn.close()
        print("MySQL connection OK.")
    except Exception as e:
        print(f"[ERROR] Cannot connect to MySQL: {e}")
        print("Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env")
        raise SystemExit(1)

    start_db_server(port=port)
