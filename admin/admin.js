/* ============================================================
   لوحة تحكم موقع أحمد مقبل
   تعمل بالكامل في المتصفح عبر GitHub API — بدون خادم أو قاعدة بيانات
   ============================================================ */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const LS = {
  token: 'am_admin_token',
  owner: 'am_admin_owner',
  repo: 'am_admin_repo',
};

const CONTENT_FILES = ['content/site.json', 'content/projects.json', 'content/pages.json'];
const MAX_IMAGE = 3 * 1024 * 1024;
const MAX_VIDEO = 8 * 1024 * 1024;

const state = {
  token: '',
  owner: 'AhmedMokbel99',
  repo: 'AhmedMokbel99.github.io',
  branch: 'main',
  user: null,
  site: null,
  projects: null,
  pages: null,
  shas: {},
  dirty: false,
  pendingUploads: new Map(),
  pendingDeletes: new Set(),
  draft: null,
  draftPreview: '',
  tab: 'projects',
  pollTimer: null,
  search: '',
  filter: 'all',
};

/* ---------------- أدوات عامة ---------------- */
function h(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getPath(obj, path) {
  return path.split('.').reduce((node, key) => {
    if (node == null) return undefined;
    return node[key];
  }, obj);
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((node, key) => {
    if (node[key] == null) node[key] = {};
    return node[key];
  }, obj);
  target[last] = value;
}

function toast(message, kind = '') {
  const node = $('#toast');
  node.textContent = message;
  node.className = 'toast is-on' + (kind ? ` is-${kind}` : '');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    node.className = 'toast';
  }, 4200);
}

