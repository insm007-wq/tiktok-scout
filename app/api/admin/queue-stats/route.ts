import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { redisConnection } from '@/lib/queue/redis';

/**
 * GET /api/admin/queue-stats
 * BullMQ 큐 통계 조회
 */
export async function GET(request: NextRequest) {
  try {
    // Redis 연결
    const connection = redisConnection.connection;

    // 큐 인스턴스 생성
    const queue = new Queue('video-search', { connection: connection as any });

    // 각 상태별 작업 수 조회
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getPausedCount(),
    ]);

    // 최근 작업들 조회 (상태별로 일부씩)
    const [
      waitingJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      delayedJobs,
      pausedJobs,
    ] = await Promise.all([
      queue.getWaiting(0, 10),
      queue.getActive(0, 10),
      queue.getCompleted(0, 10),
      queue.getFailed(0, 10),
      queue.getDelayed(0, 10),
      queue.getPaused(0, 10),
    ]);

    // 작업 정보 포맷팅
    const formatJobInfo = (job: any, status: string) => ({
      id: job.id,
      name: job.name,
      status,
      progress: job.progress() || 0,
      data: job.data,
      attemptsMade: job.attemptsMade,
    });

    const allJobs = [
      ...activeJobs.map((job) => formatJobInfo(job, 'active')),
      ...waitingJobs.map((job) => formatJobInfo(job, 'waiting')),
      ...delayedJobs.map((job) => formatJobInfo(job, 'delayed')),
      ...pausedJobs.map((job) => formatJobInfo(job, 'paused')),
      ...completedJobs.map((job) => formatJobInfo(job, 'completed')),
      ...failedJobs.map((job) => formatJobInfo(job, 'failed')),
    ];

    return NextResponse.json({
      stats: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
        total: waiting + active + completed + failed + delayed + paused,
      },
      jobs: allJobs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin Queue Stats] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stats: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
        },
        jobs: [],
      },
      { status: 500 }
    );
  }
}
