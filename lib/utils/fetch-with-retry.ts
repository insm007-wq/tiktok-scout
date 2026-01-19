/**
 * Exponential Backoff로 재시도하는 fetch 함수
 * 429 (Rate Limit) 에러 시 자동 재시도
 */

interface RetryOptions {
  maxRetries?: number;       // 최대 재시도 횟수 (기본값: 3)
  initialDelayMs?: number;   // 초기 대기 시간 (기본값: 1000ms = 1초)
  backoffMultiplier?: number; // 지수 배수 (기본값: 2, 즉 1s, 2s, 4s...)
  maxDelayMs?: number;       // 최대 대기 시간 (기본값: 30000ms = 30초)
}

/**
 * Fetch with exponential backoff retry for 429 errors
 * @param url - Fetch URL
 * @param options - Fetch options
 * @param retryOptions - Retry configuration
 * @returns Fetch response
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
  } = retryOptions || {};

  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // 429 에러가 아니면 즉시 반환
      if (response.status !== 429) {
        return response;
      }

      // 429 에러인데 마지막 시도라면 반환
      if (attempt === maxRetries) {
        return response;
      }

      // 429 에러 시 대기 후 재시도
      console.log(
        `[Fetch Retry] 429 Rate Limit. Attempt ${attempt + 1}/${maxRetries}, ` +
        `waiting ${delay}ms before retry...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
      continue;
    } catch (error) {
      lastError = error as Error;

      // 네트워크 에러인데 마지막 시도라면 throw
      if (attempt === maxRetries) {
        throw error;
      }

      // 네트워크 에러 시에도 재시도
      console.log(
        `[Fetch Retry] Network error. Attempt ${attempt + 1}/${maxRetries}, ` +
        `waiting ${delay}ms before retry...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
      continue;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Helper: POST 요청 with retry
 */
export async function fetchPostWithRetry(
  url: string,
  body: Record<string, any>,
  headers: Record<string, string> = {},
  retryOptions?: RetryOptions
): Promise<Response> {
  return fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  }, retryOptions);
}

/**
 * Helper: GET 요청 with retry
 */
export async function fetchGetWithRetry(
  url: string,
  headers: Record<string, string> = {},
  retryOptions?: RetryOptions
): Promise<Response> {
  return fetchWithRetry(url, {
    method: 'GET',
    headers,
  }, retryOptions);
}
