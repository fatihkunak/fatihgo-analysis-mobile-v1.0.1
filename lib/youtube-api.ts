import AsyncStorage from "@react-native-async-storage/async-storage";
import ytdl from "react-native-ytdl";
import * as FileSystem from 'expo-file-system';

export interface VideoData {
  title: string;
  channel: string;
  description: string;
  duration: string;
  durationInSeconds: number;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  engagementRate: string;
}

// ISO 8601 Duration parser (PT1M30S -> 90)
export const parseISO8601Duration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  return hours * 3600 + minutes * 60 + seconds;
};

// Load YouTube API key from AsyncStorage
export const loadYoutubeApiKey = async (): Promise<string | null> => {
  try {
    const key = await AsyncStorage.getItem("youtubeApiKey");
    if (key) {
      console.log(`YouTube API Key yüklendi: ${maskApiKey(key)}`);
      return key.trim();
    }
    return null;
  } catch (error) {
    console.error("API key yüklenemedi:", error);
    return null;
  }
};

// Mask API key for logging (shows first 5 and last 5)
export const maskApiKey = (key: string | null): string => {
  if (!key) return "YOK";
  const trimmed = key.trim();
  if (trimmed.length <= 10) return "****";
  return `${trimmed.substring(0, 5)}...${trimmed.substring(trimmed.length - 5)}`;
};

// Validate YouTube API key format
export const validateApiKey = (apiKey: string | null): boolean => {
  if (!apiKey || !apiKey.trim()) return false;
  // YouTube API keys typically start with 'AIza'
  return apiKey.trim().length > 20 && apiKey.trim().startsWith("AIza");
};

