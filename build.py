#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مولّد موقع أحمد مقبل
=====================
المصدر الوحيد للمحتوى هو ملفات content/*.json:

    content/site.json      → كل نصوص الصفحة الرئيسية + بيانات التواصل
    content/projects.json  → المشاريع
    content/pages.json     → صفحتا الخدمات (موشن جرافيك / هوية بصرية)

يُنتج:
    js/data.js             → SITE_DATA + CATEGORIES + WORK_DATA (يقرأه main.js)
    index.html             → نصوص ومشاريع وخدمات وأسئلة محدّثة داخل القالب
    motion-graphics.html   → صفحة خدمة مولّدة
    brand-identity.html    → صفحة خدمة مولّدة
    sitemap.xml            → تحديث lastmod
    standalone.html        → نسخة ملف واحد

الاستخدام:
    python build.py
"""

from __future__ import annotations

import datetime as dt
import base64
import hashlib
import html as html_lib
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"

SITE_FILE = CONTENT / "site.json"
PROJECTS_FILE = CONTENT / "projects.json"
PAGES_FILE = CONTENT / "pages.json"

INDEX = ROOT / "index.html"
DATA_JS = ROOT / "js" / "data.js"
MAIN_JS = ROOT / "js" / "main.js"
WEBMCP_JS = ROOT / "js" / "webmcp.js"
CSS_FILE = ROOT / "css" / "style.css"
STANDALONE = ROOT / "standalone.html"
SITEMAP = ROOT / "sitemap.xml"
CNAME_FILE = ROOT / "CNAME"
ROBOTS_FILE = ROOT / "robots.txt"

ASSET_VERSION = "18"

# عدد المشاريع الظاهرة في الصفحة الرئيسية قبل زر «عرض المزيد»
INITIAL_CARDS = 8

# أول أربعة مشاريع في شبكة الأعمال: اثنان بعرض الصفحة واثنان بنصف العرض
LEAD_CARDS = 2
FEATURED_CARDS = 4

# توكِنات تتغيّر تلقائيًا داخل أي نص: {location} و{city}
TOKENS: dict[str, str] = {}

CATEGORY_FALLBACK = {
    "motion": "موشن جرافيك",
    "brand": "هوية وطباعة",
    "digital": "تصميم رقمي",
}

CHANNEL_ICONS = {
    "email": ("i-mail", False),
    "whatsapp": ("i-whatsapp", True),
    "behance": ("i-behance", True),
    "facebook": ("i-facebook", True),
}


def esc(value) -> str:
    text = str(value)
    if TOKENS and "{" in text:
        for token, replacement in TOKENS.items():
            if token in text:
                text = text.replace(token, replacement)
    return html_lib.escape(text, quote=True)


def apply_tokens(value):
    """يستبدل {city} و{location} داخل أي نص أو قائمة أو كائن."""
    if isinstance(value, str):
        text = value
        for token, replacement in TOKENS.items():
            if token in text:
                text = text.replace(token, replacement)
        return text
    if isinstance(value, list):
        return [apply_tokens(item) for item in value]
    if isinstance(value, dict):
        return {key: apply_tokens(item) for key, item in value.items()}
    return value


def _number(value, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def site_images(site: dict) -> dict:
    """صور الموقع القابلة للتعديل من اللوحة (البروفايل + صورة المشاركة)."""
    brand = site["brand"]
    fallback_alt = f'{brand["name"]} — {brand["jobTitle"]}'
    images = site.get("images") or {}
    portrait = images.get("portrait") or {}
    og = images.get("og") or {}
    meta = site.get("meta") or {}

    portrait = {
        "src": portrait.get("src") or "assets/ahmed-mokbel.jpg",
        "width": _number(portrait.get("width"), 887),
        "height": _number(portrait.get("height"), 1024),
        "medium": portrait.get("medium") or "",
        "mediumWidth": _number(portrait.get("mediumWidth"), 800),
        "mediumHeight": _number(portrait.get("mediumHeight"), 924),
        "small": portrait.get("small") or "",
        "smallWidth": _number(portrait.get("smallWidth"), 480),
        "smallHeight": _number(portrait.get("smallHeight"), 554),
        "alt": portrait.get("alt") or fallback_alt,
    }

    og = {
        "src": og.get("src") or meta.get("ogImage") or "assets/og-image.jpg",
        "width": _number(og.get("width"), 1200),
        "height": _number(og.get("height"), 630),
        "alt": og.get("alt") or fallback_alt,
    }

    return {"portrait": portrait, "og": og}


def fail(message: str) -> None:
    print(f"✗ {message}", file=sys.stderr)
    raise SystemExit(1)


def encode_email(value: str) -> str:
    """يخفي البريد عن زاحف الصفحات؛ الـ JS يفكّه عند الضغط فقط."""
    return base64.b64encode(str(value).encode("utf-8")).decode("ascii")


def decode_email(value: str) -> str:
    """يفكّ القيمة المخزّنة في site.json، ويقبل النص العادي للتوافق."""
    text = str(value or "")
    if not text:
        return ""
    try:
        return base64.b64decode(text, validate=True).decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        return text


def read(path: Path) -> str:
    text = path.read_text(encoding="utf-8-sig")
    return text.replace("\r\n", "\n").replace("\r", "\n")


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")


def load_json(path: Path, label: str):
    if not path.is_file():
        fail(f"ملف المحتوى غير موجود: {path.relative_to(ROOT)}")
    try:
        return json.loads(read(path))
    except json.JSONDecodeError as exc:
        fail(f"{label}: JSON غير صالح — {exc}")


def get(data: dict, dotted: str, default=None):
    node = data
    for part in dotted.split("."):
        if not isinstance(node, dict) or part not in node:
            return default
        node = node[part]
    return node


# ---------------------------------------------------------------------------
# 1) js/data.js
# ---------------------------------------------------------------------------
def build_data_js(site: dict, projects: list[dict]) -> str:
    brand = site["brand"]
    contact = site["contact"]
    hero = site["hero"]

    site_data = {
        "name": brand["name"],
        "firstName": brand["firstName"],
        "title": brand["jobTitle"],
        "location": brand["location"],
        "careerStart": brand["careerStart"],
        "behanceSince": str(brand["behanceSince"]),
        "lead": hero["lead"],
        "roles": hero.get("roles", []),
        "agency": {
            "name": site["agency"]["name"],
            "tagline": site["agency"]["tagline"],
            "url": contact.get("agencyUrl", contact.get("facebook", "")),
            "description": site["agency"]["description"],
        },
        "email": encode_email(contact["email"]),
        "whatsapp": contact["whatsapp"],
        "behance": contact["behance"],
        "facebook": contact["facebook"],
        "twitter": contact["twitter"],
        "tools": site.get("tools", []),
        "skills": site.get("skills", []),
        "stats": site.get("stats", []),
        "services": [
            {"title": s["title"], "desc": s.get("desc", ""), "link": s.get("link", "")}
            for s in site.get("services", [])
            if s.get("title")
        ],
    }

    visible = [p for p in projects if p.get("visible", True) is not False]

    site_data = apply_tokens(site_data)
    visible = apply_tokens(visible)

    # نفس الـslug العلني اللي في api/projects/<slug>.json
    slugs = project_slugs(visible)
    visible = [dict(p, slug=slugs[p["id"]]) for p in visible]

    header = (
        "/**\n"
        " * ملف مولّد آليًا من content/*.json بواسطة build.py\n"
        " * لا تعدّله يدويًا — عدّل المحتوى من لوحة التحكم أو من ملفات content.\n"
        " */\n\n"
    )
    return (
        header
        + "const SITE_DATA = "
        + json.dumps(site_data, ensure_ascii=False, indent=2)
        + ";\n\nconst CATEGORIES = "
        + json.dumps(site.get("categories", []), ensure_ascii=False, indent=2)
        + ";\n\nconst WORK_DATA = "
        + json.dumps(visible, ensure_ascii=False, indent=2)
        + ";\n"
    )


# ---------------------------------------------------------------------------
# 2) وضع النصوص (data-cms)
# ---------------------------------------------------------------------------
CMS_RE = re.compile(r'<([a-zA-Z][\w-]*)([^>]*\bdata-cms="([^"]+)"[^>]*)>(.*?)</\1>', re.S)
CMS_ATTR_RE = re.compile(
    r'<([a-zA-Z][\w-]*)([^>]*\bdata-cms-attr="([^"]+)"[^>]*\bdata-cms="([^"]+)"[^>]*)>'
)


def apply_cms(html: str, site: dict) -> tuple[str, int]:
    missed: list[str] = []

    def repl(match: re.Match) -> str:
        tag, attrs, key = match.group(1), match.group(2), match.group(3)
        value = get(site, key)
        # العناصر اللي مالهاش محتوى نصي: النص بيتغيّر في الـplaceholder عن طريق data-cms-attr
        if tag.lower() == "textarea":
            return f"<{tag}{attrs}></{tag}>"
        if tag.lower() in {"input", "img", "br", "hr", "source", "track"}:
            return match.group(0)
        if value is None:
            missed.append(key)
            return match.group(0)
        return f"<{tag}{attrs}>{esc(value)}</{tag}>"

    html = CMS_RE.sub(repl, html)

    def attr_repl(match: re.Match) -> str:
        tag, attrs, attr_name, key = (
            match.group(1),
            match.group(2),
            match.group(3),
            match.group(4),
        )
        value = get(site, key)
        if value is None:
            missed.append(key)
            return match.group(0)
        new_attrs = re.sub(
            rf'(?<![\w-]){re.escape(attr_name)}="[^"]*"',
            f'{attr_name}="{esc(value)}"',
            attrs,
            count=1,
        )
        return f"<{tag}{new_attrs}>"

    html = CMS_ATTR_RE.sub(attr_repl, html)
    if missed:
        fail("مفاتيح نصوص غير موجودة في site.json: " + ", ".join(sorted(set(missed))))
    return html, len(CMS_RE.findall(html))


def replace_block(html: str, name: str, inner: str) -> str:
    pattern = re.compile(
        rf"(<!-- {re.escape(name)}:start -->).*?(<!-- {re.escape(name)}:end -->)", re.S
    )
    if not pattern.search(html):
        fail(f"لم يتم العثور على علامات {name} داخل index.html.")
    return pattern.sub(lambda m: f"{m.group(1)}\n{inner}\n{m.group(2)}", html, count=1)


# ---------------------------------------------------------------------------
# 3) مكوّنات HTML
# ---------------------------------------------------------------------------
DEDUPE_TRANSLATION = str.maketrans(
    {
        "أ": "ا", "إ": "ا", "آ": "ا", "ى": "ي", "ة": "ه",
        "َ": "", "ً": "", "ٌ": "", "ْ": "", "ِ": "", "ٍ": "", "ّ": "",
    }
)


def normalize_dedupe(text: str) -> str:
    """تطبيع خفيف للمقارنة: الألف/الياء/التاء والـ«ال» لا تفرّق بين جزأين مكررين."""
    value = str(text or "").translate(DEDUPE_TRANSLATION)
    return value[2:] if value.startswith("ال") else value


def dedupe_alt(text: str) -> str:
    """يشيل التكرار في نص الصورة البديل: «اسم — وصف — وصف» -> «اسم — وصف»."""
    parts = [part.strip() for part in str(text).split(" — ")]
    out: list[str] = []
    for part in parts:
        if part and (not out or normalize_dedupe(out[-1]) != normalize_dedupe(part)):
            out.append(part)
    return " — ".join(out)


def project_alt(project: dict) -> str:
    fallback = f'{project["title"]} — {project.get("tag", "")}'
    return dedupe_alt(project.get("alt") or fallback)


LATIN_RUN = re.compile(r"[A-Za-z][A-Za-z0-9.'’+\-/]*(?:[ \t]+[A-Za-z0-9.'’+\-/]+)*")


def mark_latin(value) -> str:
    """يغلّف المقاطع اللاتينية بـ<span lang="en" dir="ltr"> جوه النص العربي."""
    text = str(value or "")
    out: list[str] = []
    last = 0
    for match in LATIN_RUN.finditer(text):
        out.append(esc(text[last : match.start()]))
        out.append('<span lang="en" dir="ltr">' + esc(match.group(0)) + "</span>")
        last = match.end()
    out.append(esc(text[last:]))
    return "".join(out)


def project_has_video(project: dict) -> bool:
    """هل فيه فيديو فعلي يتشغّل؟ لو لأ منعرضش «شاهد الفيديو» على الفاضي."""
    return bool(project.get("video") or project.get("youtube") or project.get("videos"))


