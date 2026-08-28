# songloft-plugin-tagger

Songloft 标签管理插件，用于批量创建和绑定标签。

## 功能

### 1. 按元数据批量生成标签

根据歌曲的 genre/artist/album/language/style 字段，自动创建对应标签并关联歌曲。

```
POST /api/generate-by-field
{
  "field": "genre",   // genre | artist | album | language | style
  "dryRun": true      // true=仅预览不执行
}
```

genre 字段支持多值分隔符（`;` `；` `,` `，` `/`）。

### 2. 从 CSV/JSON 导入

按歌名+歌手匹配歌曲，批量打标签。

```
POST /api/import
{
  "items": [
    { "title": "晴天", "artist": "周杰伦", "tags": ["怀旧", "华语经典"] },
    { "title": "海阔天空", "artist": "Beyond", "tags": ["粤语", "经典"] }
  ]
}
```

### 3. 歌单转标签

将歌单内所有歌曲关联到同名标签（标签不存在时自动创建）。

```
GET /api/playlists
// => { "playlists": [{"id": 1, "name": "...", "song_count": 10}, ...] }

POST /api/from-playlist
{ "playlistId": 3 }
// => { "tag": {...}, "bound": 15 }
```

### 4. 查看统计

```
GET /api/stats
// => { "totalTags": 15, "totalBindings": 230 }
```

## 权限

- `storage` — 存储配置
- `songs.read` — 读取歌曲列表
- `playlists.read` — 读取歌单列表
- `tags.*` — 读写标签

## 开发

```bash
pnpm install
pnpm run build
pnpm run dev    # 热重载开发
```

## 许可证

Apache-2.0
