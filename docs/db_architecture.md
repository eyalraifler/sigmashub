# ארכיטקטורת הדאטאבייס — תיעוד מפורט

---

## `db_client.py` — הצד השולח (על מחשב ה-Backend)

### פונקציית השליחה `_send`

```python
def _send(sock, payload: dict):
    data = json.dumps(payload).encode('utf-8')
    sock.sendall(struct.pack('>I', len(data)) + data)
```

שלושה שלבים:

1. `json.dumps(payload).encode('utf-8')` — הופך את ה-dict לסדרת bytes של JSON
2. `struct.pack('>I', len(data))` — יוצר 4 bytes שמייצגים את אורך ה-JSON. ה-`>I` אומר: big-endian unsigned integer (תמיד 4 bytes, ללא תלות בפלטפורמה)
3. `sock.sendall(...)` — שולח את ה-4 bytes + ה-JSON ביחד. `sendall` מבטיח שהכל נשלח, גם אם TCP שבר את הנתונים לחבילות מרובות

לדוגמה, השאילתה `SELECT * FROM users` תישלח כך:

```
[0, 0, 0, 42]  +  {"query": "SELECT * FROM users", "params": []}
  ↑ 4 bytes          ↑ 42 bytes של JSON
```

---

### פונקציית הקריאה `_recvall`

```python
def _recvall(sock, n: int) -> bytes | None:
    buf = b''
    while len(buf) < n:
        try:
            chunk = sock.recv(n - len(buf))
        except OSError as e:
            raise ConnectionError(...)
        if not chunk:
            return None
        buf += chunk
    return buf
```

זו הנקודה הכי עדינה בקוד. `sock.recv(n)` לא מבטיח שיחזיר בדיוק `n` bytes — TCP יכול לחלק את הנתונים לחבילות קטנות. לכן הלולאה מצברת chunks עד שמגיעים לכמות המבוקשת. אם `recv` מחזיר bytes ריקים — זה אומר שהחיבור נסגר.

---

### פונקציית הקריאה `_recv`

```python
def _recv(sock) -> dict:
    raw_len = _recvall(sock, 4)                   # שלב 1: קרא 4 bytes של אורך
    if not raw_len:
        raise ConnectionError("Connection closed by DB server")
    length = struct.unpack('>I', raw_len)[0]      # שלב 2: פענח את האורך
    data = _recvall(sock, length)                 # שלב 3: קרא בדיוק length bytes
    return json.loads(data.decode('utf-8'))       # שלב 4: פענח JSON
```

שני `_recvall` — אחד לאורך (תמיד 4 bytes), ואחד לתוכן (`length` bytes שנקרא בשלב הקודם).

---

### המחלקה `RemoteDBClient`

```python
class RemoteDBClient:
    def __init__(self, host='localhost', port=5000):
        self.host = host
        self.port = port
        self._sock = None

    def connect(self):
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._sock.connect((self.host, self.port))
```

- `AF_INET` — IPv4
- `SOCK_STREAM` — TCP (להבדיל מ-`SOCK_DGRAM` שהוא UDP)
- השימוש ב-context manager (`with db() as client:`) מבטיח שהסוקט ייסגר תמיד, גם אם נזרקת שגיאה

---

### ניהול טרנזקציות

```python
@contextmanager
def transaction(self):
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
```

טרנזקציה שולחת `BEGIN` כשאילתת טקסט רגילה. ה-`db_server.py` מזהה אותה ומתחיל טרנזקציה על MySQL. אם נזרקת שגיאה בצד ה-Backend — נשלח `ROLLBACK` לפני שהשגיאה ממשיכה להתפשט. זה מבטיח consistency גם כשהדאטאבייס נמצא על מחשב אחר לגמרי.

---

## `db_server.py` — הצד המקבל (על מחשב הדאטאבייס)

### הפעלת ה-Server

```python
def start_db_server(host='0.0.0.0', port=5000):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((host, port))
        server_socket.listen()
        while True:
            conn, addr = server_socket.accept()
            thread = threading.Thread(target=_serve_connection, args=(conn, addr), daemon=True)
            thread.start()
```

- `host='0.0.0.0'` — מאזין על כל ה-network interfaces של המחשב, לא רק localhost. בלי זה, חיבורים מרחוק לא היו מתקבלים
- `SO_REUSEADDR` — מאפשר לאתחל את ה-server מיד לאחר כיבוי, בלי לחכות שה-OS ישחרר את הפורט (בדרך כלל 60 שניות)
- `server_socket.listen()` — מתחיל להאזין לחיבורים נכנסים
- `accept()` — חוסם את התהליך עד שמגיע חיבור חדש, ומחזיר socket ייעודי לאותו לקוח + את הכתובת שלו
- `threading.Thread(..., daemon=True)` — כל לקוח שמתחבר מקבל thread נפרד, כך שמספר לקוחות יכולים לשלוח שאילתות במקביל. ה-`daemon=True` אומר שה-threads האלה ייסגרו אוטומטית כשה-process הראשי נסגר

