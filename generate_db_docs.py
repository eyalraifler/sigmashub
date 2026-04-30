from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

doc = Document()

# ── הגדרת RTL ברמת המסמך כולו ──────────────────────────────
def set_doc_rtl(doc):
    """מגדיר כיוון RTL כברירת מחדל לכל המסמך"""
    settings = doc.settings.element
    bidi = OxmlElement('w:bidi')
    settings.append(bidi)
    # ברירת מחדל לפסקאות
    docDefaults = doc.styles.element.find(qn('w:docDefaults'))
    if docDefaults is not None:
        pPrDefault = docDefaults.find(qn('w:pPrDefault'))
        if pPrDefault is None:
            pPrDefault = OxmlElement('w:pPrDefault')
            docDefaults.append(pPrDefault)
        pPr = pPrDefault.find(qn('w:pPr'))
        if pPr is None:
            pPr = OxmlElement('w:pPr')
            pPrDefault.append(pPr)
        bidi_el = OxmlElement('w:bidi')
        pPr.append(bidi_el)

set_doc_rtl(doc)

# ── עזרים ───────────────────────────────────────────────────
def make_rtl(paragraph):
    """הופך פסקה לכיוון RTL"""
    pPr = paragraph._p.get_or_add_pPr()
    # bidi
    bidi = OxmlElement('w:bidi')
    pPr.insert(0, bidi)
    # jc = right
    jc = pPr.find(qn('w:jc'))
    if jc is None:
        jc = OxmlElement('w:jc')
        pPr.append(jc)
    jc.set(qn('w:val'), 'right')

def make_rtl_run(run):
    """מסמן run כ-RTL"""
    rPr = run._r.get_or_add_rPr()
    rtl = OxmlElement('w:rtl')
    rPr.append(rtl)

def set_shading(paragraph, fill_hex):
    pPr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    pPr.append(shd)

