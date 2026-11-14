/**
 * ============================================================
 * أحمد مقبل — Portfolio
 * التفاعلات الرئيسية (Main JavaScript)
 * ------------------------------------------------------------
 * كل الوحدات مستقلة وآمنة إذا لم يوجد العنصر المرتبط بها.
 * ============================================================
 */
'use strict';

document.documentElement.classList.add('js');

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const categoryLabel = (id) =>
  (typeof CATEGORIES !== 'undefined' && CATEGORIES.find((c) => c.id === id)?.label) || id;

const formatCount = (n) => new Intl.NumberFormat('en-US').format(n);
const whatsappBase = () =>
  typeof SITE_DATA !== 'undefined' ? `https://wa.me/${SITE_DATA.whatsapp}` : '';

/* ------------------------------------------------------------
   Toast
------------------------------------------------------------ */
let toastTimer = null;
function showToast(message) {
  const toast = $('#toastMsg');
  const text = $('#toastText');
  if (!toast || !text) return;
  text.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 5000);
}

/* ------------------------------------------------------------
   1) ربط بيانات الموقع بالعناصر
------------------------------------------------------------ */
function initSiteData() {
  if (typeof SITE_DATA === 'undefined') return;

  const links = {
    email: `mailto:${SITE_DATA.email}?subject=${encodeURIComponent(
      'طلب مشروع جديد — من الموقع الشخصي'
    )}`,
    whatsapp: `${whatsappBase()}?text=${encodeURIComponent(
      'مرحباً أحمد، أود الاستفسار عن مشروع تصميم / موشن جرافيك'
    )}`,
    behance: SITE_DATA.behance,
    facebook: SITE_DATA.facebook,
    twitter: SITE_DATA.twitter,
    agency: SITE_DATA.agency?.url || SITE_DATA.facebook,
  };

  $$('[data-link]').forEach((el) => {
    const key = el.dataset.link;
    if (!links[key]) return;
    el.setAttribute('href', links[key]);

    if (key === 'email') {
      el.removeAttribute('target');
      el.removeAttribute('rel');
    } else {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });

  $$('[data-text="email"]').forEach((el) => {
    el.textContent = SITE_DATA.email;
  });

  /* شرائح المهارات والأدوات */
  const skills = $('#skillChips');
  if (skills) {
    skills.innerHTML = SITE_DATA.skills.map((s) => `<li class="chip">${s}</li>`).join('');
  }

  const tools = $('#toolChips');
  if (tools) {
    tools.innerHTML = SITE_DATA.tools
      .map((t) => `<li class="chip chip--tool">${t}</li>`)
      .join('');
  }

  /* شريط الماركي */
  const track = $('#marqueeTrack');
  if (track) {
    const words = [...SITE_DATA.skills, SITE_DATA.agency?.name || 'DOT Media'];
    const set = words.map((w) => `<span class="marquee__item">${w}</span>`).join('');
    track.innerHTML = set + set;
  }

  /* الإحصائيات — القيم الديناميكية تُحسب من نفس مصدر البيانات */
  const currentYear = new Date().getFullYear();
  const work = typeof WORK_DATA !== 'undefined' ? WORK_DATA : [];
  const behanceProjects = work.filter((p) => p.external && p.url);

  const siteStats = (SITE_DATA.stats || []).map((stat) => {
    if (stat.key === 'experience') {
      const start = Number(SITE_DATA.careerStart) || currentYear;
      return { ...stat, value: Math.max(1, currentYear - start) };
    }
    if (stat.key === 'selected') {
      return { ...stat, value: work.length };
    }
    if (stat.key === 'behance') {
      return { ...stat, value: behanceProjects.length };
    }
    return stat;
  });

  const statValue = (key) => siteStats.find((s) => s.key === key)?.value;

  const stats = $('#statsGrid');
  if (stats && siteStats.length) {
    stats.innerHTML = siteStats
      .map(
        (s) => `
        <div class="stat">
          <span class="stat__value" data-count="${s.value}" data-suffix="${s.suffix || ''}">0</span>
          <span class="stat__label">${s.label}</span>
        </div>`
      )
      .join('');
  }

  /* البطاقات العائمة وملاحظة الأعمال — أرقام مطابقة للإحصائيات */
  const pillYears = $('#pillYears');
  if (pillYears && statValue('experience')) {
    pillYears.textContent = `+${statValue('experience')}`;
  }

  const pillProjects = $('#pillProjects');
  if (pillProjects && statValue('projects')) {
    pillProjects.textContent = `+${statValue('projects')}`;
  }

  const workTotal = $('#workTotal');
  if (workTotal) workTotal.textContent = String(work.length);

  const since = $('#behanceSince');
  if (since && SITE_DATA.behanceSince) {
    since.textContent = String(SITE_DATA.behanceSince);
  }

  const careerSince = $('#careerSince');
  if (careerSince && SITE_DATA.careerStart) {
    careerSince.textContent = String(SITE_DATA.careerStart);
  }

  const year = $('#year');
  if (year) year.textContent = currentYear;
}

/* ------------------------------------------------------------
   2) الهيدر وقائمة الجوال
------------------------------------------------------------ */
function initHeader() {
  const toggle = $('#navToggle');
  const panel = $('#navPanel');
  const overlay = $('#navOverlay');

  if (!toggle || !panel) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
    panel.classList.toggle('is-open', open);
    if (overlay) overlay.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);

    if (open) {
      const first = panel.querySelector('a, button');
      if (first) first.focus({ preventScroll: true });
    }
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  if (overlay) overlay.addEventListener('click', () => setOpen(false));

  panel.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
      return;
    }

    /* حصر التركيز داخل القائمة عند فتحها */
    if (event.key === 'Tab' && panel.classList.contains('is-open')) {
      const focusables = $$('a, button', panel).filter((el) => !el.disabled);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && panel.classList.contains('is-open')) setOpen(false);
  });
}

