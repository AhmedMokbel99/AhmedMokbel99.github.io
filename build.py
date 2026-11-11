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
import html as html_lib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"

SITE_FILE = CONTENT / "site.json"
PROJECTS_FILE = CONTENT / "projects.json"
PAGES_FILE = CONTENT / "pages.json"

INDEX = ROOT / "index.html"
DATA_JS = ROOT / "js" / "data.js"
MAIN_JS = ROOT / "js" / "main.js"
CSS_FILE = ROOT / "css" / "style.css"
STANDALONE = ROOT / "standalone.html"
SITEMAP = ROOT / "sitemap.xml"

ASSET_VERSION = "15"

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
    return html_lib.escape(str(value), quote=True)


def fail(message: str) -> None:
    print(f"✗ {message}", file=sys.stderr)
    raise SystemExit(1)


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
        "email": contact["email"],
        "whatsapp": contact["whatsapp"],
        "behance": contact["behance"],
        "facebook": contact["facebook"],
        "twitter": contact["twitter"],
        "tools": site.get("tools", []),
        "skills": site.get("skills", []),
        "stats": site.get("stats", []),
    }

    visible = [p for p in projects if p.get("visible", True) is not False]

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
def project_card(project: dict) -> str:
    """Keep in sync with projectMarkup() in js/main.js."""
    image = project.get("image", "")
    image_small = project.get("imageSmall") or ""
    width = int(project.get("width") or 1200)
    height = int(project.get("height") or 900)
    fallback = image_small or image
    srcset = (f"{image_small} 900w, " if image_small else "") + f"{image} {width}w"
    alt = project.get("alt") or f'{project["title"]} — {project["tag"]}'

    badge = (
        '<span class="project__type">'
        '<svg class="icon icon--solid" aria-hidden="true"><use href="#i-play"></use></svg>'
        "فيديو"
        "</span>"
        if project.get("isVideo")
        else ""
    )

    return f'''<article class="project" data-reveal data-project-card="{esc(project["id"])}" data-category="{esc(project["cat"])}">
  <div class="project__media">
    <img
      src="{esc(fallback)}"
      srcset="{esc(srcset)}"
      sizes="(max-width: 680px) 92vw, (max-width: 1080px) 45vw, 30vw"
      width="{width}"
      height="{height}"
      alt="{esc(alt)}"
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
      <span>{"شاهد الفيديو" if project.get("isVideo") else "عرض التفاصيل"}</span>
      <svg class="icon" aria-hidden="true"><use href="#i-arrow-left"></use></svg>
    </span>
  </div>
  <button
    type="button"
    class="project__open"
    data-project-open="{esc(project["id"])}"
    aria-label="عرض تفاصيل مشروع {esc(project["title"])} — {esc(CATEGORY_FALLBACK.get(project["cat"], project["cat"]))}"
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
            <span class="service__num" aria-hidden="true">{index:02d}</span>
            <div class="service__icon">
              <svg class="icon" aria-hidden="true"><use href="#{esc(service.get("icon", "i-compass"))}"></use></svg>
            </div>
            <h3>{esc(service["title"])}</h3>
            <p>{esc(service["desc"])}</p>{link}
          </article>'''
        )
    return "\n\n".join(cards)


def process_block(steps: list[dict]) -> str:
    cards = []
    for index, step in enumerate(steps, start=1):
        cards.append(
            f'''          <article class="step" data-reveal>
            <div class="step__num">{index:02d}</div>
            <h3>{esc(step["title"])}</h3>
            <p>{esc(step["desc"])}</p>
          </article>'''
        )
    return "\n".join(cards)


def faq_block(items: list[dict]) -> str:
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
    return "\n\n".join(cards)


def channels_block(site: dict) -> str:
    contact = site["contact"]
    cards = []
    for channel in site.get("channels", []):
        kind = channel.get("type", "email")
        icon, solid = CHANNEL_ICONS.get(kind, ("i-globe", False))
        icon_class = "icon icon--solid" if solid else "icon"
        if kind == "email":
            href = ""
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