# ── בוני תוכן ────────────────────────────────────────────────
def add_title(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(20)
    run.font.color.rgb = RGBColor(0x1F, 0x49, 0x7D)
    run.font.name = 'David'
    make_rtl(p)
    make_rtl_run(run)

def add_h1(doc, text):
    p = doc.add_paragraph()
    make_rtl(p)
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(15)
    run.font.color.rgb = RGBColor(0x1F, 0x49, 0x7D)
    run.font.name = 'David'
    make_rtl_run(run)
    set_shading(p, 'D6E4F0')
    doc.add_paragraph()

def add_h2(doc, text):
    p = doc.add_paragraph()
    make_rtl(p)
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(13)
    run.font.color.rgb = RGBColor(0x2E, 0x74, 0xB5)
    run.font.name = 'David'
    make_rtl_run(run)

def add_body(doc, text):
    p = doc.add_paragraph()
    make_rtl(p)
    run = p.add_run(text)
    run.font.size = Pt(11)
    run.font.name = 'David'
    make_rtl_run(run)

def add_code_block(doc, code):
    """בלוק קוד — נשאר LTR כי קוד תמיד כתוב משמאל לימין"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    set_shading(p, 'F2F2F2')
    # גבול שמאלי
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    left = OxmlElement('w:left')
    left.set(qn('w:val'), 'single')
    left.set(qn('w:sz'), '12')
    left.set(qn('w:space'), '4')
    left.set(qn('w:color'), '2E74B5')
    pBdr.append(left)
    pPr.append(pBdr)
    # indent
    ind = OxmlElement('w:ind')
    ind.set(qn('w:left'), '240')
    pPr.append(ind)
    run = p.add_run(code)
    run.font.name = 'Courier New'
    run.font.size = Pt(9.5)
    run.font.color.rgb = RGBColor(0x1A, 0x1A, 0x1A)

def add_bullet(doc, text):
    p = doc.add_paragraph()
    make_rtl(p)
    pPr = p._p.get_or_add_pPr()
    # indent RTL
    ind = OxmlElement('w:ind')
    ind.set(qn('w:right'), '360')
    pPr.append(ind)
    run = p.add_run('◄  ' + text)
    run.font.size = Pt(11)
    run.font.name = 'David'
    make_rtl_run(run)

def add_numbered(doc, num, text):
    p = doc.add_paragraph()
    make_rtl(p)
    pPr = p._p.get_or_add_pPr()
    ind = OxmlElement('w:ind')
    ind.set(qn('w:right'), '360')
    pPr.append(ind)
    run = p.add_run(f'{num}.  {text}')
    run.font.size = Pt(11)
    run.font.name = 'David'
    make_rtl_run(run)

def add_separator(doc):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('─' * 55)
    run.font.color.rgb = RGBColor(0xBB, 0xBB, 0xBB)
    run.font.size = Pt(10)
    doc.add_paragraph()

# ════════════════════════════════════════════════════════════
#  כותרת ראשית
# ════════════════════════════════════════════════════════════
add_title(doc, 'ארכיטקטורת הדאטאבייס — תיעוד מפורט')
doc.add_paragraph()

# ════════════════════════════════════════════════════════════
#  חלק 1 — db_client.py
# ════════════════════════════════════════════════════════════
add_h1(doc, 'db_client.py — הצד השולח (מחשב ה-Backend)')

# _send
add_h2(doc, 'פונקציית השליחה — _send')
add_code_block(doc,
"""def _send(sock, payload: dict):
    data = json.dumps(payload).encode('utf-8')
    sock.sendall(struct.pack('>I', len(data)) + data)""")

add_body(doc, 'הפונקציה עובדת בשלושה שלבים:')
add_numbered(doc, 1, "json.dumps(payload).encode('utf-8') — הופך את ה-dict לסדרת bytes של JSON")
add_numbered(doc, 2, "struct.pack('>I', len(data)) — יוצר 4 bytes שמייצגים את אורך ה-JSON. הסימן >I פירושו: big-endian unsigned integer (תמיד 4 bytes בדיוק, ללא תלות בפלטפורמה)")
add_numbered(doc, 3, "sock.sendall(...) — שולח את ה-4 bytes יחד עם ה-JSON. הפונקציה sendall מבטיחה שהכל נשלח, גם אם TCP שבר את הנתונים לחבילות מרובות")

add_body(doc, "לדוגמה: השאילתה SELECT * FROM users תישלח בצורה הבאה:")
add_code_block(doc,
"""[0, 0, 0, 42]  +  {\"query\": \"SELECT * FROM users\", \"params\": []}
  ↑ 4 bytes          ↑ 42 bytes של JSON""")

doc.add_paragraph()

# _recvall
add_h2(doc, 'פונקציית הקריאה — _recvall')
add_code_block(doc,
"""def _recvall(sock, n: int) -> bytes | None:
    buf = b''
    while len(buf) < n:
        try:
            chunk = sock.recv(n - len(buf))
        except OSError as e:
            raise ConnectionError(...)
        if not chunk:
            return None
        buf += chunk
    return buf""")

add_body(doc, 'זו הנקודה הכי עדינה בקוד. הפונקציה sock.recv(n) אינה מבטיחה שתחזיר בדיוק n bytes — פרוטוקול TCP יכול לחלק את הנתונים לחבילות קטנות בדרך. לכן הלולאה ממשיכה לצבור chunks עד שמגיעים לכמות המבוקשת. אם recv מחזיר bytes ריקים — סימן שהחיבור נסגר מהצד השני.')
doc.add_paragraph()

# _recv
add_h2(doc, 'פונקציית הקריאה — _recv')
add_code_block(doc,
"""def _recv(sock) -> dict:
    raw_len = _recvall(sock, 4)                    # שלב 1: קרא 4 bytes של אורך
    if not raw_len:
        raise ConnectionError("Connection closed by DB server")
    length = struct.unpack('>I', raw_len)[0]       # שלב 2: פענח את האורך
    data   = _recvall(sock, length)                # שלב 3: קרא בדיוק length bytes
    return json.loads(data.decode('utf-8'))        # שלב 4: פענח JSON""")

add_body(doc, 'הפונקציה קוראת פעמיים את _recvall: פעם אחת עבור 4 bytes של האורך, ופעם שנייה עבור תוכן ה-JSON עצמו, בדיוק לפי האורך שנקרא בשלב הראשון.')
doc.add_paragraph()

# RemoteDBClient
add_h2(doc, 'המחלקה RemoteDBClient')
add_code_block(doc,
"""class RemoteDBClient:
    def __init__(self, host='localhost', port=5000):
        self.host = host
        self.port = port
        self._sock = None

    def connect(self):
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._sock.connect((self.host, self.port))""")

add_bullet(doc, 'AF_INET — שימוש ב-IPv4')
add_bullet(doc, 'SOCK_STREAM — שימוש ב-TCP (להבדיל מ-SOCK_DGRAM שהוא UDP)')
add_bullet(doc, 'השימוש ב-context manager כלומר (with db() as client:) מבטיח שהסוקט ייסגר תמיד, גם במקרה של שגיאה באמצע הדרך')
doc.add_paragraph()

# Transactions
add_h2(doc, 'ניהול טרנזקציות')
add_code_block(doc,
"""@contextmanager
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
        raise""")

add_body(doc, 'טרנזקציה נפתחת על ידי שליחת המחרוזת BEGIN כשאילתה רגילה. ה-db_server.py מזהה אותה ומתחיל טרנזקציה על MySQL. אם נזרקת שגיאה בצד ה-Backend — נשלח ROLLBACK לפני שהשגיאה ממשיכה להתפשט. כך מובטח consistency גם כשהדאטאבייס יושב על מחשב אחר לגמרי.')

add_separator(doc)

# ════════════════════════════════════════════════════════════
#  חלק 2 — db_server.py
# ════════════════════════════════════════════════════════════
add_h1(doc, 'db_server.py — הצד המקבל (מחשב הדאטאבייס)')

# start_db_server
add_h2(doc, 'הפעלת ה-Server')
add_code_block(doc,
"""def start_db_server(host='0.0.0.0', port=5000):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((host, port))
        server_socket.listen()
        while True:
            conn, addr = server_socket.accept()
            thread = threading.Thread(
                target=_serve_connection, args=(conn, addr), daemon=True
            )
            thread.start()""")

add_bullet(doc, "host='0.0.0.0' — מאזין על כל ה-network interfaces של המחשב, לא רק localhost. בלי זה, חיבורים מרחוק לא היו מגיעים כלל")
add_bullet(doc, "SO_REUSEADDR — מאפשר לאתחל את ה-server מיד לאחר כיבוי, מבלי לחכות שה-OS ישחרר את הפורט (תהליך שלוקח בדרך כלל עד 60 שניות)")
add_bullet(doc, "server_socket.listen() — מתחיל להאזין לחיבורים נכנסים")
add_bullet(doc, "accept() — חוסם את התהליך עד שמגיע חיבור חדש. מחזיר socket ייעודי לאותו לקוח ואת כתובת ה-IP שלו")
add_bullet(doc, "threading.Thread(..., daemon=True) — כל לקוח שמתחבר מקבל thread נפרד, כך שמספר לקוחות יכולים לשלוח שאילתות במקביל. daemon=True אומר שה-threads ייסגרו אוטומטית כשה-process הראשי נסגר")
doc.add_paragraph()

# _serve_connection
add_h2(doc, 'טיפול בחיבור בודד — _serve_connection')
add_code_block(doc,
"""def _serve_connection(conn_socket, addr):
    db = get_conn()
    cursor = db.cursor(dictionary=True)

    while True:
        request = _recv(conn_socket)
        if request is None:
            break

        raw_query = request.get('query', '').strip()
        params    = request.get('params', [])

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
            db.commit()""")

add_body(doc, "כל thread מחזיק חיבור MySQL נפרד — זה הכרחי מכיוון ש-MySQL אינו thread-safe עם חיבור משותף. הלולאה while True ממשיכה לשרת שאילתות על אותו חיבור עד שהלקוח מתנתק. הפרמטר dictionary=True גורם ל-MySQL להחזיר כל שורה כ-dict למשל: {'id': 1, 'name': 'eyal'} במקום tuple רגיל.")
doc.add_paragraph()

# DateTimeEncoder
add_h2(doc, 'סריאליזציה של תאריכים ו-Decimal')
add_code_block(doc,
"""class _DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return int(obj)
        return super().default(obj)""")

add_body(doc, 'MySQL מחזיר טיפוסים שספריית ה-JSON הסטנדרטית של Python לא יודעת לטפל בהם: datetime, date ו-Decimal. ה-Encoder המותאם הזה מטפל בהם — תאריכים הופכים למחרוזת בפורמט ISO (לדוגמה "2026-04-23T14:30:00") ו-Decimal הופך ל-int.')

add_separator(doc)

# ════════════════════════════════════════════════════════════
#  חלק 3 — database.py
# ════════════════════════════════════════════════════════════
add_h1(doc, 'database.py — חיבור הכל ביחד')
add_code_block(doc,
"""DB_HOST = os.getenv("DB_SERVER_HOST", "localhost")
DB_PORT = int(os.getenv("DB_SERVER_PORT", "5000"))

def db():
    return RemoteDBClient(host=DB_HOST, port=DB_PORT)""")

add_body(doc, "זהו שכבת ה-glue של המערכת. כל ה-routers של FastAPI משתמשים בה בצורה הבאה:")
add_code_block(doc,
"""with db() as client:
    result = client.execute("SELECT * FROM users WHERE id = %s", (user_id,))""")

add_body(doc, "כשמשנים את DB_SERVER_HOST בקובץ ה-.env — כל ה-routers מתחברים אוטומטית למחשב הנכון, מבלי לשנות שורה אחת בקוד.")

add_separator(doc)

# ════════════════════════════════════════════════════════════
#  חלק 4 — .env
# ════════════════════════════════════════════════════════════
add_h1(doc, 'הגדרות .env לפי תרחיש')

add_h2(doc, 'תרחיש 1 — הכל על מחשב אחד (ברירת מחדל)')
add_code_block(doc,
"""# backend/.env
DB_HOST=127.0.0.1        # db_server.py → MySQL
DB_SERVER_HOST=localhost  # FastAPI → db_server.py
DB_SERVER_PORT=5000""")

doc.add_paragraph()
add_h2(doc, 'תרחיש 2 — MySQL ו-db_server.py על מחשב נפרד ברשת המקומית')
add_body(doc, 'על מחשב הדאטאבייס (לדוגמה: IP 192.168.1.50):')
add_code_block(doc,
"""DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=...
DB_NAME=sigmas_hub""")

add_body(doc, 'על מחשב ה-Backend:')
add_code_block(doc,
"""DB_SERVER_HOST=192.168.1.50   # ← ה-IP של מחשב הדאטאבייס
DB_SERVER_PORT=5000""")

add_separator(doc)

# ════════════════════════════════════════════════════════════
#  חלק 5 — זרימה מלאה
# ════════════════════════════════════════════════════════════
add_h1(doc, 'זרימת בקשה מלאה — מהמשתמש ועד MySQL')
add_body(doc, 'להלן דוגמה מלאה של מה שקורה כאשר משתמש לוחץ על כפתור "Like":')
doc.add_paragraph()

steps = [
    ('1', 'המשתמש לוחץ "Like" בדפדפן'),
    ('2', 'Next.js שולח POST /api-proxy/posts/like/123'),
    ('3', 'FastAPI מקבל את הבקשה (דרך rewrite פנימי)'),
    ('4', 'ה-router פותח חיבור: with db() as client:'),
    ('5', 'RemoteDBClient פותח TCP socket ל-192.168.1.50:5000'),
    ('6', 'שולח: [0,0,0,52] + {"query":"UPDATE posts SET likes=...", "params":[123]}'),
    ('7', 'db_server.py מקבל את ה-bytes מהרשת'),
    ('8', 'מפענח: קורא 4 bytes → מבין שיש 52 bytes → קורא 52 bytes → מפענח JSON'),
    ('9', 'מריץ cursor.execute("UPDATE posts...", [123]) על MySQL'),
    ('10', 'MySQL מעדכן את הנתון ומחזיר rowcount=1'),
    ('11', 'db_server.py שולח חזרה: [0,0,0,38] + {"status":"success","rowcount":1}'),
    ('12', 'RemoteDBClient מקבל את התשובה ומחזיר dict ל-router'),
    ('13', 'FastAPI מחזיר תגובת 200 OK למשתמש'),
]

for num, text in steps:
    add_numbered(doc, num, text)

doc.save('docs/db_architecture.docx')
print("Done: docs/db_architecture.docx")
