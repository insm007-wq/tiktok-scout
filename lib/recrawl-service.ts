/**
 * 자동 링크 갱신 서비스
 * - CDN URL 403 에러 시 자동으로 링크 갱신 트리거
 * - Redis 기반 중복 방지 (Deduplication)
 * - Rate Limiting (시간당 3회)
 * - Queue 기반 비동기 처리
 */

import { Platform } from '@/types/video';
import { searchQueue } from './queue/search-queue';
import { clearSearchCache } from './cache';
import { getRedisClient } from './queue/redis-client';

/**
 * 링크 갱신 상태 저장소
 */
interface RecrawlState {
  jobId: string;
  alreadyInProgress: boolean;
  estimatedWaitSeconds?: number;
}

/**
 * 링크 갱신 진행 중인지 확인 (Redis 기반)
 * 동일한 query/platform/dateRange에 대한 중복 갱신 방지
 */
async function isRecrawlInProgress(cacheKey: string): Promise<string | null> {
  try {
    const redis = await getRedisClient();
    return await redis.get(`recrawl:lock:${cacheKey}`);
  } catch (error) {
    console.error('[Recrawl] Redis check failed:', error);
    return null;
  }
}

/**
 * 링크 갱신 진행 중 표시 (5분 TTL)
 */
async function setRecrawlInProgress(
  cacheKey: string,
  jobId: string
): Promise<void> {
  try {
    const redis = await getRedisClient();
    await redis.setex(`recrawl:lock:${cacheKey}`, 300, jobId); // 5분 잠금
  } catch (error) {
    console.error('[Recrawl] Redis set failed:', error);
  }
}

/**
 * Rate Limiting 체크 (시간당 3회 제한)
 * 동일한 query/platform 조합으로 갱신하는 빈도 제한
 * @returns true if allowed, false if rate limit exceeded
 */
async function checkRateLimitAndRecord(
  query: string,
  platform: Platform
): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const rateLimitKey = `recrawl:rate:${platform}:${query}`;
    const attempts = await redis.incr(rateLimitKey);

    // 첫 시도일 때만 TTL 설정
    if (attempts === 1) {
      await redis.expire(rateLimitKey, 3600); // 1시간
    }

    // 시간당 3회 제한
    const limit = parseInt(process.env.RECRAWL_RATE_LIMIT_PER_HOUR || '3', 10);
    if (attempts > limit) {
      console.warn(
        `[Recrawl] Rate limit exceeded for ${platform}:${query} (${attempts}/${limit})`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Recrawl] Rate limit check failed:', error);
    // Rate limit 실패 시 요청 허용 (서비스 가용성 우선)
    return true;
  }
}

/**
 * 링크 갱신 트리거 (중복 방지 및 Rate Limiting 포함)
 *
 * @param query - 검색어
 * @param platform - 플랫폼 (tiktok, douyin, xiaohongshu)
 * @param dateRange - 검색 기간 (optional)
 * @returns { jobId, alreadyInProgress }
 *
 * @example
 * const { jobId, alreadyInProgress } = await triggerRecrawl('프라이팬', 'douyin');
 * if (alreadyInProgress) {
 *   console.log('재크롤링 진행 중:', jobId);
 * } else {
 *   console.log('새 재크롤링 시작:', jobId);
 * }
 */
