"use client";

interface ChannelModalProps {
  isOpen: boolean;
  channelTitle: string;
  channelDescription: string;
  viewCount: number;
  subscriberCount: boolean;
  subscriberCountValue: number;
  videoCount: number;
  customUrl: string;
  channelId: string;
  isLoading: boolean;
  onClose: () => void;
}

export default function ChannelModal({
  isOpen,
  channelTitle,
  channelDescription,
  viewCount,
  subscriberCount,
  subscriberCountValue,
  videoCount,
  customUrl,
  channelId,
  isLoading,
  onClose,
}: ChannelModalProps) {
  if (!isOpen) return null;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <>
      <div className="channel-modal" style={{ display: isOpen ? "flex" : "none" }} onClick={onClose}>
        <div className="channel-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="channel-modal-header">
            <div className="channel-modal-title">📺 {channelTitle} 채널 분석</div>
            <button className="channel-modal-close" onClick={onClose}>
              ✕
            </button>
          </div>

          {isLoading ? (
            <div className="channel-loading">채널 정보를 불러오는 중...</div>
          ) : (
            <>
              <div className="channel-description">
                {channelDescription.substring(0, 300)}
                {channelDescription.length > 300 ? "..." : ""}
              </div>

              <div className="channel-stats-grid">
                <div className="channel-stat-box">
                  <div className="channel-stat-label">총 조회수</div>
                  <div className="channel-stat-value">{formatNumber(viewCount)}</div>
                </div>
                <div className="channel-stat-box">
                  <div className="channel-stat-label">구독자 수</div>
                  <div className="channel-stat-value">{subscriberCount ? "비공개" : formatNumber(subscriberCountValue)}</div>
                </div>
                <div className="channel-stat-box">
                  <div className="channel-stat-label">총 영상 수</div>
                  <div className="channel-stat-value">{formatNumber(videoCount)}</div>
                </div>
                <div className="channel-stat-box">
                  <div className="channel-stat-label">채널 카테고리</div>
                  <div className="channel-stat-value">{customUrl || "N/A"}</div>
                </div>
              </div>

              <div style={{ textAlign: "center", marginTop: "15px" }}>
                <a
                  href={`https://www.youtube.com/channel/${channelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "10px 20px",
                    backgroundColor: "#ff0000",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "4px",
                    fontWeight: "600",
                  }}
                >
                  YouTube 채널 방문
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