---

### טיפול בחיבור בודד `_serve_connection`

```python
def _serve_connection(conn_socket, addr):
    db = get_conn()      # חיבור MySQL ייעודי לאותו לקוח
    cursor = db.cursor(dictionary=True)

    while True:
        request = _recv(conn_socket)      # מחכה לשאילתה הבאה
        if request is None:
            break                          # לקוח סגר חיבור

        raw_query = request.get('query', '').strip()
        params = request.get('params', [])

        if raw_query.upper() == 'BEGIN':
            in_transaction = True
            _send(conn_socket, {'status': 'success', 'data': []})
            continue

        cursor.execute(raw_query, params if params else None)

        if raw_query.upper().startswith(('SELECT', 'SHOW')):
            rows = cursor.fetchall()
            _send(conn_socket, {'status': 'success', 'data': rows})
        else:
            _send(conn_socket, {
                'status': 'success',
                'data': [],
                'rowcount': cursor.rowcount,
                'lastrowid': cursor.lastrowid,
            })

        if not in_transaction:
            db.commit()
```

כל thread מחזיק חיבור MySQL נפרד — זה חשוב כי MySQL לא thread-safe עם חיבור משותף. הלולאה `while True` ממשיכה לשרת שאילתות על אותו חיבור עד שהלקוח מתנתק. `cursor(dictionary=True)` גורם ל-MySQL להחזיר rows כ-dicts (`{'id': 1, 'name': 'eyal'}`) במקום tuples.

---

### סריאליזציה של תאריכים ו-Decimal

```python
class _DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return int(obj)
        return super().default(obj)
```

MySQL מחזיר טיפוסים שה-JSON הסטנדרטי לא יודע לסרל: `datetime`, `date`, ו-`Decimal`. ה-Encoder הזה מטפל בהם — תאריכים הופכים למחרוזת ISO (`"2026-04-23T14:30:00"`) ו-`Decimal` הופך ל-`int`.

---

## `database.py` — חיבור הכל ביחד

```python
DB_HOST = os.getenv("DB_SERVER_HOST", "localhost")
DB_PORT = int(os.getenv("DB_SERVER_PORT", "5000"))

def db():
    return RemoteDBClient(host=DB_HOST, port=DB_PORT)
```

זהו ה-glue layer. כל ה-routers של FastAPI קוראים ל-`db()` כך:

```python
with db() as client:
    result = client.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

כשמשנים את `DB_SERVER_HOST` ב-`.env` — כל ה-routers מתחברים אוטומטית למחשב הנכון, בלי לשנות שורה אחת בקוד.

---

## הגדרות ה-`.env` לפי תרחיש

### תרחיש 1 — הכל על מחשב אחד (ברירת מחדל)

```env
# backend/.env
DB_HOST=127.0.0.1        # db_server.py → MySQL
DB_SERVER_HOST=localhost  # FastAPI → db_server.py
DB_SERVER_PORT=5000
```

### תרחיש 2 — MySQL ו-`db_server.py` על מחשב נפרד ב-LAN

על מחשב הדאטאבייס (למשל IP: `192.168.1.50`):

```env
DB_HOST=127.0.0.1   # MySQL רץ מקומית על אותו מחשב
DB_PORT=3306
DB_USER=root
DB_PASSWORD=...
DB_NAME=sigmas_hub
```

על מחשב ה-Backend:

```env
DB_SERVER_HOST=192.168.1.50   # ← IP של מחשב הדאטאבייס
DB_SERVER_PORT=5000
```

---

## זרימת בקשה מלאה — מהמשתמש ועד MySQL

```
1.  משתמש לוחץ "Like" בדפדפן
          ↓
2.  Next.js שולח POST /api-proxy/posts/like/123
          ↓ (rewrite פנימי)
3.  FastAPI מקבל את הבקשה
          ↓
4.  router קורא: with db() as client:
          ↓
5.  RemoteDBClient פותח TCP socket ל-192.168.1.50:5000
          ↓
6.  שולח: [0,0,0,52] + {"query":"UPDATE posts SET likes=...", "params":[123]}
          ↓  (דרך הרשת)
7.  db_server.py מקבל את ה-bytes
          ↓
8.  מפענח: קורא 4 bytes → מבין שיש 52 bytes → קורא 52 bytes → מפענח JSON
          ↓
9.  מריץ cursor.execute("UPDATE posts...", [123]) על MySQL
          ↓
10. MySQL מעדכן ומחזיר rowcount=1
          ↓
11. db_server.py שולח: [0,0,0,38] + {"status":"success","rowcount":1,"lastrowid":0}
          ↓  (חזרה דרך הרשת)
12. RemoteDBClient מקבל ומחזיר את ה-dict ל-router
          ↓
13. FastAPI מחזיר 200 OK למשתמש
```
