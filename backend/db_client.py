import socket
import json
import struct
from contextlib import contextmanager


def _send(sock, payload: dict):
    data = json.dumps(payload).encode('utf-8')
    sock.sendall(struct.pack('>I', len(data)) + data)


def _recv(sock) -> dict:
    raw_len = _recvall(sock, 4)
    if not raw_len:
        raise ConnectionError("Connection closed by DB server")
    length = struct.unpack('>I', raw_len)[0]
    data = _recvall(sock, length)
    return json.loads(data.decode('utf-8'))


def _recvall(sock, n: int) -> bytes | None:
    buf = b''
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return buf


class _Transaction:
    """Wraps a RemoteDBClient for use inside an active transaction."""

    def __init__(self, client: 'RemoteDBClient'):
        self._db = client

    def execute(self, query: str, params=()):
        return self._db.execute(query, params)

    def executemany(self, query: str, params_list):
        return [self._db.execute(query, p) for p in params_list]


class RemoteDBClient:
    def __init__(self, host='localhost', port=5000):
        self.host = host
        self.port = port
        self._sock = None

    def connect(self):
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._sock.connect((self.host, self.port))

    def close(self):
        if self._sock:
            self._sock.close()
            self._sock = None

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, *_):
        self.close()

    def execute(self, query: str, params=()):
        """Send a query and return the response dict.

        For SELECT queries, response['data'] is a list of row dicts.
        For INSERT/UPDATE/DELETE, response also contains 'rowcount' and 'lastrowid'.
        Raises RuntimeError on DB errors.
        """
        if self._sock is None:
            self.connect()
        _send(self._sock, {'query': query, 'params': list(params)})
        response = _recv(self._sock)
        if response.get('status') == 'error':
            raise RuntimeError(f"DB error: {response.get('message')}")
        return response

    @contextmanager
    def transaction(self):
        """Context manager that wraps queries in a BEGIN/COMMIT/ROLLBACK block."""
        self.execute('BEGIN')
        try:
            yield _Transaction(self)
            self.execute('COMMIT')
        except Exception:
            try:
                self.execute('ROLLBACK')
            except Exception:
                pass
            raise
