#!/usr/bin/env python3
"""Generate a DOCX file with all project code, VSCode-styled."""

import os
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from pygments import lex
from pygments.lexers import (
    PythonLexer, JavascriptLexer, CssLexer, JsonLexer, get_lexer_for_filename
)
from pygments.token import (
    Token, Keyword, Name, Comment, String, Error, Number,
    Operator, Generic, Punctuation, Whitespace, Text
)

# VSCode Dark+ theme token colors
VSCODE_COLORS = {
    Token:                    (0xD4, 0xD4, 0xD4),  # default text
    Token.Text:               (0xD4, 0xD4, 0xD4),
    Token.Text.Whitespace:    (0xD4, 0xD4, 0xD4),
    Whitespace:               (0xD4, 0xD4, 0xD4),

    Keyword:                  (0x56, 0x9C, 0xD6),  # blue
    Keyword.Constant:         (0x56, 0x9C, 0xD6),
    Keyword.Declaration:      (0x56, 0x9C, 0xD6),
    Keyword.Namespace:        (0x56, 0x9C, 0xD6),
    Keyword.Pseudo:           (0x56, 0x9C, 0xD6),
    Keyword.Reserved:         (0x56, 0x9C, 0xD6),
    Keyword.Type:             (0x4E, 0xC9, 0xB0),  # teal

    Name:                     (0xD4, 0xD4, 0xD4),
    Name.Attribute:           (0x9C, 0xDC, 0xFE),  # light blue
    Name.Builtin:             (0x4E, 0xC9, 0xB0),  # teal
    Name.Builtin.Pseudo:      (0x4E, 0xC9, 0xB0),
    Name.Class:               (0x4E, 0xC9, 0xB0),
    Name.Constant:            (0x4F, 0xC1, 0xFF),
    Name.Decorator:           (0xDD, 0xDD, 0x00),  # yellow
    Name.Entity:              (0xD4, 0xD4, 0xD4),
    Name.Exception:           (0x4E, 0xC9, 0xB0),
    Name.Function:            (0xDC, 0xDC, 0xAA),  # yellow-ish
    Name.Function.Magic:      (0xDC, 0xDC, 0xAA),
    Name.Label:               (0xD4, 0xD4, 0xD4),
    Name.Namespace:           (0xD4, 0xD4, 0xD4),
    Name.Other:               (0xD4, 0xD4, 0xD4),
    Name.Property:            (0x9C, 0xDC, 0xFE),
    Name.Tag:                 (0xF4, 0x4B, 0x53),  # red (HTML tags)
    Name.Variable:            (0x9C, 0xDC, 0xFE),
    Name.Variable.Class:      (0x9C, 0xDC, 0xFE),
    Name.Variable.Global:     (0x9C, 0xDC, 0xFE),
    Name.Variable.Instance:   (0x9C, 0xDC, 0xFE),

    Comment:                  (0x6A, 0x99, 0x55),  # green
    Comment.Hashbang:         (0x6A, 0x99, 0x55),
    Comment.Multiline:        (0x6A, 0x99, 0x55),
    Comment.Preproc:          (0x6A, 0x99, 0x55),
    Comment.Single:           (0x6A, 0x99, 0x55),
    Comment.Special:          (0x6A, 0x99, 0x55),

    String:                   (0xCE, 0x91, 0x78),  # orange/brown
    String.Affix:             (0xCE, 0x91, 0x78),
    String.Backtick:          (0xCE, 0x91, 0x78),
    String.Char:              (0xCE, 0x91, 0x78),
    String.Delimiter:         (0xCE, 0x91, 0x78),
    String.Doc:               (0x6A, 0x99, 0x55),  # docstrings green
    String.Double:            (0xCE, 0x91, 0x78),
    String.Escape:            (0xD7, 0xBA, 0x7D),  # light orange
    String.Heredoc:           (0xCE, 0x91, 0x78),
    String.Interpol:          (0xCE, 0x91, 0x78),
    String.Other:             (0xCE, 0x91, 0x78),
    String.Regex:             (0xD1, 0x6E, 0x6E),
    String.Single:            (0xCE, 0x91, 0x78),
    String.Symbol:            (0xCE, 0x91, 0x78),

    Number:                   (0xB5, 0xCE, 0xA8),  # light green
    Number.Bin:               (0xB5, 0xCE, 0xA8),
    Number.Float:             (0xB5, 0xCE, 0xA8),
    Number.Hex:               (0xB5, 0xCE, 0xA8),
    Number.Integer:           (0xB5, 0xCE, 0xA8),
    Number.Integer.Long:      (0xB5, 0xCE, 0xA8),
    Number.Oct:               (0xB5, 0xCE, 0xA8),

    Operator:                 (0xD4, 0xD4, 0xD4),
    Operator.Word:            (0x56, 0x9C, 0xD6),  # blue

    Punctuation:              (0xD4, 0xD4, 0xD4),

    Error:                    (0xF4, 0x4B, 0x53),
}