def project_first_video(project: dict) -> str:
    """أول ملف فيديو محلي نستخدمه كمعاينة عند التحويم (بدون صوت)."""
    videos = project.get("videos")
    if isinstance(videos, list) and videos:
        first = videos[0]
        if isinstance(first, dict):
            return str(first.get("src") or "")
        return str(first or "")
    return str(project.get("video") or "")


def project_card(project: dict, index: int = 0) -> str:
    """Keep in sync with projectMarkup() in js/main.js."""
    image = project.get("image", "")
    image_small = project.get("imageSmall") or ""
    width = int(project.get("width") or 1200)
    height = int(project.get("height") or 900)
    fallback = image_small or image
    grid_small = (
        re.sub(r"\.(?:jpe?g|png|webp)$", "-640.jpg", image, flags=re.I)
        if image.startswith("assets/")
        else ""
    )
    srcset = ", ".join(
        part
        for part in (
            f"{grid_small} 640w" if grid_small else "",
            f"{image_small} 900w" if image_small else "",
            f"{image} {width}w",
        )
        if part
    )
    alt = project_alt(project)
    aria_label = dedupe_alt(f'عرض تفاصيل مشروع {project["title"]} — {project.get("tag", "")}')

    classes = ["project"]
    if index < LEAD_CARDS:
        classes.append("project--lead")
    elif index < FEATURED_CARDS:
        classes.append("project--feature")
    if project_has_video(project):
        classes.append("project--video")
    if index >= INITIAL_CARDS:
        classes.append("is-deferred")

    has_video = project_has_video(project)
    badge = (
        '<span class="project__type">'
        '<svg class="icon icon--solid" aria-hidden="true"><use href="#i-play"></use></svg>'
        "اضغط للمشاهدة"
        "</span>"
        if has_video
        else ""
    )

    preview_src = project_first_video(project)
    preview = (
        f'    <video class="project__preview" src="{esc(preview_src)}" '
        f'poster="{esc(fallback)}" muted loop playsinline preload="none" '
        'aria-hidden="true" tabindex="-1"></video>'
        if preview_src
        else ""
    )

    return f'''<article id="project-{esc(project["id"])}" class="{" ".join(classes)}" data-reveal data-project-card="{esc(project["id"])}" data-category="{esc(project["cat"])}">
  <div class="project__media">
    <img
      src="{esc(fallback)}"
      srcset="{esc(srcset)}"
      sizes="(max-width: 680px) 100vw, (max-width: 1080px) 90vw, 60vw"
      width="{width}"
      height="{height}"
      alt="{esc(alt)}"
      loading="lazy"
      decoding="async"
    >
{preview}
    {f'<div class="project__badges">{badge}</div>' if badge else ''}
  </div>
  <div class="project__body">
    <span class="project__tag">{esc(project["tag"])}</span>
    <h3 class="project__title">{mark_latin(project["title"])}</h3>
    <span class="project__more">
      <span>{"شاهد الفيديو" if has_video else "عرض التفاصيل"}</span>
      <svg class="icon" aria-hidden="true"><use href="#i-arrow-left"></use></svg>
    </span>
  </div>
  <button
    type="button"
    class="project__open"
    data-project-open="{esc(project["id"])}"
    aria-label="{esc(aria_label)}"
  ></button>
</article>'''


def services_block(services: list[dict]) -> str:
    cards = []
    for index, service in enumerate(services, start=1):
        link = ""
        if service.get("link") and service.get("linkLabel"):
            link = f'''
              <a class="service__link" href="{esc(service["link"])}">
                {esc(service["linkLabel"])}
                <svg class="icon" aria-hidden="true"><use href="#i-arrow-left"></use></svg>
              </a>'''
        cards.append(
            f'''          <article class="service" data-reveal>
            <div class="service__head">
              <span class="service__num" aria-hidden="true">{index:02d}</span>
              <div class="service__icon">
                <svg class="icon" aria-hidden="true"><use href="#{esc(service.get("icon", "i-compass"))}"></use></svg>
              </div>
              <h3>{esc(service["title"])}</h3>
              <button class="service__toggle" type="button" aria-expanded="false" aria-label="عرض تفاصيل {esc(service["title"])}">
                <svg class="icon" aria-hidden="true"><use href="#i-arrow-down"></use></svg>
              </button>
            </div>
            <div class="service__panel">
              <p>{esc(service["desc"])}</p>{link}
            </div>
          </article>'''
        )
    return "\n\n".join(cards)


def clients_block(site: dict) -> str:
    cards = []
    for client in site.get("clients", []):
        latin = (client.get("latin") or client["name"]).strip()
        # لو الاسم اللاتيني هو نفسه اسم العلامة، ما نكرّرش السطر تحته
        same = latin.casefold() == client["name"].strip().casefold()
        hidden = ' aria-hidden="true"' if not same else ""
        label = "" if same else f'\n            <span class="client__name">{mark_latin(client["name"])}</span>'
        cards.append(
            f'''          <li class="client">
            <span class="client__wordmark" lang="en" dir="ltr"{hidden}>{esc(latin)}</span>{label}
          </li>'''
        )
    return "\n".join(cards)


def stats_block(site: dict, projects: list[dict]) -> str:
    """أرقام ثابتة داخل HTML — تظهر حتى لو تعطّل JavaScript أو تأخّر تحميله."""
    current_year = dt.date.today().year
    career_start = int((site.get("brand") or {}).get("careerStart") or current_year)
    behance = sum(1 for p in projects if p.get("external") and p.get("url"))
    rows = []
    for stat in site.get("stats", []):
        key = stat.get("key")
        value = stat.get("value")
        if key == "experience":
            value = max(1, current_year - career_start)
        elif key == "selected":
            value = len(projects)
        elif key == "behance":
            value = behance
        if value is None:
            continue
        suffix = esc(stat.get("suffix") or "")
        rows.append(
            f'''          <div class="stat">
            <span class="stat__value" data-count="{esc(value)}" data-suffix="{suffix}">{esc(value)}{suffix}</span>
            <span class="stat__label">{esc(stat.get("label") or "")}</span>
          </div>'''
        )
    return "\n".join(rows)


def process_block(steps: list[dict]) -> str:
    cards = []
    for index, step in enumerate(steps, start=1):
        cards.append(
            f'''          <article class="step" data-reveal>
            <div class="step__head">
              <div class="step__num">{index:02d}</div>
              <h3>{esc(step["title"])}</h3>
              <button class="step__toggle" type="button" aria-expanded="false" aria-label="عرض تفاصيل {esc(step["title"])}">
                <svg class="icon" aria-hidden="true"><use href="#i-arrow-down"></use></svg>
              </button>
            </div>
            <div class="step__panel">
              <p>{esc(step["desc"])}</p>
            </div>
          </article>'''
        )
    return "\n".join(cards)


def faq_block(items: list[dict], terms: list[dict], terms_title: str) -> str:
    cards = []
    for item in items:
        cards.append(
            f'''          <details class="faq" data-reveal>
            <summary>
              {esc(item["q"])}
              <span class="faq__icon" aria-hidden="true"></span>
            </summary>
            <p>{esc(item["a"])}</p>
          </details>'''
        )
    if terms:
        cards.append(f'          <p class="faq__group" data-reveal>{esc(terms_title)}</p>')
        for item in terms:
            cards.append(
                f'''          <details class="faq" data-reveal>
            <summary>
              {esc(item["q"])}
              <span class="faq__icon" aria-hidden="true"></span>
            </summary>
            <p>{esc(item["a"])}</p>
          </details>'''
            )
    return "\n\n".join(cards)


def channels_block(site: dict) -> str:
    contact = site["contact"]
    cards = []
    for channel in site.get("channels", []):
        kind = channel.get("type", "email")
        icon, solid = CHANNEL_ICONS.get(kind, ("i-globe", False))
        icon_class = "icon icon--solid" if solid else "icon"
        if kind == "email":
            href = ' href="#contact"'
            value = "<b data-text=\"email\"></b>"
        else:
            value = f"<b>{esc(channel.get('value', ''))}</b>"
            if kind == "whatsapp":
                href = f' href="https://wa.me/{esc(contact["whatsapp"])}" target="_blank" rel="noopener noreferrer"'
            else:
                href = f' href="{esc(contact.get(kind, ""))}" target="_blank" rel="noopener noreferrer"'
        cards.append(
            f'''            <a class="channel" data-link="{esc(kind)}"{href}>
              <span class="channel__icon">
                <svg class="{icon_class}" aria-hidden="true"><use href="#{icon}"></use></svg>
              </span>
              <span class="channel__text">
                <small>{esc(channel.get("label", ""))}</small>
                {value}
              </span>
              <svg class="icon channel__arrow" aria-hidden="true"><use href="#i-arrow-left"></use></svg>
            </a>'''
        )
    return "\n\n".join(cards)


def service_options(site: dict) -> str:
    options = [
        '                  <option value="" selected data-cms="form.servicePlaceholder">'
        + esc(site["form"]["servicePlaceholder"])
        + "</option>"
    ]
    for item in site["form"].get("serviceOptions", []):
        options.append(f'                  <option value="{esc(item)}">{esc(item)}</option>')
    return "\n".join(options)


# ---------------------------------------------------------------------------
# 4) بيانات منظمة (JSON-LD)
# ---------------------------------------------------------------------------
def jsonld_script(graph: list[dict]) -> str:
    payload = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2)
    return (
        '  <script type="application/ld+json">\n'
        + payload
        + "\n  </script>"
    )


def site_base(site: dict) -> str:
    """الدومين المخصص لو متسجّل، وإلا رابط GitHub Pages."""
    meta = site.get("meta", {})
    domain = (meta.get("customDomain") or "").strip()
    if domain:
        domain = domain.split("://", 1)[-1].strip("/")
        return "https://" + domain
    return meta["siteUrl"].rstrip("/")


def home_jsonld(site: dict, projects: list[dict]) -> str:
    base = site_base(site)
    contact = site["contact"]
    brand = site["brand"]
    agency = site["agency"]
    images = site_images(site)
    person_id = f"{base}/#person"

    person = {
        "@type": "Person",
        "@id": person_id,
        "name": brand["name"],
        "jobTitle": brand["jobTitle"],
        "description": f'{brand["jobTitle"]} من {brand["location"]}، ومؤسس {agency["name"]}. {agency["description"]}',
        "url": base + "/",
        "image": f'{base}/{images["portrait"]["src"]}',
        "telephone": f'+{contact["whatsapp"]}',
        "address": {
            "@type": "PostalAddress",
            "addressLocality": brand["location"].split("،")[0],
            "addressRegion": "الدقهلية",
            "addressCountry": "EG",
        },
        "worksFor": {
            "@type": "Organization",
            "name": agency["name"],
            "description": agency["description"],
            "url": contact.get("agencyUrl", contact.get("facebook")),
        },
        "sameAs": [
            contact["behance"],
            contact["facebook"],
            contact["twitter"],
        ],
        "knowsAbout": site.get("skills", []),
    }

    website = {
        "@type": "WebSite",
        "@id": f"{base}/#website",
        "url": base + "/",
        "name": f'{brand["name"]} — بورتفوليو',
        "inLanguage": "ar",
        "publisher": {"@id": person_id},
    }

    service = {
        "@type": ["ProfessionalService", "LocalBusiness"],
        "@id": f"{base}/#service",
        "name": f'{brand["name"]} — {agency["name"]}',
        "description": f'{agency["description"]} خدمات تصميم الجرافيك والموشن جرافيك والهوية البصرية والإنتاج الإعلامي من {brand["location"]}، مصر.',
        "url": base + "/",
        "image": f'{base}/{images["og"]["src"]}',
        "telephone": f'+{contact["whatsapp"]}',
        "priceRange": "$$",
        "founder": {"@id": person_id},
        "address": {
            "@type": "PostalAddress",
            "addressLocality": brand["location"].split("،")[0],
            "addressRegion": "الدقهلية",
            "addressCountry": "EG",
        },
        "areaServed": [
            {"@type": "City", "name": brand["location"].split("،")[0]},
            {"@type": "Country", "name": "مصر"},
            {"@type": "AdministrativeArea", "name": "العالم العربي"},
        ],
        "sameAs": [contact["behance"], contact["facebook"], contact["twitter"]],
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "خدمات التصميم والموشن جرافيك",
            "itemListElement": [
                {
                    "@type": "Offer",
                    "itemOffered": {
                        "@type": "Service",
                        "name": item["title"],
                        **({"url": f'{base}/{item["link"]}'} if item.get("link") else {}),
                    },
                }
                for item in site.get("services", [])
            ],
        },
    }

    faq = {
        "@type": "FAQPage",
        "@id": f"{base}/#faq",
        "mainEntity": [
            {
                "@type": "Question",
                "name": item["q"],
                "acceptedAnswer": {"@type": "Answer", "text": item["a"]},
            }
            for item in (site.get("faq", []) + site.get("terms", []))
        ],
    }

    portfolio = portfolio_jsonld(site, projects)
    videos = video_jsonld(site, projects)

    return jsonld_script([person, website, service, faq, portfolio] + videos)


