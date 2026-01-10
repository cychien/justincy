export interface SocialPost {
  id: string;
  platform: 'threads' | 'twitter';
  content: string;
  date: string;
  url: string;
  likes?: number;
  reposts?: number;
  media?: {
    type: 'image' | 'video';
    url: string;
    alt?: string;
  }[];
}

// 這裡可以放置你的社群媒體貼文
// 未來可以透過 API 自動抓取，目前先用靜態資料
export const socialPosts: SocialPost[] = [
  {
    id: '1',
    platform: 'threads',
    content: '剛讀完一本很棒的書，關於如何在數位時代保持專注力。推薦給所有在資訊洪流中掙扎的人。',
    date: '2025-01-08',
    url: 'https://threads.net/@username/post/1',
    likes: 42,
    reposts: 5,
  },
  {
    id: '2',
    platform: 'twitter',
    content:
      '今天學到一個很有趣的概念：Second Brain。把所有想法和筆記都整理到一個系統裡，讓大腦專注在創造而不是記憶。',
    date: '2025-01-05',
    url: 'https://twitter.com/username/status/2',
    likes: 128,
    reposts: 23,
  },
  {
    id: '3',
    platform: 'threads',
    content:
      '寫作是思考的最佳方式。當你試著把想法寫下來時，你會發現自己其實不如想像中那麼了解這個主題。',
    date: '2025-01-03',
    url: 'https://threads.net/@username/post/3',
    likes: 89,
    reposts: 12,
  },
  {
    id: '4',
    platform: 'twitter',
    content:
      '閱讀不是為了記住所有內容，而是為了改變你的思考方式。一本好書可能只有一個觀點改變了你，但那就足夠了。',
    date: '2025-01-01',
    url: 'https://twitter.com/username/status/4',
    likes: 256,
    reposts: 45,
  },
];

export function getSocialPosts(): SocialPost[] {
  return socialPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getSocialPostsByPlatform(platform: 'threads' | 'twitter'): SocialPost[] {
  return getSocialPosts().filter((post) => post.platform === platform);
}
