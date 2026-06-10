// ===== utils =====
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

// ===== state =====
let DATA = { text: [], image_text: [], video: [] };

// ===== render =====
function renderAll() {
  renderText();
  renderImageText();
  renderVideo();
  $('#stat-text').textContent = (DATA.text || []).length;
  $('#stat-image').textContent = (DATA.image_text || []).length;
  $('#stat-video').textContent = (DATA.video || []).length;
  const empty = !((DATA.text || []).length || (DATA.image_text || []).length || (DATA.video || []).length);
  $('#empty').classList.toggle('hidden', !empty);
}

function renderText() {
  const grid = $('#grid-text');
  const items = DATA.text || [];
  if (!items.length) {
    grid.innerHTML = '<p class="empty">今天还没有文字内容 ☕️</p>';
    return;
  }
  grid.innerHTML = items
    .map(
      (it) => `
      <article class="card-text" data-id="${escapeHtml(it.id)}" data-type="text">
        <div class="quote">${escapeHtml(it.body || it.title)}</div>
        <div class="author">— ${escapeHtml(it.author || it.source || '佚名')}</div>
        <div class="tags">${(it.tags || []).slice(0, 3).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      </article>`
    )
    .join('');
}

function bindImageFallback(img) {
  const fb = img.dataset.fallback;
  let stage = 0; // 0 = primary, 1 = fallback, 2 = hide
  img.addEventListener('error', () => {
    if (stage === 0 && fb) {
      stage = 1;
      img.src = fb;
    } else if (stage === 1) {
      stage = 2;
      img.style.display = 'none';
    }
  });
}

function renderImageText() {
  const grid = $('#grid-image_text');
  const items = DATA.image_text || [];
  if (!items.length) {
    grid.innerHTML = '<p class="empty">今天还没有图文内容 ☕️</p>';
    return;
  }
  grid.innerHTML = items
    .map(
      (it) => `
      <article class="card-media" data-id="${escapeHtml(it.id)}" data-type="image_text">
        <div class="thumb">
          <img src="${escapeHtml(it.image || '')}" alt="${escapeHtml(it.title || '')}" loading="lazy"
               data-fallback="${escapeHtml(it.fallbackImage || '')}" />
        </div>
        <div class="body">
          <h3>${escapeHtml(it.title || '')}</h3>
          <p>${escapeHtml(it.desc || it.body || '')}</p>
          <div class="meta">
            <span>📷 ${escapeHtml(it.source || '')}</span>
            <span>${formatTime(it.publishedAt)}</span>
          </div>
        </div>
      </article>`
    )
    .join('');
  $$('#grid-image_text img').forEach(bindImageFallback);
}

function renderVideo() {
  const grid = $('#grid-video');
  const items = DATA.video || [];
  if (!items.length) {
    grid.innerHTML = '<p class="empty">今天还没有视频内容 ☕️</p>';
    return;
  }
  grid.innerHTML = items
    .map(
      (it) => `
      <article class="card-media" data-id="${escapeHtml(it.id)}" data-type="video">
        <div class="thumb">
          <img src="${escapeHtml(it.image || '')}" alt="${escapeHtml(it.title || '')}" loading="lazy"
               data-fallback="${escapeHtml(it.fallbackImage || '')}" />
          <div class="play">▶</div>
        </div>
        <div class="body">
          <h3>${escapeHtml(it.title || '')}</h3>
          <p>${escapeHtml(it.desc || it.body || '')}</p>
          <div class="meta">
            <span>🎬 ${escapeHtml(it.source || '')}</span>
            <span>${formatTime(it.publishedAt)}</span>
          </div>
        </div>
      </article>`
    )
    .join('');
  $$('#grid-video img').forEach(bindImageFallback);
}

// ===== tabs =====
function setupTabs() {
  $$('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      $$('.tab').forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      $$('.panel').forEach((p) => {
        p.classList.toggle('active', p.id === `panel-${cat}`);
      });
      const el = $(`#panel-${cat}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ===== modal =====
function findItem(id, type) {
  const list = DATA[type] || [];
  return list.find((x) => x.id === id) || list[0];
}

function openTextModal(item) {
  $('#modal-title').textContent = item.title || '';
  $('#modal-source').textContent = item.source ? `来源 · ${item.source}` : '';
  $('#modal-time').textContent = formatTime(item.publishedAt);
  $('#modal-body').textContent = item.body || item.desc || '';
  $('#modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function openVideoModal(item) {
  if (!item.embed) {
    if (item.url) window.open(item.url, '_blank', 'noopener');
    return;
  }
  const sep = item.embed.includes('?') ? '&' : '?';
  $('#video-frame').src = item.embed + sep + 'autoplay=1';
  $('#video-title').textContent = item.title || '';
  $('#video-desc').textContent = item.desc || item.body || '';
  $('#video-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(which) {
  if (!which || which === 'modal') {
    $('#modal').classList.add('hidden');
  }
  if (!which || which === 'video-modal') {
    $('#video-modal').classList.add('hidden');
    $('#video-frame').src = '';
  }
  document.body.style.overflow = '';
}

function setupModal() {
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.card-text, .card-media');
    if (!card) return;
    const id = card.dataset.id;
    const type = card.dataset.type;
    const item = findItem(id, type);
    if (!item) return;
    if (type === 'video') openVideoModal(item);
    else openTextModal(item);
  });
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ===== today =====
function setToday() {
  const d = new Date();
  const wk = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  $('#today').textContent = `${d.getMonth() + 1}月${d.getDate()}日 周${wk}`;
}

// ===== load =====
async function load() {
  try {
    const r = await fetch('/api/contents', { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('http ' + r.status);
    const data = await r.json();
    DATA = {
      text: data.text || [],
      image_text: data.image_text || [],
      video: data.video || []
    };
    if (data.updatedAt) {
      const t = new Date(data.updatedAt);
      if (!isNaN(t)) {
        $('#updatedAt').textContent =
          `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
      }
    }
    renderAll();
  } catch (err) {
    console.error('load contents failed', err);
    $('#empty').textContent = '加载失败,刷新试试 🌷';
    $('#empty').classList.remove('hidden');
  }
}

// ===== boot =====
setToday();
setupTabs();
setupModal();
load();