// Test YouTube API connection
export const testYoutubeApiConnection = async (apiKey: string): Promise<{ success: boolean; error?: string }> => {
  const trimmedKey = apiKey.trim();
  console.log(`API Bağlantısı test ediliyor: ${maskApiKey(trimmedKey)}`);

  if (!validateApiKey(trimmedKey)) {
    return { success: false, error: "API anahtarı geçersiz format. AIza... ile başlamalı ve 20 karakterden uzun olmalıdır." };
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?q=test&key=${trimmedKey}&part=snippet&maxResults=1`;
    console.log(`Test İsteği URL: https://www.googleapis.com/youtube/v3/search?q=test&key=***&part=snippet&maxResults=1`);

    const response = await fetch(url);

    if (response.status === 401) {
      return { success: false, error: "API anahtarı geçersiz. Lütfen anahtarınızı kontrol edin." };
    }

    if (response.status === 403) {
      const data = await response.json();
      const message = data.error?.message || "Erişim kısıtlı.";
      return { success: false, error: `Bağlantı Reddildi: ${message}\n\nİpucu: Google Cloud Console'da 'YouTube Data API v3' etkin mi? IP veya HTTP referrer kısıtlaması var mı?` };
    }

    if (!response.ok) {
      return { success: false, error: `API Hatası: ${response.status}` };
    }

    const data = await response.json();
    if (data.error) {
      return { success: false, error: `API Hatası: ${data.error.message}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Bağlantı hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}` };
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

  const trimmedKey = apiKey.trim();
  if (!validateApiKey(trimmedKey)) {
    throw new Error("API anahtarı geçersiz format. Lütfen Google Cloud Console'dan doğru anahtarı kopyalayın.");
  }

  try {
    console.log(`YouTube API çağrılıyor: videoId=${videoId} | Key: ${maskApiKey(trimmedKey)}`);
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${trimmedKey}&part=snippet,statistics,contentDetails`;

    const response = await fetch(apiUrl);

    if (response.status === 401) {
      console.error(`YouTube API 401 Hatası: Geçersiz API Anahtarı (${maskApiKey(trimmedKey)})`);
      throw new Error("API anahtarı geçersiz (401). Lütfen Ayarlar sayfasında anahtarınızı yenileyin.");
    }

    if (response.status === 403) {
      const errorData = await response.json();
      console.error("YouTube API 403 Hatası:", errorData.error?.message || "Erişim Reddedildi");
      throw new Error(`YouTube API Hatası (403): ${errorData.error?.message || "Erişim Reddedildi. Kota dolmuş veya anahtar kısıtlanmış olabilir."}\n\nNot: Google Cloud'da IP kısıtlaması olmadığından emin olun.`);
    }

    if (!response.ok) {
      console.error(`YouTube API Hatası: Status ${response.status}`);
      throw new Error(`API Hatası: ${response.status}`);
    }

    const data = await response.json();
    console.log("YouTube API Yanıtı:", JSON.stringify(data, null, 2));

    if (data.error) {
      console.error("API Veri Hatası:", data.error.message);
      throw new Error(`API Hatası: ${data.error.message}`);
    }

    if (data.items && data.items.length > 0) {
      const video = data.items[0];

      // Güvenli veri erişimi - snippet ve statistics kontrolü
      const videoTitle = video.snippet?.title || "Bilinmeyen Başlık";
      const channelTitle = video.snippet?.channelTitle || "Bilinmeyen Kanal";
      const description = video.snippet?.description || "";
      const duration = video.contentDetails?.duration || "";
      const durationInSeconds = parseISO8601Duration(duration);

      const viewCount = video.statistics?.viewCount || "0";
      const likeCount = video.statistics?.likeCount || "0";
      const commentCount = video.statistics?.commentCount || "0";

      const views = parseInt(viewCount) || 0;
      const likes = parseInt(likeCount) || 0;
      const engagementRate = views > 0 ? ((likes / views) * 100).toFixed(2) : "0.00";

      return {
        title: videoTitle,
        channel: channelTitle,
        description,
        duration,
        durationInSeconds,
        viewCount,
        likeCount,
        commentCount,
        engagementRate
      };
    }

    console.warn(`Video bulunamadı: ${videoId}. Video gizli veya kaldırılmış olabilir.`);
    throw new Error("Video bulunamadı. Video gizli veya kaldırılmış olabilir.");
  } catch (error) {
    console.error("YouTube API hatası yakalandı:", error);
    throw error;
  }
};

// Convert live stream URL to standard video URL format
export const convertLiveToVideoUrl = (url: string): string => {
  if (!url) return url;

  // Handle youtube.com/live/ID format
  const liveMatch = url.match(/youtube\.com\/live\/([\w-]+)/);
  if (liveMatch) {
    const videoId = liveMatch[1];
    // Preserve other query parameters if they exist
    const urlParts = url.split('?');
    const queryParams = urlParts.length > 1 ? `&${urlParts[1]}` : '';
    return `https://www.youtube.com/watch?v=${videoId}${queryParams}`;
  }

  return url;
};

// Validate if the given string is a valid YouTube URL
export const validateYoutubeUrl = (url: string): boolean => {
  if (!url || !url.trim()) return false;

  const patterns = [
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/live\/([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
  ];

  return patterns.some(pattern => pattern.test(url));
};

// Extract video ID from various YouTube URL formats
export const extractVideoId = (url: string): string | null => {
  if (!url) return null;

  // First, convert live URLs to standard format
  const convertedUrl = convertLiveToVideoUrl(url);

  const patterns = [
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
  ];

  for (const pattern of patterns) {
    const match = convertedUrl.match(pattern);
    if (match) return match[1];
  }

  // Fallback check for live if conversion missed it (shouldn't happen with the new logic but good for safety)
  const liveMatch = url.match(/youtube\.com\/live\/([\w-]+)/);
  if (liveMatch) return liveMatch[1];

  return null;
};

/**
 * Downloads a YouTube video's MP4 stream to a local file
 * Note: Real frame extraction requires a local file or a direct stream URL
 */
export const downloadYouTubeVideo = async (videoId: string, targetPath: string): Promise<string> => {
  try {
    console.log(`Video indirme başlatılıyor: ${videoId}`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Get direct formats
    const info = await ytdl.getInfo(videoId);
    const format = ytdl.chooseFormat(info.formats, { quality: 'lowestvideo', filter: 'videoandaudio' });

    if (!format || !format.url) {
      throw new Error("Uygun video formatı bulunamadı.");
    }

    console.log(`İndirme URL'si alındı, dosyaya kaydediliyor: ${targetPath}`);

    const downloadResumable = FileSystem.createDownloadResumable(
      format.url,
      targetPath
    );

    const result = await downloadResumable.downloadAsync();
    if (!result) throw new Error("İndirme başarısız oldu.");

    return result.uri;
  } catch (error) {
    console.error("Video indirme hatası:", error);
    throw error;
  }
};
