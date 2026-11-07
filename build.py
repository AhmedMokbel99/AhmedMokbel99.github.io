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

import html as html_lib
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

# بطاقات المشاريع المكتوبة داخل index.html (تظهر لمحركات البحث بدون JavaScript)
WORK_START = "<!-- static-projects:start -->"
WORK_END = "<!-- static-projects:end -->"
WORK_BLOCK = re.compile(re.escape(WORK_START) + r".*?" + re.escape(WORK_END), re.S)

CATEGORY_LABELS = {
    "motion": "موشن جرافيك",
    "brand": "هوية وطباعة",
    "digital": "تصميم رقمي",
}


def _split_top_level_objects(body: str) -> list[str]:
    """Split the WORK_DATA array body into top-level {...} chunks."""
    objects: list[str] = []
    depth = 0
    start = -1
    in_string = False
    escaped = False

    for index, char in enumerate(body):
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == "{":
            if depth == 0:
                start = index
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0 and start != -1:
                objects.append(body[start : index + 1])
                start = -1

    return objects


def _field(obj: str, key: str, default=None):
    match = re.search(rf'\b{key}:\s*"((?:[^"\\]|\\.)*)"', obj)
    if match:
        return match.group(1).replace('\\"', '"').replace("\\\\", "\\")

    match = re.search(rf"\b{key}:\s*(true|false|-?\d+)", obj)
    if match:
        value = match.group(1)
        if value == "true":
            return True
        if value == "false":
            return False
        return int(value)

    return default


def parse_work_data(js_text: str) -> list[dict]:
    """Read WORK_DATA from data.js without running JavaScript."""
    match = re.search(r"const\s+WORK_DATA\s*=\s*\[", js_text)
    if not match:
        fail("لم يتم العثور على WORK_DATA داخل js/data.js.")

    body_start = match.end()
    depth = 1
    index = body_start
    in_string = False
    escaped = False

    while index < len(js_text) and depth > 0:
        char = js_text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
        elif char == '"':
            in_string = True
        elif char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
        index += 1

    body = js_text[body_start : index - 1]
    projects = []
    for chunk in _split_top_level_objects(body):
        projects.append(
            {
                "id": _field(chunk, "id"),
                "code": _field(chunk, "code"),
                "title": _field(chunk, "title"),
                "cat": _field(chunk, "cat"),
                "tag": _field(chunk, "tag"),
                "isVideo": bool(_field(chunk, "isVideo", False)),
                "image": _field(chunk, "image"),
                "imageSmall": _field(chunk, "imageSmall"),
                "width": _field(chunk, "width", 1200),
                "height": _field(chunk, "height", 900),
            }
        )
    return projects


def project_card(project: dict) -> str:
    """Static copy of projectMarkup() in js/main.js — keep both in sync."""
    esc = lambda value: html_lib.escape(str(value), quote=True)
    category = CATEGORY_LABELS.get(project["cat"], project["cat"])
    fallback = project["imageSmall"] or project["image"]
    srcset = (
        f'{project["imageSmall"]} 900w, ' if project["imageSmall"] else ""
    ) + f'{project["image"]} {project["width"]}w'

    badge = (
        '<span class="project__type">'
        '<svg class="icon icon--solid" aria-hidden="true"><use href="#i-play"></use></svg>'
        "فيديو"
        "</span>"
        if project["isVideo"]
        else ""
    )

    return f'''<article class="project" data-reveal data-project-card="{esc(project["id"])}" data-category="{esc(project["cat"])}">
  <div class="project__media">
    <img
      src="{esc(fallback)}"
      srcset="{esc(srcset)}"
      sizes="(max-width: 680px) 92vw, (max-width: 1080px) 45vw, 30vw"
      width="{esc(project["width"])}"
      height="{esc(project["height"])}"
      alt="{esc(project["title"])} — {esc(project["tag"])}"
      loading="lazy"
      decoding="async"
    >
    <div class="project__badges">
      <span class="project__code">{esc(project["code"])}</span>
      {badge}
    </div>
  </div>
  <div class="project__body">
    <span class="project__tag">{esc(project["tag"])}</span>
    <h3 class="project__title">{esc(project["title"])}</h3>
    <span class="project__more">
      <span>{"شاهد الفيديو" if project["isVideo"] else "عرض التفاصيل"}</span>
      <svg class="icon" aria-hidden="true"><use href="#i-arrow-left"></use></svg>
    </span>
  </div>
  <button
    type="button"
    class="project__open"
    data-project-open="{esc(project["id"])}"
    aria-label="عرض تفاصيل مشروع {esc(project["title"])} — {esc(category)}"
  ></button>
</article>'''


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

    # 0) اكتب بطاقات المشاريع داخل index.html (محتوى ثابت لمحركات البحث).
    projects = parse_work_data(data)
    if not projects:
        fail("لم يتم استخراج أي مشروع من js/data.js.")
    if not WORK_BLOCK.search(html):
        fail("لم يتم العثور على علامتي static-projects داخل index.html.")

    block = WORK_START + "\n" + "\n".join(project_card(p) for p in projects) + "\n" + WORK_END
    synced = WORK_BLOCK.sub(lambda _: block, html, count=1)
    if synced != html:
        SOURCE.write_text(synced, encoding="utf-8", newline="\n")
        html = synced
        print(f"✓ تم تحديث {len(projects)} بطاقة مشروع داخل index.html")

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
    # Windows consoles default to cp1252 and crash on Arabic/✓ output.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
