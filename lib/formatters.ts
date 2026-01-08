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

/**
 * 비디오 길이를 MM:SS 또는 HH:MM:SS 형식으로 포맷팅
 * 플랫폼별로 다른 단위(초, 밀리초 등)를 처리합니다
 */
export const formatVideoDuration = (duration: number | undefined | null): string => {
  if (!duration || duration === 0) return "0:00";

  let seconds = Math.round(duration);

  // 도우인 API에서 밀리초 단위로 데이터가 들어옴
  // - 54초 영상 → 54,000 값으로 들어옴
  // - 초 단위 영상의 일반적인 범위: 1초(1) ~ 30분(1800)
  // - 밀리초 단위 영상의 범위: 1000 ~ 1,800,000
  //
  // 판단 로직:
  // - 1000 이상 100,000 미만: 밀리초 가능성이 높음 (1초~100초)
  // - 100,000 이상: 확실히 밀리초 (100초 이상)
  // - 1000 미만: 초 단위
  if (seconds >= 1000) {
    // 1000 이상이면 거의 모두 밀리초
    // (초 단위로 1000초 이상 = 약 16분 이상은 드문 경우)
    seconds = Math.round(seconds / 1000);
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};
