/**
 * 개발용 워커 진입점
 * - .env.local / .env 로드
 * - NODE_ENV=development → 큐 이름 'video-search-dev' 사용 (배포 큐와 분리)
 * - 워커 동시성 기본값 낮춤 (로컬 부하 감소)
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

process.env.NODE_ENV = 'development'
if (!process.env.WORKER_CONCURRENCY) {
  process.env.WORKER_CONCURRENCY = '2'
}

// 환경 설정 후 메인 워커 로드 (동적 import로 평가 시점 보장)
void import('./search-worker')
