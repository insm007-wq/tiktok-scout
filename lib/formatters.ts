/**
 * 숫자를 포맷팅하는 유틸리티 함수들
 */

export const formatNumber = (num: number | undefined | null): string => {
  if (!num) return "0";

  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
};

export const formatNumberWithComma = (num: number | undefined | null): string => {
  if (!num) return "0";
  return num.toLocaleString("ko-KR");
};