BG_COLOR = (0x1E, 0x1E, 0x1E)   # VSCode dark background
HEADER_BG = (0x25, 0x25, 0x26)  # slightly lighter for file headers


def get_token_color(ttype):
    """Walk up the token hierarchy to find a matching color."""
    while ttype:
        if ttype in VSCODE_COLORS:
            return VSCODE_COLORS[ttype]
        ttype = ttype.parent
    return VSCODE_COLORS[Token]


def set_cell_background(cell, hex_tuple):
    """Set table cell background color."""
    r, g, b = hex_tuple
    hex_color = f"{r:02X}{g:02X}{b:02X}"
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)


def add_file_header(doc, filepath):
    """Add a styled file path header."""
    table = doc.add_table(rows=1, cols=1)
    table.style = 'Table Grid'
    cell = table.cell(0, 0)
    set_cell_background(cell, HEADER_BG)

    # Remove cell borders
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        border = OxmlElement(f'w:{border_name}')
        border.set(qn('w:val'), 'nil')
        tcBorders.append(border)
    tcPr.append(tcBorders)

    p = cell.paragraphs[0]
    run = p.add_run(f"  {filepath}")
    run.font.name = 'Consolas'
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x85, 0x99, 0x00)  # olive/green for path
    run.font.bold = False

    # Set paragraph spacing
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.left_indent = Inches(0.1)

    doc.add_paragraph()  # small gap