/* ------------------------------------------------------------
   3) شريط التقدم + زر العودة للأعلى + ظل الهيدر
------------------------------------------------------------ */
function initScrollUI() {
  const bar = $('#scrollProgress');
  const header = $('#siteHeader');
  const topBtn = $('#backToTop');
  let ticking = false;

  const update = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    if (bar) bar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress / 100))})`;
    if (header) header.classList.toggle('is-scrolled', scrollTop > 8);
    if (topBtn) topBtn.classList.toggle('is-visible', scrollTop > 700);
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    },
    { passive: true }
  );

  update();

  if (topBtn) {
    topBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  }
}

/* ------------------------------------------------------------
   4) القسم النشط في القائمة
------------------------------------------------------------ */
function initScrollSpy() {
  const links = $$('.nav__link[href^="#"]');
  if (!links.length) return;

  const map = new Map();
  const sections = [];

  links.forEach((link) => {
    const id = link.getAttribute('href').slice(1);
    const section = document.getElementById(id);
    if (!section) return;
    map.set(section, link);
    sections.push(section);
  });

  if (!sections.length || !('IntersectionObserver' in window)) return;

  const setActive = (link) => {
    links.forEach((l) => {
      const active = l === link;
      l.classList.toggle('is-active', active);
      if (active) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(map.get(entry.target));
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
}

/* ------------------------------------------------------------
   5) تأثير الظهور عند التمرير
------------------------------------------------------------ */
let revealObserver = null;

function initReveal() {
  /* مفيش إخفاء للمحتوى لحد ما المستخدم ينزل — الصفحة تظهر كاملة فورًا */
  const elements = $$('[data-reveal]');
  elements.forEach((el) => el.classList.add('is-in'));
}

function observeReveals(scope) {
  const elements = $$('[data-reveal]', scope);
  if (!revealObserver) {
    elements.forEach((el) => el.classList.add('is-in'));
    return;
  }
  elements.forEach((el) => revealObserver.observe(el));
}

/* ------------------------------------------------------------
   6) العدادات
------------------------------------------------------------ */
function initCounters() {
  const counters = $$('[data-count]');
  if (!counters.length) return;

  const animate = (el) => {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';

    if (reduceMotion.matches) {
      el.textContent = formatCount(target) + suffix;
      return;
    }

    const duration = 1500;
    const start = window.performance.now();

    const frame = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatCount(Math.round(target * eased)) + suffix;
      if (progress < 1) window.requestAnimationFrame(frame);
    };

    window.requestAnimationFrame(frame);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animate(entry.target);
      });
    },
    { threshold: 0.4 }
  );

  counters.forEach((el) => observer.observe(el));
}

/* ------------------------------------------------------------
   7) الكتابة الآلية لسطر الدور
------------------------------------------------------------ */
function initTyping() {
  const el = $('#heroRole');
  if (!el || typeof SITE_DATA === 'undefined' || !SITE_DATA.roles?.length) return;

  const phrases = SITE_DATA.roles;
  if (reduceMotion.matches) {
    el.textContent = phrases[0];
    return;
  }

  const text = document.createElement('span');
  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.setAttribute('aria-hidden', 'true');
  caret.textContent = '|';
  el.textContent = '';

  /* السطر يظهر كامل من أول لحظة بدل ما يبدأ فاضي ويكتب حرف حرف */
  text.textContent = phrases[0];
  el.append(text, caret);

  let phraseIndex = 0;
  let charIndex = phrases[0].length;
  let deleting = true;

  const tick = () => {
    const current = phrases[phraseIndex];

    if (!deleting) {
      charIndex += 1;
      text.textContent = current.slice(0, charIndex);
      if (charIndex === current.length) {
        deleting = true;
        window.setTimeout(tick, 1900);
        return;
      }
    } else {
      charIndex -= 1;
      text.textContent = current.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
    }

    window.setTimeout(tick, deleting ? 34 : 62);
  };

  window.setTimeout(tick, 2800);
}

/* ------------------------------------------------------------
   8) قسم الأعمال: العرض + الفلترة
------------------------------------------------------------ */
const state = {
  projects: [],
  visible: [],
  dialogIndex: 0,
  videoIndex: 0,
  dialogImages: [],
  dialogImageIndex: 0,
  lightboxIndex: 0,
  shown: 8,
  filter: 'all',
};

/* نسخ الصورة الخفيفة: -thumb للشريط الصغير و -1200 لنافذة العرض */
function variantPath(path, suffix) {
  if (!path) return '';
  return String(path).replace(/(-900)?\.(jpe?g|png|webp)$/i, `${suffix}.$2`);
}

function thumbOf(item) {
  if (!item) return '';
  return item.thumb || variantPath(item.small || item.src, '-thumb');
}

/* نسخة 640 الخفيفة اللي بتكون محمّلة بالفعل في كارت الصفحة الرئيسية */
function gridOf(item) {
  if (!item) return '';
  const base = item.small || item.src;
  if (!base || !/^assets\//.test(base)) return base;
  return String(base).replace(/(-900)?\.(jpe?g|png|webp)$/i, '-640.jpg');
}

function hasMedium(item) {
  if (!item) return false;
  if (item.medium) return true;
  return /-900\.(jpe?g|png|webp)$/i.test(item.small || '');
}

function mediumOf(item) {
  if (!item) return '';
  if (item.medium) return item.medium;
  if (!hasMedium(item)) return '';
  return String(item.small).replace(/-900(\.(jpe?g|png|webp))$/i, '-1200$1');
}

/* تحميل مسبق هادئ للصور المجاورة عشان التنقل يبان فوري */
const preloaded = new Map();

function preloadImage(url) {
  if (!url || preloaded.has(url)) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  preloaded.set(url, img);
}

/* أقل نسخة خفيفة متاحة لمشروع من بيانات الموقع */
function projectLow(project) {
  if (!project) return '';
  const base = project.imageSmall || project.image || '';
  if (!/^assets\//.test(base)) return base;
  return String(base).replace(/(-900)?\.(jpe?g|png|webp)$/i, '-640.jpg');
}

/* الصورة اللي الكارت بيعرضها فعلاً — بنفتح بيها النافذة فورًا */
function cardImageSrc(projectId) {
  const img = document.querySelector(`[data-project-card="${projectId}"] .project__media img`);
  return img && img.complete && img.naturalWidth ? img.currentSrc || img.src : '';
}

function preloadNeighbours(items, index, pick) {
  if (!Array.isArray(items) || items.length < 2) return;
  [index + 1, index - 1].forEach((position) => {
    if (position < 0 || position >= items.length) return;
    const item = items[position];
    if (item) preloadImage(pick(item));
  });
}

/* تعيين الصورة المعروضة في نافذة المشروع: تظهر فورًا بنسخة الكارت المحمّلة
   وبعدين تتبدّل بهدوء للنسخة الأوضح من غير ما الشاشة تفضى */
function applyDialogImage(item, alt, immediate) {
  const image = $('#dialogImage');
  if (!image || !item) return;

  const small = item.small || item.src;
  const medium = mediumOf(item);
  const low = immediate || gridOf(item) || small;
  /* على الموبايل نسخة 900 كفاية وواضحة، والـ1200 بتبقى تحميل زيادة بلا داعي */
  const wide = window.matchMedia('(min-width: 681px)').matches;
  const hi = wide ? medium || small || item.src : small || item.src;

  image.alt = item.alt || alt || '';
  image.dataset.small = small || '';
  image.dataset.hi = hi || '';
  image.classList.remove('is-loading');
  image.sizes = '(max-width: 680px) 100vw, 1022px';
  if (item.width) image.width = item.width;
  if (item.height) image.height = item.height;

  image.srcset = '';
  if (image.getAttribute('src') !== low) image.src = low;

  if (!hi || hi === low) return;

  const pre = new Image();
  pre.decoding = 'async';
  pre.onload = () => {
    if (image.dataset.hi === hi) image.src = hi;
  };
  pre.src = hi;
}

/* استخراج معرّف فيديو يوتيوب من أي صيغة رابط */
function youtubeId(url) {
  if (!url) return '';
  const value = String(url).trim();
  const patterns = [
    /youtu\.be\/([\w-]{6,})/i,
    /youtube\.com\/watch\?(?:.*&)?v=([\w-]{6,})/i,
    /youtube\.com\/embed\/([\w-]{6,})/i,
    /youtube\.com\/shorts\/([\w-]{6,})/i,
    /youtube\.com\/live\/([\w-]{6,})/i,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return /^[\w-]{11}$/.test(value) ? value : '';
}

/* قائمة فيديوهات المشروع: إما مشروع بمقطع واحد أو مشروع بعدة مقاطع */
function projectVideos(project) {
  if (!project) return [];
  if (Array.isArray(project.videos) && project.videos.length) return project.videos;
  if (project.video) {
    return [
      {
        src: project.video,
        poster: project.imageMedium || project.imageSmall || project.image,
        title: project.title,
      },
    ];
  }
  return [];
}

function projectMarkup(project) {
  const category = categoryLabel(project.cat);
  const fallback = project.imageSmall || project.image;
  const alt = project.alt || `${project.title} — ${project.tag}`;
  const gridSmall = project.image
    ? String(project.image).replace(/\.(jpe?g|png|webp)$/i, '-640.jpg')
    : '';
  const srcset = [
    project.image && /^assets\//.test(project.image) ? `${gridSmall} 640w` : '',
    project.imageSmall ? `${project.imageSmall} 900w` : '',
    `${project.image} ${project.width}w`,
  ]
    .filter(Boolean)
    .join(', ');

  return `
    <article class="project" data-reveal data-project-card="${project.id}" data-category="${project.cat}">
      <div class="project__media">
        <img
          src="${fallback}"
          srcset="${srcset}"
          sizes="(max-width: 680px) 92vw, (max-width: 1080px) 45vw, 560px"
          width="${project.width}"
          height="${project.height}"
          alt="${alt}"
          loading="lazy"
          decoding="async"
        >
        <div class="project__badges">
          <span class="project__code">${project.code}</span>
          ${
            project.isVideo
              ? `<span class="project__type">
                   <svg class="icon icon--solid" aria-hidden="true"><use href="#i-play"></use></svg>
                   فيديو
                 </span>`
              : ''
          }
        </div>
      </div>
      <div class="project__body">
        <span class="project__tag">${project.tag}</span>
        <h3 class="project__title">${project.title}</h3>
        <span class="project__more">
          <span>${project.isVideo ? 'شاهد الفيديو' : 'عرض التفاصيل'}</span>
          <svg class="icon" aria-hidden="true"><use href="#i-arrow-left"></use></svg>
        </span>
      </div>
      <button
        type="button"
        class="project__open"
        data-project-open="${project.id}"
        aria-label="عرض تفاصيل مشروع ${project.title} — ${category}"
      ></button>
    </article>`;
}

function renderFilters() {
  const container = $('#filters');
  if (!container || typeof CATEGORIES === 'undefined') return;

  container.innerHTML = CATEGORIES.map((category) => {
    const count =
      category.id === 'all'
        ? state.projects.length
        : state.projects.filter((p) => p.cat === category.id).length;

    return `<button
      type="button"
      class="filter"
      data-filter="${category.id}"
      aria-pressed="${category.id === 'all' ? 'true' : 'false'}"
    >
      ${category.label}
      <span class="filter__count">${count}</span>
    </button>`;
  }).join('');
}

function renderProjects() {
  const grid = $('#workGrid');
  if (!grid || typeof WORK_DATA === 'undefined') return;

  state.projects = WORK_DATA.slice();
  state.visible = state.projects.slice();

  /* البطاقات مبنية مسبقًا داخل الـHTML — نستخدمها زي ما هي بدل ما نمسحها
     ونعيد بناءها (ده كان بيخلي الصور تتحمّل مرتين ويأخر أول رسم) */
  const existing = $$('[data-project-card]', grid);
  const inSync =
    existing.length === state.projects.length &&
    existing.every(
      (card, index) => card.dataset.projectCard === state.projects[index].id
    );

  if (!inSync) grid.innerHTML = state.projects.map(projectMarkup).join('');

  initGridImages(grid);
  renderFilters();
  observeReveals(grid);
  ensureWorkMore(grid);
  updateWorkMore();

  const counter = $('#workTotal');
  if (counter) counter.textContent = String(state.projects.length);
}

/* إظهار الصور بهدوء عند جهوزها بدل ما تنط في الشاشة */
function initGridImages(scope) {
  $$('.project__media img', scope).forEach((img) => {
    if (img.classList.contains('is-ready')) return;
    const ready = () => {
      img.classList.add('is-ready');
      img.closest('.project__media')?.classList.add('is-ready');
    };
    if (img.complete && img.naturalWidth) ready();
    else img.addEventListener('load', ready, { once: true });
  });
}

/* زر «عرض المزيد» — أول 8 مشاريع بس، والباقي عند الطلب */
function ensureWorkMore(grid) {
  if ($('#workMore')) return;
  const wrap = document.createElement('div');
  wrap.className = 'work-more';
  wrap.id = 'workMore';
  wrap.innerHTML = `
    <button class="btn btn--ghost work-more__btn" id="workMoreBtn" type="button">
      <span>عرض المزيد من الأعمال</span>
      <span class="work-more__count" id="workMoreCount"></span>
      <svg class="icon" aria-hidden="true"><use href="#i-arrow-down"></use></svg>
    </button>`;
  grid.after(wrap);
  wrap.addEventListener('click', () => {
    state.shown = Math.min(state.projects.length, state.shown + 8);
    updateWorkMore();
    const live = $('#workLive');
    if (live) {
      live.textContent = `يتم عرض ${Math.min(state.shown, state.projects.length)} من ${
        state.projects.length
      } مشروعًا`;
    }
  });
}

function updateWorkMore() {
  const grid = $('#workGrid');
  const more = $('#workMore');
  if (!grid || !more) return;

  const all = state.filter === 'all';
  $$('[data-project-card]', grid).forEach((card) => {
    const position = state.projects.findIndex((p) => p.id === card.dataset.projectCard);
    card.classList.toggle('is-deferred', all && position >= state.shown);
  });

  const remaining = all ? Math.max(0, state.projects.length - state.shown) : 0;
  more.hidden = remaining === 0;
  const count = $('#workMoreCount');
  if (count) count.textContent = remaining ? `(${remaining})` : '';

  initGridImages(grid);
}

function initWork() {
  const grid = $('#workGrid');
  if (!grid) return;

  /* تحميل مسبق للنسخة الواضحة بمجرد التحويم/اللمس → نافذة المشروع تفتح فورًا */
  const warm = (event) => {
    const card = event.target.closest('[data-project-card]');
    if (!card) return;
    const project = state.projects.find((p) => p.id === card.dataset.projectCard);
    if (!project) return;
    preloadImage(projectLow(project));
  };
  grid.addEventListener('pointerover', warm, { passive: true });
  grid.addEventListener('touchstart', warm, { passive: true });
  grid.addEventListener('focusin', warm);

  const filters = $('#filters');
  const live = $('#workLive');

  if (filters) {
    filters.addEventListener('click', (event) => {
      const button = event.target.closest('.filter');
      if (!button) return;

      const filter = button.dataset.filter;
      state.filter = filter;
      $$('.filter', filters).forEach((b) =>
        b.setAttribute('aria-pressed', String(b === button))
      );

      state.visible = state.projects.filter((p) => filter === 'all' || p.cat === filter);

      const shownNow = [];
      $$('[data-project-card]', grid).forEach((card) => {
        const show = state.visible.some((p) => p.id === card.dataset.projectCard);
        card.hidden = !show;
        card.classList.remove('is-enter');
        if (show) shownNow.push(card);
      });

      /* إعادة تشغيل الأنيميشن دفعة واحدة بعد الرسم — بدون إجبار المتصفح
         على إعادة حساب التصميم لكل كارت على حدة */
      window.requestAnimationFrame(() => {
        shownNow.forEach((card) => card.classList.add('is-enter'));
      });

      updateWorkMore();

      const empty = $('#workEmpty');
      if (empty) empty.hidden = state.visible.length !== 0;

      if (live) {
        const shownCount =
          filter === 'all'
            ? Math.min(state.shown, state.projects.length)
            : state.visible.length;
        live.textContent = `يتم عرض ${shownCount} من ${state.projects.length} مشروعًا`;
      }
    });
  }

  grid.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-project-open]');
    if (!trigger) return;
    openProject(trigger.dataset.projectOpen);
  });

  /* صورة بديلة عند فشل التحميل */
  grid.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      const media = img.closest('.project__media');
      if (!media) return;
      media.classList.add('is-missing');
      img.remove();
    },
    true
  );
}

/* ------------------------------------------------------------
   9) نافذة تفاصيل المشروع
------------------------------------------------------------ */
function renderDialog() {
  const project = state.visible[state.dialogIndex];
  if (!project) return;

  const image = $('#dialogImage');
  const video = $('#dialogVideo');
  const media = $('#dialogMedia');
  const kicker = $('#dialogKicker');
  const title = $('#dialogTitle');
  const summary = $('#dialogSummary');
  const details = $('#dialogDetails');
  const factsList = $('#dialogFacts');
  const category = $('#dialogCategory');
  const type = $('#dialogType');
  const tag = $('#dialogTag');
  const code = $('#dialogCode');
  const link = $('#dialogLink');
  const count = $('#dialogCount');
  const prev = $('#dialogPrev');
  const next = $('#dialogNext');

  if (title) title.textContent = project.title;
  if (kicker) kicker.textContent = `${project.code} · ${project.tag}`;
  if (summary) summary.textContent = project.summary;

  if (details) {
    const text = String(project.details || '').trim();
    details.textContent = text;
    details.hidden = !text;
  }

  if (factsList) {
    factsList.querySelectorAll('[data-extra-fact]').forEach((node) => node.remove());
    (Array.isArray(project.facts) ? project.facts : []).forEach((fact) => {
      const label = fact && String(fact.label || '').trim();
      const value = fact && String(fact.value || '').trim();
      if (!label || !value) return;
      const row = document.createElement('div');
      row.dataset.extraFact = '';
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      row.append(dt, dd);
      factsList.append(row);
    });
  }

  if (category) category.textContent = categoryLabel(project.cat);
  if (type) type.textContent = project.isVideo ? 'فيديو / موشن' : 'تصميم ثابت';
  if (tag) tag.textContent = project.tag;
  if (code) code.textContent = project.code;

  const videos = projectVideos(project);
  const hasVideo = videos.length > 0;
  const ytId = youtubeId(project.youtube);
  const hasYoutube = !hasVideo && Boolean(ytId);
  state.videoIndex = 0;

  const playlist = $('#dialogPlaylist');

  if (playlist) {
    playlist.innerHTML = '';

    if (videos.length > 1) {
      videos.forEach((item, index) => {
        const button = document.createElement('button');
        const poster = item.poster
          ? thumbOf({ src: item.poster })
          : thumbOf({ src: project.image, small: project.imageSmall });
        button.type = 'button';
        button.className = 'dialog-playlist__item';
        button.dataset.videoIndex = String(index);
        button.setAttribute('aria-current', index === 0 ? 'true' : 'false');
        button.setAttribute('aria-label', item.title || `المقطع ${index + 1}`);
        button.innerHTML = `<img src="${poster}" alt="" width="200" height="150" loading="lazy" decoding="async"><span class="dialog-playlist__index">${index + 1}</span>`;
        playlist.append(button);
      });
      playlist.hidden = false;
    } else {
      playlist.hidden = true;
    }
  }

  /* جاليري الصور: الغلاف + الصور الإضافية */
  const galleryWrap = $('#dialogGallery');

  if (galleryWrap) {
    const items = [];

    if (project.image) {
      items.push({
        src: project.image,
        small: project.imageSmall || project.image,
        width: project.width,
        height: project.height,
        alt: project.alt || `${project.title} — ${project.tag}`,
      });
    }

    (project.gallery || []).forEach((item) => {
      if (item && item.src) items.push(item);
    });

    const showGallery = !hasVideo && !hasYoutube && items.length > 1;
    galleryWrap.innerHTML = '';
    galleryWrap.hidden = !showGallery;

    state.dialogImages = items;
    state.dialogImageIndex = 0;

    if (showGallery) {
      items.forEach((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dialog-gallery__item';
        button.setAttribute('aria-current', index === 0 ? 'true' : 'false');
        button.setAttribute('aria-label', item.alt || `صورة ${index + 1}`);
        button.innerHTML = `<img src="${thumbOf(item)}" data-fallback="${item.small || item.src}" alt="" width="80" height="80" loading="lazy" decoding="async">`;

        button.addEventListener('click', () => {
          if (!image) return;
          state.dialogImageIndex = index;
          applyDialogImage(item, `${project.title} — ${project.tag}`);
          preloadNeighbours(items, index, (entry) => gridOf(entry) || entry.small || entry.src);
          Array.from(galleryWrap.children).forEach((node) =>
            node.setAttribute('aria-current', node === button ? 'true' : 'false')
          );
        });

        galleryWrap.append(button);
      });
    }
  }

  const zoom = $('#dialogZoom');
  if (zoom) zoom.hidden = hasVideo || hasYoutube || !project.image;

  const full = $('#dialogFull');
  if (full) full.hidden = !(hasVideo || hasYoutube);

  if (video) {
    if (hasVideo) {
      const first = videos[0];
      video.src = first.src;
      video.poster = first.poster || project.image || '';
      video.hidden = false;
      video.load();
    } else {
      video.pause();
      video.hidden = true;
      video.removeAttribute('src');
      video.removeAttribute('poster');
      video.load();
    }
  }

  /* فيديو يوتيوب غير المدرج: عرض داخل الصفحة عبر iframe */
  if (media) {
    let frame = $('#dialogYoutube');

    if (hasYoutube) {
      if (!frame) {
        frame = document.createElement('iframe');
        frame.id = 'dialogYoutube';
        frame.className = 'dialog-youtube';
        frame.loading = 'lazy';
        frame.allow =
          'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        frame.setAttribute('allowfullscreen', '');
        media.append(frame);
      }
      frame.src = `https://www.youtube-nocookie.com/embed/${ytId}?rel=0`;
      frame.title = `فيديو مشروع ${project.title}`;
      frame.hidden = false;
    } else if (frame) {
      frame.hidden = true;
      frame.removeAttribute('src');
    }
  }

  if (image) {
    image.hidden = hasVideo || hasYoutube;

    if (!hasVideo) {
      const cover = state.dialogImages[0] || {
        src: project.image,
        small: project.imageSmall,
        width: project.width,
        height: project.height,
      };
      applyDialogImage(cover, `${project.title} — ${project.tag}`, cardImageSrc(project.id));
      preloadNeighbours(state.dialogImages, 0, (entry) => gridOf(entry) || entry.small || entry.src);
    }
  }

  if (media) media.classList.remove('is-missing');

  if (link) {
    if (project.external && project.url) {
      link.hidden = false;
      link.href = project.url;
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.innerHTML = `عرض المشروع على بيهانس
        <svg class="icon" aria-hidden="true"><use href="#i-external"></use></svg>`;
    } else {
      link.hidden = true;
      link.removeAttribute('href');
      link.textContent = '';
    }
  }

  if (count) count.textContent = `${state.dialogIndex + 1} / ${state.visible.length}`;
  if (prev) prev.disabled = state.dialogIndex === 0;
  if (next) next.disabled = state.dialogIndex === state.visible.length - 1;
}

