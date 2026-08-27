/// <reference types="@songloft/plugin-sdk" />
import { jsonResponse, createRouter } from '@songloft/plugin-sdk';

const router = createRouter();

// ============================================================================
// 按元数据批量生成标签
// ============================================================================

interface GenerateByFieldRequest {
  field: 'genre' | 'artist' | 'album' | 'language' | 'style';
  dryRun?: boolean;
}

router.post('/api/generate-by-field', async (req) => {
  const body: GenerateByFieldRequest = JSON.parse(req.body);
  const field = body.field;
  const dryRun = body.dryRun ?? false;

  const songs = await songloft.songs.list({ limit: 100000, offset: 0 });
  const fieldMap = new Map<string, number[]>();

  for (const song of songs) {
    const value = (song as Record<string, unknown>)[field] as string | undefined;
    if (!value || !value.trim()) continue;
    const values = field === 'genre'
      ? value.split(/[;；,，/]/).map(v => v.trim()).filter(Boolean)
      : [value.trim()];
    for (const v of values) {
      const ids = fieldMap.get(v) || [];
      ids.push(song.id);
      fieldMap.set(v, ids);
    }
  }

  if (dryRun) {
    const preview = Array.from(fieldMap.entries()).map(([name, ids]) => ({
      name,
      count: ids.length,
    }));
    return jsonResponse({ dryRun: true, tags: preview });
  }

  let created = 0;
  let bound = 0;
  for (const [name, songIds] of fieldMap.entries()) {
    const existing = await songloft.tags.list({ keyword: name, limit: 1 });
    let tagId: number;
    if (existing.length > 0 && existing[0].name.toLowerCase() === name.toLowerCase()) {
      tagId = existing[0].id;
    } else {
      const tag = await songloft.tags.create({ name });
      tagId = tag.id;
      created++;
    }
    const result = await songloft.tags.bindSongs(tagId, songIds);
    bound += result.bound;
  }

  return jsonResponse({ created, bound, totalTags: fieldMap.size });
});

// ============================================================================
// 从 CSV/JSON 导入
// ============================================================================

interface ImportItem {
  title?: string;
  artist?: string;
  tags: string[];
}

router.post('/api/import', async (req) => {
  const body: { items: ImportItem[] } = JSON.parse(req.body);
  const items = body.items || [];

  let matched = 0;
  let bound = 0;

  for (const item of items) {
    if (!item.tags || item.tags.length === 0) continue;

    let keyword = '';
    if (item.title) keyword = item.title;
    if (item.artist) keyword += ` ${item.artist}`;
    keyword = keyword.trim();
    if (!keyword) continue;

    const songs = await songloft.songs.search(keyword, { limit: 5 });
    if (songs.length === 0) continue;

    const song = songs[0];
    matched++;

    for (const tagName of item.tags) {
      const name = tagName.trim();
      if (!name) continue;

      const existing = await songloft.tags.list({ keyword: name, limit: 1 });
      let tagId: number;
      if (existing.length > 0 && existing[0].name.toLowerCase() === name.toLowerCase()) {
        tagId = existing[0].id;
      } else {
        const tag = await songloft.tags.create({ name });
        tagId = tag.id;
      }
      const result = await songloft.tags.bindSongs(tagId, [song.id]);
      bound += result.bound;
    }
  }

  return jsonResponse({ total: items.length, matched, bound });
});

// ============================================================================
// 查看当前状态
// ============================================================================

router.get('/api/stats', async () => {
  const tags = await songloft.tags.list({ limit: 10000 });
  const totalTags = tags.length;
  const totalSongs = tags.reduce((sum, t) => sum + t.song_count, 0);
  return jsonResponse({ totalTags, totalBindings: totalSongs });
});

// ============================================================================
// HTTP 入口
// ============================================================================

globalThis.onHTTPRequest = async (req: HTTPRequest) => router.handle(req);