def add_code_block(doc, code, filepath):
    """Add a syntax-highlighted code block."""
    try:
        lexer = get_lexer_for_filename(filepath)
    except Exception:
        lexer = PythonLexer()

    table = doc.add_table(rows=1, cols=1)
    table.style = 'Table Grid'
    cell = table.cell(0, 0)
    set_cell_background(cell, BG_COLOR)

    # Remove cell borders
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for border_name in ['top', 'left', 'bottom', 'right']:
        border = OxmlElement(f'w:{border_name}')
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), '4')
        border.set(qn('w:color'), '3C3C3C')
        tcBorders.append(border)
    tcPr.append(tcBorders)

    # Set cell padding
    tcMar = OxmlElement('w:tcMar')
    for side in ['top', 'left', 'bottom', 'right']:
        m = OxmlElement(f'w:{side}')
        m.set(qn('w:w'), '100')
        m.set(qn('w:type'), 'dxa')
        tcMar.append(m)
    tcPr.append(tcMar)

    # Clear default paragraph
    cell.paragraphs[0]._element.getparent().remove(cell.paragraphs[0]._element)

    tokens = list(lex(code, lexer))

    # Split into lines, then build paragraphs
    line_tokens = []
    current_line = []
    for ttype, value in tokens:
        parts = value.split('\n')
        for i, part in enumerate(parts):
            if part:
                current_line.append((ttype, part))
            if i < len(parts) - 1:
                line_tokens.append(current_line)
                current_line = []
    if current_line:
        line_tokens.append(current_line)

    for line in line_tokens:
        p = OxmlElement('w:p')
        pPr = OxmlElement('w:pPr')

        # Paragraph spacing
        spacing = OxmlElement('w:spacing')
        spacing.set(qn('w:before'), '0')
        spacing.set(qn('w:after'), '0')
        spacing.set(qn('w:line'), '240')
        spacing.set(qn('w:lineRule'), 'auto')
        pPr.append(spacing)

        # Indentation
        ind = OxmlElement('w:ind')
        ind.set(qn('w:left'), '144')
        pPr.append(ind)

        p.append(pPr)

        for ttype, text in line:
            r = OxmlElement('w:r')
            rPr = OxmlElement('w:rPr')

            # Font
            rFonts = OxmlElement('w:rFonts')
            rFonts.set(qn('w:ascii'), 'Consolas')
            rFonts.set(qn('w:hAnsi'), 'Consolas')
            rPr.append(rFonts)

            # Size (9pt = 18 half-points)
            sz = OxmlElement('w:sz')
            sz.set(qn('w:val'), '18')
            rPr.append(sz)
            szCs = OxmlElement('w:szCs')
            szCs.set(qn('w:val'), '18')
            rPr.append(szCs)

            # Color
            color_rgb = get_token_color(ttype)
            color_el = OxmlElement('w:color')
            color_el.set(qn('w:val'), '{:02X}{:02X}{:02X}'.format(*color_rgb))
            rPr.append(color_el)

            r.append(rPr)

            t = OxmlElement('w:t')
            t.set(qn('xml:space'), 'preserve')
            t.text = text
            r.append(t)
            p.append(r)

        cell._tc.append(p)

    doc.add_paragraph()  # gap after block