function selectVideo(index) {
  const project = state.visible[state.dialogIndex];
  const videos = projectVideos(project);
  const item = videos[index];
  const video = $('#dialogVideo');
  if (!item || !video) return;

  state.videoIndex = index;
  video.src = item.src;
  video.poster = item.poster || project.image || '';
  video.hidden = false;
  video.load();

  const playlist = $('#dialogPlaylist');
  if (playlist) {
    playlist.querySelectorAll('[data-video-index]').forEach((button) => {
      button.setAttribute(
        'aria-current',
        Number(button.dataset.videoIndex) === index ? 'true' : 'false'
      );
    });
  }

  const attempt = video.play();
  if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
}

function moveDialog(delta) {
  const next = state.dialogIndex + delta;
  if (next < 0 || next >= state.visible.length) return;

  const video = $('#dialogVideo');
  if (video) {
    video.pause();
    video.currentTime = 0;
  }

  state.dialogIndex = next;
  renderDialog();
}

function openProject(id) {
  const dialog = $('#projectDialog');
  if (!dialog) return;

  const index = state.visible.findIndex((p) => p.id === id);
  if (index === -1) return;

  state.dialogIndex = index;

  if (typeof HTMLDialogElement === 'undefined' || !dialog.showModal) {
    const project = state.visible[index];
    const fallbackVideo = projectVideos(project)[0];
    const ytId = youtubeId(project?.youtube);
    if (fallbackVideo) window.open(fallbackVideo.src, '_blank', 'noopener');
    else if (ytId) window.open(`https://youtu.be/${ytId}`, '_blank', 'noopener');
    else if (project?.url) window.open(project.url, '_blank', 'noopener');
    return;
  }

  renderDialog();
  document.body.classList.add('has-dialog');
  if (!dialog.open) dialog.showModal();
  $('#dialogClose')?.focus({ preventScroll: true });
}

