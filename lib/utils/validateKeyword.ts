/**
 * 키워드 유효성 검증 함수
 */
import { validateKeywordLocal } from './validateKeywordLocal';

export interface KeywordValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

export function validateKeyword(keyword: string): KeywordValidationResult {
  // 1. 빈 문자열 체크
  const trimmed = keyword.trim();
  if (!trimmed) {
    return { isValid: false, error: '검색어를 입력해주세요' };
  }

  // 2. 특수문자 체크 (알파벳, 숫자, 한글, 중국어, 공백만 허용)
  const allowedPattern = /^[a-zA-Z0-9가-힣\u4e00-\u9fff\s]+$/;
  if (!allowedPattern.test(trimmed)) {
    return {
      isValid: false,
      error: '특수문자는 사용할 수 없습니다. 알파벳, 숫자, 한글, 중국어만 입력 가능합니다'
    };
  }

  // 3. 연속 공백 정규화
  const sanitized = trimmed.replace(/\s+/g, ' ');

  // 4. 로컬 의미 검증 (신규 추가!)
  const localCheck = validateKeywordLocal(sanitized);
  if (!localCheck.isValid) {
    return {
      isValid: false,
      error: localCheck.reason || '유효하지 않은 검색어입니다'
    };
  }

  return { isValid: true, sanitized };
}
