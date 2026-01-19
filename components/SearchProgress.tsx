'use client';

import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';

interface SearchProgressProps {
  isSearching: boolean;
  onCancel: () => void;

  // 새로운 실시간 데이터 props
  jobStatus?: 'waiting' | 'active' | 'delayed' | 'paused';
  realProgress?: number;        // 0-100 (Worker에서 제공)
  queuePosition?: number;       // 현재 대기 위치 (1부터 시작)
  totalQueueSize?: number;      // 큐에 들어갔을 때의 총 작업 수
  statusMessage?: string;       // API에서 제공하는 메시지
  estimatedWaitSeconds?: number; // 예상 대기 시간
}

export function SearchProgress({
  isSearching,
  onCancel,
  jobStatus,
  realProgress,
  queuePosition,
  totalQueueSize,
  statusMessage: apiStatusMessage,
  estimatedWaitSeconds,
}: SearchProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 타이머 구현 (1초마다 증가)
  useEffect(() => {
    if (!isSearching) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSearching]);

  // 시각적 상태 결정
  const visualState = jobStatus === 'active' ? 'ACTIVE' : 'QUEUED';

  // 진행률 계산
  const displayProgress = realProgress !== undefined ? realProgress : (visualState === 'ACTIVE' ? 10 : 5);

  // 큐 위치 메시지
  const queueMessage =
    queuePosition && totalQueueSize
      ? `Position ${queuePosition} of ${totalQueueSize}`
      : queuePosition
      ? `Position ${queuePosition}`
      : null;

  // Edge case: Position 1이지만 아직 대기 중
  const isFirstInQueue = queuePosition === 1 && visualState === 'QUEUED';

  // Edge case: 예상 시간 초과 감지
  const elapsedExceedsEstimate =
    estimatedWaitSeconds && elapsedSeconds > estimatedWaitSeconds;

  // 상태 메시지 - API 메시지가 없을 때만 기본값 사용
  let displayMessage = apiStatusMessage;
  if (!displayMessage) {
    if (elapsedExceedsEstimate) {
      displayMessage = 'Processing...';
    } else if (isFirstInQueue) {
      displayMessage = 'Starting worker...';
    } else if (visualState === 'QUEUED') {
      displayMessage = 'Waiting in queue...';
    } else {
      displayMessage = 'Processing your request...';
    }
  }

  // 예상 대기 시간 표시 (초과하면 숨김)
  const showEstimatedWait = estimatedWaitSeconds && !elapsedExceedsEstimate;

  return (
    <div className={`search-progress-container ${visualState.toLowerCase()}`}>
      <div className="progress-content">
        {/* QUEUED 상태 - 큐 위치 강조 */}
        {visualState === 'QUEUED' && queuePosition ? (
          <>
            <div className="queue-position-display">
              <div className="queue-number">{queuePosition}</div>
              {totalQueueSize && <div className="queue-total">of {totalQueueSize}</div>}
            </div>
            {queueMessage && <p className="queue-message">{queueMessage}</p>}
            {showEstimatedWait && (
              <p className="estimated-wait">Estimated wait: {Math.ceil(estimatedWaitSeconds)}s</p>
            )}
          </>
        ) : (
          <>
            {/* ACTIVE 상태 - 스피너와 경과 시간만 표시 */}
            <div className="spinner-container">
              <Loader2 className="spinner-icon animate-spin" />
              <span className="elapsed-time">{elapsedSeconds}s</span>
            </div>
          </>
        )}

        {/* 상태 메시지 */}
        <p className="status-message">{displayMessage}</p>

        {/* 진행바 */}
        <div className="progress-bar-container">
          <div
            className={`progress-bar-fill ${visualState.toLowerCase()}`}
            style={{
              width: `${displayProgress}%`,
              transition: 'width 0.6s ease',
            }}
          />
        </div>

        {/* 취소 버튼 */}
        <button onClick={onCancel} className="cancel-button">
          <X className="w-4 h-4" />
          Cancel Search
        </button>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes queuePulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0%, 100% {
            background-position: -1000px 0;
          }
          50% {
            background-position: 1000px 0;
          }
        }

        .search-progress-container {
          margin: 24px 0;
          padding: 32px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          animation: fadeInUp 0.4s ease-out;
        }

        .search-progress-container.queued {
          border-color: rgba(59, 130, 246, 0.2);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.02) 0%, rgba(255, 255, 255, 0.98) 100%);
        }

        .search-progress-container.active {
          border-color: rgba(34, 197, 94, 0.2);
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.02) 0%, rgba(255, 255, 255, 0.98) 100%);
        }

        .progress-content {
          max-width: 480px;
          margin: 0 auto;
          text-align: center;
        }

        /* QUEUED 상태 스타일 */
        .queue-position-display {
          margin-bottom: 20px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 16px;
          animation: slideDown 0.4s ease-out;
        }

        .queue-number {
          font-size: 48px;
          font-weight: 700;
          color: #3b82f6;
          line-height: 1;
          letter-spacing: -0.02em;
          animation: queuePulse 1.5s ease-in-out infinite;
        }

        .queue-total {
          font-size: 14px;
          color: #6b7280;
          margin-top: 6px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .queue-message {
          font-size: 13px;
          font-weight: 600;
          color: #3b82f6;
          margin-bottom: 10px;
          margin-top: 12px;
          letter-spacing: 0.04em;
          animation: slideDown 0.5s ease-out 0.1s backwards;
        }

        .estimated-wait {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
          margin-top: 8px;
          animation: slideDown 0.5s ease-out 0.2s backwards;
          font-weight: 500;
        }

        /* ACTIVE 상태 스타일 */
        .spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .spinner-icon {
          width: 24px;
          height: 24px;
          color: #22c55e;
          opacity: 0.8;
        }

        .elapsed-time {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.02em;
        }

        .progress-display {
          font-size: 36px;
          font-weight: 700;
          color: #22c55e;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
          animation: slideDown 0.4s ease-out;
        }

        .status-message {
          font-size: 13px;
          font-weight: 600;
          color: #6b6b6b;
          margin-bottom: 24px;
          margin-top: 16px;
          letter-spacing: 0.04em;
          animation: slideDown 0.5s ease-out 0.15s backwards;
        }

        .progress-bar-container {
          width: 100%;
          height: 6px;
          background-color: rgba(0, 0, 0, 0.06);
          border-radius: 9999px;
          overflow: hidden;
          margin-bottom: 28px;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }

        .progress-bar-fill.queued {
          background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        .progress-bar-fill.active {
          background: linear-gradient(90deg, #22c55e 0%, #4ade80 50%, #22c55e 100%);
          background-size: 200% 100%;
          animation: shimmer 2s ease-in-out infinite;
        }

        .cancel-button {
          margin-top: 8px;
          padding: 8px 18px;
          background-color: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .cancel-button:hover {
          background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%);
          border-color: rgba(0, 0, 0, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .cancel-button:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        @media (max-width: 640px) {
          .search-progress-container {
            margin: 16px 0;
            padding: 20px;
            border-radius: 10px;
          }

          .queue-number {
            font-size: 36px;
          }

          .progress-display {
            font-size: 28px;
          }

          .elapsed-time {
            font-size: 24px;
          }

          .status-message {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
