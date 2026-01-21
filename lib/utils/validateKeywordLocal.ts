/**
 * 로컬 기반 키워드 의미 검증
 * (빠른 패턴 매칭으로 무의미한 입력 차단)
 */

export interface LocalValidationResult {
  isValid: boolean;
  reason?: string;
}

export function validateKeywordLocal(keyword: string): LocalValidationResult {
  // 1. 한글 자음/모음 포함 체크 (엄격 모드)
  if (/[ㄱ-ㅎㅏ-ㅣ]/.test(keyword)) {
    return {
      isValid: false,
      reason: '완성된 한글만 입력해주세요'
    };
  }

  // 2. 같은 문자 반복 (5개 이상)
  if (/(.)\1{4,}/.test(keyword)) {
    return {
      isValid: false,
      reason: '반복되는 문자는 사용할 수 없습니다'
    };
  }

  // 3. 키보드 순서 패턴
  const keyboardPatterns = [
    'qwerty', 'asdfgh', 'zxcvbn',
    'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
    'qwerasdf', 'asdfzxcv'
  ];
  const lower = keyword.toLowerCase();
  for (const pattern of keyboardPatterns) {
    if (lower.includes(pattern)) {
      return {
        isValid: false,
        reason: '무작위 키보드 입력은 사용할 수 없습니다'
      };
    }
  }

  // 3-1. 반복되는 2-3글자 패턴 감지 (예: "sfsfsfsfsd", "abababab", "dadadadada")
  // 같은 2-3글자 패턴이 4회 이상 연속 반복되면 차단
  for (let patternLen = 2; patternLen <= 3; patternLen++) {
    // 모든 시작점에서 가능한 패턴 추출
    const seenPatterns = new Set<string>();

    for (let i = 0; i <= keyword.length - patternLen; i++) {
      const pattern = keyword.slice(i, i + patternLen);
      if (!seenPatterns.has(pattern)) {
        seenPatterns.add(pattern);

        // 이 패턴이 정확히 몇 번 연속으로 반복되는지 확인
        const regex = new RegExp(`(${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})+`, 'g');
        const match = keyword.match(regex);

        if (match) {
          // 가장 긴 매칭 찾기
          const longestMatch = match.reduce((a, b) => a.length > b.length ? a : b, '');
          const repetitions = longestMatch.length / pattern.length;

          // 4회 이상 반복되면 차단 (8글자 이상의 같은 패턴)
          if (repetitions >= 4) {
            return {
              isValid: false,
              reason: '반복되는 패턴은 사용할 수 없습니다'
            };
          }
        }
      }
    }
  }

  // 4. 숫자만 입력 (검색어로 부적합)
  if (/^\d+$/.test(keyword.replace(/\s/g, ''))) {
    return {
      isValid: false,
      reason: '숫자만 입력할 수 없습니다'
    };
  }

  // 5. 단일 단어 길이 체크 (공백 없을 때만)
  if (!/\s/.test(keyword)) {
    if (keyword.length < 2) {
      return {
        isValid: false,
        reason: '검색어가 너무 짧습니다 (최소 2자)'
      };
    }
    if (keyword.length > 30) {
      return {
        isValid: false,
        reason: '검색어가 너무 깁니다 (최대 30자)'
      };
    }
  }

  // 6. 공백으로만 이루어진 여러 단어 (예: "a b c d e")
  const words = keyword.split(/\s+/);
  if (words.length > 1 && words.every(w => w.length === 1)) {
    return {
      isValid: false,
      reason: '한 글자씩 띄어쓰기는 사용할 수 없습니다'
    };
  }

  // 7. 영문 모음 비율 체크 (자음만 가득한 무의미한 입력 차단)
  // "vmfkdlvos" 같은 경우를 감지
  const englishLetters = keyword.match(/[a-zA-Z]/g) || [];
  if (englishLetters.length > 0) {
    const vowels = keyword.match(/[aeiouAEIOU]/g) || [];
    const vowelRatio = vowels.length / englishLetters.length;

    // 모음 비율이 15% 미만이면 자음만 가득한 무의미한 입력
    // 정상 영어 단어는 모음 비율이 보통 25-40%
    if (vowelRatio < 0.15 && englishLetters.length >= 5) {
      return {
        isValid: false,
        reason: '올바른 단어 형태가 아닙니다'
      };
    }
  }

  return { isValid: true };
}
