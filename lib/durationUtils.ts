/**
 * ISO 8601 duration 파싱 유틸리티
 */

export const parseDurationToSeconds = (duration: string): number => {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
};

export const formatDuration = (duration: string | undefined): string => {
  if (!duration) return "-";

  const totalSeconds = parseDurationToSeconds(duration);

  if (totalSeconds === 0) return "-";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  } else if (minutes > 0) {
    return `${minutes}분 ${seconds}초`;
  } else {
    return `${seconds}초`;
  }
};

export const isShortVideo = (duration: string, shortLimit: number = 180): boolean => {
  const totalSeconds = parseDurationToSeconds(duration);
  return totalSeconds <= shortLimit;
};

export const isLongVideo = (duration: string, shortLimit: number = 180): boolean => {
  const totalSeconds = parseDurationToSeconds(duration);
  return totalSeconds > shortLimit;
};
