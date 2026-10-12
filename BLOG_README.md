# justincy

個人網站，React Router v7 (Framework Mode) + MDX + Tailwind CSS v4。

## 開發

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm typecheck
pnpm build
```

## 寫文章

每篇文章是一個 `.mdx` 檔，檔名就是網址的 slug。

| 區塊   | 資料夾                | 網址             |
| ------ | --------------------- | ---------------- |
| Blog   | `app/content/blog/`   | `/blog/<檔名>`   |
| Design | `app/content/design/` | `/design/<檔名>` |

### Blog frontmatter

```mdx
---
title: 文章標題
date: 2026-10-06
description: 一句話摘要（選填），顯示在卡片封面與 meta description
kind: AI 工作流 # 選填；分類 tag，顯示在文章標題下方
thumb: /images/blog/<檔名>/cover.webp # 選填；4:3 卡片封面，1440x1080
thumbAlt: 封面說明
ogImage: /images/blog/<檔名>/og.jpg # 選填；1200x630 社群預覽圖
draft: true # 選填；草稿只在 pnpm dev 看得到，正式環境不會出現
---

正文用 Markdown 寫：## / ### 標題、清單、> 引用、程式碼區塊、表格、圖片都支援。
```

沒有 `thumb` 的文章，卡片會改用文字封面：有 `description` 就顯示摘要，沒有就顯示標題。

### 系列文章

在每一篇的 frontmatter 加上同一個 `series`（字要完全一樣），`title` 只寫這篇自己的標題：

```mdx
---
title: 關係建立
series: 深入 Lauren Tan AI 工作流
date: 2026-10-06
---
```

- 文章頁的主標題只顯示這篇的標題，系列名以小字放在主標題上方；瀏覽器分頁標題則組成 `深入 Lauren Tan AI 工作流 - 關係建立`。
- 篇序依 `date` 排，同一天再依檔名排。
- Blog 列表把整個系列合成一張堆疊卡片，標題是系列名、日期是最新一篇的日期，點進去是第 1 篇。堆疊張數等於篇數，最多 3 張。
- 每篇開頭會自動出現系列導覽。草稿篇在正式環境不會出現在導覽和篇數裡。

### 產生封面與 OG image

封面和 OG image 由 `blog-cover` skill 產生（`.agents/skills/blog-cover/`）。在 Claude Code 或 Codex 裡說「幫這篇做 cover」即可；它會用 Codex 的 `image_gen` 生圖、套上網站統一的 zinc 色調、用模板做 OG image，再把 `thumb`、`thumbAlt`、`ogImage` 寫進 frontmatter。候選圖和工作檔在 `tmp/blog-cover/<檔名>/`，不進 git。

### 插入圖片

```bash
pnpm image <文章檔名> <圖片路徑> [圖片名稱]
# 例：pnpm image lauren-tan-ai-workflow-1 ~/Desktop/shot@2x.png trust-vs-agents
```

會轉成 WebP 存到 `public/images/blog/<文章檔名>/`，並印出可以直接貼進文章的 Markdown：

```mdx
![圖片說明](/images/blog/lauren-tan-ai-workflow-1/trust-vs-agents@2x.webp)
```

- 檔名帶 `@2x`（例如 CleanShot 截圖）的圖片會以一半尺寸顯示，在 Retina 螢幕上才會清晰。
- 圖片寬高會在 build 時自動寫進 `<img>`，路徑打錯 build 會直接失敗。
- 用同一個名稱覆蓋舊圖時，`pnpm dev` 下要再存一次那篇 `.mdx`，寬高才會更新。

### 嵌入 YouTube

```mdx
<YouTube id="EWSUvEyFwjc" title="影片標題" />
<YouTube id="EWSUvEyFwjc" title="影片標題" start={90} />
```

`id` 是網址 `watch?v=` 後面那段；`start` 是從第幾秒開始播放。

### Design frontmatter

欄位定義見 `app/lib/design.ts` 的 `DesignPostFrontmatter`。
