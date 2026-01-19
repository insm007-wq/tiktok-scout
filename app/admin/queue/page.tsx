'use client';

import { useEffect, useState } from 'react';
import { Queue, Worker } from 'bullmq';
import { redisConnection } from '@/lib/queue/redis';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface JobInfo {
  id: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  progress?: number;
  attemptsMade?: number;
  data?: any;
  name?: string;
}

export default function QueueDashboard() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'waiting' | 'completed' | 'failed'>('all');

  useEffect(() => {
    const fetchQueueData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/queue-stats');
        if (!response.ok) {
          throw new Error('Failed to fetch queue stats');
        }
        const data = await response.json();
        setStats(data.stats);
        setJobs(data.jobs);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // 초기 로드
    fetchQueueData();

    // 2초마다 갱신
    const interval = setInterval(fetchQueueData, 2000);
    return () => clearInterval(interval);
  }, []);

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true;
    return job.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#22c55e'; // 초록색
      case 'waiting':
        return '#3b82f6'; // 파란색
      case 'completed':
        return '#10b981'; // 진한 초록색
      case 'failed':
        return '#ef4444'; // 빨간색
      case 'delayed':
        return '#f59e0b'; // 주황색
      default:
        return '#6b7280'; // 회색
    }
  };

  if (loading && !stats) {
    return (
      <div className="admin-queue-page">
        <div className="loading">큐 데이터를 로드 중입니다...</div>
      </div>
    );
  }

  return (
    <div className="admin-queue-page">
      <div className="header">
        <h1>🚀 BullMQ 대시보드</h1>
        <p>작업 대기열 실시간 모니터링</p>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ 오류: {error}
        </div>
      )}

      {/* 통계 카드 */}
      {stats && (
        <div className="stats-grid">
          <StatCard label="대기 중" count={stats.waiting} color="#3b82f6" />
          <StatCard label="처리 중" count={stats.active} color="#22c55e" />
          <StatCard label="완료됨" count={stats.completed} color="#10b981" />
          <StatCard label="실패" count={stats.failed} color="#ef4444" />
          <StatCard label="지연됨" count={stats.delayed} color="#f59e0b" />
          <StatCard label="일시 중지" count={stats.paused} color="#8b5cf6" />
        </div>
      )}

      {/* 필터 */}
      <div className="filter-bar">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          모두 ({jobs.length})
        </button>
        <button
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
          style={{ borderLeftColor: '#22c55e' }}
        >
          처리 중 ({jobs.filter((j) => j.status === 'active').length})
        </button>
        <button
          className={`filter-btn ${filter === 'waiting' ? 'active' : ''}`}
          onClick={() => setFilter('waiting')}
          style={{ borderLeftColor: '#3b82f6' }}
        >
          대기 중 ({jobs.filter((j) => j.status === 'waiting').length})
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
          style={{ borderLeftColor: '#10b981' }}
        >
          완료 ({jobs.filter((j) => j.status === 'completed').length})
        </button>
        <button
          className={`filter-btn ${filter === 'failed' ? 'active' : ''}`}
          onClick={() => setFilter('failed')}
          style={{ borderLeftColor: '#ef4444' }}
        >
          실패 ({jobs.filter((j) => j.status === 'failed').length})
        </button>
      </div>

      {/* 작업 테이블 */}
      <div className="jobs-container">
        <table className="jobs-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>상태</th>
              <th>진행률</th>
              <th>시도</th>
              <th>데이터</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  작업이 없습니다
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => (
                <tr key={job.id}>
                  <td className="job-id">{job.id}</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(job.status) }}
                    >
                      {getStatusLabel(job.status)}
                    </span>
                  </td>
                  <td>
                    <ProgressBar progress={job.progress || 0} />
                  </td>
                  <td className="attempts">{job.attemptsMade || 0}</td>
                  <td className="job-data">{JSON.stringify(job.data).substring(0, 50)}...</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .admin-queue-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 40px 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
        }

        .header {
          max-width: 1200px;
          margin: 0 auto 40px;
          text-align: center;
        }

        .header h1 {
          font-size: 32px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }

        .header p {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .loading {
          text-align: center;
          font-size: 16px;
          color: #6b7280;
          padding: 60px 20px;
        }

        .error-banner {
          max-width: 1200px;
          margin: 0 auto 20px;
          padding: 16px;
          background: #fee2e2;
          border-left: 4px solid #ef4444;
          border-radius: 8px;
          color: #991b1b;
          font-size: 14px;
          font-weight: 600;
        }

        .stats-grid {
          max-width: 1200px;
          margin: 0 auto 40px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .filter-bar {
          max-width: 1200px;
          margin: 0 auto 20px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .filter-btn {
          padding: 8px 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          white-space: nowrap;
          transition: all 0.2s;
          border-left: 3px solid #d1d5db;
        }

        .filter-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .filter-btn.active {
          background: #fff;
          border-color: currentColor;
          color: #1a1a1a;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .jobs-container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .jobs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .jobs-table thead {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .jobs-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #6b7280;
          letter-spacing: 0.5px;
        }

        .jobs-table td {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
          color: #1a1a1a;
        }

        .jobs-table tbody tr:hover {
          background: #f9fafb;
        }

        .job-id {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: #3b82f6;
          font-weight: 600;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .attempts {
          text-align: center;
          color: #9ca3af;
        }

        .job-data {
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: #9ca3af;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .empty {
          text-align: center;
          color: #9ca3af;
          padding: 40px !important;
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-count" style={{ color }}>
        {count}
      </div>
      <style jsx>{`
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border-left: 4px solid ${color};
        }

        .stat-label {
          font-size: 12px;
          color: #9ca3af;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .stat-count {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
      `}</style>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${progress}%` }} />
      <span className="progress-text">{progress}%</span>
      <style jsx>{`
        .progress-bar {
          position: relative;
          width: 100%;
          height: 24px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
          font-size: 11px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          transition: width 0.3s ease;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          white-space: nowrap;
          z-index: 1;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: '🟢 처리 중',
    waiting: '🔵 대기',
    completed: '✅ 완료',
    failed: '❌ 실패',
    delayed: '⏱️ 지연',
    paused: '⏸️ 일시중지',
  };
  return labels[status] || status;
}
