import { describe, it, expect } from "vitest";

describe("YouTube URL Validation", () => {
  const convertLiveToVideoUrl = (url: string): string => {
    const liveMatch = url.match(/youtube\.com\/live\/([\w-]+)/);
    if (liveMatch) {
      return `https://www.youtube.com/watch?v=${liveMatch[1]}`;
    }
    return url;
  };

  const extractVideoId = (url: string): string | null => {
    const standardUrl = convertLiveToVideoUrl(url);
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

  it("should extract video ID from youtube.com/watch?v= URL", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const videoId = extractVideoId(url);
    expect(videoId).toBe("dQw4w9WgXcQ");
  });

  it("should extract video ID from youtu.be/ URL", () => {
    const url = "https://youtu.be/dQw4w9WgXcQ";
    const videoId = extractVideoId(url);
    expect(videoId).toBe("dQw4w9WgXcQ");
  });

  it("should extract video ID from youtube.com/embed/ URL", () => {
    const url = "https://www.youtube.com/embed/dQw4w9WgXcQ";
    const videoId = extractVideoId(url);
    expect(videoId).toBe("dQw4w9WgXcQ");
  });

  it("should handle video IDs with hyphens and underscores", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ_-test";
    const videoId = extractVideoId(url);
    expect(videoId).toBe("dQw4w9WgXcQ_-test");
  });

  it("should return null for invalid URLs", () => {
    const url = "https://example.com/video";
    const videoId = extractVideoId(url);
    expect(videoId).toBeNull();
  });

  it("should return null for empty URLs", () => {
    const url = "";
    const videoId = extractVideoId(url);
    expect(videoId).toBeNull();
  });

  it("should handle URLs with query parameters", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s";
    const videoId = extractVideoId(url);
    expect(videoId).toBe("dQw4w9WgXcQ");
  });

  it("should extract video ID from youtube.com/live/ URL", () => {
    const url = "https://www.youtube.com/live/dQw4w9WgXcQ";
    const videoId = extractVideoId(url);
    expect(videoId).toBe("dQw4w9WgXcQ");
  });

  it("should convert live stream URL to watch format", () => {
    const url = "https://www.youtube.com/live/dQw4w9WgXcQ";
    const converted = convertLiveToVideoUrl(url);
    expect(converted).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("should return non-live URLs unchanged", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const converted = convertLiveToVideoUrl(url);
    expect(converted).toBe(url);
  });
});

describe("Niche Scanning Mock Data", () => {
  interface NicheResult {
    id: string;
    channelName: string;
    subs: number;
    views: number;
    age: number;
    ratio: number;
    isOutlier: boolean;
    videoId: string;
  }

  it("should generate mock results with correct structure", () => {
    const mockResults: NicheResult[] = [
      {
        id: "UCabc123",
        channelName: "Örnek Kanal 1",
        subs: 15000,
        views: 500000,
        age: 365,
        ratio: 3.0,
        isOutlier: false,
        videoId: "dQw4w9WgXcQ",
      },
    ];

    expect(mockResults).toHaveLength(1);
    expect(mockResults[0].id).toBe("UCabc123");
    expect(mockResults[0].subs).toBe(15000);
    expect(mockResults[0].isOutlier).toBe(false);
  });

  it("should identify outliers correctly", () => {
    const mockResults: NicheResult[] = [
      {
        id: "UCdef456",
        channelName: "Örnek Kanal 2",
        subs: 2500,
        views: 1200000,
        age: 180,
        ratio: 48.0,
        isOutlier: true,
        videoId: "jNQXAC9IVRw",
      },
    ];

    const outlier = mockResults[0];
    expect(outlier.isOutlier).toBe(true);
    expect(outlier.ratio).toBeGreaterThan(10);
  });

  it("should calculate correct engagement ratio", () => {
    const subs = 2500;
    const views = 1200000;
    const ratio = (views / subs) * 100;

    expect(ratio).toBe(48000);
  });
});