function initProjectDialog() {
  const dialog = $('#projectDialog');
  if (!dialog) return;

  if (typeof HTMLDialogElement === 'undefined' || !dialog.showModal) return;

  $('#dialogClose')?.addEventListener('click', () => dialog.close());
  $('#dialogPrev')?.addEventListener('click', () => moveDialog(-1));
  $('#dialogNext')?.addEventListener('click', () => moveDialog(1));

  /* إزالة تأثير التحميل مع أول صورة جاهزة */
  const dialogImage = $('#dialogImage');
  const settleImage = () => dialogImage?.classList.remove('is-loading');
  dialogImage?.addEventListener('load', settleImage);
  dialogImage?.addEventListener('error', () => {
    const small = dialogImage?.dataset.small;
    if (small && dialogImage && !dialogImage.src.endsWith(small)) {
      dialogImage.src = small;
      dialogImage.srcset = '';
    }
    settleImage();
  });

  /* لو المصغّرة مش موجودة نرجع للنسخة 900 */
  $('#dialogGallery')?.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      const fallback = img.dataset.fallback;
      if (fallback && !img.src.endsWith(fallback)) {
        img.removeAttribute('data-fallback');
        img.src = fallback;
      }
    },
    true
  );

  $('#dialogPlaylist')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-video-index]');
    if (!button) return;
    selectVideo(Number(button.dataset.videoIndex));
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('has-dialog');

    if (document.fullscreenElement) document.exitFullscreen?.();

    const video = $('#dialogVideo');
    if (video) {
      video.pause();
      video.currentTime = 0;
    }

    const frame = $('#dialogYoutube');
    if (frame) frame.removeAttribute('src');
  });

  dialog.addEventListener('keydown', (event) => {
    if (event.target.closest?.('video')) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveDialog(1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveDialog(-1);
    }
  });

  $('#dialogImage')?.addEventListener('error', () => {
    $('#dialogMedia')?.classList.add('is-missing');
  });

  const openZoom = () => {
    if (!$('#dialogImage') || $('#dialogImage').hidden) return;
    openLightbox(state.dialogImageIndex);
  };

  $('#dialogImage')?.addEventListener('click', openZoom);
  $('#dialogZoom')?.addEventListener('click', openZoom);

  $('#dialogFull')?.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }

    const video = $('#dialogVideo');
    const frame = $('#dialogYoutube');
    const target =
      video && !video.hidden ? video : frame && !frame.hidden ? frame : $('#dialogMedia');

    if (!target || !target.requestFullscreen) return;
    target.requestFullscreen().catch(() => {
      $('#dialogMedia')?.requestFullscreen?.().catch(() => {});
    });
  });
}

