"use client";

import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";

interface SearchProgressProps {
  isSearching: boolean;
  onCancel: () => void;
  jobStatus?: "waiting" | "active" | "delayed" | "paused";
  realProgress?: number;
  queuePosition?: number;
  totalQueueSize?: number;
  statusMessage?: string;
  estimatedWaitSeconds?: number;
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

  const visualState = jobStatus === "active" ? "ACTIVE" : "QUEUED";
  const displayProgress = realProgress !== undefined ? realProgress : visualState === "ACTIVE" ? 10 : 5;

  const queueMessage =
    queuePosition && totalQueueSize ? `Position ${queuePosition} of ${totalQueueSize}` : queuePosition ? `Position ${queuePosition}` : null;

  const isFirstInQueue = queuePosition === 1 && visualState === "QUEUED";
  const elapsedExceedsEstimate = estimatedWaitSeconds && elapsedSeconds > estimatedWaitSeconds;

  let displayMessage = apiStatusMessage;
  if (!displayMessage) {
    if (elapsedExceedsEstimate) {
      displayMessage = "Processing...";
    } else if (isFirstInQueue) {
      displayMessage = "Starting worker...";
    } else if (visualState === "QUEUED") {
      displayMessage = "Waiting in queue...";
    } else {
      displayMessage = "Processing your request...";
    }
  }

  const showEstimatedWait = estimatedWaitSeconds && !elapsedExceedsEstimate;

  return (
    <div className={`search-progress-container ${visualState.toLowerCase()}`}>
      <div className="progress-content">
        {visualState === "QUEUED" && queuePosition ? (
          <>
            <div className="queue-position-display">
              <div className="queue-number">{queuePosition}</div>
              {totalQueueSize && <div className="queue-total">of {totalQueueSize}</div>}
            </div>
            {queueMessage && <p className="queue-message">{queueMessage}</p>}
            {showEstimatedWait && <p className="estimated-wait">Estimated wait: {Math.ceil(estimatedWaitSeconds)}s</p>}
          </>
        ) : (
          <>
            <div className="spinner-container">
              <Loader2 className="spinner-icon animate-spin" />
              <span className="elapsed-time">{elapsedSeconds}s</span>
            </div>
          </>
        )}

        <p className="status-message">{displayMessage}</p>

        <div className="progress-bar-container">
          <div
            className={`progress-bar-fill ${visualState.toLowerCase()}`}
            style={{
              width: `${displayProgress}%`,
              transition: "width 0.6s ease",
            }}
          />
        </div>

        <button onClick={onCancel} className="cancel-button">
          <X className="w-4 h-4" />
          Cancel Search
        </button>
      </div>

      <style jsx>{`
        /* 깜박임을 유발하는 등장 애니메이션(fadeInUp, slideDown) 정의를 제거했습니다 */

        @keyframes queuePulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
          }
        }

        @keyframes shimmer {
          0%,
          100% {
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
          /* animation: fadeInUp 0.4s ease-out;  <-- 제거: 상태 업데이트 시 깜박임 원인 */
          transition: all 0.3s ease; /* 부드러운 전환 추가 */
        }

        .search-progress-container.queued {
          border-color: rgba(59, 130, 246, 0.2);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.02) 0%, rgba(255, 255, 255, 0.98) 100%);
        }

        .search-progress-container.active {
          border-color: rgba(59, 130, 246, 0.2);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.02) 0%, rgba(255, 255, 255, 0.98) 100%);
        }

        .progress-content {
          max-width: 480px;
          margin: 0 auto;
          text-align: center;
        }

        .queue-position-display {
          margin-bottom: 20px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 16px;
          /* animation: slideDown 0.4s ease-out; <-- 제거 */
        }

        .queue-number {
          font-size: 48px;
          font-weight: 700;
          color: #3b82f6;
          line-height: 1;
          letter-spacing: -0.02em;
          animation: queuePulse 1.5s ease-in-out infinite; /* Pulse는 무한 반복이라 괜찮음 */
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
          /* animation: slideDown ... <-- 제거 */
        }

        .estimated-wait {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
          margin-top: 8px;
          font-weight: 500;
          /* animation: slideDown ... <-- 제거 */
        }

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
          color: #3b82f6;
          opacity: 0.8;
        }

        .elapsed-time {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.02em;
        }

        .status-message {
          font-size: 13px;
          font-weight: 600;
          color: #6b6b6b;
          margin-bottom: 24px;
          margin-top: 16px;
          letter-spacing: 0.04em;
          /* animation: slideDown ... <-- 제거 */
        }

        .progress-bar-container {
          width: 100%;
          height: 6px;
          background-color: rgba(59, 130, 246, 0.1);
          border-radius: 9999px;
          overflow: hidden;
          margin-bottom: 28px;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); /* 너비 변경은 부드럽게 유지 */
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }

        .progress-bar-fill.queued {
          background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        .progress-bar-fill.active {
          background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%);
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