function markDirty() {
  state.dirty = true;
  const btn = $('#saveBtn');
  btn.disabled = false;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function rawUrl(path) {
  return `https://raw.githubusercontent.com/${state.owner}/${state.repo}/${state.branch}/${path}`;
}

/* ---------------- GitHub API ---------------- */
async function api(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${state.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `خطأ ${response.status}`;
    try {
      const body = await response.json();
      if (body.message) message = body.message;
    } catch (error) {
      /* ignore */
    }
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) return null;
  return response.json();
}

function decodeBase64(text) {
  const binary = atob(String(text).replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadFile(path) {
  const data = await api(
    `/repos/${state.owner}/${state.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(state.branch)}`
  );
  state.shas[path] = data.sha;
  return decodeBase64(data.content);
}

async function loadContent() {
  const [siteRaw, projectsRaw, pagesRaw] = await Promise.all(CONTENT_FILES.map(loadFile));
  state.site = JSON.parse(siteRaw);
  state.projects = JSON.parse(projectsRaw);
  state.pages = JSON.parse(pagesRaw);
}

/* ---------------- الدخول ---------------- */
async function login(event) {
  event.preventDefault();
  const errorBox = $('#loginError');
  errorBox.textContent = '';

  const token = $('#tokenInput').value.trim();
  const owner = $('#ownerInput').value.trim();
  const repo = $('#repoInput').value.trim();

  if (!token || !owner || !repo) {
    errorBox.textContent = 'املأ الحقول الثلاثة أولاً.';
    return;
  }

  const button = $('#loginBtn');
  button.disabled = true;
  button.textContent = 'جاري التحقق…';

  state.token = token;
  state.owner = owner;
  state.repo = repo;

  try {
    state.user = await api('/user');
    const repoInfo = await api(`/repos/${owner}/${repo}`);
    state.branch = repoInfo.default_branch || 'main';
    await loadContent();

    localStorage.setItem(LS.token, token);
    localStorage.setItem(LS.owner, owner);
    localStorage.setItem(LS.repo, repo);

    showApp(repoInfo);
    toast(`مرحبًا ${state.user.login}`, 'ok');
  } catch (error) {
    errorBox.textContent =
      error.status === 401
        ? 'التوكن غير صالح أو منتهي. أنشئ توكنًا جديدًا وحاول مرة أخرى.'
        : `تعذّر الاتصال: ${error.message}`;
    state.token = '';
  } finally {
    button.disabled = false;
    button.textContent = 'دخول';
  }
}

function showApp(repoInfo) {
  $('#loginView').hidden = true;
  $('#appView').hidden = false;
  $('#repoLabel').textContent = `${state.owner}/${state.repo} · ${state.branch}`;
  $('#userLabel').textContent = state.user ? `@${state.user.login}` : '';
  $('#previewLink').href = `https://${state.owner.toLowerCase()}.github.io/`;
  if (repoInfo && repoInfo.html_url) {
    $('#previewLink').href = repoInfo.homepage || $('#previewLink').href;
  }
  renderAll();
  checkDeploy();
}

function logout() {
  if (state.dirty && !confirm('فيه تعديلات مش محفوظة. متأكد إنك عايز تخرج؟')) return;
  localStorage.removeItem(LS.token);
  localStorage.removeItem(LS.owner);
  localStorage.removeItem(LS.repo);
  state.token = '';
  state.user = null;
  state.site = null;
  state.projects = null;
  state.pages = null;
  state.dirty = false;
  state.pendingUploads.clear();
  state.pendingDeletes.clear();
  $('#appView').hidden = true;
  $('#loginView').hidden = false;
  $('#tokenInput').value = '';
  $('#saveBtn').disabled = true;
}

/* ---------------- التبويبات ---------------- */
function switchTab(tab) {
  state.tab = tab;
  $$('.tab').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tab));
  ['projects', 'texts', 'pages', 'settings'].forEach((name) => {
    $(`#panel-${name}`).hidden = name !== tab;
  });
}

function renderAll() {
  renderProjects();
  renderTexts();
  renderPages();
  renderSettings();
}

/* ---------------- المشاريع ---------------- */
function categoryLabel(id) {
  const found = (state.site.categories || []).find((item) => item.id === id);
  return found ? found.label : id;
}

function renderProjects() {
  const panel = $('#panel-projects');
  const categories = (state.site.categories || []).filter((c) => c.id !== 'all');

  const list = state.projects
    .map((project, index) => ({ project, index }))
    .filter(({ project }) => {
      const matchCat = state.filter === 'all' || project.cat === state.filter;
      const term = state.search.trim();
      const matchText =
        !term ||
        [project.title, project.tag, project.code, project.summary]
          .join(' ')
          .toLowerCase()
          .includes(term.toLowerCase());
      return matchCat && matchText;
    });

  const cards = list
    .map(
      ({ project, index }) => `
      <article class="pcard${project.visible === false ? ' is-hidden' : ''}">
        <div class="pcard__media">
          ${
            project.image
              ? `<img src="${h(rawUrl(project.image))}" alt="${h(project.title)}" loading="lazy">`
              : '<div class="image-preview">بدون صورة</div>'
          }
          <span class="pcard__badge">${h(project.code || '')}</span>
          ${project.isVideo ? '<span class="pcard__badge pcard__badge--video">فيديو</span>' : ''}
        </div>
        <div class="pcard__body">
          <b>${h(project.title)}</b>
          <small>${h(project.tag || '')} · ${h(categoryLabel(project.cat))}</small>
          ${project.visible === false ? '<small style="color:var(--amber)">مخفي من الموقع</small>' : ''}
        </div>
        <div class="pcard__actions">
          <button class="icon-btn" type="button" data-edit-project="${index}" title="تعديل">✎</button>
          <button class="icon-btn" type="button" data-move-project="${index}" data-dir="-1" title="لأعلى" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button class="icon-btn" type="button" data-move-project="${index}" data-dir="1" title="لأسفل" ${index === state.projects.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="icon-btn" type="button" data-delete-project="${index}" title="حذف">🗑</button>
        </div>
      </article>`
    )
    .join('');

  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <h2>المشاريع</h2>
        <p>${state.projects.length} مشروعًا. أضف أعمالك، رتّبها، وارفع صورها — تتحدّث في الموقع بعد الحفظ.</p>
      </div>
      <button class="btn btn--primary" type="button" id="addProjectBtn">+ إضافة مشروع</button>
    </div>

    <div class="toolbar">
      <input class="input" id="projectSearch" type="search" placeholder="ابحث بالاسم أو الوسم…" value="${h(state.search)}">
      <select class="input" id="projectFilter">
        <option value="all">كل التصنيفات</option>
        ${categories.map((c) => `<option value="${h(c.id)}"${state.filter === c.id ? ' selected' : ''}>${h(c.label)}</option>`).join('')}
      </select>
    </div>

    ${
      list.length
        ? `<div class="projects-grid">${cards}</div>`
        : '<p class="note">لا توجد مشاريع مطابقة. جرّب كلمة بحث أخرى أو أضف مشروعًا جديدًا.</p>'
    }
  `;

  $('#addProjectBtn').addEventListener('click', () => openProjectEditor(null));
  $('#projectSearch').addEventListener('input', (event) => {
    state.search = event.target.value;
    renderProjects();
    $('#projectSearch').focus();
  });
  $('#projectFilter').addEventListener('change', (event) => {
    state.filter = event.target.value;
    renderProjects();
  });

  $$('[data-edit-project]', panel).forEach((btn) =>
    btn.addEventListener('click', () => openProjectEditor(Number(btn.dataset.editProject)))
  );
  $$('[data-delete-project]', panel).forEach((btn) =>
    btn.addEventListener('click', () => deleteProject(Number(btn.dataset.deleteProject)))
  );
  $$('[data-move-project]', panel).forEach((btn) =>
    btn.addEventListener('click', () =>
      moveProject(Number(btn.dataset.moveProject), Number(btn.dataset.dir))
    )
  );
}

function moveProject(index, dir) {
  const target = index + dir;
  if (target < 0 || target >= state.projects.length) return;
  const [item] = state.projects.splice(index, 1);
  state.projects.splice(target, 0, item);
  markDirty();
  renderProjects();
}

function nextProjectCode() {
  return `F${String(state.projects.length + 1).padStart(2, '0')}`;
}

function blankProject() {
  const id = `f${String(state.projects.length + 1).padStart(2, '0')}`;
  return {
    id,
    code: nextProjectCode(),
    title: '',
    cat: 'motion',
    tag: '',
    isVideo: false,
    url: '',
    external: false,
    image: '',
    imageSmall: '',
    width: 1200,
    height: 900,
    alt: '',
    summary: '',
    visible: true,
    video: '',
    youtube: '',
  };
}

function openProjectEditor(index) {
  const isNew = index == null;
  state.draft = isNew ? blankProject() : clone(state.projects[index]);
  state.draftIndex = isNew ? -1 : index;
  state.draftPreview = '';
  state.draftImageName = state.draft.image
    ? state.draft.image.split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/-900$/, '')
    : `project-${state.draft.id}`;

  $('#projectModalTitle').textContent = isNew ? 'إضافة مشروع' : 'تعديل مشروع';
  renderProjectForm();
  $('#projectModal').hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#pf_title')?.focus(), 40);
}

function closeProjectModal() {
  $('#projectModal').hidden = true;
  document.body.style.overflow = '';
  state.draft = null;
  state.draftPreview = '';
}

function projectPreviewSrc() {
  if (state.draftPreview) return state.draftPreview;
  if (state.draft.image) return rawUrl(state.draft.image);
  return '';
}

function renderProjectForm() {
  const draft = state.draft;
  const categories = (state.site.categories || []).filter((c) => c.id !== 'all');
  const videoMode = draft.youtube ? 'youtube' : draft.video ? 'local' : 'none';
  const preview = projectPreviewSrc();

  $('#projectForm').innerHTML = `
    <div class="form-section">
      <h4>البيانات الأساسية</h4>
      <div class="grid-2">
        <label class="field">
          <span>اسم المشروع *</span>
          <input id="pf_title" type="text" value="${h(draft.title)}" data-draft="title">
        </label>
        <label class="field">
          <span>الوسم (مثال: موشن جرافيك)</span>
          <input type="text" value="${h(draft.tag)}" data-draft="tag">
        </label>
        <label class="field">
          <span>التصنيف</span>
          <select data-draft="cat">
            ${categories
              .map(
                (c) =>
                  `<option value="${h(c.id)}"${draft.cat === c.id ? ' selected' : ''}>${h(c.label)}</option>`
              )
              .join('')}
          </select>
        </label>
        <label class="field">
          <span>الكود الظاهر</span>
          <input type="text" value="${h(draft.code)}" data-draft="code">
        </label>
        <label class="field" style="grid-column:1/-1">
          <span>وصف المشروع</span>
          <textarea data-draft="summary" rows="3">${h(draft.summary)}</textarea>
        </label>
        <label class="field" style="grid-column:1/-1">
          <span>رابط المشروع على بيهانس (اختياري)</span>
          <input type="url" value="${h(draft.url)}" data-draft="url" placeholder="https://www.behance.net/gallery/...">
        </label>
        <label class="check" style="grid-column:1/-1">
          <input type="checkbox" data-draft="external"${draft.external ? ' checked' : ''}>
          إظهار زر «عرض المشروع على بيهانس»
        </label>
        <label class="check" style="grid-column:1/-1">
          <input type="checkbox" data-draft="visible"${draft.visible !== false ? ' checked' : ''}>
          إظهار المشروع في الموقع
        </label>
      </div>
    </div>

    <div class="form-section">
      <h4>صورة الغلاف *</h4>
      <div class="image-picker">
        <div class="image-preview" id="imagePreview">
          ${preview ? `<img src="${h(preview)}" alt="معاينة الغلاف">` : 'اختر صورة'}
        </div>
        <div class="image-controls">
          <input type="file" id="imageInput" accept="image/jpeg,image/png,image/webp">
          <label class="field" style="margin:0">
            <span>اسم الملف (إنجليزي — يظهر في رابط الصورة)</span>
            <input type="text" id="imageNameInput" value="${h(state.draftImageName)}" dir="ltr">
          </label>
          <label class="field" style="margin:0">
            <span>النص البديل للصورة (Alt) *</span>
            <input type="text" value="${h(draft.alt || '')}" data-draft="alt" placeholder="وصف الصورة لمحركات البحث">
          </label>
          <p class="hint" style="margin:0">أقصى حجم 3MB. يتم القص والضغط تلقائيًا وتوليد نسخة 900px للبطاقة.</p>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>الفيديو (اختياري)</h4>
      <div class="seg" id="videoMode">
        <button type="button" data-video-mode="none" class="${videoMode === 'none' ? 'is-active' : ''}">بدون فيديو</button>
        <button type="button" data-video-mode="local" class="${videoMode === 'local' ? 'is-active' : ''}">رفع فيديو</button>
        <button type="button" data-video-mode="youtube" class="${videoMode === 'youtube' ? 'is-active' : ''}">يوتيوب</button>
      </div>
      ${
        videoMode === 'local'
          ? `<div style="margin-top:.7rem">
              <input type="file" id="videoInput" accept="video/mp4,video/webm">
              <p class="hint">MP4 حتى 8MB. الملفات الأكبر ارفعها على يوتيوب (غير مدرج) والصق الرابط.</p>
              ${draft.video ? `<p class="hint" dir="ltr">${h(draft.video)}</p>` : ''}
            </div>`
          : videoMode === 'youtube'
            ? `<label class="field" style="margin:.7rem 0 0">
                <span>رابط يوتيوب (غير مدرج)</span>
                <input type="url" value="${h(draft.youtube)}" data-draft="youtube" placeholder="https://youtu.be/..." dir="ltr">
              </label>`
            : ''
      }
    </div>

    <div class="form-section">
      <h4>إعدادات متقدمة</h4>
      <div class="grid-2">
        <label class="field">
          <span>المعرّف (id)</span>
          <input type="text" value="${h(draft.id)}" data-draft="id" dir="ltr">
        </label>
        <label class="field">
          <span>مسار الصورة</span>
          <input type="text" value="${h(draft.image)}" data-draft="image" dir="ltr">
        </label>
      </div>
      <p class="note">غيّر الـid فقط لو تعرف ما تفعل — الروابط الداخلية تعتمد عليه.</p>
    </div>
  `;

  // bindings
  $$('[data-draft]', $('#projectForm')).forEach((input) => {
    const key = input.dataset.draft;
    const update = () => {
      let value;
      if (input.type === 'checkbox') value = input.checked;
      else if (input.type === 'number') value = Number(input.value);
      else value = input.value;
      state.draft[key] = value;
      if (key === 'youtube' && value) state.draft.video = '';
      if (key === 'video' && value) state.draft.youtube = '';
    };
    input.addEventListener('input', update);
    input.addEventListener('change', update);
  });

  $$('#videoMode [data-video-mode]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const mode = btn.dataset.videoMode;
      if (mode === 'none') {
        state.draft.video = '';
        state.draft.youtube = '';
      } else if (mode === 'local') {
        state.draft.youtube = '';
      } else {
        state.draft.video = '';
      }
      renderProjectForm();
    })
  );

  $('#imageInput')?.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) await attachImage(file);
  });

  $('#videoInput')?.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) await attachVideo(file);
  });

  $('#imageNameInput')?.addEventListener('input', (event) => {
    state.draftImageName = event.target.value;
  });
}

async function attachImage(file) {
  try {
    if (file.size > MAX_IMAGE) throw new Error('الصورة أكبر من 3MB. اضغطها قبل الرفع.');
    const prepared = await prepareImage(file);
    const base = slugify(state.draftImageName) || `project-${state.draft.id}`;
    const fullPath = `assets/projects/${base}.jpg`;
    const smallPath = `assets/projects/${base}-900.jpg`;

    state.pendingUploads.set(fullPath, prepared.full);
    state.pendingUploads.set(smallPath, prepared.small);

    state.draft.image = fullPath;
    state.draft.imageSmall = smallPath;
    state.draft.width = prepared.width;
    state.draft.height = prepared.height;
    if (!state.draft.alt) state.draft.alt = `${state.draft.title || 'مشروع'} — ${state.draft.tag || ''}`.trim();

    state.draftPreview = URL.createObjectURL(prepared.fullBlob);
    renderProjectForm();
    toast('تم تجهيز الصورة — اضغط «تأكيد المشروع» ثم «حفظ ونشر».', 'ok');
  } catch (error) {
    toast(error.message || 'تعذّر تجهيز الصورة', 'err');
  }
}

async function attachVideo(file) {
  try {
    if (file.size > MAX_VIDEO) {
      throw new Error('الفيديو أكبر من 8MB. ارفعه على يوتيوب (غير مدرج) واستخدم رابط يوتيوب.');
    }
    const base = slugify(state.draftImageName) || `project-${state.draft.id}`;
    const path = `assets/projects/${base}.mp4`;
    const buffer = await file.arrayBuffer();
    state.pendingUploads.set(path, base64FromBuffer(buffer));
    state.draft.video = path;
    state.draft.youtube = '';
    state.draft.isVideo = true;
    renderProjectForm();
    toast('تم تجهيز الفيديو.', 'ok');
  } catch (error) {
    toast(error.message || 'تعذّر تجهيز الفيديو', 'err');
  }
}

async function prepareImage(file) {
  const bitmap = await createImageBitmap(file);
  const make = (maxWidth) => {
    const scale = Math.min(1, maxWidth / bitmap.width, maxWidth / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve({ blob, width, height }) : reject(new Error('فشل الضغط'))),
        'image/jpeg',
        0.85
      );
    });
  };

  const full = await make(1600);
  const small = await make(900);
  const fullB64 = base64FromBuffer(await full.blob.arrayBuffer());
  const smallB64 = base64FromBuffer(await small.blob.arrayBuffer());
  bitmap.close?.();

  return {
    full: fullB64,
    small: smallB64,
    width: full.width,
    height: full.height,
    fullBlob: full.blob,
  };
}

function base64FromBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function saveProjectDraft() {
  const draft = state.draft;
  if (!draft.title.trim()) return toast('اسم المشروع مطلوب', 'err');
  if (!draft.image) return toast('صورة الغلاف مطلوبة', 'err');
  if (!draft.alt.trim()) return toast('النص البديل (Alt) مطلوب لمحركات البحث', 'err');
  if (!draft.isVideo && (draft.video || draft.youtube)) draft.isVideo = true;
  if (draft.isVideo && !draft.video && !draft.youtube) {
    draft.isVideo = false;
  }

  if (state.draftIndex < 0) {
    state.projects.push(clone(draft));
  } else {
    state.projects[state.draftIndex] = clone(draft);
  }

  closeProjectModal();
  markDirty();
  renderProjects();
  toast('تم تحديث المشروع. اضغط «حفظ ونشر» لتطبيقه على الموقع.', 'ok');
}

function deleteProject(index) {
  const project = state.projects[index];
  if (!project) return;
  if (!confirm(`حذف مشروع «${project.title}»؟`)) return;

  const stillUsed = (path) => state.projects.some((p, i) => i !== index && p.image === path);
  if (project.image && !stillUsed(project.image)) state.pendingDeletes.add(project.image);
  if (project.imageSmall && !stillUsed(project.imageSmall)) state.pendingDeletes.add(project.imageSmall);
  if (project.video) state.pendingDeletes.add(project.video);

  state.projects.splice(index, 1);
  markDirty();
  renderProjects();
  toast('تم حذف المشروع من القائمة. اضغط «حفظ ونشر» للتأكيد.', 'ok');
}

/* ---------------- نصوص الموقع ---------------- */
const TEXT_GROUPS = [
  {
    id: 'meta',
    title: 'عنوان ووصف الموقع (SEO)',
    hint: 'تظهر في نتائج جوجل وروابط المشاركة',
    fields: [
      ['meta.title', 'عنوان الصفحة', 'text'],
      ['meta.description', 'وصف الصفحة', 'textarea'],
      ['meta.ogTitle', 'عنوان المشاركة', 'text'],
      ['meta.ogDescription', 'وصف المشاركة', 'textarea'],
      ['meta.ogImage', 'صورة المشاركة', 'text'],
    ],
  },
  {
    id: 'hero',
    title: 'قسم البداية (Hero)',
    fields: [
      ['hero.availability', 'شارة التوفر', 'text'],
      ['hero.agencyLabel', 'اسم الوكالة في الشارة', 'text'],
      ['hero.role', 'المسمى الوظيفي', 'text'],
      ['hero.name', 'الاسم', 'text'],
      ['hero.taglinePrefix', 'بداية الجملة', 'text'],
      ['hero.taglineAccent', 'الجملة الملوّنة', 'text'],
      ['hero.lead', 'النص التعريفي', 'textarea'],
      ['hero.roleFallback', 'سطر الدور بدون جافاسكريبت', 'text'],
      ['hero.specialty', 'نص التخصص لقارئ الشاشة', 'text'],
      ['hero.location', 'المكان', 'text'],
      ['hero.experiencePrefix', 'نص الخبرة', 'text'],
      ['hero.behancePrefix', 'نص بيهانس', 'text'],
      ['hero.remote', 'نص العمل عن بُعد', 'text'],
      ['hero.ctaWork', 'زر الأعمال', 'text'],
      ['hero.ctaContact', 'زر التواصل', 'text'],
    ],
  },
  {
    id: 'brand',
    title: 'الهوية والروابط',
    fields: [
      ['brand.name', 'الاسم الظاهر', 'text'],
      ['brand.firstName', 'الاسم الأول', 'text'],
      ['brand.jobTitle', 'المسمى', 'text'],
      ['brand.location', 'المدينة', 'text'],
      ['brand.initials', 'الحروف المختصرة', 'text'],
      ['brand.careerStart', 'سنة بداية المسيرة', 'number'],
      ['brand.behanceSince', 'سنة الانضمام لبيهانس', 'text'],
    ],
  },
  {
    id: 'contact',
    title: 'بيانات التواصل',
    fields: [
      ['contact.email', 'البريد الإلكتروني', 'text'],
      ['contact.whatsapp', 'واتساب (أرقام فقط)', 'text'],
      ['contact.behance', 'رابط بيهانس', 'text'],
      ['contact.facebook', 'رابط فيسبوك', 'text'],
      ['contact.twitter', 'رابط إكس', 'text'],
      ['contact.agencyUrl', 'رابط الوكالة', 'text'],
    ],
  },
  {
    id: 'about',
    title: 'قسم النبذة',
    fields: [
      ['about.eyebrow', 'العنوان الصغير', 'text'],
      ['about.title', 'العنوان الرئيسي', 'text'],
      ['about.p1a', 'الفقرة الأولى (قبل الاسم)', 'textarea'],
      ['about.p1strong', 'الاسم المميز', 'text'],
      ['about.p1b', 'الفقرة الأولى (بعد الاسم)', 'textarea'],
      ['about.p2', 'الفقرة الثانية', 'textarea'],
      ['about.quoteA', 'الاقتباس (البداية)', 'text'],
      ['about.quoteMark', 'الاقتباس (المميز)', 'text'],
      ['about.quoteB', 'الاقتباس (النهاية)', 'text'],
      ['about.signName', 'اسم التوقيع', 'text'],
      ['about.signRole', 'صفة التوقيع', 'text'],
      ['about.agencyTitle', 'عنوان بطاقة الوكالة', 'text'],
      ['about.agencyTagline', 'وصف الوكالة بالإنجليزي', 'text'],
      ['about.agencyDesc', 'وصف الوكالة', 'textarea'],
      ['about.agencyCta', 'زر الوكالة', 'text'],
      ['about.toolsTitle', 'عنوان الأدوات', 'text'],
      ['about.skillsTitle', 'عنوان المهارات', 'text'],
      ['about.behanceCta', 'رابط بيهانس', 'text'],
    ],
  },
  {
    id: 'work',
    title: 'قسم الأعمال',
    fields: [
      ['workSection.eyebrow', 'العنوان الصغير', 'text'],
      ['workSection.title', 'العنوان', 'text'],
      ['workSection.lead', 'الوصف', 'textarea'],
      ['workSection.note', 'ملاحظة العدد', 'text'],
      ['workSection.empty', 'نص عدم وجود نتائج', 'text'],
      ['workSection.noscript', 'نص بدون جافاسكريبت', 'textarea'],
      ['workSection.behanceLink', 'نص رابط بيهانس', 'text'],
    ],
  },
  {
    id: 'contactSection',
    title: 'قسم التواصل والنموذج',
    fields: [
      ['contactSection.eyebrow', 'العنوان الصغير', 'text'],
      ['contactSection.title', 'العنوان', 'text'],
      ['contactSection.lead', 'الوصف', 'textarea'],
      ['contactSection.formTitle', 'عنوان النموذج', 'text'],
      ['contactSection.formBadge', 'شارة الرد', 'text'],
      ['contactSection.submitWhatsapp', 'زر واتساب', 'text'],
      ['contactSection.submitEmail', 'زر البريد', 'text'],
      ['contactSection.formNote', 'ملاحظة أسفل النموذج', 'textarea'],
    ],
  },
  {
    id: 'form',
    title: 'حقول النموذج',
    fields: [
      ['form.nameLabel', 'اسم الحقل — الاسم', 'text'],
      ['form.namePlaceholder', 'Placeholder — الاسم', 'text'],
      ['form.phoneLabel', 'اسم الحقل — الهاتف', 'text'],
      ['form.phonePlaceholder', 'Placeholder — الهاتف', 'text'],
      ['form.emailLabel', 'اسم الحقل — البريد', 'text'],
      ['form.emailPlaceholder', 'Placeholder — البريد', 'text'],
      ['form.serviceLabel', 'اسم الحقل — الخدمة', 'text'],
      ['form.servicePlaceholder', 'Placeholder — الخدمة', 'text'],
      ['form.messageLabel', 'اسم الحقل — التفاصيل', 'text'],
      ['form.messagePlaceholder', 'Placeholder — التفاصيل', 'text'],
    ],
  },
  {
    id: 'footer',
    title: 'التذييل',
    fields: [
      ['footer.about', 'نبذة التذييل', 'textarea'],
      ['footer.navTitle', 'عنوان التنقل', 'text'],
      ['footer.socialTitle', 'عنوان المتابعة', 'text'],
      ['footer.aboutLink', 'رابط نبذة', 'text'],
      ['footer.servicesLink', 'رابط الخدمات', 'text'],
      ['footer.workLink', 'رابط الأعمال', 'text'],
      ['footer.processLink', 'رابط الطريقة', 'text'],
      ['footer.contactLink', 'رابط تواصل', 'text'],
      ['footer.madeIn', 'سطر الصنع', 'text'],
      ['footer.rights', 'حقوق النشر', 'text'],
    ],
  },
  {
    id: 'nav',
    title: 'شريط التنقل',
    fields: [
      ['nav.about', 'نبذة', 'text'],
      ['nav.services', 'الخدمات', 'text'],
      ['nav.work', 'الأعمال', 'text'],
      ['nav.process', 'الطريقة', 'text'],
      ['nav.contact', 'تواصل', 'text'],
      ['nav.cta', 'زر لنعمل معًا', 'text'],
    ],
  },
];

const SITE_LISTS = {
  services: {
    title: 'الخدمات',
    hint: 'بطاقات قسم الخدمات في الصفحة الرئيسية',
    path: 'services',
    itemTitle: (item, i) => item.title || `خدمة ${i + 1}`,
    fields: [
      ['title', 'العنوان'],
      ['desc', 'الوصف', 'textarea'],
      ['icon', 'الأيقونة', 'text'],
      ['link', 'رابط صفحة الخدمة', 'text'],
      ['linkLabel', 'نص الرابط', 'text'],
    ],
    template: { title: '', desc: '', icon: 'i-compass', link: '', linkLabel: '' },
  },
  process: {
    title: 'خطوات العمل',
    path: 'process',
    itemTitle: (item, i) => item.title || `خطوة ${i + 1}`,
    fields: [
      ['title', 'العنوان'],
      ['desc', 'الوصف', 'textarea'],
    ],
    template: { title: '', desc: '' },
  },
  faq: {
    title: 'الأسئلة الشائعة',
    path: 'faq',
    itemTitle: (item) => item.q || 'سؤال',
    fields: [
      ['q', 'السؤال'],
      ['a', 'الإجابة', 'textarea'],
    ],
    template: { q: '', a: '' },
  },
  channels: {
    title: 'قنوات التواصل',
    path: 'channels',
    itemTitle: (item) => item.label || item.type,
    fields: [
      ['type', 'النوع (email / whatsapp / behance / facebook)'],
      ['label', 'الاسم الظاهر'],
      ['value', 'النص الظاهر'],
    ],
    template: { type: 'whatsapp', label: '', value: '' },
  },
};

function fieldRow(label, path, type = 'text') {
  const value = getPath(state.site, path);
  if (type === 'textarea') {
    return `<label class="field-row"><span>${h(label)}</span><textarea data-path="${h(path)}" rows="3">${h(value)}</textarea></label>`;
  }
  return `<label class="field-row"><span>${h(label)}</span><input type="${type === 'number' ? 'number' : 'text'}" data-path="${h(path)}" value="${h(value)}"${type === 'number' ? ' step="1"' : ''}></label>`;
}

function listEditor(config) {
  const items = getPath(state.site, config.path) || [];
  const cards = items
    .map(
      (item, index) => `
      <div class="item-card">
        <div class="item-card__head">
          <b>${h(config.itemTitle(item, index))}</b>
          <div class="actions">
            <button class="icon-btn" type="button" data-list-move="${config.path}.${index}" data-dir="-1" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button class="icon-btn" type="button" data-list-move="${config.path}.${index}" data-dir="1" ${index === items.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="icon-btn" type="button" data-list-remove="${config.path}.${index}" title="حذف">✕</button>
          </div>
        </div>
        <div class="item-grid">
          ${config.fields
            .map(
              ([key, label, type]) => `
              <label class="mini-field${type === 'textarea' ? ' wide' : ''}">
                <span>${h(label)}</span>
                ${
                  type === 'textarea'
                    ? `<textarea data-path="${config.path}.${index}.${key}" rows="2">${h(item[key] || '')}</textarea>`
                    : `<input type="text" data-path="${config.path}.${index}.${key}" value="${h(item[key] || '')}">`
                }
              </label>`
            )
            .join('')}
        </div>
      </div>`
    )
    .join('');

  return `<div class="list-editor">${cards}
    <button class="btn btn--ghost btn--sm add-btn" type="button" data-list-add="${config.path}">+ إضافة</button>
  </div>`;
}

function statsEditor() {
  const stats = state.site.stats || [];
  const rows = stats
    .map(
      (stat, index) => `
      <div class="item-card">
        <div class="item-grid">
          <label class="mini-field">
            <span>التسمية</span>
            <input type="text" data-path="stats.${index}.label" value="${h(stat.label || '')}">
          </label>
          <label class="mini-field">
            <span>اللاحقة</span>
            <input type="text" data-path="stats.${index}.suffix" value="${h(stat.suffix || '')}" dir="ltr">
          </label>
          ${
            stat.key && !['projects', 'clients'].includes(stat.key)
              ? '<p class="hint" style="grid-column:1/-1">يُحسب تلقائيًا</p>'
              : `<label class="mini-field">
                  <span>القيمة</span>
                  <input type="number" data-path="stats.${index}.value" value="${h(stat.value || 0)}">
                </label>`
          }
        </div>
      </div>`
    )
    .join('');
  return `<div class="list-editor">${rows}</div>`;
}

function categoriesEditor() {
  const categories = state.site.categories || [];
  const rows = categories
    .map(
      (cat, index) => `
      <div class="item-card">
        <div class="item-grid">
          <label class="mini-field">
            <span>المعرّف</span>
            <input type="text" value="${h(cat.id)}" dir="ltr" disabled>
          </label>
          <label class="mini-field">
            <span>الاسم الظاهر</span>
            <input type="text" data-path="categories.${index}.label" value="${h(cat.label)}">
          </label>
        </div>
      </div>`
    )
    .join('');
  return `<div class="list-editor">${rows}</div>`;
}

function linesEditor(label, path) {
  const value = getPath(state.site, path) || [];
  return `<label class="field-row"><span>${h(label)} <em>كل عنصر في سطر</em></span>
    <textarea data-path="${h(path)}" data-lines="1" rows="4">${h(value.join('\n'))}</textarea>
  </label>`;
}

function renderTexts() {
  const panel = $('#panel-texts');
  const groups = TEXT_GROUPS.map(
    (group) => `
    <details class="group">
      <summary>${h(group.title)}${group.hint ? `<small>${h(group.hint)}</small>` : ''}</summary>
      <div class="group__body">
        ${group.fields.map(([path, label, type]) => fieldRow(label, path, type)).join('')}
      </div>
    </details>`
  ).join('');

  const editableLists = ['services', 'process', 'faq', 'channels']
    .map(
      (key) => `
      <details class="group">
        <summary>${h(SITE_LISTS[key].title)}</summary>
        <div class="group__body">${listEditor(SITE_LISTS[key])}</div>
      </details>`
    )
    .join('');

  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <h2>نصوص الموقع</h2>
        <p>كل النصوص هنا. عدّل أي حقل واضغط «حفظ ونشر» — التغييرات تظهر بعد دقائق.</p>
      </div>
    </div>
    ${groups}
    <details class="group">
      <summary>أدوار الهيرو المتحركة</summary>
      <div class="group__body">${linesEditor('العبارات المتبادلة', 'hero.roles')}</div>
    </details>
    ${editableLists}
    <details class="group">
      <summary>الأرقام والإحصائيات</summary>
      <div class="group__body">${statsEditor()}</div>
    </details>
    <details class="group">
      <summary>المهارات والأدوات</summary>
      <div class="group__body">
        ${linesEditor('مجالات الخبرة', 'skills')}
        ${linesEditor('أدوات العمل', 'tools')}
      </div>
    </details>
    <details class="group">
      <summary>تصنيفات المشاريع</summary>
      <div class="group__body">${categoriesEditor()}</div>
    </details>
    <details class="group">
      <summary>خيارات نموذج التواصل</summary>
      <div class="group__body">${linesEditor('الخدمات في القائمة', 'form.serviceOptions')}</div>
    </details>
  `;

  bindEditors(panel, 'site');
}

/* ---------------- صفحات الخدمات ---------------- */
function pageField(page, index, label, path, type = 'text') {
  const value = getPath(page, path);
  return `<label class="field-row"><span>${h(label)}</span>${
    type === 'textarea'
      ? `<textarea data-scope="page" data-page="${index}" data-path="${h(path)}" rows="3">${h(value)}</textarea>`
      : `<input type="text" data-scope="page" data-page="${index}" data-path="${h(path)}" value="${h(value)}">`
  }</label>`;
}

function pageLines(page, index, label, path) {
  const value = getPath(page, path) || [];
  return `<label class="field-row"><span>${h(label)} <em>كل عنصر في سطر</em></span>
    <textarea data-scope="page" data-page="${index}" data-path="${h(path)}" data-lines="1" rows="5">${h(value.join('\n'))}</textarea>
  </label>`;
}

function pageList(page, index, path, label, items, fields) {
  const cards = (items || [])
    .map(
      (item, row) => `
      <div class="item-card">
        <div class="item-card__head">
          <b>${h(label)} ${row + 1}</b>
          <div class="actions">
            <button class="icon-btn" type="button" data-scope="page" data-page="${index}" data-list-move="${path}.${row}" data-dir="-1" ${row === 0 ? 'disabled' : ''}>↑</button>
            <button class="icon-btn" type="button" data-scope="page" data-page="${index}" data-list-move="${path}.${row}" data-dir="1" ${row === items.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="icon-btn" type="button" data-scope="page" data-page="${index}" data-list-remove="${path}.${row}" title="حذف">✕</button>
          </div>
        </div>
        <div class="item-grid">
          ${fields
            .map(
              ([key, fieldLabel, type]) => `
              <label class="mini-field${type === 'textarea' ? ' wide' : ''}">
                <span>${h(fieldLabel)}</span>
                ${
                  type === 'textarea'
                    ? `<textarea data-scope="page" data-page="${index}" data-path="${path}.${row}.${key}" rows="2">${h(item[key] || '')}</textarea>`
                    : `<input type="text" data-scope="page" data-page="${index}" data-path="${path}.${row}.${key}" value="${h(item[key] || '')}">`
                }
              </label>`
            )
            .join('')}
        </div>
      </div>`
    )
    .join('');

  return `<div class="list-editor">${cards}
    <button class="btn btn--ghost btn--sm add-btn" type="button" data-scope="page" data-page="${index}" data-list-add="${path}">+ إضافة</button>
  </div>`;
}

function renderPages() {
  const panel = $('#panel-pages');

  const blocks = state.pages
    .map(
      (page, index) => `
      <details class="group"${index === 0 ? ' open' : ''}>
        <summary>${h(page.navLabel)} <small>${h(page.slug)}</small></summary>
        <div class="group__body">
          <h4 style="margin:.8rem 0 .2rem;color:var(--cyan);font-size:.82rem">البيانات التعريفية</h4>
          ${pageField(page, index, 'عنوان الصفحة', 'title')}
          ${pageField(page, index, 'وصف الصفحة', 'description', 'textarea')}
          ${pageField(page, index, 'عنوان المشاركة', 'ogTitle')}
          ${pageField(page, index, 'وصف المشاركة', 'ogDescription', 'textarea')}

          <h4 style="margin:.9rem 0 .2rem;color:var(--cyan);font-size:.82rem">الهيرو</h4>
          ${pageField(page, index, 'العنوان الرئيسي H1', 'h1')}
          ${pageField(page, index, 'النص التعريفي', 'lead', 'textarea')}
          ${pageField(page, index, 'زر واتساب', 'heroCta')}

          <h4 style="margin:.9rem 0 .2rem;color:var(--cyan);font-size:.82rem">قسم الخدمة</h4>
          ${pageField(page, index, 'العنوان الصغير', 'service.eyebrow')}
          ${pageField(page, index, 'العنوان', 'service.title')}
          ${pageField(page, index, 'المقدمة', 'service.intro', 'textarea')}
          ${pageLines(page, index, 'عناصر الخدمة', 'service.items')}

          <h4 style="margin:.9rem 0 .2rem;color:var(--cyan);font-size:.82rem">خطوات العمل</h4>
          ${pageField(page, index, 'العنوان', 'process.title')}
          ${pageList(page, index, 'process.steps', 'خطوة', page.process.steps, [
            ['title', 'العنوان'],
            ['desc', 'الوصف', 'textarea'],
          ])}

          <h4 style="margin:.9rem 0 .2rem;color:var(--cyan);font-size:.82rem">لمن الخدمة</h4>
          ${pageField(page, index, 'العنوان', 'audience.title')}
          ${pageList(page, index, 'audience.cards', 'بطاقة', page.audience.cards, [
            ['title', 'العنوان'],
            ['desc', 'الوصف', 'textarea'],
          ])}

          <h4 style="margin:.9rem 0 .2rem;color:var(--cyan);font-size:.82rem">معرض الأعمال</h4>
          ${pageField(page, index, 'العنوان', 'gallery.title')}
          ${pageField(page, index, 'المقدمة', 'gallery.intro', 'textarea')}
          ${pageList(page, index, 'gallery.items', 'عمل', page.gallery.items, [
            ['title', 'الاسم'],
            ['image', 'مسار الصورة'],
            ['alt', 'النص البديل'],
          ])}

          <h4 style="margin:.9rem 0 .2rem;color:var(--cyan);font-size:.82rem">الأسئلة الشائعة</h4>
          ${pageField(page, index, 'العنوان', 'faq.title')}
          ${pageList(page, index, 'faq.items', 'سؤال', page.faq.items, [
            ['q', 'السؤال'],
            ['a', 'الإجابة', 'textarea'],
          ])}

          <h4 style="margin:.9rem 0 .2rem;color:var(--cyan);font-size:.82rem">دعوة الإجراء</h4>
          ${pageField(page, index, 'العنوان', 'cta.title')}
          ${pageField(page, index, 'النص', 'cta.text', 'textarea')}
        </div>
      </details>`
    )
    .join('');

  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <h2>صفحات الخدمات</h2>
        <p>صفحتا الموشن جرافيك والهوية البصرية. كل تعديل هنا يُعاد بناؤه تلقائيًا مع الحفاظ على SEO.</p>
      </div>
    </div>
    ${blocks}
  `;

  bindEditors(panel, 'pages');
}

/* ---------------- ربط المحرّرات ---------------- */
function bindEditors(panel, scope) {
  if (panel.dataset.bound) return;
  panel.dataset.bound = '1';

  panel.addEventListener('input', (event) => {
    const target = event.target;
    const path = target.dataset.path;
    if (!path) return;
    let root;
    if (target.dataset.scope === 'page') root = state.pages[Number(target.dataset.page)];
    else root = state.site;

    let value = target.value;
    if (target.dataset.lines) {
      value = value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }
    setPath(root, path, value);
    markDirty();
  });

  panel.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;

    const isPage = target.dataset.scope === 'page';
    const root = isPage ? state.pages[Number(target.dataset.page)] : state.site;

    if (target.dataset.listAdd) {
      const path = target.dataset.listAdd;
      const arr = getPath(root, path) || [];
      let template = { title: '', desc: '' };
      if (!isPage) {
        const config = Object.values(SITE_LISTS).find((entry) => entry.path === path);
        if (config) template = clone(config.template);
      }
      arr.push(clone(template));
      setPath(root, path, arr);
      markDirty();
      isPage ? renderPages() : renderTexts();
      return;
    }

    if (target.dataset.listRemove) {
      const path = target.dataset.listRemove;
      const parts = path.split('.');
      const index = Number(parts.pop());
      const arr = getPath(root, parts.join('.')) || [];
      arr.splice(index, 1);
      markDirty();
      isPage ? renderPages() : renderTexts();
      return;
    }

    if (target.dataset.listMove) {
      const path = target.dataset.listMove;
      const parts = path.split('.');
      const index = Number(parts.pop());
      const arr = getPath(root, parts.join('.')) || [];
      const next = index + Number(target.dataset.dir);
      if (next < 0 || next >= arr.length) return;
      const [item] = arr.splice(index, 1);
      arr.splice(next, 0, item);
      markDirty();
      isPage ? renderPages() : renderTexts();
    }
  });
}

/* ---------------- الإعدادات ---------------- */
function renderSettings() {
  const panel = $('#panel-settings');
  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <h2>الإعدادات</h2>
        <p>الاتصال بالمستودع، حالة النشر، وإدارة الجلسة.</p>
      </div>
    </div>

    <div class="settings-grid">
      <div class="card">
        <h3>الاتصال</h3>
        <div class="kv">
          <span>المستخدم: <b>@${h(state.user ? state.user.login : '')}</b></span>
          <span>المستودع: <b dir="ltr">${h(state.owner)}/${h(state.repo)}</b></span>
          <span>الفرع: <b dir="ltr">${h(state.branch)}</b></span>
        </div>
        <button class="btn btn--ghost btn--sm" type="button" id="reloadBtn">إعادة تحميل المحتوى</button>
      </div>

      <div class="card">
        <h3>النشر</h3>
        <p>بعد الحفظ يبني GitHub الموقع تلقائيًا وينشره خلال 2–5 دقائق تقريبًا.</p>
        <div class="deploy" id="deployStatusSettings">لم يتم الفحص بعد</div>
        <button class="btn btn--ghost btn--sm" type="button" id="checkDeployBtn">تحديث الحالة</button>
        <a class="btn btn--ghost btn--sm" href="https://github.com/${h(state.owner)}/${h(state.repo)}/actions" target="_blank" rel="noopener">سجل النشر</a>
      </div>

      <div class="card">
        <h3>الأمان</h3>
        <p>التوكن محفوظ في هذا المتصفح فقط. لو فقدته أو شككت في تسريبه، اعمل Revoke من GitHub وأنشئ واحدًا جديدًا.</p>
        <button class="btn btn--danger btn--sm" type="button" id="logoutBtn2">تسجيل الخروج</button>
      </div>
    </div>
  `;

  $('#reloadBtn').addEventListener('click', reloadContent);
  $('#checkDeployBtn').addEventListener('click', () => checkDeploy(true));
  $('#logoutBtn2').addEventListener('click', logout);
}

async function reloadContent() {
  try {
    state.pendingUploads.clear();
    state.pendingDeletes.clear();
    state.dirty = false;
    $('#saveBtn').disabled = true;
    await loadContent();
    renderAll();
    toast('تم تحميل أحدث نسخة من المستودع.', 'ok');
  } catch (error) {
    toast(`تعذّر التحميل: ${error.message}`, 'err');
  }
}

/* ---------------- النشر ---------------- */
async function checkDeploy(manual = false) {
  const chips = [$('#deployStatus'), $('#deployStatusSettings')].filter(Boolean);
  try {
    const runs = await api(
      `/repos/${state.owner}/${state.repo}/actions/runs?branch=${encodeURIComponent(state.branch)}&per_page=1`
    );
    const run = runs.workflow_runs && runs.workflow_runs[0];
    if (!run) {
      chips.forEach((chip) => {
        chip.hidden = false;
        chip.className = 'deploy';
        chip.textContent = 'لا يوجد نشر بعد';
      });
      return;
    }

    const map = {
      queued: 'في الانتظار…',
      in_progress: 'جاري البناء والنشر…',
      completed: run.conclusion === 'success' ? 'تم النشر بنجاح' : 'فشل النشر',
    };
    const label = map[run.status] || run.status;
    const cls = run.status === 'completed' ? (run.conclusion === 'success' ? 'is-ok' : 'is-err') : '';
    chips.forEach((chip) => {
      chip.hidden = false;
      chip.className = `deploy ${cls}`;
      chip.textContent = label;
    });

    if (run.status === 'queued' || run.status === 'in_progress') {
      clearTimeout(state.pollTimer);
      state.pollTimer = setTimeout(() => checkDeploy(), 15000);
    } else if (manual) {
      toast(label, cls === 'is-ok' ? 'ok' : 'err');
    }
  } catch (error) {
    if (manual) toast(`تعذّر قراءة الحالة: ${error.message}`, 'err');
  }
}

/* ---------------- الحفظ والالتزام ---------------- */
async function saveAll() {
  const button = $('#saveBtn');
  button.disabled = true;
  button.textContent = 'جاري الحفظ…';

  try {
    const files = CONTENT_FILES.map((path) => {
      const data =
        path.endsWith('site.json')
          ? state.site
          : path.endsWith('projects.json')
            ? state.projects
            : state.pages;
      return { path, text: JSON.stringify(data, null, 2) + '\n' };
    });

    state.pendingUploads.forEach((base64, path) => {
      files.push({ path, base64 });
    });

    const deletions = Array.from(state.pendingDeletes).filter(
      (path) => !state.pendingUploads.has(path)
    );

    const message = `تحديث الموقع من لوحة التحكم — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
    await commitFiles(files, deletions, message);

    state.pendingUploads.clear();
    state.pendingDeletes.clear();
    state.dirty = false;
    await loadContent();
    renderAll();
    toast('تم الحفظ. GitHub يبني الموقع الآن — تابع الحالة بالأعلى.', 'ok');
    setTimeout(() => checkDeploy(), 4000);
  } catch (error) {
    toast(`فشل الحفظ: ${error.message}`, 'err');
    button.disabled = false;
  } finally {
    button.textContent = 'حفظ ونشر';
    if (!state.dirty) button.disabled = true;
  }
}

async function commitFiles(files, deletions, message) {
  const ref = await api(`/git/ref/heads/${encodeURIComponent(state.branch)}`);
  const base = await api(`/git/commits/${ref.object.sha}`);

  const blobs = [];
  for (const file of files) {
    const blob = await api('/git/blobs', {
      method: 'POST',
      body: JSON.stringify(
        file.base64
          ? { content: file.base64, encoding: 'base64' }
          : { content: file.text, encoding: 'utf-8' }
      ),
    });
    blobs.push(blob.sha);
  }

  const tree = files.map((file, index) => ({
    path: file.path,
    mode: '100644',
    type: 'blob',
    sha: blobs[index],
  }));
  deletions.forEach((path) => {
    tree.push({ path, mode: '100644', type: 'blob', sha: null });
  });

  const newTree = await api('/git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: base.tree.sha, tree }),
  });

  const commit = await api('/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message, tree: newTree.sha, parents: [base.sha] }),
  });

  await api(`/git/refs/heads/${encodeURIComponent(state.branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return commit;
}

/* ---------------- التهيئة ---------------- */
function bindGlobal() {
  $('#loginForm').addEventListener('submit', login);
  $('#logoutBtn').addEventListener('click', logout);
  $('#saveBtn').addEventListener('click', saveAll);
  $('#projectSaveBtn').addEventListener('click', saveProjectDraft);

  $$('.tab').forEach((btn) =>
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      if (btn.dataset.tab === 'settings') renderSettings();
    })
  );

  $$('[data-close-modal]').forEach((node) => node.addEventListener('click', closeProjectModal));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('#projectModal').hidden) closeProjectModal();
  });

  window.addEventListener('beforeunload', (event) => {
    if (state.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}

async function init() {
  bindGlobal();

  state.token = localStorage.getItem(LS.token) || '';
  state.owner = localStorage.getItem(LS.owner) || state.owner;
  state.repo = localStorage.getItem(LS.repo) || state.repo;

  $('#ownerInput').value = state.owner;
  $('#repoInput').value = state.repo;

  if (!state.token) return;

  try {
    $('#loginError').textContent = 'جاري استعادة الجلسة…';
    state.user = await api('/user');
    const repoInfo = await api(`/repos/${state.owner}/${state.repo}`);
    state.branch = repoInfo.default_branch || 'main';
    await loadContent();
    $('#loginError').textContent = '';
    showApp(repoInfo);
  } catch (error) {
    $('#loginError').textContent = '';
    state.token = '';
    localStorage.removeItem(LS.token);
  }
}

document.addEventListener('DOMContentLoaded', init);
