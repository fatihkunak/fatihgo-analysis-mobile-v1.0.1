import AsyncStorage from "@react-native-async-storage/async-storage";

export interface VideoData {
  title: string;
  channel: string;
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
