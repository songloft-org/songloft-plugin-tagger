// songloft-plugin-tagger 前端逻辑

const P = () => window.SongloftPlugin;

const api = {
  get: (path) => P().apiGet(path),
  post: (path, body) => P().apiPost(path, body),
};

// DOM refs
const statTags = document.getElementById('stat-tags');
const statBindings = document.getElementById('stat-bindings');
const fieldSelect = document.getElementById('field-select');
const btnPreview = document.getElementById('btn-preview');
const btnGenerate = document.getElementById('btn-generate');
const generateResult = document.getElementById('generate-result');
const importInput = document.getElementById('import-input');
const btnImport = document.getElementById('btn-import');
const importResult = document.getElementById('import-result');

// ============================================================================
// 统计
// ============================================================================

async function loadStats() {
  const data = await api.get('/api/stats');
  if (data) {
    statTags.textContent = data.totalTags ?? 0;
    statBindings.textContent = data.totalBindings ?? 0;
  }
}

// ============================================================================
// 按元数据生成
// ============================================================================

function showResult(el, type, content) {
  el.className = 'result-box ' + type;
  el.innerHTML = content;
}

btnPreview.addEventListener('click', async () => {
  const field = fieldSelect.value;
  btnPreview.disabled = true;
  btnPreview.textContent = '预览中...';
  generateResult.className = 'result-box hidden';

  try {
    const data = await api.post('/api/generate-by-field', { field, dryRun: true });
    if (!data || !data.tags || data.tags.length === 0) {
      showResult(generateResult, 'info', '未找到可生成的标签（该字段为空）');
      return;
    }
    const sorted = data.tags.sort((a, b) => b.count - a.count);
    const items = sorted.slice(0, 30).map(
      t => `<li><span class="tag-name">${escHtml(t.name)}</span><span class="tag-count">${t.count} 首</span></li>`
    ).join('');
    const extra = sorted.length > 30 ? `\n...共 ${sorted.length} 个标签` : '';
    showResult(generateResult, 'info',
      `<ul class="preview-list">${items}</ul>${extra}`);
  } catch (e) {
    showResult(generateResult, 'error', '预览失败: ' + (e.message || e));
  } finally {
    btnPreview.disabled = false;
    btnPreview.textContent = '预览';
  }
});

btnGenerate.addEventListener('click', async () => {
  const field = fieldSelect.value;
  if (!confirm(`确定按「${fieldSelect.selectedOptions[0].text}」字段生成标签？`)) return;

  btnGenerate.disabled = true;
  btnGenerate.textContent = '执行中...';

  try {
    const data = await api.post('/api/generate-by-field', { field, dryRun: false });
    if (data) {
      showResult(generateResult, 'success',
        `✅ 完成: 新建 ${data.created} 个标签, 绑定 ${data.bound} 条关系 (共 ${data.totalTags} 个标签值)`);
      loadStats();
    }
  } catch (e) {
    showResult(generateResult, 'error', '执行失败: ' + (e.message || e));
  } finally {
    btnGenerate.disabled = false;
    btnGenerate.textContent = '执行';
  }
});

// ============================================================================
// JSON 导入
// ============================================================================

btnImport.addEventListener('click', async () => {
  const raw = importInput.value.trim();
  if (!raw) {
    showResult(importResult, 'error', '请粘贴 JSON 数据');
    return;
  }

  let items;
  try {
    items = JSON.parse(raw);
    if (!Array.isArray(items)) throw new Error('顶层必须是数组');
  } catch (e) {
    showResult(importResult, 'error', 'JSON 解析失败: ' + e.message);
    return;
  }

  btnImport.disabled = true;
  btnImport.textContent = '导入中...';
  importResult.className = 'result-box hidden';

  try {
    const data = await api.post('/api/import', { items });
    if (data) {
      showResult(importResult, 'success',
        `✅ 导入完成: 匹配 ${data.matched}/${data.total} 首, 绑定 ${data.bound} 条`);
      loadStats();
    }
  } catch (e) {
    showResult(importResult, 'error', '导入失败: ' + (e.message || e));
  } finally {
    btnImport.disabled = false;
    btnImport.textContent = '导入';
  }
});

// ============================================================================
// 歌单转标签
// ============================================================================

const playlistSelect = document.getElementById('playlist-select');
const btnConvert = document.getElementById('btn-convert');
const convertResult = document.getElementById('convert-result');

async function loadPlaylists() {
  try {
    const data = await api.get('/api/playlists');
    if (data && data.playlists && data.playlists.length > 0) {
      playlistSelect.innerHTML = data.playlists
        .map(p => `<option value="${p.id}">${escHtml(p.name)} (${p.song_count} 首)</option>`)
        .join('');
    } else {
      playlistSelect.innerHTML = '<option value="">暂无歌单</option>';
    }
  } catch (e) {
    playlistSelect.innerHTML = '<option value="">加载失败</option>';
  }
}

btnConvert.addEventListener('click', async () => {
  const playlistId = parseInt(playlistSelect.value, 10);
  if (!playlistId) {
    showResult(convertResult, 'error', '请选择一个歌单');
    return;
  }
  const name = playlistSelect.selectedOptions[0].textContent.replace(/\s*\(\d+ 首\)$/, '');
  if (!confirm(`确定将歌单「${name}」转为标签？`)) return;

  btnConvert.disabled = true;
  btnConvert.textContent = '转换中...';
  convertResult.className = 'result-box hidden';

  try {
    const data = await api.post('/api/from-playlist', { playlistId });
    if (data) {
      showResult(convertResult, 'success',
        `✅ 已创建标签「${escHtml(data.tag?.name || name)}」，关联 ${data.bound} 首歌曲`);
      loadStats();
    }
  } catch (e) {
    showResult(convertResult, 'error', '转换失败: ' + (e.message || e));
  } finally {
    btnConvert.disabled = false;
    btnConvert.textContent = '转换';
  }
});

// ============================================================================
// Util
// ============================================================================

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// 初始化
loadStats();
loadPlaylists();