/* ------------------------------------------------------------
   9b) عرض الصور بالحجم الكامل
------------------------------------------------------------ */
function lightboxList() {
  return Array.isArray(state.dialogImages) ? state.dialogImages : [];
}

function renderLightbox() {
  const items = lightboxList();
  const item = items[state.lightboxIndex];
  if (!item) return;

  const img = $('#lightboxImage');
  if (img) {
    const full = item.src;
    const quick = mediumOf(item) || item.small || full;
    const serial = (state.lightboxSerial = (state.lightboxSerial || 0) + 1);

    img.decoding = 'async';
    img.srcset = '';
    img.sizes = '100vw';
    img.src = quick;
    img.alt = item.alt || '';

    /* الصورة الكاملة توصل في الخلفية وتُستبدل بهدوء */
    if (full && full !== quick) {
      const loader = new Image();
      loader.decoding = 'async';
      loader.onload = () => {
        if (state.lightboxSerial !== serial) return;
        img.src = full;
      };
      loader.src = full;
    }

    preloadNeighbours(items, state.lightboxIndex, (entry) => entry.src);
  }

  const count = $('#lightboxCount');
  if (count) count.textContent = `${state.lightboxIndex + 1} / ${items.length}`;

  const caption = $('#lightboxCaption');
  if (caption) caption.textContent = item.alt || '';

  const single = items.length < 2;
  const prev = $('#lightboxPrev');
  const next = $('#lightboxNext');
  if (prev) prev.hidden = single;
  if (next) next.hidden = single;
}

