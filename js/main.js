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

    if (bar) bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
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
  $$('[data-reveal-group]').forEach((group) => {
    Array.from(group.children).forEach((child, index) => {
      if (child.hasAttribute('data-reveal')) {
        child.style.setProperty('--reveal-delay', `${Math.min(index, 7) * 70}ms`);
      }
    });
  });

  const elements = $$('[data-reveal]');
  if (!elements.length) return;

  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    elements.forEach((el) => el.classList.add('is-in'));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px' }
  );

  elements.forEach((el) => revealObserver.observe(el));
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
  el.append(text, caret);

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

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

  window.setTimeout(tick, 1000);
}

/* ------------------------------------------------------------
   8) قسم الأعمال: العرض + الفلترة
------------------------------------------------------------ */
const state = {
  projects: [],
  visible: [],
  dialogIndex: 0,
  videoIndex: 0,
};

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

  return `
    <article class="project" data-reveal data-project-card="${project.id}" data-category="${project.cat}">
      <div class="project__media">
        <img
          src="${fallback}"
          srcset="${project.imageSmall ? `${project.imageSmall} 900w, ` : ''}${project.image} ${project.width}w"
          sizes="(max-width: 680px) 92vw, (max-width: 1080px) 45vw, 30vw"
          width="${project.width}"
          height="${project.height}"
          alt="${project.title} — ${project.tag}"
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
  grid.innerHTML = state.projects.map(projectMarkup).join('');

  $$('[data-project-card]', grid).forEach((card, index) => {
    card.style.setProperty('--reveal-delay', `${Math.min(index, 7) * 60}ms`);
  });

  renderFilters();
  observeReveals(grid);

  const counter = $('#workTotal');
  if (counter) counter.textContent = String(state.projects.length);
}

function initWork() {
  const grid = $('#workGrid');
  if (!grid) return;

  const filters = $('#filters');
  const live = $('#workLive');

  if (filters) {
    filters.addEventListener('click', (event) => {
      const button = event.target.closest('.filter');
      if (!button) return;

      const filter = button.dataset.filter;
      $$('.filter', filters).forEach((b) =>
        b.setAttribute('aria-pressed', String(b === button))
      );

      state.visible = state.projects.filter((p) => filter === 'all' || p.cat === filter);

      $$('[data-project-card]', grid).forEach((card) => {
        const show = state.visible.some((p) => p.id === card.dataset.projectCard);
        card.hidden = !show;
        card.classList.remove('is-enter');
        if (show) {
          void card.offsetWidth;
          card.classList.add('is-enter');
        }
      });

      const empty = $('#workEmpty');
      if (empty) empty.hidden = state.visible.length !== 0;

      if (live) {
        live.textContent = `يتم عرض ${state.visible.length} من ${state.projects.length} مشروعًا`;
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
  if (category) category.textContent = categoryLabel(project.cat);
  if (type) type.textContent = project.isVideo ? 'فيديو / موشن' : 'تصميم ثابت';
  if (tag) tag.textContent = project.tag;
  if (code) code.textContent = project.code;

  const videos = projectVideos(project);
  const hasVideo = videos.length > 0;
  state.videoIndex = 0;

  const playlist = $('#dialogPlaylist');

  if (playlist) {
    playlist.innerHTML = '';

    if (videos.length > 1) {
      videos.forEach((item, index) => {
        const button = document.createElement('button');
        const poster = item.poster || project.image || '';
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

  if (image) {
    image.hidden = hasVideo;

    if (!hasVideo) {
      image.src = project.imageMedium || project.imageSmall || project.image;
      image.srcset = project.imageSmall
        ? `${project.imageSmall} 900w, ${project.image} ${project.width}w`
        : '';
      image.sizes = '(max-width: 680px) 92vw, 50vw';
      image.alt = `${project.title} — ${project.tag}`;
      image.width = project.width;
      image.height = project.height;
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
    if (fallbackVideo) window.open(fallbackVideo.src, '_blank', 'noopener');
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

    const video = $('#dialogVideo');
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
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
}

/* ------------------------------------------------------------
   10) نموذج التواصل
------------------------------------------------------------ */
function initContactForm() {
  const form = $('#contactForm');
  if (!form) return;

  const status = $('#formStatus');
  const submit = $('#formSubmit');
  const whatsappBtn = $('#formWhatsapp');

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

  const openWhatsApp = () => {
    const url = whatsappUrl();
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  };

  whatsappBtn?.addEventListener('click', () => {
    if (!validateAll()) {
      setStatus('error', 'راجع الحقول المطلوبة أولاً حتى نتمكن من تجهيز رسالتك.');
      return;
    }
    openWhatsApp();
    setStatus('info', 'تم تجهيز رسالتك على واتساب. أرسلها من تطبيق واتساب لإتمام التواصل.');
  });

  const isLocal =
    window.location.protocol === 'file:' ||
    ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();

    if (!validateAll()) {
      setStatus('error', 'هناك بعض الحقول تحتاج إلى تصحيح قبل الإرسال.');
      return;
    }

    /* في المعاينة المحلية نجهّز الرسالة على واتساب مباشرة */
    if (isLocal) {
      openWhatsApp();
      setStatus(
        'info',
        'هذه معاينة محلية، لذا تم تجهيز رسالتك على واتساب. عند النشر على Netlify سيعمل إرسال النموذج مباشرة.'
      );
      return;
    }

    if (submit) {
      submit.setAttribute('aria-busy', 'true');
      submit.disabled = true;
    }

    try {
      const body = new URLSearchParams(new FormData(form)).toString();
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!response.ok) throw new Error('Request failed');

      form.reset();
      Object.keys(fields).forEach((key) => {
        fields[key]?.removeAttribute('aria-invalid');
        if (errors[key]) errors[key].textContent = '';
      });

      setStatus('success', 'وصل طلبك بنجاح. سأتواصل معك في أقرب وقت ممكن.');
      showToast('تم إرسال طلبك بنجاح');
    } catch (error) {
      setStatus('error', 'تعذّر إرسال النموذج من الخادم. يمكنك إرسال نفس التفاصيل عبر واتساب:', {
        href: whatsappUrl(),
        label: 'افتح واتساب',
      });
    } finally {
      if (submit) {
        submit.removeAttribute('aria-busy');
        submit.disabled = false;
      }
    }
  });
}

/* ------------------------------------------------------------
   11) روابط إضافية
------------------------------------------------------------ */
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
  renderProjects();
  initWork();
  initProjectDialog();
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
