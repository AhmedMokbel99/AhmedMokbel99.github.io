#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
بناء نسخة الملف الواحد (standalone.html)
=========================================
يدمج css/style.css و js/data.js و js/main.js داخل index.html
لإنتاج ملف واحد يعمل بفتحه مباشرة في المتصفح (بدون خادم).

الاستخدام:
    python build.py

ملاحظة: لا تعدّل standalone.html يدويًا؛ عدّل الملفات الأصلية
ثم أعد تشغيل هذا السكربت.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "index.html"
OUTPUT = ROOT / "standalone.html"

CSS_FILE = ROOT / "css" / "style.css"
DATA_FILE = ROOT / "js" / "data.js"
MAIN_FILE = ROOT / "js" / "main.js"

STYLE_TAG = re.compile(
    r'[ \t]*<link\s+rel="stylesheet"\s+href="css/style\.css(?:\?v=[^"]*)?"\s*/?>'
)
SCRIPT_TAGS = re.compile(
    r'[ \t]*<script\s+src="js/(?:data|main)\.js(?:\?v=[^"]*)?"\s+defer\s*>\s*</script>'
)


def read(path: Path) -> str:
    """Read UTF-8 text (tolerating a BOM) and normalise to LF."""
    text = path.read_text(encoding="utf-8-sig")
    return text.replace("\r\n", "\n").replace("\r", "\n")


def fail(message: str) -> None:
    print(f"✗ {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    for path in (SOURCE, CSS_FILE, DATA_FILE, MAIN_FILE):
        if not path.is_file():
            fail(f"الملف غير موجود: {path.relative_to(ROOT)}")

    html = read(SOURCE)
    css = read(CSS_FILE)
    data = read(DATA_FILE)
    main_js = read(MAIN_FILE)

    if not STYLE_TAG.search(html):
        fail("لم يتم العثور على وسم css/style.css داخل index.html.")

    if len(SCRIPT_TAGS.findall(html)) != 2:
        fail("لم يتم العثور على وسوم js/data.js و js/main.js داخل index.html.")

    # 1) Inline the stylesheet.
    html = STYLE_TAG.sub(
        lambda _: "  <style>\n" + css.rstrip() + "\n  </style>", html, count=1
    )

    # 2) Remove the external scripts (they must run after the DOM is parsed).
    html = SCRIPT_TAGS.sub("", html)

    # 3) Append both scripts right before </body>, keeping their order.
    bundle = (
        "  <!-- Inlined application scripts -->\n"
        "  <script>\n" + data.rstrip() + "\n  </script>\n"
        "  <script>\n" + main_js.rstrip() + "\n  </script>\n"
    )
    if "</body>" not in html:
        fail("لم يتم العثور على وسم </body> في index.html.")
    html = html.replace("</body>", bundle + "</body>", 1)

    # 4) Keep the single-file copy out of search results.
    html = html.replace(
        "</head>",
        '  <meta name="robots" content="noindex">\n</head>',
        1,
    )

    # 5) Mark the generated file.
    html = html.replace(
        "<!DOCTYPE html>",
        "<!DOCTYPE html>\n<!-- نسخة مولّدة آليًا بواسطة build.py — عدّل الملفات الأصلية ثم أعد البناء -->",
        1,
    )

    # Sanity checks: nothing may still point at the external bundles.
    leftovers = [
        needle
        for needle in ("css/style.css", '"js/data.js', '"js/main.js')
        if needle in html
    ]
    if leftovers:
        fail("بقيت مراجع خارجية في الناتج: " + ", ".join(leftovers))

    OUTPUT.write_text(html, encoding="utf-8", newline="\n")
    size_kb = OUTPUT.stat().st_size / 1024
    print(f"✓ تم إنشاء {OUTPUT.name} ({size_kb:.1f} KB)")
    print("  CSS + data.js + main.js مدمجة داخل ملف واحد.")


if __name__ == "__main__":
    main()