export async function triggerRecrawl(
  query: string,
  platform: Platform,
  dateRange?: string
): Promise<RecrawlState> {
  try {
    // 링크 갱신 설정이 비활성화된 경우
    if (process.env.RECRAWL_ENABLE_AUTO !== 'true') {
      throw new Error('자동 링크 갱신이 비활성화되었습니다');
    }

    // 캐시 키 생성 (L1/L2 캐시 키 형식)
    const cacheKey = `${platform}:${query}:${dateRange || 'all'}`;

    // 1단계: 갱신 진행 중인지 확인 (중복 방지)
    const existingJobId = await isRecrawlInProgress(cacheKey);
    if (existingJobId) {
      // 기존 job이 진행 중이면, 그 job의 상태를 확인
      const existingJob = await searchQueue.getJob(existingJobId);
      if (existingJob) {
        const existingState = await existingJob.getState();
        // Job이 여전히 진행 중이면 재사용
        if (existingState === 'waiting' || existingState === 'active') {
          console.log(
            `[Recrawl] Already in progress for ${cacheKey}, jobId: ${existingJobId}, state: ${existingState}`
          );
          return {
            jobId: existingJobId,
            alreadyInProgress: true,
            estimatedWaitSeconds: 30,
          };
        } else if (existingState === 'failed' || existingState === 'completed') {
          // Job이 실패했거나 완료되었으면, 기존 lock 제거하고 새로운 job 생성
          console.log(
            `[Recrawl] Existing job ${existingJobId} is ${existingState}, creating new job`
          );
          await clearRecrawlLock(query, platform, dateRange);
        }
      }
    }

    // 2단계: Rate Limiting 체크
    const rateLimitPassed = await checkRateLimitAndRecord(query, platform);
    if (!rateLimitPassed) {
          throw new Error(
        `시간당 링크 갱신 한도 초과 (${process.env.RECRAWL_RATE_LIMIT_PER_HOUR || 3}회). 1시간 후 다시 시도해주세요.`
      );
    }

    // 3단계: 캐시 무효화 (L1 + L2)
    console.log(`[Recrawl] Clearing cache for ${cacheKey}`);
    await clearSearchCache(query, platform, dateRange);

    // 3-1단계: 기존 stuck job이 있으면 cancel (optional optimization)
    // 이는 같은 query에 대한 일반 검색 job이 stuck된 경우 처리
    try {
      const waitingJobs = await searchQueue.getJobs(['waiting', 'active']);
      const stuckJob = waitingJobs.find(
        (j) =>
          j.data.query === query &&
          j.data.platform === platform &&
          (j.data.dateRange || 'all') === (dateRange || 'all') &&
          !j.data.isRecrawl
      );

      if (stuckJob) {
        console.log(
          `[Recrawl] Canceling stuck job ${stuckJob.id} for ${cacheKey}`
        );
        await stuckJob.remove();
      }
    } catch (error) {
      console.warn('[Recrawl] Could not cancel stuck job:', error);
      // Continue even if cancellation fails
    }

    // 4단계: Queue에 링크 갱신 Job 추가
    const job = await searchQueue.add('recrawl', {
      query,
      platform,
      dateRange,
      isRecrawl: true, // 내부 플래그(호환 유지)
    });

    if (!job.id) {
      throw new Error('Job ID 생성 실패');
    }

    // 5단계: Redis에 갱신 진행 중 표시 (5분 잠금)
    await setRecrawlInProgress(cacheKey, job.id);

    console.log(
      `[Recrawl] Triggered for ${cacheKey}, jobId: ${job.id}, attempt: 1/${process.env.RECRAWL_RATE_LIMIT_PER_HOUR || 3}`
    );

    return {
      jobId: job.id,
      alreadyInProgress: false,
      estimatedWaitSeconds: 30,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[Recrawl] Trigger failed:', errorMessage);
    throw error;
  }
}

/**
 * 재크롤링 상태 조회 (프론트엔드 폴링 용)
 * /api/search/[jobId] 엔드포인트와 동일한 형식으로 반환
 */
export async function getRecrawlStatus(jobId: string): Promise<any> {
  try {
    const job = await searchQueue.getJob(jobId);

    if (!job) {
      return {
        status: 'unknown',
        error: '작업을 찾을 수 없습니다',
      };
    }

    const state = await job.getState();
    const progressValue = typeof job.progress === 'number' ? job.progress : 0;

    return {
      status: state,
      progress: progressValue,
      jobId,
      isRecrawl: job.data.isRecrawl || false,
    };
  } catch (error) {
    console.error('[Recrawl] Status check failed:', error);
    throw error;
  }
}

/**
 * 재크롤링 Lock 해제 (관리용)
 * 재크롤링 완료 또는 타임아웃 시 호출
 */
export async function clearRecrawlLock(
  query: string,
  platform: Platform,
  dateRange?: string
): Promise<void> {
  try {
    const cacheKey = `${platform}:${query}:${dateRange || 'all'}`;
    const redis = await getRedisClient();
    await redis.del(`recrawl:lock:${cacheKey}`);
    console.log(`[Recrawl] Lock cleared for ${cacheKey}`);
  } catch (error) {
    console.error('[Recrawl] Clear lock failed:', error);
  }
}

/**
 * 재크롤링 Rate Limit 초기화 (관리용 - 수동 리셋)
 */
export async function resetRateLimit(
  query: string,
  platform: Platform
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const rateLimitKey = `recrawl:rate:${platform}:${query}`;
    await redis.del(rateLimitKey);
    console.log(`[Recrawl] Rate limit reset for ${platform}:${query}`);
  } catch (error) {
    console.error('[Recrawl] Reset rate limit failed:', error);
  }
}