function moveLightbox(delta) {
  const items = lightboxList();
  if (items.length < 2) return;
  state.lightboxIndex = (state.lightboxIndex + delta + items.length) % items.length;
  renderLightbox();
}

function openLightbox(index) {
  const box = $('#lightbox');
  const items = lightboxList();
  if (!box || !items.length) return;

  state.lightboxIndex = Math.max(0, Math.min(Number(index) || 0, items.length - 1));
  renderLightbox();

  if (typeof HTMLDialogElement === 'undefined' || !box.showModal) {
    window.open(items[state.lightboxIndex].src, '_blank', 'noopener');
    return;
  }

  if (!box.open) box.showModal();
  $('#lightboxClose')?.focus({ preventScroll: true });
}

function initLightbox() {
  const box = $('#lightbox');
  if (!box) return;

  $('#lightboxClose')?.addEventListener('click', () => box.close());
  $('#lightboxPrev')?.addEventListener('click', () => moveLightbox(-1));
  $('#lightboxNext')?.addEventListener('click', () => moveLightbox(1));

  box.addEventListener('click', (event) => {
    if (event.target === box) box.close();
  });

  box.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveLightbox(1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveLightbox(-1);
    }
  });

  /* Esc يقفل العرض الكامل بس، ويسيب نافذة المشروع مفتوحة */
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !box.open) return;
      event.preventDefault();
      event.stopPropagation();
      box.close();
    },
    true
  );

  box.addEventListener('close', () => {
    $('#dialogZoom')?.focus({ preventScroll: true });
  });

  let startX = null;
  box.addEventListener(
    'touchstart',
    (event) => {
      startX = event.touches[0]?.clientX ?? null;
    },
    { passive: true }
  );
  box.addEventListener(
    'touchend',
    (event) => {
      if (startX === null) return;
      const dx = (event.changedTouches[0]?.clientX ?? startX) - startX;
      startX = null;
      if (Math.abs(dx) > 45) moveLightbox(dx < 0 ? 1 : -1);
    },
    { passive: true }
  );
}