def add_section_title(doc, title):
    """Add a styled section title (BACKEND / FRONTEND)."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(8)
    run = p.add_run(title)
    run.font.size = Pt(24)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x56, 0x9C, 0xD6)

    # Add a horizontal rule via bottom border on the paragraph
    pPr = p._element.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), '569CD6')
    pBdr.append(bottom)
    pPr.append(pBdr)


def read_file_safe(path):
    for enc in ['utf-8', 'utf-8-sig', 'latin-1']:
        try:
            with open(path, 'r', encoding=enc) as f:
                return f.read()
        except Exception:
            continue
    return f"[Could not read file: {path}]"


def main():
    base = Path(r'c:\Users\eyalr\sigmashub')
    output = base / 'sigmashub_code.docx'

    BACKEND_FILES = [
        'backend/main.py',
        'backend/database.py',
        'backend/db_client.py',
        'backend/schemas.py',
        'backend/send_email.py',
        'backend/pyrightconfig.json',
        'backend/db/__init__.py',
        'backend/db/db_connection.py',
        'backend/db/db_server.py',
        'backend/db/init_db.py',
        'backend/db/models.py',
        'backend/db/queries/__init__.py',
        'backend/db/queries/chats.py',
        'backend/db/queries/notifications.py',
        'backend/db/queries/posts.py',
        'backend/db/queries/search.py',
        'backend/db/queries/sql.py',
        'backend/db/queries/users.py',
        'backend/routers/ai.py',
        'backend/routers/auth.py',
        'backend/routers/chats.py',
        'backend/routers/notifications.py',
        'backend/routers/posts.py',
        'backend/routers/search.py',
        'backend/routers/users.py',
        'backend/utils/__init__.py',
        'backend/utils/auth.py',
        'backend/utils/media.py',
    ]

    FRONTEND_FILES = [
        'frontend/package.json',
        'frontend/jsconfig.json',
        'frontend/components.json',
        'frontend/lib/utils.js',
        'frontend/app/layout.js',
        'frontend/app/page.js',
        'frontend/app/error.js',
        'frontend/app/not-found.js',
        'frontend/app/fonts.js',
        'frontend/app/globals.css',
        'frontend/app/lib/auth.js',
        'frontend/app/lib/config.js',
        'frontend/app/logout/actions.js',
        'frontend/app/signup/actions.js',
        'frontend/app/signup/page.js',
        'frontend/app/signup/SignUpForm.jsx',
        'frontend/app/login/page.js',
        'frontend/app/login/LoginForm.jsx',
        'frontend/app/contact_page/page.js',
        'frontend/app/api/clear-session/route.js',
        'frontend/app/api/download/route.js',
        'frontend/app/app/layout.js',
        'frontend/app/app/page.js',
        'frontend/app/app/AppContent.jsx',
        'frontend/app/app/[username]/page.js',
        'frontend/app/app/create/page.js',
        'frontend/app/app/create/AppContent.jsx',
        'frontend/app/app/messages/page.js',
        'frontend/app/app/messages/MessagesContent.jsx',
        'frontend/app/app/profile/page.js',
        'frontend/app/app/profile/AppContent.jsx',
        'frontend/app/app/search/page.js',
        'frontend/app/app/search/SearchContent.jsx',
        'frontend/app/app/settings/page.js',
        'frontend/app/app/settings/SettingsContent.jsx',
        'frontend/app/components/AppTour.jsx',
        'frontend/app/components/AppTourWrapper.jsx',
        'frontend/app/components/CreatePost.jsx',
        'frontend/app/components/CustomCursor.jsx',
        'frontend/app/components/HoverText.jsx',
        'frontend/app/components/ImageCarouselWrapper.jsx',
        'frontend/app/components/LogoutButton.jsx',
        'frontend/app/components/NavBar.jsx',
        'frontend/app/components/NotificationsPanel.jsx',
        'frontend/app/components/PostSuccessAnimation.jsx',
        'frontend/app/components/PostsFeed.jsx',
        'frontend/app/components/Sidebar.jsx',
        'frontend/app/components/TourFloatButton.jsx',
        'frontend/app/components/chevron.jsx',
        'frontend/app/components/meteors.jsx',
    ]

    doc = Document()

    # Page setup: narrow margins
    section = doc.sections[0]
    section.top_margin = Inches(0.75)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(0.75)
    section.right_margin = Inches(0.75)

    # Title
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_p.add_run('SigmasHub — Full Source Code')
    title_run.font.size = Pt(28)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(0x56, 0x9C, 0xD6)

    subtitle_p = doc.add_paragraph()
    subtitle_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_run = subtitle_p.add_run('VSCode Dark+ Theme  •  Backend & Frontend')
    sub_run.font.size = Pt(11)
    sub_run.font.color.rgb = RGBColor(0x6A, 0x99, 0x55)

    doc.add_paragraph()

    # ── BACKEND ──────────────────────────────────────────────
    add_section_title(doc, '⬡  BACKEND')

    for rel_path in BACKEND_FILES:
        full_path = base / rel_path
        if not full_path.exists():
            print(f"  SKIP (not found): {rel_path}")
            continue
        print(f"  Adding: {rel_path}")
        add_file_header(doc, rel_path)
        code = read_file_safe(full_path)
        add_code_block(doc, code, str(full_path))

    # ── FRONTEND ─────────────────────────────────────────────
    add_section_title(doc, '⬡  FRONTEND')

    for rel_path in FRONTEND_FILES:
        full_path = base / rel_path
        if not full_path.exists():
            print(f"  SKIP (not found): {rel_path}")
            continue
        print(f"  Adding: {rel_path}")
        add_file_header(doc, rel_path)
        code = read_file_safe(full_path)
        add_code_block(doc, code, str(full_path))

    doc.save(str(output))
    print(f"\nDone! Saved to: {output}")


if __name__ == '__main__':
    main()
