import AsyncStorage from "@react-native-async-storage/async-storage";

export interface VideoData {
  title: string;
  channel: string;
}

export interface VideoStatistics {
  views: number;
  likes: number;
  comments: number;
}

export interface ChannelSearchResult {
  id: string;
  channelName: string;
  subs: number;
  views: number;
  age: number;
  ratio: number;
  isOutlier: boolean;
  videoId: string;
  videoTitle: string;
}

// Load YouTube API key from AsyncStorage
export const loadYoutubeApiKey = async (): Promise<string | null> => {
  try {
    const key = await AsyncStorage.getItem("youtubeApiKey");
    return key;
  } catch (error) {
    console.error("API key yüklenemedi:", error);
    return null;
  }
};

// Fetch video data from YouTube API
export const fetchVideoData = async (
  videoId: string,
  apiKey: string | null
): Promise<VideoData | null> => {
  if (!apiKey) {
    throw new Error("YouTube API anahtarı bulunamadı. Lütfen Ayarlar sayfasında ekleyin.");
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`
    );

    if (!response.ok) {
      throw new Error(`API Hatası: ${response.status}`);
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      return {
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
      };
    }

    throw new Error("Video bulunamadı");
  } catch (error) {
    console.error("YouTube API hatası:", error);
    throw error;
  }
};

// Fetch video statistics (views, likes, comments)
export const fetchVideoStatistics = async (
  videoId: string,
  apiKey: string | null
): Promise<VideoStatistics | null> => {
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=statistics`
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const stats = data.items[0].statistics;
      return {
        views: parseInt(stats.viewCount || "0", 10),
        likes: parseInt(stats.likeCount || "0", 10),
        comments: parseInt(stats.commentCount || "0", 10),
      };
    }

    return null;
  } catch (error) {
    console.error("İstatistik hatası:", error);
    return null;
  }
};

// Search channels in a niche using YouTube Search API
export const searchNicheChannels = async (
  query: string,
  apiKey: string | null,
  maxResults: number = 20
): Promise<ChannelSearchResult[]> => {
  if (!apiKey) {
    throw new Error("YouTube API anahtarı bulunamadı.");
  }

  try {
    // First, search for videos in this niche
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(query)}&key=${apiKey}&part=snippet&type=video&maxResults=${Math.min(maxResults, 50)}&order=viewCount`
    );

    if (!searchResponse.ok) {
      throw new Error(`Arama Hatası: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      throw new Error("Sonuç bulunamadı");
    }

    // Extract unique channel IDs
    const channelIds = [...new Set(searchData.items.map((item: any) => item.snippet.channelId))] as string[];

    // Fetch channel statistics
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?id=${channelIds.slice(0, 10).join(",")}&key=${apiKey}&part=snippet,statistics`
    );

    if (!channelResponse.ok) {
      throw new Error(`Kanal Hatası: ${channelResponse.status}`);
    }

    const channelData = await channelResponse.json();

    if (!channelData.items) {
      throw new Error("Kanal bilgisi alınamadı");
    }

    // Build results with outlier detection
    const results: ChannelSearchResult[] = channelData.items.map((channel: any) => {
      const subs = parseInt(channel.statistics.subscriberCount || "0", 10);
      const views = parseInt(channel.statistics.viewCount || "0", 10);
      const channelAge = channel.snippet.publishedAt
        ? Math.floor(
            (Date.now() - new Date(channel.snippet.publishedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;
      const ratio = subs > 0 ? (views / subs) * 100 : 0;
      const isOutlier = ratio > 300; // Outlier threshold

      // Find a video from this channel in search results
      const channelVideo = searchData.items.find(
        (item: any) => item.snippet.channelId === channel.id
      );

      return {
        id: channel.id,
        channelName: channel.snippet.title,
        subs,
        views,
        age: channelAge,
        ratio: parseFloat(ratio.toFixed(1)),
        isOutlier,
        videoId: channelVideo?.id?.videoId || "",
        videoTitle: channelVideo?.snippet?.title || "",
      };
    });

    return results;
  } catch (error) {
    console.error("Niş arama hatası:", error);
    throw error;
  }
};

// Convert live stream URL to standard video URL format
export const convertLiveToVideoUrl = (url: string): string => {
  const liveMatch = url.match(/youtube\.com\/live\/([\w-]+)/);
  if (liveMatch) {
    return `https://www.youtube.com/watch?v=${liveMatch[1]}`;
  }
  return url;
};

// Extract video ID from various YouTube URL formats
export const extractVideoId = (url: string): string | null => {
  // Convert live URLs to standard format first
  const standardUrl = convertLiveToVideoUrl(url);

  // Match YouTube URLs: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/live/ID, youtube.com/embed/ID
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/live\/([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
  ];

  for (const pattern of patterns) {
    const match = standardUrl.match(pattern);
    if (match) return match[1];
  }
  return null;
};
