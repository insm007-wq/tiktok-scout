/**
 * Engagement 관련 계산 유틸리티
 */

export const calculateEngagementRatio = (
  viewCount: number | undefined,
  subscriberCount: number | undefined
): number => {
  const views = viewCount || 0;
  const subscribers = subscriberCount || 0;

  if (subscribers === 0) return 0;
  return views / subscribers;
};

export const getEngagementLevel = (ratio: number): number => {
  if (ratio >= 3.0) return 5;
  if (ratio >= 1.4) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
};

export const calculateVPH = (
  viewCount: number | undefined,
  subscriberCount: number | undefined
): number => {
  return calculateEngagementRatio(viewCount, subscriberCount);
};

export const formatEngagementLevel = (level: number): string => {
  const levels = ["레벨1", "레벨2", "레벨3", "레벨4", "레벨5"];
  return levels[level - 1] || "레벨1";
};

export const getEngagementColor = (level: number): string => {
  const colors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];
  return colors[level - 1] || "#ef4444";
};

export const calculateAverageEngagementRatio = (videos: any[]): number => {
  if (videos.length === 0) return 0;

  const totalRatio = videos.reduce((sum, video) => {
    return sum + calculateEngagementRatio(video.viewCount, video.subscriberCount);
  }, 0);

  return totalRatio / videos.length;
};
