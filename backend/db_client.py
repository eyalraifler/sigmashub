import os
import ssl
import socket
import json
import struct
from contextlib import contextmanager


def _send(sock, payload: dict):
    """Serialize a dict to JSON and send it over a socket with a 4-byte length header.

    Args:
        sock: An open socket connected to the DB server.
        payload: The data to send (typically {'query': ..., 'params': ...}).
    """
    data = json.dumps(payload).encode('utf-8')
    sock.sendall(struct.pack('>I', len(data)) + data)


def _recv(sock) -> dict:
    """Read a response from the DB server socket and deserialize it from JSON.

    Reads the 4-byte length header first, then reads exactly that many bytes
    of JSON data.

    Args:
        sock: An open socket connected to the DB server.

    Returns:
        The deserialized response as a dict.

    Raises:
        ConnectionError: If the connection was closed before the full response arrived.
    """
    raw_len = _recvall(sock, 4)
    if not raw_len:
        raise ConnectionError("Connection closed by DB server")
    length = struct.unpack('>I', raw_len)[0]
    data = _recvall(sock, length)
    return json.loads(data.decode('utf-8'))


def _recvall(sock, n: int) -> bytes | None:
    """Read exactly n bytes from the socket, handling partial reads.

    TCP does not guarantee all data arrives in one chunk, so this function
    loops until the full n bytes have been received.

    Args:
        sock: An open socket to read from.
        n: The exact number of bytes to read.

    Returns:
        The bytes read, or None if the connection was closed mid-read.

    Raises:
        ConnectionError: If the socket raises an OSError during reading.
    """
    buf = b''
    while len(buf) < n:
        try:
            chunk = sock.recv(n - len(buf))
        except OSError as e:
            raise ConnectionError(
                f"Lost connection to DB server: {e}. "
                "Check that db_server.py is running and can connect to MySQL."
            ) from e
        if not chunk:
            return None
        buf += chunk
    return buf


class _Transaction:
    """Wraps a RemoteDBClient for use inside an active transaction."""

    def __init__(self, client: 'RemoteDBClient'):
        self._db = client

    def execute(self, query: str, params=()):
        """Execute a single SQL query within the active transaction.

        Args:
            query: The SQL query string to execute.
            params: Optional tuple of parameters to bind to the query.

        Returns:
            The response dict from the DB server.
        """
        return self._db.execute(query, params)

    def executemany(self, query: str, params_list):
        """Execute the same SQL query multiple times with different parameters.

        Args:
            query: The SQL query string to execute.
            params_list: A list of parameter tuples, one per execution.

        Returns:
            A list of response dicts, one per execution.
        """
        return [self._db.execute(query, p) for p in params_list]


class RemoteDBClient:
    """A TCP socket client that communicates with the custom DB server.

    Sends SQL queries as JSON over a socket and receives results back.
    Supports context manager usage (with RemoteDBClient() as client:)
    and transaction management.
    """

    def __init__(self, host='localhost', port=5000):
        self.host = host
        self.port = port
        self._sock = None

    def connect(self):
        """Open a TCP socket connection to the DB server."""
        ssl_ca = os.getenv("DB_SSL_CA")

        raw_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        raw_sock.connect((self.host, self.port))

        if ssl_ca:
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            context.load_verify_locations(cafile=ssl_ca)
            context.check_hostname = False
            self._sock = context.wrap_socket(raw_sock, server_hostname=self.host)
        else:
            self._sock = raw_sock

    def close(self):
        """Close the socket connection if it is open."""
        if self._sock:
            self._sock.close()
            self._sock = None

    def __enter__(self):
        """Connect on entering a 'with' block and return self."""
        self.connect()
        return self

    def __exit__(self, *_):
        """Close the connection when leaving a 'with' block."""
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