def home_jsonld(site: dict, projects: list[dict]) -> str:
    base = site["meta"]["siteUrl"].rstrip("/")
    contact = site["contact"]
    brand = site["brand"]
    agency = site["agency"]
    person_id = f"{base}/#person"

    person = {
        "@type": "Person",
        "@id": person_id,
        "name": brand["name"],
        "jobTitle": brand["jobTitle"],
        "description": f'{brand["jobTitle"]} من {brand["location"]}، ومؤسس وكالة {agency["name"]} للإنتاج الإبداعي.',
        "url": base + "/",
        "image": f'{base}/assets/ahmed-mokbel.jpg',
        "email": f'mailto:{contact["email"]}',
        "telephone": f'+{contact["whatsapp"]}',
        "address": {
            "@type": "PostalAddress",
            "addressLocality": brand["location"].split("،")[0],
            "addressCountry": "EG",
        },
        "worksFor": {
            "@type": "Organization",
            "name": agency["name"],
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
        "@type": "ProfessionalService",
        "@id": f"{base}/#service",
        "name": f'{brand["name"]} — {agency["name"]}',
        "description": f'خدمات تصميم الجرافيك والموشن جرافيك والهوية البصرية والإنتاج الإعلامي من {brand["location"]}، مصر.',
        "url": base + "/",
        "image": f'{base}/assets/og-image.jpg',
        "telephone": f'+{contact["whatsapp"]}',
        "email": f'mailto:{contact["email"]}',
        "priceRange": "$$",
        "founder": {"@id": person_id},
        "address": {
            "@type": "PostalAddress",
            "addressLocality": brand["location"].split("،")[0],
            "addressCountry": "EG",
        },
        "areaServed": [
            {"@type": "City", "name": brand["location"].split("،")[0]},
            {"@type": "Country", "name": "مصر"},
        ],
        "sameAs": [contact["behance"], contact["facebook"], contact["twitter"]],
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "خدمات التصميم والموشن جرافيك",
            "itemListElement": [
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": item["title"]}}
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
            for item in site.get("faq", [])
        ],
    }

    return jsonld_script([person, website, service, faq])


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
def service_page(page: dict, site: dict, other: dict) -> str:
    base = site["meta"]["siteUrl"].rstrip("/")
    brand = site["brand"]
    contact = site["contact"]
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

    return f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

  <title>{esc(page["title"])}</title>
  <meta name="description" content="{esc(page["description"])}">
  <meta name="author" content="{esc(brand["name"])}">
  <meta name="theme-color" content="#07080d">
  <meta name="color-scheme" content="dark">
  <link rel="canonical" href="{esc(url)}">

  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
  <link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
  <link rel="manifest" href="site.webmanifest">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="{esc(brand["name"])}">
  <meta property="og:locale" content="ar_EG">
  <meta property="og:url" content="{esc(url)}">
  <meta property="og:title" content="{esc(page["ogTitle"])}">
  <meta property="og:description" content="{esc(page["ogDescription"])}">
  <meta property="og:image" content="{esc(base)}/{esc(site["meta"]["ogImage"])}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{esc(brand["name"])} — {esc(brand["jobTitle"])}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(page["ogTitle"])}">
  <meta name="twitter:description" content="{esc(page["ogDescription"])}">
  <meta name="twitter:image" content="{esc(base)}/{esc(site["meta"]["ogImage"])}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
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
        <a href="{esc(other["slug"])}">{esc(other["navLabel"])}</a>
        <a href="index.html#work">الأعمال</a>
        <a href="index.html#contact">تواصل</a>
        <a class="btn btn--primary btn--sm" href="index.html#contact">لنعمل معًا</a>
      </nav>
    </div>
  </header>

  <main id="main">

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
          <p class="eyebrow">{esc(page["process"]["eyebrow"])}</p>
          <h2>{esc(page["process"]["title"])}</h2>

          <div class="process-grid" style="margin-top:1.8rem">
{steps}
          </div>
        </div>
      </div>
    </section>

    <section class="section section--soft">
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
      <span>© <span id="year">2026</span> {esc(brand["name"])} — {esc(site["agency"]["name"])}. {esc(site["footer"]["rights"])}</span>
      <span>
        <a href="index.html">الرئيسية</a> ·
        <a href="{esc(other["slug"])}">{esc(other["navLabel"])}</a> ·
        <a href="{esc(contact["behance"])}" target="_blank" rel="noopener noreferrer">بيهانس</a>
      </span>
    </div>
  </footer>

  <script>document.getElementById('year').textContent = new Date().getFullYear();</script>
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
    base = meta["siteUrl"].rstrip("/")

    html = re.sub(r"<title>.*?</title>", lambda m: f"<title>{esc(meta['title'])}</title>", html, count=1, flags=re.S)
    html = set_attr(html, r'(<meta name="description" content=")[^"]*(")', meta["description"])
    html = set_attr(html, r'(<meta name="author" content=")[^"]*(")', site["brand"]["name"])
    html = set_attr(html, r'(<link rel="canonical" href=")[^"]*(")', base + "/")
    html = set_attr(html, r'(<meta property="og:site_name" content=")[^"]*(")', site["brand"]["name"])
    html = set_attr(html, r'(<meta property="og:url" content=")[^"]*(")', base + "/")
    html = set_attr(html, r'(<meta property="og:title" content=")[^"]*(")', meta["ogTitle"])
    html = set_attr(html, r'(<meta property="og:description" content=")[^"]*(")', meta["ogDescription"])
    html = set_attr(html, r'(<meta property="og:image" content=")[^"]*(")', f'{base}/{meta["ogImage"]}')
    html = set_attr(html, r'(<meta property="og:image:alt" content=")[^"]*(")', f'{site["brand"]["name"]} — {site["brand"]["jobTitle"]}')
    html = set_attr(html, r'(<meta name="twitter:url" content=")[^"]*(")', base + "/")
    html = set_attr(html, r'(<meta name="twitter:title" content=")[^"]*(")', meta["ogTitle"])
    html = set_attr(html, r'(<meta name="twitter:description" content=")[^"]*(")', meta["ogDescription"])
    html = set_attr(html, r'(<meta name="twitter:image" content=")[^"]*(")', f'{base}/{meta["ogImage"]}')
    html = set_attr(html, r'(<meta name="twitter:image:alt" content=")[^"]*(")', f'{site["brand"]["name"]} — {site["brand"]["jobTitle"]}')

    block = re.compile(r'  <script type="application/ld\+json">.*?  </script>', re.S)
    if not block.search(html):
        fail("لم يتم العثور على بيانات JSON-LD داخل index.html.")
    return block.sub(lambda m: "", html, count=1)


def update_assets_version(html: str) -> str:
    return re.sub(r"\?v=\d+", f"?v={ASSET_VERSION}", html)


def main() -> None:
    site = load_json(SITE_FILE, "site.json")
    projects = load_json(PROJECTS_FILE, "projects.json")
    pages = load_json(PAGES_FILE, "pages.json")

    if not isinstance(projects, list) or not projects:
        fail("projects.json يجب أن يحتوي على قائمة مشاريع غير فارغة.")
    if not isinstance(pages, list) or len(pages) < 2:
        fail("pages.json يحتاج صفحتي الخدمات على الأقل.")

    for index, project in enumerate(projects, start=1):
        for key in ("id", "code", "title", "cat", "tag", "image"):
            if not project.get(key):
                fail(f"المشروع رقم {index} ينقصه الحقل: {key}")

    # 1) js/data.js
    write(DATA_JS, build_data_js(site, projects))
    visible = [p for p in projects if p.get("visible", True) is not False]

    # 2) index.html
    html = read(INDEX)

    html = replace_block(html, "services", services_block(site.get("services", [])))
    html = replace_block(html, "process", process_block(site.get("process", [])))
    html = replace_block(html, "faq", faq_block(site.get("faq", [])))
    html = replace_block(html, "channels", channels_block(site))
    html = replace_block(html, "service-options", service_options(site))
    html = replace_block(html, "static-projects", "\n".join(project_card(p) for p in visible))

    html, text_count = apply_cms(html, site)

    html = update_head(html, site)

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
        r'(id="pillProjects">)[^<]*(</b>)',
        lambda m: m.group(1)
        + f'+{next((s.get("value") for s in site.get("stats", []) if s.get("key") == "projects"), len(visible))}'
        + m.group(2),
        html,
        count=1,
    )
    html = update_assets_version(html)
    write(INDEX, html)

    # 3) صفحات الخدمات
    for page in pages:
        others = [p for p in pages if p["slug"] != page["slug"]]
        other = others[0]
        write(ROOT / page["slug"], service_page(page, site, other))

    # 4) sitemap
    if SITEMAP.is_file():
        today = dt.date.today().isoformat()
        sitemap = read(SITEMAP)
        sitemap = re.sub(r"<lastmod>[^<]*</lastmod>", f"<lastmod>{today}</lastmod>", sitemap)
        write(SITEMAP, sitemap)

    # 5) standalone.html
    build_standalone(read(STANDALONE if False else INDEX))

    print(f"✓ data.js: {len(visible)} مشروعًا مرئيًا")
    print(f"✓ index.html: {text_count} نصًا محدّثًا من site.json")
    print(f"✓ صفحات الخدمات: {', '.join(p['slug'] for p in pages)}")
    print(f"✓ sitemap.xml: lastmod محدّث")
    print(f"✓ standalone.html: {STANDALONE.stat().st_size / 1024:.1f} KB")


