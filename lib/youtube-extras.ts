// Nichevo ek YouTube Data API çağrıları (kanal bilgisi, trendler, yorumlar, etiketler).

export interface ChannelInfo {
  id: string;
  title: string;
  subs: number;
  views: number;
  videos: number;
}

const BASE = "https://www.googleapis.com/youtube/v3";

// Kanalı @handle, kanal ID'si (UC...) veya kanal URL'sinden bul
export const fetchChannelInfo = async (
  input: string,
  apiKey: string | null,
): Promise<ChannelInfo | null> => {
  if (!apiKey) return null;
  const raw = input.trim();
  if (!raw) return null;
  const idMatch = raw.match(/(UC[\w-]{22})/);
  const handleMatch = raw.match(/@([\w.-]+)/);
  const handle = handleMatch ? handleMatch[1] : raw.replace(/^@/, "");
  const param = idMatch ? `id=${idMatch[1]}` : `forHandle=${encodeURIComponent("@" + handle)}`;
  const response = await fetch(`${BASE}/channels?${param}&key=${apiKey}&part=snippet,statistics`);
  if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
  const data = await response.json();
  const item = data.items?.[0];
  if (!item) return null;
  return {
    id: item.id,
    title: item.snippet.title,
    subs: parseInt(item.statistics.subscriberCount || "0", 10),
    views: parseInt(item.statistics.viewCount || "0", 10),
    videos: parseInt(item.statistics.videoCount || "0", 10),
  };
};

// Bölgede öne çıkan videoların başlık ve etiketleri
export const fetchTrendingVideoTexts = async (
  apiKey: string | null,
  region = "TR",
): Promise<{ titles: string[]; tags: string[] }> => {
  if (!apiKey) return { titles: [], tags: [] };
  const response = await fetch(
    `${BASE}/videos?chart=mostPopular&regionCode=${region}&maxResults=25&key=${apiKey}&part=snippet`,
  );
  if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
  const data = await response.json();
  const items: any[] = data.items ?? [];
  return {
    titles: items.map((i) => i.snippet.title as string),
    tags: items.flatMap((i) => (i.snippet.tags as string[] | undefined)?.slice(0, 3) ?? []),
  };
};

export interface VideoExtras {
  tags: string[];
  description: string;
}

export const fetchVideoExtras = async (
  videoId: string,
  apiKey: string | null,
): Promise<VideoExtras | null> => {
  if (!apiKey) return null;
  const response = await fetch(`${BASE}/videos?id=${videoId}&key=${apiKey}&part=snippet`);
  if (!response.ok) return null;
  const data = await response.json();
  const s = data.items?.[0]?.snippet;
  if (!s) return null;
  return { tags: s.tags ?? [], description: s.description ?? "" };
};

// Yorumlar kapalıysa veya hata olursa boş dizi döner
export const fetchVideoComments = async (
  videoId: string,
  apiKey: string | null,
  max = 50,
): Promise<string[]> => {
  if (!apiKey) return [];
  const response = await fetch(
    `${BASE}/commentThreads?videoId=${videoId}&maxResults=${max}&order=relevance&textFormat=plainText&key=${apiKey}&part=snippet`,
  );
  if (!response.ok) return [];
  const data = await response.json();
  return (data.items ?? []).map((i: any) => i.snippet.topLevelComment.snippet.textDisplay as string);
};
