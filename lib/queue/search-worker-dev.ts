/**
 * 개발용 워커 진입점
 * - .env.local / .env 로드
 * - NODE_ENV=development 강제 → 큐 이름 'video-search-dev' (Next dev와 동일 큐 사용)
 * - 워커 동시성 기본값 낮춤 (로컬 부하 감소)
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

// Next.js( next dev )와 같은 큐 사용: video-search-dev
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development'
if (!process.env.WORKER_CONCURRENCY) process.env.WORKER_CONCURRENCY = '2'

// 환경 설정 후 메인 워커 로드 (동적 import로 평가 시점 보장)
void import('./search-worker')
