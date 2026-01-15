'use client';

import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';

interface SearchProgressProps {
  isSearching: boolean;
  onCancel: () => void;
}

export function SearchProgress({ isSearching, onCancel }: SearchProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('서버 연결 중...');

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

  // 진행바 애니메이션 (90%까지 증가)
  useEffect(() => {
    if (!isSearching) {
      setProgress(0);
      return;
    }

    // 90%까지 60초에 걸쳐 증가
    const targetProgress = 90;
    const duration = 60000; // 60초
    const increment = (targetProgress / duration) * 100; // 100ms마다

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= targetProgress) return prev;
        return Math.min(prev + increment, targetProgress);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isSearching]);

  // 상태 메시지 변경
  useEffect(() => {
    if (!isSearching) {
      setStatusMessage('서버 연결 중...');
      return;
    }

    if (elapsedSeconds <= 10) {
      setStatusMessage('서버 연결 중...');
    } else if (elapsedSeconds <= 30) {
      setStatusMessage('크롤링 액터 시작...');
    } else if (elapsedSeconds <= 60) {
      setStatusMessage('데이터 수집 중...');
    } else if (elapsedSeconds <= 90) {
      setStatusMessage('결과 처리 중...');
    } else {
      setStatusMessage('거의 완료...');
    }
  }, [elapsedSeconds, isSearching]);

  return (
    <div className="search-progress-container">
      <div className="progress-content">
        {/* 스피너 + 경과 시간 */}
        <div className="spinner-container">
          <Loader2 className="spinner-icon animate-spin" />
          <span className="elapsed-time">{elapsedSeconds}초</span>
        </div>

        {/* 상태 메시지 */}
        <p className="status-message">{statusMessage}</p>

        {/* 진행바 */}
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 취소 버튼 (10초 후 표시) */}
        {elapsedSeconds >= 10 && (
          <button
            onClick={onCancel}
            className="cancel-button"
          >
            <X className="w-4 h-4" />
            검색 취소
          </button>
        )}
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

        .search-progress-container {
          margin: 24px 0;
          padding: 32px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          animation: fadeInUp 0.4s ease-out;
        }

        .progress-content {
          max-width: 480px;
          margin: 0 auto;
          text-align: center;
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
          color: #1a1a1a;
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
          text-transform: uppercase;
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
          background: linear-gradient(90deg, #1a1a1a 0%, #6b6b6b 100%);
          border-radius: 9999px;
          transition: width 0.3s ease;
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
          background-color: #f5f5f5;
          border-color: rgba(0, 0, 0, 0.2);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .cancel-button:active {
          transform: scale(0.98);
        }

        @media (max-width: 640px) {
          .search-progress-container {
            margin: 16px 0;
            padding: 20px;
            border-radius: 10px;
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