def portfolio_jsonld(site: dict, projects: list[dict]) -> dict:
    """قائمة الأعمال كـItemList — بتوضّح لمحركات البحث إن دي صفحة بورتفوليو حقيقية."""
    base = site_base(site)
    visible = [p for p in projects if p.get("visible", True) is not False]
    items = []
    for index, project in enumerate(visible, start=1):
        work = {
            "@type": "CreativeWork",
            "name": project["title"],
            "url": f'{base}/#project-{project["id"]}',
            "genre": project.get("tag") or "",
            "description": project.get("summary") or "",
        }
        if project.get("external") and project.get("url"):
            work["sameAs"] = project["url"]
        if project.get("image"):
            work["image"] = f'{base}/{project["image"]}'
        items.append({"@type": "ListItem", "position": index, "item": work})

    return {
        "@type": "ItemList",
        "@id": f"{base}/#work",
        "name": "مشاريع مختارة",
        "numberOfItems": len(items),
        "itemListElement": items,
    }


def video_jsonld(site: dict, projects: list[dict]) -> list[dict]:
    """VideoObject لكل مشروع ليه ملف فيديو فعلي — الـcontentUrl لازم يكون ملف ميديا."""
    base = site_base(site)
    nodes = []
    for project in projects:
        if project.get("visible", True) is False:
            continue
        video = str(project.get("video") or "").strip()
        if not video.lower().endswith((".mp4", ".webm", ".mov")):
            continue
        image = str(project.get("image") or "").strip()
        nodes.append(
            {
                "@type": "VideoObject",
                "@id": f'{base}/#video-{project["id"]}',
                "name": project["title"],
                "description": project.get("summary") or "",
                "thumbnailUrl": f"{base}/{image}" if image else "",
                "contentUrl": f"{base}/{video}",
                "uploadDate": str(project.get("date") or "").strip(),
                "inLanguage": "ar",
                "url": f'{base}/#project-{project["id"]}',
            }
        )
    return nodes


def svg_sprite() -> str:
    return '''  <svg class="svg-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <symbol id="i-arrow-left" viewBox="0 0 24 24"><path d="M19 12H5M11 18l-6-6 6-6"/></symbol>
    <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></symbol>
    <symbol id="i-whatsapp" viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.29 3.8.6.26 1.07.41 1.44.53.6.19 1.15.16 1.59.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3"/></symbol>
    <symbol id="i-external" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="m4 12 5 5L20 6"/></symbol>
    <symbol id="i-pin" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></symbol>
  </svg>'''


# ---------------------------------------------------------------------------
# 5) توليد صفحات الخدمات
# ---------------------------------------------------------------------------
def service_page(page: dict, site: dict, others: list[dict]) -> str:
    base = site_base(site)
    brand = site["brand"]
    contact = site["contact"]
    images = site_images(site)
    url = f'{base}/{page["slug"]}'
    whatsapp = f'https://wa.me/{contact["whatsapp"]}'
    phone_display = f'+{contact["whatsapp"]}'

    faq_items = page["faq"]["items"]
    graph = [
        {
            "@type": "Service",
            "@id": f"{url}#service",
            "name": page["schemaName"],
            "serviceType": page["serviceType"],
            "description": page["serviceDescription"],
            "url": url,
            "provider": {
                "@type": "Person",
                "name": brand["name"],
                "url": base + "/",
                "jobTitle": brand["jobTitle"],
            },
            "areaServed": [
                {"@type": "City", "name": brand["location"].split("،")[0]},
                {"@type": "Country", "name": "مصر"},
                {"@type": "AdministrativeArea", "name": "العالم العربي"},
            ],
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "الرئيسية", "item": base + "/"},
                {"@type": "ListItem", "position": 2, "name": page["navLabel"], "item": url},
            ],
        },
        {
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": item["q"],
                    "acceptedAnswer": {"@type": "Answer", "text": item["a"]},
                }
                for item in faq_items
            ],
        },
    ]

    service_items = "\n".join(
        f"            <li>{esc(item)}</li>" for item in page["service"]["items"]
    )
    steps = "\n".join(
        f'''            <article class="step">
              <div class="step__num">{index:02d}</div>
              <h3>{esc(step["title"])}</h3>
              <p>{esc(step["desc"])}</p>
            </article>'''
        for index, step in enumerate(page["process"]["steps"], start=1)
    )
    audience = "\n".join(
        f'''            <article class="service-card">
              <h3>{esc(card["title"])}</h3>
              <p>{esc(card["desc"])}</p>
            </article>'''
        for card in page["audience"]["cards"]
    )
    gallery = "\n".join(
        f'''            <a href="index.html#work">
              <img src="{esc(item["image"])}" width="{int(item["width"])}" height="{int(item["height"])}" alt="{esc(item["alt"])}" loading="lazy" decoding="async">
              <span>{esc(item["title"])}</span>
            </a>'''
        for item in page["gallery"]["items"]
    )
    faq_html = "\n".join(
        f'''            <details class="faq">
              <summary>{esc(item["q"])}<span class="faq__icon" aria-hidden="true"></span></summary>
              <p>{esc(item["a"])}</p>
            </details>'''
        for item in faq_items
    )
    other_links = "\n".join(
        f'''            <a class="service-cross" href="{esc(item["slug"])}">
              <span>{esc(item["navLabel"])}</span>
              <svg class="icon" aria-hidden="true"><use href="#i-arrow-left"></use></svg>
            </a>'''
        for item in others
    )
    footer_services = " · ".join(
        f'<a href="{esc(item["slug"])}">{esc(item["navLabel"])}</a>' for item in others
    )

    return f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

  <title>{esc(page["title"])}</title>
  <meta name="description" content="{esc(page["description"])}">
  <meta name="author" content="{esc(brand["name"])}">
  <meta name="theme-color" content="#111314">
  <meta name="color-scheme" content="dark">
  <link rel="canonical" href="{esc(url)}">
{agent_head_links(base, "/" + page["slug"].replace(".html", ".md"))}

  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
  <link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
  <link rel="manifest" href="site.webmanifest">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="{esc(brand["name"])}">
  <meta property="og:locale" content="ar_EG">
  <meta property="og:url" content="{esc(url)}">
  <meta property="og:title" content="{esc(page["ogTitle"])}">
  <meta property="og:description" content="{esc(page["ogDescription"])}">
  <meta property="og:image" content="{esc(base)}/{esc(images["og"]["src"])}">
  <meta property="og:image:width" content="{images["og"]["width"]}">
  <meta property="og:image:height" content="{images["og"]["height"]}">
  <meta property="og:image:alt" content="{esc(images["og"]["alt"])}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(page["ogTitle"])}">
  <meta name="twitter:description" content="{esc(page["ogDescription"])}">
  <meta name="twitter:image" content="{esc(base)}/{esc(images["og"]["src"])}">
  <meta name="twitter:image:alt" content="{esc(images["og"]["alt"])}">

  <link rel="preload" href="assets/fonts/ibm-plex-sans-arabic-400-arabic.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/tajawal-800-arabic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/style.css?v={ASSET_VERSION}">

{jsonld_script(graph)}
</head>
<body>

  <a class="skip-link" href="#main">تخطَّ إلى المحتوى</a>

{svg_sprite()}

  <header class="service-header">
    <div class="wrap service-header__inner">
      <a href="index.html" class="brand">
        <span class="brand__mark" aria-hidden="true">{esc(brand["initials"])}</span>
        <span>{esc(brand["name"])}</span>
      </a>
      <nav class="service-nav" aria-label="التنقل">
        <a href="index.html">الرئيسية</a>
        <a href="index.html#work">الأعمال</a>
        <a href="index.html#contact">تواصل</a>
        <a class="btn btn--primary btn--sm" href="index.html#contact">لنعمل معًا</a>
      </nav>
    </div>
  </header>

  <main id="main" tabindex="-1">

    <section class="section service-hero">
      <div class="wrap">
        <nav class="breadcrumb" aria-label="مسار التنقل">
          <a href="index.html">الرئيسية</a>
          <span aria-hidden="true">/</span>
          <span>{esc(page["navLabel"])}</span>
        </nav>

        <p class="eyebrow">خدمة</p>
        <h1>{esc(page["h1"])}</h1>
        <p class="service-lead">{esc(page["lead"])}</p>

        <div class="hero-actions">
          <a class="btn btn--whatsapp" href="{esc(whatsapp)}" target="_blank" rel="noopener noreferrer">
            <svg class="icon icon--solid" aria-hidden="true"><use href="#i-whatsapp"></use></svg>
            {esc(page["heroCta"])}
          </a>
          <a class="btn btn--ghost" href="index.html#work">
            شاهد الأعمال
            <svg class="icon" aria-hidden="true"><use href="#i-arrow-left"></use></svg>
          </a>
        </div>
      </div>
    </section>

    <section class="section section--soft">
      <div class="wrap">
        <div class="service-block" style="margin-top:0">
          <p class="eyebrow">{esc(page["service"]["eyebrow"])}</p>
          <h2>{esc(page["service"]["title"])}</h2>
          <p>{esc(page["service"]["intro"])}</p>

          <ul class="service-list">
{service_items}
          </ul>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="service-block" style="margin-top:0">
          <p class="eyebrow">{esc(page["gallery"]["eyebrow"])}</p>
          <h2>{esc(page["gallery"]["title"])}</h2>
          <p>{esc(page["gallery"]["intro"])}</p>

          <div class="service-gallery">
{gallery}
          </div>

          <p style="margin-top:1.3rem">
            <a class="service__link" href="index.html#work">
              اكتشف كل المشاريع
              <svg class="icon" aria-hidden="true"><use href="#i-arrow-left"></use></svg>
            </a>
          </p>
        </div>
      </div>
    </section>

    <section class="section section--soft">
      <div class="wrap">
        <div class="service-block" style="margin-top:0">
          <p class="eyebrow">{esc(page["process"]["eyebrow"])}</p>
          <h2>{esc(page["process"]["title"])}</h2>

          <div class="process-grid" style="margin-top:1.8rem">
{steps}
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="service-block" style="margin-top:0">
          <p class="eyebrow">{esc(page["audience"]["eyebrow"])}</p>
          <h2>{esc(page["audience"]["title"])}</h2>

          <div class="service-cards">
{audience}
          </div>
        </div>
      </div>
    </section>

    <section class="section section--soft">
      <div class="wrap">
        <div class="service-block" style="margin-top:0">
          <p class="eyebrow">{esc(page["faq"]["eyebrow"])}</p>
          <h2>{esc(page["faq"]["title"])}</h2>

          <div class="service-faq">
{faq_html}
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="service-block" style="margin-top:0">
          <p class="eyebrow">خدمات أخرى</p>
          <h2>خدمات مكمّلة</h2>
          <div class="service-crosses">
{other_links}
          </div>
        </div>
      </div>
    </section>

    <section class="section section--soft">
      <div class="wrap">
        <div class="service-cta">
          <h2>{esc(page["cta"]["title"])}</h2>
          <p>{esc(page["cta"]["text"])}</p>
          <div class="hero-actions">
            <a class="btn btn--whatsapp" href="{esc(whatsapp)}" target="_blank" rel="noopener noreferrer">
              <svg class="icon icon--solid" aria-hidden="true"><use href="#i-whatsapp"></use></svg>
              ابدأ المحادثة
            </a>
            <a class="btn btn--ghost" href="index.html#contact">
              <svg class="icon" aria-hidden="true"><use href="#i-mail"></use></svg>
              أرسل تفاصيل المشروع
            </a>
          </div>
        </div>
      </div>
    </section>

  </main>

  <footer class="service-footer">
    <div class="wrap service-footer__inner">
      <span>© <span id="year">2026</span> {esc(brand["name"])}. {esc(site["footer"]["rights"])}</span>
      <span>
        <a href="index.html">الرئيسية</a> ·
{footer_services} ·
        <a href="privacy.html">سياسة الخصوصية</a> ·
        <a href="{esc(contact["behance"])}" target="_blank" rel="noopener noreferrer">بيهانس</a>
      </span>
    </div>
  </footer>

  <script>{SERVICE_YEAR_SCRIPT}</script>
