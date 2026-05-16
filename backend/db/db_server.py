import os
import ssl
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
        """Serialize datetime, date, and Decimal objects to JSON-compatible types.

        Args:
            obj: The object to serialize.

        Returns:
            ISO-format string for datetime/date, int for Decimal, or delegates
            to the default JSONEncoder for all other types.
        """
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return int(obj)
        return super().default(obj)


def _send(sock, payload: dict):
    """Serialize payload to JSON and send it over a socket with a 4-byte length prefix.

    Args:
        sock: An open socket to write to.
        payload: The dict to serialize and send (datetimes/Decimals are handled).
    """
    data = json.dumps(payload, cls=_DateTimeEncoder).encode('utf-8')
    sock.sendall(struct.pack('>I', len(data)) + data)


def _recv(sock) -> dict | None:
    """Read a length-prefixed JSON message from the socket.

    Reads 4 bytes to determine the payload length, then reads exactly that
    many bytes and deserializes them as JSON.

    Args:
        sock: An open socket to read from.

    Returns:
        The deserialized response dict, or None if the connection was closed.
    """
    raw_len = _recvall(sock, 4)
    if not raw_len:
        return None
    length = struct.unpack('>I', raw_len)[0]
    data = _recvall(sock, length)
    if not data:
        return None
    return json.loads(data.decode('utf-8'))


def _recvall(sock, n: int) -> bytes | None:
    """Read exactly n bytes from the socket, looping over partial reads.

    Args:
        sock: An open socket to read from.
        n: The exact number of bytes to read.

    Returns:
        The bytes read, or None if the connection was closed before n bytes arrived.
    """
    buf = b''
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return buf


def _serve_connection(conn_socket, addr):
    """Handle one client connection in a dedicated thread.

    Opens a MySQL connection, then loops reading SQL requests from the client
    socket. Handles BEGIN/COMMIT/ROLLBACK for transaction management and
    dispatches other queries to MySQL. Cleans up all resources on exit.

    Args:
        conn_socket: The accepted TCP (or TLS-wrapped) socket for this client.
        addr: The client's (host, port) address tuple, used for logging.
    """
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
    """Start the TCP database server and accept connections indefinitely.

    Listens on all network interfaces so remote clients can connect. Each
    accepted connection is handed off to _serve_connection in a daemon thread,
    enabling concurrent clients. TLS is enabled when DB_SSL_CERT and
    DB_SSL_KEY are set in the environment.

    Args:
        host: The address to bind to (default '0.0.0.0' = all interfaces).
        port: The TCP port to listen on (default 5000).
    """
    print(f"Starting DB server on {host}:{port}...")

    ssl_cert = os.getenv("DB_SSL_CERT")
    ssl_key  = os.getenv("DB_SSL_KEY")

    tls_context = None
    if ssl_cert and ssl_key:
        tls_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        tls_context.load_cert_chain(certfile=ssl_cert, keyfile=ssl_key)
        print("TLS enabled.")
    else:
        print("WARNING: TLS is disabled. Set DB_SSL_CERT and DB_SSL_KEY in .env to enable it.")

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((host, port))
        server_socket.listen()

        while True:
            print("Waiting for a connection...")
            conn, addr = server_socket.accept()
            if tls_context:
                conn = tls_context.wrap_socket(conn, server_side=True)
            thread = threading.Thread(target=_serve_connection, args=(conn, addr), daemon=True)
            thread.start()


def _get_lan_ip():
    """Detect the machine's LAN IP address by connecting to a public DNS server.

    Uses a UDP trick: connecting to 8.8.8.8:80 (no data is actually sent)
    causes the OS to pick the default outbound interface, revealing the LAN IP.

    Returns:
        The LAN IP as a string, or '127.0.0.1' if detection fails.
    """
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