/* ------------------------------------------------------------
   10) نموذج التواصل
------------------------------------------------------------ */
function initContactForm() {
  const form = $('#contactForm');
  if (!form) return;

  const status = $('#formStatus');
  const emailBtn = $('#formEmail');

  const setStatus = (stateName, message, link) => {
    if (!status) return;
    status.dataset.state = stateName;
    status.textContent = message;

    if (link) {
      const anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = link.label;
      anchor.style.cssText = 'color:inherit;text-decoration:underline;margin-inline-start:.35rem;';
      status.append(' ', anchor);
    }

    status.classList.add('is-visible');
  };

  const clearStatus = () => {
    if (!status) return;
    status.classList.remove('is-visible');
    status.textContent = '';
    status.removeAttribute('data-state');
  };

  const fields = {
    name: $('#fieldName'),
    phone: $('#fieldPhone'),
    email: $('#fieldEmail'),
    service: $('#fieldService'),
    message: $('#fieldMessage'),
  };

  const errors = {
    name: $('#errorName'),
    phone: $('#errorPhone'),
    email: $('#errorEmail'),
    service: $('#errorService'),
    message: $('#errorMessage'),
  };

  const validators = {
    name: (v) => (v.trim().length >= 2 ? '' : 'اكتب اسمك الكامل من فضلك.'),
    phone: (v) => {
      const digits = v.replace(/\D/g, '');
      return digits.length >= 8 && digits.length <= 15
        ? ''
        : 'اكتب رقم هاتف صحيحًا (8 إلى 15 رقمًا).';
    },
    email: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'اكتب بريدًا إلكترونيًا صحيحًا.',
    service: (v) => (v ? '' : 'اختر نوع الخدمة المطلوبة.'),
    message: (v) =>
      v.trim().length >= 10 ? '' : 'اكتب وصفًا مختصرًا للمشروع (10 أحرف على الأقل).',
  };

  const validateField = (key) => {
    const field = fields[key];
    if (!field) return true;
    const message = validators[key] ? validators[key](field.value) : '';
    if (errors[key]) errors[key].textContent = message;
    field.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  };

  Object.keys(fields).forEach((key) => {
    const field = fields[key];
    if (!field) return;
    field.addEventListener('blur', () => validateField(key));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(key);
    });
    field.addEventListener('change', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(key);
    });
  });

  const validateAll = () => {
    const results = Object.keys(fields).map(validateField);
    const firstInvalid = Object.keys(fields).find(
      (key) => fields[key]?.getAttribute('aria-invalid') === 'true'
    );
    if (firstInvalid && fields[firstInvalid]) {
      fields[firstInvalid].focus();
      fields[firstInvalid].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return results.every(Boolean);
  };

  const getValues = () => ({
    name: fields.name?.value.trim() || '',
    phone: fields.phone?.value.trim() || '',
    email: fields.email?.value.trim() || '',
    service: fields.service?.value || '',
    message: fields.message?.value.trim() || '',
  });

  const buildMessage = () => {
    const v = getValues();
    return [
      'طلب مشروع جديد — من الموقع الشخصي',
      '',
      `الاسم: ${v.name}`,
      `الهاتف: ${v.phone}`,
      `البريد: ${v.email}`,
      `نوع الخدمة: ${v.service}`,
      '',
      'تفاصيل المشروع:',
      v.message,
    ].join('\n');
  };

  const whatsappUrl = () => `${whatsappBase()}?text=${encodeURIComponent(buildMessage())}`;

  const mailtoUrl = () => {
    const subject = 'طلب مشروع جديد — من الموقع الشخصي';
    return `mailto:${SITE_DATA.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(buildMessage())}`;
  };

  const openWhatsApp = () => {
    const url = whatsappUrl();
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearStatus();

    if (!validateAll()) {
      setStatus('error', 'هناك بعض الحقول تحتاج إلى تصحيح قبل الإرسال.');
      return;
    }

    openWhatsApp();
    setStatus(
      'success',
      'تم تجهيز رسالتك على واتساب — راجعها واضغط إرسال داخل التطبيق وسأرد عليك في أقرب وقت.'
    );
  });

  emailBtn?.addEventListener('click', () => {
    clearStatus();

    if (!validateAll()) {
      setStatus('error', 'راجع الحقول المطلوبة أولاً حتى نتمكن من تجهيز رسالتك.');
      return;
    }

    window.location.href = mailtoUrl();
    setStatus(
      'info',
      'تم تجهيز رسالتك في تطبيق البريد — راجعها واضغط إرسال. لو لم يفتح تطبيق البريد، استخدم واتساب.'
    );
  });
}

