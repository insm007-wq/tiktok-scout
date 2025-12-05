/**
 * 날짜 계산 및 포맷팅 유틸리티
 */

export const getDaysAgo = (date: string | Date | undefined): number => {
  if (!date) return Infinity;

  const publishDate = new Date(date).getTime();
  if (isNaN(publishDate)) return Infinity;

  const now = Date.now();
  return (now - publishDate) / (1000 * 60 * 60 * 24);
};

export const formatDate = (date: string | Date | undefined): string => {
  if (!date) return "-";

  try {
    return new Date(date).toLocaleDateString("ko-KR");
  } catch {
    return "-";
  }
};

export const isWithinDays = (date: string | Date | undefined, days: number): boolean => {
  if (!date) return false;
  const daysAgo = getDaysAgo(date);
  return daysAgo >= 0 && daysAgo <= days;
};

export const getRelativeDateString = (date: string | Date | undefined): string => {
  if (!date) return "-";

  const daysAgo = getDaysAgo(date);

  if (daysAgo < 0) return "-";
  if (daysAgo === 0) return "오늘";
  if (daysAgo === 1) return "어제";
  if (daysAgo < 7) return `${Math.floor(daysAgo)}일 전`;
  if (daysAgo < 30) return `${Math.floor(daysAgo / 7)}주 전`;
  if (daysAgo < 365) return `${Math.floor(daysAgo / 30)}개월 전`;
  return `${Math.floor(daysAgo / 365)}년 전`;
};
