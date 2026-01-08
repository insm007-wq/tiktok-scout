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

export const formatDateWithTime = (date: string | Date | number | undefined): string => {
  if (!date) return "-";

  try {
    const dateObj = typeof date === "number" ? new Date(date) : new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    return `${year}.${month}.${day} ${hours}:${minutes}`;
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

  const publishDate = new Date(date).getTime();
  if (isNaN(publishDate)) return "-";

  const now = Date.now();
  const diffMs = now - publishDate;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffMs < 0) return "-";

  // 24시간 이내: 시간 단위로 표시
  if (diffHours < 1) {
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) return "방금 전";
    return `${minutes}분 전`;
  }

  if (diffHours < 24) {
    return `${Math.floor(diffHours)}시간 전`;
  }

  // 24시간 이상: 일 단위로 표시
  if (diffDays < 2) return "어제";
  if (diffDays < 7) return `${Math.floor(diffDays)}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
  return `${Math.floor(diffDays / 365)}년 전`;
};
