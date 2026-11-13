"""تنزيل خطوط الموقع محليًا وتوليد css/fonts.css (بدل الاعتماد على Google Fonts).

    python tools/fetch_fonts.py
"""

from __future__ import annotations

import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "assets" / "fonts"
STYLE = ROOT / "css" / "style.css"

START = "/* fonts:start — خطوط مستضافة محليًا، لا تعدّل هذا القسم يدويًا */"
END = "/* fonts:end */"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

URL = (
    "https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800"
    "&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700"
    "&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
)

KEEP = {"arabic", "latin"}


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    FONTS.mkdir(parents=True, exist_ok=True)

    req = urllib.request.Request(URL, headers={"User-Agent": UA})
    css = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")

    blocks = re.findall(r"/\*\s*([^*]+?)\s*\*/\s*@font-face\s*\{(.*?)\}", css, re.S)
    faces = []
    total = 0

    for subset, body in blocks:
        subset = subset.strip()
        if subset not in KEEP:
            continue

        family = re.search(r"font-family:\s*'([^']+)'", body).group(1)
        weight = re.search(r"font-weight:\s*(\d+)", body).group(1)
        src = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
        unicode_range = re.search(r"unicode-range:\s*([^;]+);", body).group(1).strip()

        name = f"{slug(family)}-{weight}-{subset}.woff2"
        target = FONTS / name
        if not target.exists():
            data = urllib.request.urlopen(
                urllib.request.Request(src, headers={"User-Agent": UA}), timeout=60
            ).read()
            target.write_bytes(data)
        total += target.stat().st_size
        faces.append((family, weight, name, unicode_range))

    lines = [START]
    for family, weight, name, unicode_range in faces:
        lines.append(
            "@font-face {\n"
            f"  font-family: '{family}';\n"
            "  font-style: normal;\n"
            f"  font-weight: {weight};\n"
            "  font-display: swap;\n"
            f"  src: url('../assets/fonts/{name}') format('woff2');\n"
            f"  unicode-range: {unicode_range};\n"
            "}"
        )
    lines.append(END)
    block = "\n\n".join(lines)

    style = STYLE.read_text(encoding="utf-8")
    if START in style and END in style:
        head, rest = style.split(START, 1)
        _, tail = rest.split(END, 1)
        style = head + block + tail
    else:
        style = block + "\n\n" + style

    STYLE.write_text(style, encoding="utf-8", newline="\n")
    print(f"خطوط: {len(faces)} ملف · {total / 1024:.0f} كيلوبايت · داخل css/style.css")
    return 0


if __name__ == "__main__":
    sys.exit(main())