</body>
</html>
'''


# ---------------------------------------------------------------------------
# 6) تحديث الصفحة الرئيسية
# ---------------------------------------------------------------------------
def set_attr(html: str, pattern: str, value: str) -> str:
    new, count = re.subn(pattern, lambda m: m.group(1) + esc(value) + m.group(2), html, count=1)
    if count != 1:
        fail(f"تعذّر تحديث وسم في index.html: {pattern[:70]}")
    return new


def update_head(html: str, site: dict) -> str:
    meta = site["meta"]
    base = site_base(site)
    images = site_images(site)
    og = images["og"]

    html = re.sub(r"<title>.*?</title>", lambda m: f"<title>{esc(meta['title'])}</title>", html, count=1, flags=re.S)
    html = set_attr(html, r'(<meta name="description" content=")[^"]*(")', meta["description"])
    html = set_attr(html, r'(<meta name="author" content=")[^"]*(")', site["brand"]["name"])
    html = set_attr(html, r'(<link rel="canonical" href=")[^"]*(")', base + "/")
    html = set_attr(html, r'(<meta property="og:site_name" content=")[^"]*(")', site["brand"]["name"])
    html = set_attr(html, r'(<meta property="og:url" content=")[^"]*(")', base + "/")
    html = set_attr(html, r'(<meta property="og:title" content=")[^"]*(")', meta["ogTitle"])
    html = set_attr(html, r'(<meta property="og:description" content=")[^"]*(")', meta["ogDescription"])
    html = set_attr(html, r'(<meta property="og:image" content=")[^"]*(")', f'{base}/{og["src"]}')
    html = set_attr(html, r'(<meta property="og:image:width" content=")[^"]*(")', str(og["width"]))
    html = set_attr(html, r'(<meta property="og:image:height" content=")[^"]*(")', str(og["height"]))
    html = set_attr(html, r'(<meta property="og:image:alt" content=")[^"]*(")', og["alt"])
    html = set_attr(html, r'(<meta name="twitter:url" content=")[^"]*(")', base + "/")
    html = set_attr(html, r'(<meta name="twitter:title" content=")[^"]*(")', meta["ogTitle"])
    html = set_attr(html, r'(<meta name="twitter:description" content=")[^"]*(")', meta["ogDescription"])
    html = set_attr(html, r'(<meta name="twitter:image" content=")[^"]*(")', f'{base}/{og["src"]}')
    html = set_attr(html, r'(<meta name="twitter:image:alt" content=")[^"]*(")', og["alt"])

    block = re.compile(r'  <script type="application/ld\+json">.*?  </script>', re.S)
    if not block.search(html):
        fail("لم يتم العثور على بيانات JSON-LD داخل index.html.")
    return block.sub(lambda m: "", html, count=1)


def portrait_tag(images: dict) -> str:
    portrait = images["portrait"]
    srcset = []
    if portrait["small"]:
        srcset.append(f'{portrait["small"]} {portrait["smallWidth"]}w')
    if portrait["medium"]:
        srcset.append(f'{portrait["medium"]} {portrait["mediumWidth"]}w')
    srcset.append(f'{portrait["src"]} {portrait["width"]}w')

    return (
        "<img\n"
        '                data-site-image="portrait"\n'
        f'                src="{esc(portrait["small"] or portrait["src"])}"\n'
        f'                srcset="{esc(", ".join(srcset))}"\n'
        '                sizes="72px"\n'
        '                width="72"\n'
        '                height="83"\n'
        f'                alt="{esc(portrait["alt"])}"\n'
        "                loading=\"eager\"\n"
        "                decoding=\"async\"\n"
        "              >"
    )


def update_portrait(html: str, site: dict) -> str:
    pattern = re.compile(r'<img\b[^>]*\bdata-site-image="portrait"[^>]*>', re.S)
    new, count = pattern.subn(lambda m: portrait_tag(site_images(site)), html, count=1)
    if count != 1:
        fail("لم يتم العثور على صورة البروفايل (data-site-image=\"portrait\") داخل index.html.")
    return new


def update_assets_version(html: str) -> str:
    return re.sub(r"\?v=[^\"'>\s]+", f"?v={ASSET_VERSION}", html)


# ── سياسات <head> اللي بتتفرض فعلًا على GitHub Pages ─────────────────────────
# GitHub Pages ما بتدّيش تحكم في HTTP response headers، فالمتاح هو <meta> فقط:
#   • Content-Security-Policy — مدعومة عبر <meta http-equiv> (بدون frame-ancestors،
#     لأن المتصفحات بتتجاهل هذه التوجيهات في <meta> وبتطلع تحذير في الكونسول)
#   • Referrer-Policy — مدعومة عبر <meta name="referrer">
#   • robots — مدعومة عبر <meta name="robots">
# اللي مش ممكن فرضه عبر <meta> (X-Frame-Options، X-Content-Type-Options،
# Permissions-Policy، COOP/CORP، HSTS) موثّق في docs/agent-readiness.md §1.
YOUTUBE_ORIGIN = "https://www.youtube-nocookie.com"
ANALYTICS_ORIGIN = "https://ahmed-analytics.ahmed01068775125.workers.dev"

# نموذج التواصل يفتح واتساب فقط؛ مفيش نقطة نهاية أو تحقق خارجي محتاج إذن CSP.
def configure_csp(site: dict) -> None:
    global CSP_PUBLIC, CSP_STANDALONE, CSP_SERVICE

    CSP_PUBLIC = (
        "default-src 'self'; "
        "base-uri 'self'; "
        "object-src 'none'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self' data:; "
        "media-src 'self'; "
        f"frame-src {YOUTUBE_ORIGIN}; "
        f"connect-src 'self' {ANALYTICS_ORIGIN}; "
        "form-action 'self'; "
        "manifest-src 'self'"
    )
    # standalone.html بيضمّن الـCSS والـJS جوّه الملف، فمحتاج 'unsafe-inline' للسكربتات
    CSP_STANDALONE = CSP_PUBLIC.replace(
        "script-src 'self';",
        "script-src 'self' 'unsafe-inline';",
    )
    # صفحات الخدمات فيها سكربت صغير واحد بيحدّث سنة الفوتر. بدل 'unsafe-inline'
    # بنحسب هاش الـsha256 وقت البناء ونسمح به هو بس.
    CSP_SERVICE = CSP_PUBLIC.replace(
        "script-src 'self';",
        f"script-src 'self' 'sha256-{SERVICE_YEAR_HASH}';",
    )


REFERRER_POLICY = "strict-origin-when-cross-origin"

SERVICE_YEAR_SCRIPT = "document.getElementById('year').textContent = new Date().getFullYear();"
SERVICE_YEAR_HASH = base64.b64encode(
    hashlib.sha256(SERVICE_YEAR_SCRIPT.encode("utf-8")).digest()
).decode("ascii")


def head_policy(html: str, *, csp: str | None = None, robots: str | None = None) -> str:
    """يحقن CSP + Referrer-Policy (+ robots لو مطلوب) بعد <meta charset> بشكل idempotent."""
    csp = CSP_PUBLIC if csp is None else csp
    html = re.sub(r'\n?[ \t]*<meta http-equiv="Content-Security-Policy"[^>]*>', "", html)
    html = re.sub(r'\n?[ \t]*<meta name="referrer"[^>]*>', "", html)
    block = [
        f'  <meta http-equiv="Content-Security-Policy" content="{csp}">',
        f'  <meta name="referrer" content="{REFERRER_POLICY}">',
    ]
    if robots is not None:
        html = re.sub(r'\n?[ \t]*<meta name="robots"[^>]*>', "", html)
        if robots:
            block.append(f'  <meta name="robots" content="{robots}">')
    new, count = re.subn(
        r'(<meta charset="[^"]*">)',
        lambda m: m.group(1) + "\n" + "\n".join(block),
        html,
        count=1,
    )
    if count != 1:
        fail("لم يتم العثور على <meta charset> لحقن سياسات <head>.")
    return new


def write_llms(site: dict, projects: list[dict], pages: list[dict]) -> None:
    """llms.txt مولّد من نفس المحتوى — ما يتأخّرش عن الموقع لما الأرقام تتغيّر."""
    base = site_base(site)
    brand = site["brand"]
    contact = site["contact"]
    agency = site["agency"]
    total = len(projects)
    services = [p for p in site.get("services", []) if p.get("title")]

    lines = [
        f"# {brand['name']} — Ahmed Mokbel",
        "",
        f"> {brand['jobTitle']} من {brand['location']}، مؤسس {agency['name']} للإنتاج الإبداعي.",
        f"> {agency['description']}",
        "",
        "## الصفحات",
        "",
        f"- [الرئيسية]({base}/): نبذة، {total} مشروعًا مختارًا، الخدمات، طريقة العمل، وأسئلة شائعة.",
    ]

    for page in pages:
        desc = apply_tokens(page.get("description", ""))
        lines.append(f"- [{page['navLabel']}]({base}/{page['slug']}): {desc}")

    lines += [
        "",
        "## حقائق سريعة",
        "",
        f"- الموقع: {brand['location']}، مصر. يعمل عن بُعد مع عملاء داخل مصر وخارجها.",
        f"- الخبرة: في التصميم منذ {brand['careerStart']}، وعلى Behance منذ {brand['behanceSince']}.",
        f"- المشاريع المعروضة: {total} مشروعًا مختارًا (موشن جرافيك، هوية وطباعة، تصميم رقمي).",
        f"- الاستوديو: {agency['name']} — {agency['description']}",
    ]

    if services:
        lines += ["", "## الخدمات", ""]
        lines += [f"- {esc(service['title'])}" for service in services]

    lines += [
        "",
        "## للوكلاء — Machine readable",
        "",
        f"- الملف التعريفي (JSON): {base}/api/profile.json",
        f"- المشاريع (JSON): {base}/api/projects.json",
        f"- دراسة حالة واحدة: {base}/api/projects/<slug>.json",
        f"- الخدمات (JSON): {base}/api/services.json",
        f"- نسخة Markdown من الموقع: {base}/index.md",
        f"- وصف OpenAPI: {base}/openapi.json",
        f"- فهرس مهارات الوكلاء: {base}/.well-known/agent-skills/index.json",
        f"- كتالوج الموارد (ARD): {base}/.well-known/ai-catalog.json",
        f"- بيان الوصول للوكلاء: {base}/auth.md",
        "",
        "المحتوى عام للقراءة فقط. لا يوجد تسجيل ولا مفاتيح وصول. "
        "لا تُستخدم بيانات الموقع خارج ما هو منشور فيه.",
    ]

    lines += [
        "",
        "## التواصل",
        "",
        f"- واتساب: https://wa.me/{contact['whatsapp']}",
        f"- البريد: {encode_email(contact['email'])}",
        f"- Behance: {contact['behance']}",
        f"- Facebook (DOT Media): {contact['facebook']}",
        f"- X: {contact['twitter']}",
        f"- صفحة التواصل: {base}/#contact",
        "",
    ]

    write(ROOT / "llms.txt", "\n".join(lines))


def write_cname(site: dict) -> None:
    """CNAME لمحركات GitHub Pages: يتكتب لو فيه دومين مخصص، ويتشال لو مفيش."""
    domain = (site.get("meta", {}).get("customDomain") or "").strip()
    domain = domain.split("://", 1)[-1].strip("/")
    if domain:
        write(CNAME_FILE, domain + "\n")
    elif CNAME_FILE.exists():
        CNAME_FILE.unlink()


def write_robots(site: dict) -> None:
    """robots.txt مولّد — رابط الـsitemap ومسار الـcatalog بيتغيّروا مع الدومين."""
    base = site_base(site)
    write(
        ROBOTS_FILE,
        "\n".join(
            [
                "# robots.txt — أحمد مقبل | Ahmed Mokbel Portfolio",
                "# Managed by build.py — edit content/site.json, not this file.",
                "User-agent: *",
                "Allow: /",
                "",
                "# Content Signals (contentsignals.org):",
                "#   ai-train=no  — لا يُستخدم المحتوى لتدريب النماذج",
                "#   search=yes   — الفهرسة والظهور في نتائج البحث مسموح",
                "#   ai-input=yes — يُسمح باستخدام المحتوى للإجابة والإحالة",
                "Content-Signal: ai-train=no, search=yes, ai-input=yes",
                "",
                "# Agentic Resource Discovery manifest",
                f"Agentmap: {base}/.well-known/ai-catalog.json",
                "",
                "# نسخة الملف الواحد مخصّصة للاستخدام المحلي فقط",
                "Disallow: /standalone.html",
                "Disallow: /404.html",
                "Disallow: /admin/",
                "",
                "# ملفات المصدر والأدوات — مش محتوى عام",
                "Disallow: /_source/",
                "Disallow: /content/",
                "Disallow: /tools/",
                "Disallow: /deploy/",
                "Disallow: /build.py",
                "Disallow: /netlify.toml",
                "Disallow: /docs/admin-guide.md",
                "Disallow: /docs/seo-setup.md",
                "",
                f"Sitemap: {base}/sitemap.xml",
                "",
            ]
        ),
    )


# ---------------------------------------------------------------------------
# 10) طبقة اكتشاف الوكلاء — API قراءة ثابت + /.well-known + مستندات
# ---------------------------------------------------------------------------
# كل ما هنا بيانات حقيقية مولّدة من content/*.json وقت البناء.
# لا يوجد سيرفر ولا قاعدة بيانات: الملفات دي هي الـAPI نفسه، والاستضافة
# (GitHub Pages) بترجّعها بـContent-Type صح وAccess-Control-Allow-Origin: *.
TODAY = dt.date.today().isoformat()
API_DIR = ROOT / "api"
WELL_KNOWN_DIR = ROOT / ".well-known"
SKILLS_DIR = ROOT / "skills"
DOCS_API_DIR = ROOT / "docs" / "api"

AGENT_SKILLS_SCHEMA = "https://schemas.agentskills.io/discovery/0.2.0/schema.json"


def write_nested(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    write(path, text)


def write_json(path: Path, data) -> None:
    write_nested(path, json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def slugify(value: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", str(value).strip().lower())
    return text.strip("-")


def project_slugs(projects: list[dict]) -> dict[str, str]:
    """slug عام لكل مشروع — من اسم الصورة أو من حقل slug لو موجود.

    الـslug هو الهوية العلنية في الـAPI، وأكواد f01…f24 الداخلية ما بتظهرش فيه.
    """
    used: set[str] = set()
    result: dict[str, str] = {}
    for project in projects:
        slug = slugify(project.get("slug") or "")
        if not slug:
            stem = Path(str(project.get("image") or "")).stem
            stem = re.sub(r"-(?:640|900|1200)$", "", stem)
            slug = slugify(stem) or slugify(project.get("id", "")) or "project"
        unique, index = slug, 2
        while unique in used:
            unique = f"{slug}-{index}"
            index += 1
        used.add(unique)
        result[project["id"]] = unique
    return result


def category_labels(site: dict) -> dict[str, str]:
    return {c["id"]: c["label"] for c in site.get("categories", []) if c.get("id")}


def api_project(project: dict, slug: str, base: str, labels: dict[str, str]) -> dict:
    image = str(project.get("image") or "")
    category = str(project.get("cat") or "")
    record = {
        "slug": slug,
        "title": project["title"],
        "category": category,
        "categoryLabel": labels.get(category, ""),
        "tag": project.get("tag") or "",
        "summary": project.get("summary") or "",
        "featured": bool(project.get("featured")),
        "hasVideo": bool(project.get("isVideo")),
        "media": {
            "type": "image",
            "url": f"{base}/{image}" if image else "",
            "width": int(project.get("width") or 0),
            "height": int(project.get("height") or 0),
        },
        "pageUrl": f'{base}/#project-{project["id"]}',
        "detailUrl": f"{base}/api/projects/{slug}.json",
    }
    if project.get("external") and project.get("url"):
        record["externalUrl"] = project["url"]
    return record


def api_project_full(project: dict, slug: str, base: str, labels: dict[str, str]) -> dict:
    record = api_project(project, slug, base, labels)
    record["challenge"] = project.get("challenge") or ""
    record["role"] = project.get("role") or ""
    record["result"] = project.get("result") or ""
    record["tools"] = [
        item.strip() for item in str(project.get("tools") or "").split("–") if item.strip()
    ]
    record["gallery"] = [
        {"url": f'{base}/{item["src"]}', "alt": item.get("alt") or ""}
        for item in (project.get("gallery") or [])
        if isinstance(item, dict) and item.get("src")
    ]
    return record


def experience_years(site: dict) -> int:
    start = int(site["brand"].get("careerStart") or dt.date.today().year)
    return max(1, dt.date.today().year - start)


def api_profile(site: dict, projects: list[dict], base: str) -> dict:
    brand, contact, agency = site["brand"], site["contact"], site["agency"]
    about = site.get("about", {})
    stats = {s.get("key"): s for s in site.get("stats", [])}
    return {
        "schemaVersion": "1.0",
        "generatedAt": TODAY,
        "source": base + "/",
        "name": brand["name"],
        "latinName": "Ahmed Mokbel",
        "jobTitle": brand["jobTitle"],
        "description": site["meta"]["description"],
        "approach": about.get("p2") or "",
        "location": {
            "city": brand["location"].split("،")[0].strip(),
            "governorate": brand["location"].split("،")[-1].strip(),
            "country": "مصر",
            "countryCode": "EG",
            "worksRemotely": True,
        },
        "careerStart": int(brand["careerStart"]),
        "since": int(brand["careerStart"]),
        "numbers": {
            "experienceYears": experience_years(site),
            "projectsDelivered": (stats.get("projects") or {}).get("value"),
            "clients": (stats.get("clients") or {}).get("value"),
        },
        "studio": {
            "name": agency["name"],
            "role": "founder",
            "description": agency["description"],
            "url": contact.get("agencyUrl") or contact.get("facebook"),
        },
        "services": [s["title"] for s in site.get("services", []) if s.get("title")],
        "skills": [s for s in site.get("skills", []) if s],
        "tools": [s for s in site.get("tools", []) if s],
        "projects": len([p for p in projects if p.get("visible", True) is not False]),
        "links": {
            "home": base + "/",
            "projects": f"{base}/api/projects.json",
            "services": f"{base}/api/services.json",
            "behance": contact["behance"],
            "facebook": contact["facebook"],
            "x": contact["twitter"],
            "whatsapp": f'https://wa.me/{contact["whatsapp"]}',
        },
        "contact": {
            "email": encode_email(contact["email"]),
            "whatsapp": f'+{contact["whatsapp"]}',
            "preferredLanguage": "ar",
        },
    }


def api_services(site: dict, pages: list[dict], base: str) -> dict:
    by_link = {page["slug"]: page for page in pages}
    items = []
    for service in site.get("services", []):
        if not service.get("title"):
            continue
        page = by_link.get(service.get("link", ""))
        entry = {
            "title": service["title"],
            "summary": service.get("desc") or "",
            "pageUrl": f'{base}/{service["link"]}' if service.get("link") else base + "/",
        }
        if page:
            entry["slug"] = page["slug"].replace(".html", "")
            entry["serviceType"] = page.get("serviceType") or ""
            entry["deliverables"] = [
                item for item in (page.get("service", {}).get("items") or []) if item
            ]
            entry["audience"] = [
                card.get("title") for card in (page.get("audience", {}).get("cards") or [])
            ]
            entry["markdownUrl"] = f'{base}/{page["slug"].replace(".html", "")}.md'
        items.append(entry)
    return {
        "schemaVersion": "1.0",
        "generatedAt": TODAY,
        "source": base + "/",
        "count": len(items),
        "services": items,
    }


def write_api(site: dict, projects: list[dict], pages: list[dict], base: str) -> dict[str, str]:
    labels = category_labels(site)
    visible = [p for p in projects if p.get("visible", True) is not False]
    slugs = project_slugs(visible)
    profile = api_profile(site, visible, base)
    services = api_services(site, pages, base)

    write_json(API_DIR / "profile.json", profile)
    write_json(API_DIR / "services.json", services)
    write_json(
        API_DIR / "projects.json",
        {
            "schemaVersion": "1.0",
            "generatedAt": TODAY,
            "source": base + "/",
            "count": len(visible),
            "detailPattern": f"{base}/api/projects/{{slug}}.json",
            "projects": [api_project(p, slugs[p["id"]], base, labels) for p in visible],
        },
    )
    for project in visible:
        write_json(
            API_DIR / "projects" / f'{slugs[project["id"]]}.json',
            api_project_full(project, slugs[project["id"]], base, labels),
        )

    write_json(
        API_DIR / "health.json",
        {
            "status": "ok",
            "generatedAt": TODAY,
            "kind": "static-build",
            "note": "ملف ثابت يتولّد مع كل بناء ونشر — لا يوجد سيرفر حي وراءه.",
            "counts": {
                "projects": len(visible),
                "services": services["count"],
                "servicePages": len(pages),
            },
        },
    )
    write_json(
        API_DIR / "index.json",
        {
            "schemaVersion": "1.0",
            "generatedAt": TODAY,
            "name": "Ahmed Mokbel portfolio API",
            "description": "واجهة قراءة عامة (GET فقط) لبيانات البورتفوليو، مولّدة من نفس محتوى الموقع.",
            "documentation": f"{base}/docs/api/",
            "openapi": f"{base}/openapi.json",
            "catalog": f"{base}/.well-known/api-catalog",
            "resources": [
                {"name": "profile", "url": f"{base}/api/profile.json"},
                {"name": "projects", "url": f"{base}/api/projects.json"},
                {"name": "project", "url": f"{base}/api/projects/{{slug}}.json"},
                {"name": "services", "url": f"{base}/api/services.json"},
                {"name": "health", "url": f"{base}/api/health.json"},
            ],
        },
    )

    write_json(ROOT / "openapi.json", openapi_doc(base, list(slugs.values())))
    return slugs, services


def openapi_doc(base: str, slugs: list[str]) -> dict:
    """OpenAPI 3.1 لوصف الـAPI الثابت. كل المسارات GET وبدون مصادقة."""
    ok_json = {"application/json": {"schema": {"type": "object"}}}
    return {
        "openapi": "3.1.0",
        "info": {
            "title": "Ahmed Mokbel portfolio API",
            "version": "1.0.0",
            "summary": "واجهة قراءة عامة لبيانات أعمال ومصمم أحمد مقبل.",
            "description": (
                "API ثابت للقراءة فقط (GET) يعرض بيانات البورتفوليو المولّدة من نفس "
                "محتوى الموقع. لا يوجد تسجيل ولا مفاتيح ولا كتابة. الملفات تُنشر عبر "
                "GitHub Pages وترجع Access-Control-Allow-Origin: *. توسعة .json جزء من "
                "المسار، والاستعلامات (query strings) غير مدعومة."
            ),
            "contact": {"name": "Ahmed Mokbel", "url": base + "/#contact"},
            "license": {"name": "All rights reserved"},
        },
        "servers": [{"url": base, "description": "GitHub Pages (production)"}],
        "paths": {
            "/api/profile.json": {
                "get": {
                    "operationId": "getProfile",
                    "summary": "الملف التعريفي لأحمد مقبل",
                    "responses": {"200": {"description": "profile", "content": ok_json}},
                }
            },
            "/api/projects.json": {
                "get": {
                    "operationId": "listProjects",
                    "summary": "قائمة كل المشاريع (ملخص)",
                    "responses": {"200": {"description": "project list", "content": ok_json}},
                }
            },
            "/api/projects/{slug}.json": {
                "get": {
                    "operationId": "getProject",
                    "summary": "مشروع واحد بدراسة الحالة كاملة",
                    "parameters": [
                        {
                            "name": "slug",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string", "enum": sorted(slugs)},
                            "description": "معرّف المشروع العلني (من /api/projects.json).",
                        }
                    ],
                    "responses": {
                        "200": {"description": "project", "content": ok_json},
                        "404": {"description": "slug غير موجود — GitHub Pages ترجّع صفحة 404"},
                    },
                }
            },
            "/api/services.json": {
                "get": {
                    "operationId": "listServices",
                    "summary": "الخدمات ومخرجاتها",
                    "responses": {"200": {"description": "services", "content": ok_json}},
                }
            },
            "/api/health.json": {
                "get": {
                    "operationId": "getHealth",
                    "summary": "حالة آخر بناء",
                    "responses": {"200": {"description": "health", "content": ok_json}},
                }
            },
        },
        "components": {"schemas": {}},
    }


def api_catalog_doc(base: str) -> dict:
    return {
        "linkset": [
            {
                "anchor": f"{base}/api/",
                "service-desc": [
                    {"href": f"{base}/openapi.json", "type": "application/openapi+json"}
                ],
                "service-doc": [{"href": f"{base}/docs/api/", "type": "text/html"}],
                "status": [{"href": f"{base}/api/health.json", "type": "application/json"}],
                "item": [
                    {"href": f"{base}/api/profile.json", "type": "application/json"},
                    {"href": f"{base}/api/projects.json", "type": "application/json"},
                    {"href": f"{base}/api/services.json", "type": "application/json"},
                ],
            }
        ]
    }


def ai_catalog_doc(site: dict, base: str) -> dict:
    """ARD manifest — كل URL فيه شغّال فعلًا."""
    host = base.split("://", 1)[-1]
    return {
        "specVersion": "1.0",
        "host": {
            "displayName": f'{site["brand"]["name"]} — Ahmed Mokbel Portfolio',
            "identifier": base + "/",
        },
        "entries": [
            {
                "identifier": f"urn:air:{host}:portfolio:profile",
                "displayName": "Ahmed Mokbel — Profile",
                "type": "application/json",
                "url": f"{base}/api/profile.json",
                "representativeQueries": [
                    "Who is Ahmed Mokbel?",
                    "What does Ahmed Mokbel do and where is he based?",
                    "من هو أحمد مقبل ومجال عمله؟",
                ],
            },
            {
                "identifier": f"urn:air:{host}:portfolio:projects",
                "displayName": "Ahmed Mokbel — Portfolio Projects",
                "type": "application/json",
                "url": f"{base}/api/projects.json",
                "representativeQueries": [
                    "What projects has Ahmed Mokbel created?",
                    "Show Ahmed Mokbel motion graphics projects",
                    "Find Ahmed Mokbel branding projects",
                    "ما المشاريع التي صمّمها أحمد مقبل؟",
                ],
            },
            {
                "identifier": f"urn:air:{host}:portfolio:services",
                "displayName": "Ahmed Mokbel — Services",
                "type": "application/json",
                "url": f"{base}/api/services.json",
                "representativeQueries": [
                    "What services does Ahmed Mokbel offer?",
                    "Does Ahmed Mokbel design brand identities?",
                    "هل يقدّم أحمد مقبل تصوير منتجات؟",
                ],
            },
            {
                "identifier": f"urn:air:{host}:portfolio:openapi",
                "displayName": "Ahmed Mokbel — OpenAPI description",
                "type": "application/openapi+json",
                "url": f"{base}/openapi.json",
                "representativeQueries": [
                    "How do I call the Ahmed Mokbel portfolio API?",
                    "Show the OpenAPI schema for the portfolio API",
                ],
            },
            {
                "identifier": f"urn:air:{host}:portfolio:agent-skills",
                "displayName": "Ahmed Mokbel — Agent Skills",
                "type": "application/json",
                "url": f"{base}/.well-known/agent-skills/index.json",
                "representativeQueries": [
                    "Which agent skills are available for this portfolio?",
                    "How can an agent browse Ahmed Mokbel case studies?",
                ],
            },
            {
                "identifier": f"urn:air:{host}:portfolio:markdown",
                "displayName": "Ahmed Mokbel — Portfolio in Markdown",
                "type": "text/markdown",
                "url": f"{base}/index.md",
                "representativeQueries": [
                    "Give me the Ahmed Mokbel portfolio as markdown",
                    "Read the portfolio without images",
                ],
            },
        ],
    }


SKILLS: list[dict] = [
    {
        "name": "portfolio-discovery",
        "summary": "Discover who Ahmed Mokbel is, what he does, and where his work lives.",
        "body": """## When to use this skill

Use it when a user asks who Ahmed Mokbel is, what he does, where he is based,
or how to reach him. This is the entry point for every other portfolio skill.

## Data sources (all real, all public)

| Resource | URL |
| --- | --- |
| Profile JSON | `{base}/api/profile.json` |
| Portfolio homepage | `{base}/` |
| Markdown mirror | `{base}/index.md` |
| Human summary | `{base}/llms.txt` |

## Steps

1. Fetch `{base}/api/profile.json` — it answers identity, location, services,
   tools, numbers and contact in a single request.
2. If the user wants prose, fetch `{base}/index.md`.
3. Cite `{base}/` as the source. Never invent clients, prices, awards or years.

## Facts you may state

- Ahmed Mokbel is a visual designer and art director based in
  {location}, Egypt, and the founder of DOT Media.
- His disciplines are graphic design, brand identity, motion graphics,
  photography and video editing.
- Ahmed Mokbel is the primary brand; DOT Media is his studio.

## Contact

Public contact details live in `{base}/api/profile.json` under `contact`.
Inquiries are handled through the site's own form at `{base}/#contact` and
require an explicit human confirmation before anything is sent.
""",
    },
    {
        "name": "project-discovery",
        "summary": "Search and read Ahmed Mokbel's 24 portfolio projects and case studies.",
        "body": """## When to use this skill

Use it when a user asks for examples of Ahmed Mokbel's work, needs a case study,
or wants projects filtered by discipline (motion graphics, brand identity,
digital and print design).

## Data sources

| Resource | URL |
| --- | --- |
| All projects (summary) | `{base}/api/projects.json` |
| One project (full case study) | `{base}/api/projects/<slug>.json` |
| Human view (dialog) | `{base}/#work` |

## Steps

1. Fetch `{base}/api/projects.json` once and keep the `projects` array.
2. Filter locally by `category` (`motion`, `brand`, `digital`), `tag`, or by
   matching words in `title` and `summary`. There is no server-side search.
3. For any project the user asks about, fetch its `detailUrl`. That document
   contains `summary`, `challenge`, `role`, `result`, `tools` and `gallery`.
4. Always quote the project's own `title` exactly and link its `pageUrl`.

## Rules

- Every project already has a written case study; do not fill gaps yourself.
- `externalUrl` points to the original Behance gallery where one exists.
- Project `slug` is the public identifier. Internal build codes are not part of
  the API and must not be shown to users.
""",
    },
    {
        "name": "service-discovery",
        "summary": "Explain Ahmed Mokbel's design, motion, photography and consulting services.",
        "body": """## When to use this skill

Use it when a user asks what Ahmed Mokbel offers, what a service includes, who
it is for, or how a project starts.

## Data sources

| Resource | URL |
| --- | --- |
| Services JSON | `{base}/api/services.json` |
| Motion graphics page | `{base}/motion-graphics.html` |
| Brand identity page | `{base}/brand-identity.html` |
| Digital and print page | `{base}/digital-print.html` |
| Photo production page | `{base}/photo-production.html` |
| Social media ads page | `{base}/social-media-ads.html` |
| Brand consulting page | `{base}/brand-consulting.html` |

## Steps

1. Fetch `{base}/api/services.json` for the canonical list, deliverables and
   audience for each service.
2. For detail, fetch the matching service page or its `markdownUrl`.
3. If the user wants to start a project, point them to `{base}/#contact` and ask
   them to confirm the message themselves.

## Rules

- No prices are published. Do not estimate one.
- No turnaround times or guarantees are published. Do not invent them.
""",
    },
]


def agent_skill_body(site: dict, skill: dict) -> str:
    body = skill["body"].replace("{base}", site_base(site))
    body = body.replace("{location}", site["brand"]["location"])
    return (
        "---\n"
        f'name: "{skill["name"]}"\n'
        f'description: "{skill["summary"]}"\n'
        "---\n\n"
        f'# {skill["name"]}\n\n'
        f'{skill["summary"]}\n\n'
        f"{body}"
    )


def write_agent_skills(site: dict, base: str) -> dict:
    entries = []
    for skill in SKILLS:
        artifact = agent_skill_body(site, skill)
        path = SKILLS_DIR / skill["name"] / "SKILL.md"
        write_nested(path, artifact)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        entries.append(
            {
                "name": skill["name"],
                "type": "skill-md",
                "description": skill["summary"],
                "url": f'{base}/skills/{skill["name"]}/SKILL.md',
                "digest": f"sha256:{digest}",
            }
        )
    index = {"$schema": AGENT_SKILLS_SCHEMA, "skills": entries}
    write_json(WELL_KNOWN_DIR / "agent-skills" / "index.json", index)
    return index


def write_well_known(site: dict, base: str) -> None:
    catalog = api_catalog_doc(base)
    # RFC 9727 يطلب المسار بدون امتداد. ننشر نفس الجسم بالامتدادين لأن
    # GitHub Pages ما بتقدرش تتحكم في Content-Type لملف بلا امتداد.
    write_json(WELL_KNOWN_DIR / "api-catalog.json", catalog)
    write_nested(
        WELL_KNOWN_DIR / "api-catalog",
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
    )
    write_json(WELL_KNOWN_DIR / "ai-catalog.json", ai_catalog_doc(site, base))
    expires = (dt.date.today() + dt.timedelta(days=365)).isoformat()
    write_nested(
        WELL_KNOWN_DIR / "security.txt",
        "\n".join(
            [
                f'Contact: mailto:{encode_email(site["contact"]["email"])}',
                f'Contact: https://wa.me/{site["contact"]["whatsapp"]}',
                f"Expires: {expires}T00:00:00.000Z",
                f"Canonical: {base}/.well-known/security.txt",
                "Preferred-Languages: ar, en",
                "",
            ]
        ),
    )


AUTH_MD = """# auth.md — Ahmed Mokbel portfolio

This document tells AI agents how to access **https://{host}/**.

## Summary

The portfolio is **public and read-only**. No authentication is required, and
none is offered. There is no account system, no API key, no token endpoint and
no OAuth authorization server on this host.

## Public resources

| Resource | URL | Auth |
| --- | --- | --- |
| Profile | `{base}/api/profile.json` | none |
| Projects | `{base}/api/projects.json` | none |
| Project detail | `{base}/api/projects/<slug>.json` | none |
| Services | `{base}/api/services.json` | none |
| Agent skills index | `{base}/.well-known/agent-skills/index.json` | none |
| Markdown mirror | `{base}/index.md` | none |
| Human site | `{base}/` | none |

All of the above are `GET` only. Anonymous access is the intended access level,
so there is nothing to register and no credential to obtain.

## Registration

There is **no agent registration endpoint** and no dynamic client registration.
Anything that claims otherwise for this host is not operated by the site owner.
If an agent needs something that is not published here, the correct path is
human contact, not automated provisioning.

## agent_auth

The block below is machine-readable and declares the exact access model. Every
field is a truthful statement that no provisioning exists — it is not a
placeholder waiting to be filled in.

```yaml
agent_auth:
  # No OAuth authorization server is operated on this host.
  authorization_servers: []
  # There is nothing to register against.
  register_uri: null
  # Anonymous access is the only identity type offered.
  identity_types_supported: ["anonymous"]
  # No credentials are issued, so none are needed.
  credential_types_supported: []
  # Nothing is issued, so nothing can be claimed or revoked.
  claim_uri: null
  revocation_uri: null
  scopes_supported: []
  bearer_methods_supported: []
  audience: "AI agents and LLM crawlers reading public portfolio content"
  note: >-
    Read-only public data. No account, key or token exists for this host, so
    registration is not applicable rather than merely undocumented.
```

Because no authorization server exists, `/.well-known/oauth-authorization-server`
and `/.well-known/oauth-protected-resource` are intentionally **not published**.
Empty or placeholder documents at those paths would misrepresent the service.

## Write operations

The site has no write API. The only outbound action available to visitors is the
contact form at `{base}/#contact`, which sends a project inquiry to the owner by
email or WhatsApp. An agent may help a user fill that form, but a **human must
review and submit it**. Do not submit on the user's behalf without confirmation.

## Privacy

Do not send personal data to any endpoint other than the contact form the user
explicitly confirms. No analytics identities, credentials or private documents
are exposed by this site.

## Contact

- Email: {email}
- WhatsApp: https://wa.me/{whatsapp}
- Studio: {agency}
"""


def write_auth_md(site: dict, base: str) -> None:
    host = base.split("://", 1)[-1]
    write_nested(
        ROOT / "auth.md",
        AUTH_MD.format(
            host=host,
            base=base,
            email=encode_email(site["contact"]["email"]),
            whatsapp=site["contact"]["whatsapp"],
            agency=site["agency"]["name"],
        ),
    )


DOCS_CSS = """
:root{--bg:#111314;--surface:#1a1e20;--line:rgba(46,196,182,.12);--text:#f4f4f4;--muted:#c6cdcd;--brand:#e3b341;--cyan:#2ec4b6;--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:"IBM Plex Sans Arabic","Segoe UI",system-ui,sans-serif;line-height:1.75;font-size:16px}
.wrap{max-width:860px;margin:0 auto;padding:3rem 1.25rem 5rem}
a{color:var(--cyan)}
h1{font-size:clamp(1.7rem,4vw,2.4rem);line-height:1.3;margin:.4rem 0 1rem}
h2{margin:2.6rem 0 .8rem;font-size:1.25rem;padding-bottom:.5rem;border-bottom:1px solid var(--line)}
h3{margin:1.8rem 0 .4rem;font-size:1.02rem;color:#f4f4f4}
p,li{color:var(--muted)}
code{font-family:var(--mono);font-size:.86em;background:rgba(255,255,255,.06);padding:.15em .4em;border-radius:6px;color:#f4f4f4;direction:ltr;display:inline-block}
pre{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:1rem 1.1rem;overflow:auto;direction:ltr;text-align:left}
pre code{background:none;padding:0;font-size:.84rem;display:block;white-space:pre}
.eyebrow{font-family:var(--mono);font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);margin:0}
table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:.92rem}
th,td{text-align:start;padding:.6rem .5rem;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--text);font-weight:600}
td code{font-size:.8rem}
.note{border-inline-start:3px solid var(--brand);background:rgba(227,179,65,.08);padding:.8rem 1rem;border-radius:10px;margin:1.2rem 0}
footer{margin-top:3.5rem;padding-top:1.2rem;border-top:1px solid var(--line);font-size:.85rem;color:#929292}
"""


def docs_api_page(site: dict, base: str, slugs: list[str], services: list[dict]) -> str:
    example_slug = slugs[0] if slugs else "example"
    service_rows = "\n".join(
        f'              <tr><td>{esc(s["title"])}</td><td><code>{esc(s["pageUrl"].replace(base, ""))}</code></td></tr>'
        for s in services[:6]
    )
    return f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Portfolio API — Ahmed Mokbel</title>
  <meta name="description" content="Read-only static JSON API for Ahmed Mokbel's portfolio: profile, projects, case studies and services. No authentication, CORS enabled.">
  <link rel="canonical" href="{base}/docs/api/">
  <link rel="icon" type="image/svg+xml" href="../../assets/favicon.svg">
  <link rel="api-catalog" href="{base}/.well-known/api-catalog" type="application/linkset+json">
  <link rel="alternate" type="application/json" href="{base}/openapi.json">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#111314">
  <style>{DOCS_CSS}</style>
</head>
<body>
  <main class="wrap">
    <p class="eyebrow">API documentation</p>
    <h1>Ahmed Mokbel — Portfolio API</h1>
    <p>A public, read-only JSON API generated from the same content as
    <a href="{base}/">the portfolio</a>. It is the machine-readable mirror of the site:
    the same projects, the same case studies, the same services.</p>

    <div class="note">
      <strong>Honest description of the architecture.</strong>
      This is a <em>static</em> API. Every response is a pre-rendered JSON file published
      on GitHub Pages and regenerated on each deploy. There is no server, no database,
      no query language and no rate limiter — so there is also nothing to abuse beyond
      reading public content.
    </div>

    <h2>Base URL</h2>
    <pre><code>{base}</code></pre>

    <h2>Endpoints</h2>
    <table>
      <thead><tr><th>Endpoint</th><th>Returns</th></tr></thead>
      <tbody>
        <tr><td><code>GET /api/profile.json</code></td><td>Identity, disciplines, location, studio, numbers, contact links.</td></tr>
        <tr><td><code>GET /api/projects.json</code></td><td>All published projects with a short summary and a detail URL.</td></tr>
        <tr><td><code>GET /api/projects/&lt;slug&gt;.json</code></td><td>One project with challenge, role, result, tools and gallery.</td></tr>
        <tr><td><code>GET /api/services.json</code></td><td>Six services with deliverables, audience and page URLs.</td></tr>
        <tr><td><code>GET /api/health.json</code></td><td>Build status and dataset counts.</td></tr>
        <tr><td><code>GET /api/index.json</code></td><td>Machine-readable index of the endpoints above.</td></tr>
        <tr><td><code>GET /openapi.json</code></td><td>OpenAPI 3.1 description of this API.</td></tr>
        <tr><td><code>GET /.well-known/api-catalog</code></td><td>RFC 9727 API catalog (linkset).</td></tr>
      </tbody>
    </table>

    <h2>Example</h2>
    <pre><code>curl -s {base}/api/projects.json | head -c 400</code></pre>
    <pre><code>curl -s {base}/api/projects/{example_slug}.json</code></pre>

    <h2>Conventions</h2>
    <ul>
      <li>Method: <code>GET</code> only. Every other method returns the static host's default error.</li>
      <li>Content type: <code>application/json; charset=utf-8</code>.</li>
      <li>Encoding: UTF-8, Arabic text is not escaped (<code>ensure_ascii=false</code>).</li>
      <li>Query parameters are not supported — the path is the whole request.</li>
      <li>Unknown slugs return the static host's 404 page, not a JSON error body.</li>
      <li>Timestamps use ISO&nbsp;8601 dates and refer to the last build.</li>
    </ul>

    <h2>Authentication and rate limits</h2>
    <p>None and none. All data is public portfolio content intended for humans and
    agents alike. See <a href="{base}/auth.md">auth.md</a> for the full access statement.</p>

    <h2>CORS</h2>
    <p>GitHub Pages answers every request with <code>Access-Control-Allow-Origin: *</code>,
    so browser-based agents can call the API directly.</p>

    <h2>Caching</h2>
    <p>Responses carry an <code>ETag</code> and short <code>Cache-Control</code> headers from the
    host. Files change only when the site is redeployed.</p>

    <h2>Service pages</h2>
    <table>
      <thead><tr><th>Service</th><th>Page</th></tr></thead>
      <tbody>
{service_rows}
      </tbody>
    </table>

    <h2>Agent entry points</h2>
    <ul>
      <li><a href="{base}/.well-known/agent-skills/index.json">Agent Skills index</a></li>
      <li><a href="{base}/.well-known/ai-catalog.json">ARD / AI catalog manifest</a></li>
      <li><a href="{base}/index.md">Markdown mirror of the homepage</a></li>
      <li><a href="{base}/llms.txt">llms.txt</a></li>
      <li><a href="{base}/docs/agent-readiness.md">Agent readiness audit</a></li>
    </ul>

    <footer>
      Ahmed Mokbel — visual designer and art director, {esc(site["brand"]["location"])}, Egypt.
      Generated on {TODAY}.
    </footer>
  </main>
</body>
</html>
"""


def write_docs_api(site: dict, base: str, slugs: list[str], services: dict) -> None:
    write_nested(
        DOCS_API_DIR / "index.html",
        head_policy(docs_api_page(site, base, slugs, services["services"])),
    )


def write_markdown_mirror(site: dict, projects: list[dict], pages: list[dict], base: str) -> None:
    """نسخة Markdown كاملة من الموقع — للي بيقرأ نص بدل HTML."""
    brand, contact, agency = site["brand"], site["contact"], site["agency"]
    labels = category_labels(site)
    slugs = project_slugs(projects)
    lines = [
        f"# {brand['name']} — Ahmed Mokbel",
        "",
        f"> {brand['jobTitle']} — {site['meta']['description']}",
        "",
        f"- الموقع: {base}/",
        f"- الموقع الجغرافي: {brand['location']}، مصر",
        f"- الاستوديو: {agency['name']} — {agency['description']}",
        f"- البيانات الكاملة: {base}/api/profile.json",
        "",
        "## نبذة",
        "",
        site.get("about", {}).get("p2") or site["meta"]["description"],
        "",
        "## الخدمات",
        "",
    ]
    for service in site.get("services", []):
        if not service.get("title"):
            continue
        link = f'{base}/{service["link"]}' if service.get("link") else base + "/"
        lines.append(f'- **{service["title"]}** — {service.get("desc", "")} ([الصفحة]({link}))')

    lines += ["", f"## أعمال مختارة ({len(projects)})", ""]
    for index, project in enumerate(projects, start=1):
        slug = slugs[project["id"]]
        lines += [
            f'### {index}. {project["title"]}',
            "",
            f'- التصنيف: {labels.get(project.get("cat", ""), project.get("cat", ""))} — {project.get("tag", "")}',
            f'- الملخص: {project.get("summary", "")}',
        ]
        if project.get("challenge"):
            lines.append(f'- التحدي: {project["challenge"]}')
        if project.get("role"):
            lines.append(f'- دوري في المشروع: {project["role"]}')
        if project.get("result"):
            lines.append(f'- النتيجة: {project["result"]}')
        if project.get("tools"):
            lines.append(f'- الأدوات: {project["tools"]}')
        lines.append(f"- البيانات: {base}/api/projects/{slug}.json")
        if project.get("external") and project.get("url"):
            lines.append(f'- المشروع الأصلي: {project["url"]}')
        lines.append("")

    faq = site.get("faq", [])
    if faq:
        lines += ["## الأسئلة الشائعة", ""]
        for item in faq:
            lines += [f'**{item["q"]}**', "", item["a"], ""]

    lines += [
        "## التواصل",
        "",
        f"- واتساب: https://wa.me/{contact['whatsapp']}",
        f"- البريد: {encode_email(contact['email'])}",
        f"- Behance: {contact['behance']}",
        f"- X: {contact['twitter']}",
        f"- نموذج التواصل: {base}/#contact",
        "",
        "---",
        "",
        f"آخر تحديث: {TODAY}. كل الأرقام والوقائع أعلاه منقولة من محتوى الموقع نفسه؛ "
        "لا تُضِف عملاء أو أسعارًا أو نتائج غير مذكورة هنا.",
        "",
    ]
    write_nested(ROOT / "index.md", "\n".join(lines))

    for page in pages:
        page_slug = page["slug"].replace(".html", "")
        md = [
            f'# {page["h1"]}',
            "",
            f'> {page["lead"]}',
            "",
            f'- الخدمة: {page["serviceType"]}',
            f'- الصفحة: {base}/{page["slug"]}',
            f'- بيانات الخدمة: {base}/api/services.json',
            "",
            f'## {page["service"]["title"]}',
            "",
            page["service"].get("intro", ""),
            "",
        ]
        md += [f'- {item}' for item in page["service"].get("items", [])]
        md += ["", f'## {page["process"]["title"]}', ""]
        for i, step in enumerate(page["process"]["steps"], start=1):
            md.append(f'{i}. **{step["title"]}** — {step["desc"]}')
        md += ["", f'## {page["audience"]["title"]}', ""]
        for card in page["audience"].get("cards", []):
            md.append(f'- **{card["title"]}** — {card["desc"]}')
        md += ["", "## الأسئلة الشائعة", ""]
        for item in page["faq"].get("items", []):
            md += [f'**{item["q"]}**', "", item["a"], ""]
        md += [
            "## التواصل",
            "",
            f'- واتساب: https://wa.me/{contact["whatsapp"]}',
            f'- البريد: {encode_email(contact["email"])}',
            f'- صفحة التواصل: {base}/#contact',
            "",
        ]
        write_nested(ROOT / f"{page_slug}.md", "\n".join(md))


def agent_head_links(base: str, markdown_href: str) -> str:
    """روابط الآلة داخل <head> — بديل ما ينفعش نبعته كـLink headers على GitHub Pages."""
    return "\n".join(
        [
            f'  <link rel="api-catalog" href="{base}/.well-known/api-catalog" type="application/linkset+json">',
            f'  <link rel="privacy-policy" href="{base}/privacy.html" type="text/html">',
            f'  <link rel="service-doc" href="{base}/docs/api/" type="text/html">',
            f'  <link rel="describedby" href="{base}/.well-known/ai-catalog.json" type="application/json">',
            f'  <link rel="alternate" type="text/markdown" href="{base}{markdown_href}" hreflang="ar">',
        ]
    )


def main() -> None:
    global ASSET_VERSION

    site = load_json(SITE_FILE, "site.json")
    projects = load_json(PROJECTS_FILE, "projects.json")
    pages = load_json(PAGES_FILE, "pages.json")

    contact = site.setdefault("contact", {})
    if contact.get("email"):
        contact["email"] = decode_email(contact["email"])
    configure_csp(site)

    # بصمة المحتوى: تتغيّر مع أي تعديل من اللوحة أو أي تعديل في التصميم/البرمجة،
    # فتكسر كاش data.js و style.css و main.js عند الزوار
    cache_sources = [
        json.dumps([site, projects, pages], ensure_ascii=False, sort_keys=True),
        CSS_FILE.read_text(encoding="utf-8"),
        MAIN_JS.read_text(encoding="utf-8"),
        WEBMCP_JS.read_text(encoding="utf-8") if WEBMCP_JS.is_file() else "",
    ]
    content_hash = hashlib.sha1("".join(cache_sources).encode("utf-8")).hexdigest()[:8]
    ASSET_VERSION = f"{ASSET_VERSION}-{content_hash}"

    if not isinstance(projects, list) or not projects:
        fail("projects.json يجب أن يحتوي على قائمة مشاريع غير فارغة.")
    if not isinstance(pages, list) or len(pages) < 2:
        fail("pages.json يحتاج صفحتي الخدمات على الأقل.")

    location = re.sub(r"\s*،\s*(?:،\s*)+", "، ", str(site.get("brand", {}).get("location", "")).strip())
    if not location:
        fail("site.json: brand.location مطلوب (يُستخدم في بيانات البحث والفوتر).")
    site.setdefault("brand", {})["location"] = location

    hero = site.get("hero") or {}
    hero_location = re.sub(r"\s*،\s*(?:،\s*)+", "، ", str(hero.get("location", "")).strip())
    if hero_location:
        if hero_location != location:
            print(
                f"⚠️  مكان الشارة «{hero_location}» مختلف عن مدينة الفوتر وبيانات البحث «{location}».",
                file=sys.stderr,
            )
        hero["location"] = hero_location
        site["hero"] = hero
    TOKENS.update(
        {
            "{location}": location,
            "{city}": location.split("،")[0].strip(),
        }
    )

    # الحقول اللي مش محتاجة تدخل من المالك تتعبّى تلقائيًا بدل ما البناء يقف
    default_categories = [
        cat for cat in site.get("categories", []) if cat.get("id") and cat.get("id") != "all"
    ]
    default_cat = default_categories[0]["id"] if default_categories else "motion"
    default_tag = (default_categories[0].get("label") if default_categories else "") or "تصميم"
    used_codes = {
        str(project.get("code") or "").strip()
        for project in projects
        if str(project.get("code") or "").strip()
    }
    used_ids = {
        str(project.get("id") or "").strip()
        for project in projects
        if str(project.get("id") or "").strip()
    }
    max_project_number = 0
    for project in projects:
        match = re.search(r"(\d+)\s*$", str(project.get("code") or project.get("id") or ""))
        if match:
            max_project_number = max(max_project_number, int(match.group(1)))

    def next_generated_project_value(prefix: str) -> str:
        nonlocal max_project_number
        while True:
            max_project_number += 1
            candidate = f"{prefix}{max_project_number:02d}"
            if candidate not in used_codes and candidate not in used_ids:
                used_codes.add(candidate)
                used_ids.add(candidate)
                return candidate

    for project in projects:
        if not str(project.get("cat") or "").strip():
            project["cat"] = default_cat
        if not str(project.get("code") or "").strip():
            project["code"] = next_generated_project_value("F")
        if not str(project.get("id") or "").strip():
            project["id"] = next_generated_project_value("f")
        if not str(project.get("title") or "").strip():
            project["title"] = f"مشروع {project['code']}"
        if not str(project.get("tag") or "").strip():
            project["tag"] = default_tag
        if not str(project.get("image") or "").strip() and (
            str(project.get("video") or "").lower().endswith((".mp4", ".webm", ".mov"))
            or str(project.get("youtube") or "").strip()
        ):
            project["image"] = "assets/projects/video-poster.svg"
        if not str(project.get("alt") or "").strip():
            project["alt"] = f"{project['title']} — {project['tag']}"
        if str(project.get("video") or "").lower().endswith((".mp4", ".webm", ".mov")):
            if not str(project.get("date") or "").strip():
                project["date"] = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    for index, project in enumerate(projects, start=1):
        for key in ("id", "code", "title", "cat", "tag", "image"):
            if not project.get(key):
                fail(f"المشروع رقم {index} ينقصه الحقل: {key}")
        if str(project.get("video") or "").lower().endswith((".mp4", ".webm", ".mov")):
            if not str(project.get("date") or "").strip():
                fail(
                    f'المشروع {project.get("code")}: حقل date مطلوب لمشاريع الفيديو '
                    "(uploadDate في VideoObject)."
                )
        gallery = project.get("gallery") or []
        if not isinstance(gallery, list):
            fail(f"المشروع {project.get('code')}: gallery يجب أن تكون قائمة.")
        clean_gallery = [
            item for item in gallery if isinstance(item, dict) and str(item.get("src") or "").strip()
        ]
        if clean_gallery or "gallery" in project:
            project["gallery"] = clean_gallery
        for item in clean_gallery:
            if not str(item.get("alt") or "").strip():
                item["alt"] = f"{project['title']} — {project['tag']}".strip()

        facts = project.get("facts") or []
        if not isinstance(facts, list):
            fail(f"المشروع {project.get('code')}: facts يجب أن تكون قائمة.")
        clean_facts = [
            {
                "label": str(fact.get("label") or "").strip(),
                "value": str(fact.get("value") or "").strip(),
            }
            for fact in facts
            if isinstance(fact, dict)
            and str(fact.get("label") or "").strip()
            and str(fact.get("value") or "").strip()
        ]
        if clean_facts or "facts" in project:
            project["facts"] = clean_facts

    # كل صورة مذكورة في المحتوى لازم تكون موجودة فعلًا — الرينيم بيتنسى سهل
    referenced: list[tuple[str, str]] = []
    for project in projects:
        for key in ("image", "imageSmall"):
            if project.get(key):
                referenced.append((f'{project.get("code")}.{key}', project[key]))
        for item in project.get("gallery") or []:
            for key in ("src", "small", "thumb"):
                if item.get(key):
                    referenced.append((f'{project.get("code")}.gallery.{key}', item[key]))
    for page in pages:
        for item in (page.get("gallery") or {}).get("items") or []:
            if item.get("image"):
                referenced.append((f'{page.get("slug")}.gallery', item["image"]))
    broken = sorted({path for _, path in referenced if not (ROOT / path).is_file()})
    if broken:
        fail("صور مذكورة في المحتوى وغير موجودة على القرص:\n  " + "\n  ".join(broken))

    # 1) js/data.js
    write(DATA_JS, build_data_js(site, projects))
    visible = [p for p in projects if p.get("visible", True) is not False]

    # 2) index.html
    html = read(INDEX)

    html = replace_block(html, "services", services_block(site.get("services", [])))
    html = replace_block(html, "clients", clients_block(site))
    html = replace_block(html, "stats", stats_block(site, visible))
    html = replace_block(html, "process", process_block(site.get("process", [])))
    html = replace_block(html, "faq", faq_block(
        site.get("faq", []),
        site.get("terms", []),
        (site.get("faqSection") or {}).get("termsTitle") or "شروط العمل",
    ))
    html = replace_block(html, "channels", channels_block(site))
    html = replace_block(html, "service-options", service_options(site))
    html = replace_block(html, "static-projects", "\n".join(project_card(p, i) for i, p in enumerate(visible)))

    html, text_count = apply_cms(html, site)

    html = update_head(html, site)
    html = update_portrait(html, site)

    # روابط الآلة في <head> — GitHub Pages ما بتسمحش بـLink headers
    if 'rel="api-catalog"' not in html:
        html = re.sub(
            r'(  <link rel="canonical" href="[^"]*">)',
            lambda m: m.group(1) + "\n" + agent_head_links(site_base(site), "/index.md"),
            html,
            count=1,
        )

    # أعد إدراج JSON-LD بعد تنظيف الوسم القديم
    html = html.replace("</head>", home_jsonld(site, projects) + "\n</head>", 1)

    # قيم ثابتة داخل القالب
    html = re.sub(
        r'(<strong id="careerSince">)[^<]*(</strong>)',
        lambda m: m.group(1) + esc(site["brand"]["careerStart"]) + m.group(2),
        html,
        count=1,
    )
    html = re.sub(
        r'(<strong id="behanceSince">)[^<]*(</strong>)',
        lambda m: m.group(1) + esc(site["brand"]["behanceSince"]) + m.group(2),
        html,
        count=1,
    )
    html = re.sub(
        r'(<span id="workTotal">)[^<]*(</span>)',
        lambda m: m.group(1) + str(len(visible)) + m.group(2),
        html,
        count=1,
    )
    html = re.sub(
        r'(id="dialogCount">)[^<]*(</span>)',
        lambda m: m.group(1) + f"1 / {len(visible)}" + m.group(2),
        html,
        count=1,
    )
    html = re.sub(
        r'(id="pillProjects">)[^<]*(</b>)',
        lambda m: m.group(1)
        + f'+{next((s.get("value") for s in site.get("stats", []) if s.get("key") == "projects"), len(visible))}'
        + m.group(2),
        html,
        count=1,
    )
    html = update_assets_version(html)
    html = head_policy(html, robots="index, follow, max-image-preview:large")
    # يمنع تراكم الأسطر الفارغة في الهيد مع كل بناء
    html = re.sub(r"\n{3,}", "\n\n", html)
    write(INDEX, html)

    # 2b) 404.html — نفس بصمة الأصول حتى ما يبقاش كاش قديم للـ CSS
    error_page = ROOT / "404.html"
    if error_page.is_file():
        write(error_page, head_policy(update_assets_version(read(error_page))))

    # 3) صفحات الخدمات
    for page in pages:
        others = [p for p in pages if p["slug"] != page["slug"]]
        write(
            ROOT / page["slug"],
            head_policy(
                service_page(page, site, others),
                csp=CSP_SERVICE,
                robots="index, follow, max-image-preview:large",
            ),
        )

    # 4) sitemap
    today = dt.date.today().isoformat()
    base = site_base(site)
    urls = [(base + "/", "1.0")] + [
        (f'{base}/{page["slug"]}', "0.8") for page in pages
    ] + [(f"{base}/docs/api/", "0.4")]
    entries = "\n".join(
        f"""  <url>
    <loc>{esc(loc)}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>{priority}</priority>
  </url>"""
        for loc, priority in urls
    )
    write(
        SITEMAP,
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{entries}\n</urlset>\n",
    )

    # 5) standalone.html
    build_standalone(read(STANDALONE if False else INDEX))

    # 6) llms.txt
    write_llms(site, visible, pages)

    # 7) طبقة اكتشاف الوكلاء: API ثابت + .well-known + مستندات + Markdown
    slugs, services_doc = write_api(site, visible, pages, base)
    write_agent_skills(site, base)
    write_well_known(site, base)
    write_auth_md(site, base)
    write_docs_api(site, base, list(slugs.values()), services_doc)
    write_markdown_mirror(site, visible, pages, base)

    # 8) robots.txt + CNAME (بيتبعوا الدومين المخصص لو موجود)
    write_robots(site)
    write_cname(site)

    print(f"✓ data.js: {len(visible)} مشروعًا مرئيًا")
    print(f"✓ index.html: {text_count} نصًا محدّثًا من site.json")
    print(f"✓ صفحات الخدمات: {', '.join(p['slug'] for p in pages)}")
    print(f"✓ sitemap.xml: lastmod محدّث")
    print(f"✓ standalone.html: {STANDALONE.stat().st_size / 1024:.1f} KB")
    print("✓ llms.txt: محدّث")
    print(f"✓ robots.txt: محدّث ({site_base(site)})")
    domain = (site.get("meta", {}).get("customDomain") or "").strip()
    if domain:
        print(f"✓ CNAME: {domain}")


def build_standalone(html: str) -> None:
    # السكربتات والستايل مضمّنين جوّه الملف، فالسياستان لازم تسمحا بـ'unsafe-inline'
    html = head_policy(html, csp=CSP_STANDALONE, robots="index, follow, max-image-preview:large")
    css = read(CSS_FILE)
    # standalone.html في جذر الموقع، فمسار الخطوط بيتغيّر
    css = css.replace("../assets/fonts/", "assets/fonts/")
    data_js = read(DATA_JS)
    main_js = read(MAIN_JS)
    webmcp_js = read(WEBMCP_JS) if WEBMCP_JS.is_file() else ""

    style_tag = re.compile(r'[ \t]*<link\s+rel="stylesheet"\s+href="css/style\.css(?:\?v=[^"]*)?"\s*/?>')
    script_tags = re.compile(r'[ \t]*<script\s+src="js/(?:data|main|webmcp)\.js(?:\?v=[^"]*)?"\s+defer\s*>\s*</script>')

    if not style_tag.search(html):
        fail("لم يتم العثور على وسم css/style.css داخل index.html.")
    if len(script_tags.findall(html)) < 2:
        fail("لم يتم العثور على وسوم js/data.js و js/main.js داخل index.html.")

    html = style_tag.sub(lambda _: "  <style>\n" + css.rstrip() + "\n  </style>", html, count=1)
    html = script_tags.sub("", html)

    bundle = (
        "  <!-- Inlined application scripts -->\n"
        "  <script>\n" + data_js.rstrip() + "\n  </script>\n"
        "  <script>\n" + main_js.rstrip() + "\n  </script>\n"
    )
    if webmcp_js:
        bundle += "  <script>\n" + webmcp_js.rstrip() + "\n  </script>\n"
    if "</body>" not in html:
        fail("لم يتم العثور على </body> في index.html.")
    html = html.replace("</body>", bundle + "</body>", 1)
    html = html.replace(
        "<!DOCTYPE html>",
        "<!DOCTYPE html>\n<!-- نسخة مولّدة آليًا بواسطة build.py — عدّل الملفات الأصلية ثم أعد البناء -->",
        1,
    )

    leftovers = [n for n in ("css/style.css", '"js/data.js', '"js/main.js', '"js/webmcp.js') if n in html]
    if leftovers:
        fail("بقيت مراجع خارجية في الناتج: " + ", ".join(leftovers))

    write(STANDALONE, html)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()