/* ------------------------------------------------------------
   11) روابط إضافية
------------------------------------------------------------ */
/* إيقاف الشريط المتحرك لما يكون خارج الشاشة (توفير معالج وبطارية) */
function initMarquee() {
  const marquee = document.querySelector('.marquee');
  const track = document.querySelector('.marquee__track');
  if (!marquee || !track || !('IntersectionObserver' in window)) return;

  new IntersectionObserver(
    ([entry]) => track.classList.toggle('is-paused', !entry.isIntersecting),
    { rootMargin: '120px 0px' }
  ).observe(marquee);
}

function initMisc() {
  const floatingWhatsApp = $('#floatingWhatsapp');
  if (floatingWhatsApp && typeof SITE_DATA !== 'undefined') {
    floatingWhatsApp.href = `${whatsappBase()}?text=${encodeURIComponent(
      'مرحباً أحمد، أود الاستفسار عن مشروع تصميم / موشن جرافيك'
    )}`;
  }
}

/* ------------------------------------------------------------
   التشغيل
------------------------------------------------------------ */
function init() {
  initSiteData();
  initHeader();
  initScrollUI();
  initScrollSpy();
  initReveal();
  initMarquee();
  renderProjects();
  initWork();
  initProjectDialog();
  initLightbox();
  initCounters();
  initTyping();
  initContactForm();
  initMisc();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