def build_standalone(html: str) -> None:
    css = read(CSS_FILE)
    data_js = read(DATA_JS)
    main_js = read(MAIN_JS)

    style_tag = re.compile(r'[ \t]*<link\s+rel="stylesheet"\s+href="css/style\.css(?:\?v=[^"]*)?"\s*/?>')
    script_tags = re.compile(r'[ \t]*<script\s+src="js/(?:data|main)\.js(?:\?v=[^"]*)?"\s+defer\s*>\s*</script>')

    if not style_tag.search(html):
        fail("لم يتم العثور على وسم css/style.css داخل index.html.")
    if len(script_tags.findall(html)) != 2:
        fail("لم يتم العثور على وسوم js/data.js و js/main.js داخل index.html.")

    html = style_tag.sub(lambda _: "  <style>\n" + css.rstrip() + "\n  </style>", html, count=1)
    html = script_tags.sub("", html)

    bundle = (
        "  <!-- Inlined application scripts -->\n"
        "  <script>\n" + data_js.rstrip() + "\n  </script>\n"
        "  <script>\n" + main_js.rstrip() + "\n  </script>\n"
    )
    if "</body>" not in html:
        fail("لم يتم العثور على </body> في index.html.")
    html = html.replace("</body>", bundle + "</body>", 1)
    html = html.replace("</head>", '  <meta name="robots" content="noindex">\n</head>', 1)
    html = html.replace(
        "<!DOCTYPE html>",
        "<!DOCTYPE html>\n<!-- نسخة مولّدة آليًا بواسطة build.py — عدّل الملفات الأصلية ثم أعد البناء -->",
        1,
    )

    leftovers = [n for n in ("css/style.css", '"js/data.js', '"js/main.js') if n in html]
    if leftovers:
        fail("بقيت مراجع خارجية في الناتج: " + ", ".join(leftovers))

    write(STANDALONE, html)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
