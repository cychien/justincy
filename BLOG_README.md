# 我的部落格

一個使用 React Router v7 Framework Mode + MDX 建立的個人部落格網站。

## 功能特色

- **文章系統**：使用 MDX 格式撰寫文章，支援 Markdown 語法和 React 元件
- **讀書心得**：專門的讀書心得分類，包含書籍評分功能
- **社群動態**：整合 Threads 和 Twitter 發文，集中顯示在部落格上
- **響應式設計**：針對手機、平板、桌面裝置優化的閱讀體驗
- **深色模式**：自動偵測系統設定，支援淺色/深色主題

## 技術棧

- **框架**：React Router v7 (Framework Mode)
- **樣式**：TailwindCSS v4
- **內容**：MDX + gray-matter + marked
- **圖示**：Lucide React
- **語言**：TypeScript

## 專案結構

```
personal-blog/
├── app/
│   ├── components/       # React 元件
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── PostCard.tsx
│   │   └── SocialCard.tsx
│   ├── content/          # MDX 內容
│   │   ├── posts/        # 文章
│   │   └── book-reviews/ # 讀書心得
│   ├── lib/              # 工具函數
│   │   ├── posts.server.ts
│   │   ├── social.ts
│   │   └── utils.ts
│   ├── routes/           # 頁面路由
│   │   ├── home.tsx
│   │   ├── posts._index.tsx
│   │   ├── posts.$slug.tsx
│   │   ├── books._index.tsx
│   │   ├── books.$slug.tsx
│   │   ├── social.tsx
│   │   └── about.tsx
│   ├── app.css           # 全域樣式
│   ├── root.tsx          # 根元件
│   └── routes.ts         # 路由設定
├── public/               # 靜態資源
├── vite.config.ts        # Vite 設定
├── react-router.config.ts
└── package.json
```

## 開始使用

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
npm run dev
```

網站將在 http://localhost:5173 啟動。

### 建置生產版本

```bash
npm run build
```

### 預覽生產版本

```bash
npm start
```

## 新增內容

### 新增文章

在 `app/content/posts/` 目錄下建立新的 `.mdx` 檔案：

```mdx
---
title: 文章標題
date: 2025-01-10
excerpt: 文章摘要
tags:
  - 標籤1
  - 標籤2
---

# 文章內容

這裡是文章的正文...
```

### 新增讀書心得

在 `app/content/book-reviews/` 目錄下建立新的 `.mdx` 檔案：

```mdx
---
title: 書名
date: 2025-01-10
excerpt: 心得摘要
bookAuthor: 作者名稱
bookRating: 5
tags:
  - 類別
---

# 讀書心得內容

這裡是心得的正文...
```

### 新增社群動態

編輯 `app/lib/social.ts` 檔案，在 `socialPosts` 陣列中新增項目：

```typescript
{
  id: "unique-id",
  platform: "threads", // 或 "twitter"
  content: "貼文內容",
  date: new Date("2025-01-10"),
  likes: 42,
  reposts: 5,
  url: "https://...",
}
```

## 自訂設定

### 修改網站資訊

- 網站標題：編輯 `app/components/Header.tsx` 和 `app/components/Footer.tsx`
- 社群連結：編輯 `app/components/Footer.tsx` 和 `app/routes/about.tsx`

### 修改樣式

- 全域樣式：編輯 `app/app.css`
- 元件樣式：各元件使用 TailwindCSS 類別

## 部署

這個專案可以部署到任何支援 Node.js 的平台：

- Vercel
- Netlify
- Cloudflare Pages
- Railway
- 自架伺服器

## 授權

MIT License
