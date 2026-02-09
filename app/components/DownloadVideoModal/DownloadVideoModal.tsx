"use client";

import { useState } from "react";
import { X, Download, AlertCircle, Loader } from "lucide-react";

interface Video {
  id: string;
  title: string;
  creator: string;
  playCount: number;
  likeCount: number;
  videoUrl?: string;
}

interface DownloadVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (video: Video) => void;
  isLoading?: boolean;
}

export default function DownloadVideoModal({
  isOpen,
  onClose,
  onDownload,
  isLoading = false,
}: DownloadVideoModalProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const detectPlatformFromUrl = (url: string): "tiktok" | "douyin" | "xiaohongshu" | null => {
    if (url.includes("tiktok.com")) return "tiktok";
    if (url.includes("douyin.com")) return "douyin";
    if (url.includes("xiaohongshu.com")) return "xiaohongshu";
    return null;
  };

  const extractVideoIdFromUrl = (url: string): string | null => {
    try {
      // TikTok: /video/7595183372683463957
      let match = url.match(/\/video\/(\d+)/);
      if (match) return match[1];

      // Douyin: /video/7595183372683463957 or /aweme/detail/7595183372683463957
      match = url.match(/\/aweme\/detail\/(\d+)/);
      if (match) return match[1];

      // Xiaohongshu: /explore/1234567890?search_id=...
      match = url.match(/\/explore\/(\d+)/);
      if (match) return match[1];

      return null;
    } catch {
      return null;
    }
  };

  const handleDownload = async () => {
    setError("");

    if (!input.trim()) {
      setError("URL을 입력해주세요.");
      return;
    }

    setIsDownloading(true);

    try {
      const webVideoUrl = input.trim();

      // Detect platform from URL
      const detectedPlatform = detectPlatformFromUrl(webVideoUrl);
      if (!detectedPlatform) {
        setError("지원하지 않는 플랫폼입니다. TikTok, Douyin, 샤오홍슈 URL을 입력해주세요.");
        setIsDownloading(false);
        return;
      }

      // Extract video ID for filename
      const videoId = extractVideoIdFromUrl(webVideoUrl) || "video";

      console.log("[Modal] 다운로드 요청:", {
        platform: detectedPlatform,
        webVideoUrl: webVideoUrl.substring(0, 80),
        videoId,
      });

      // Call download API directly
      const response = await fetch("/api/download-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webVideoUrl,
          videoId,
          platform: detectedPlatform,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "다운로드 실패");
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${detectedPlatform}_${videoId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Close modal after successful download
      setInput("");
      onClose();

    } catch (err) {
      setError(err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isDownloading && !isLoading) {
      handleDownload();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <>
      <div
        className="download-modal-overlay"
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          className="download-modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "600px",
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            animation: "slideUp 0.3s ease-out",
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#000",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Download size={24} />
              영상 다운로드
            </h2>
            <button
              onClick={onClose}
              disabled={isLoading || isDownloading}
              style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: isLoading || isDownloading ? "not-allowed" : "pointer",
                color: "#999",
                padding: "0",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => !(isLoading || isDownloading) && (e.currentTarget.style.color = "#000")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#999")}
            >
              <X size={20} />
            </button>
          </div>

          {/* 정보 메시지 */}
          <div
            style={{
              padding: "12px",
              backgroundColor: "#f0f4ff",
              border: "1px solid #d0deff",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "13px",
              color: "#3b5bdb",
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>TikTok, Douyin, 샤오홍슈</strong> 영상 URL을 붙여넣기하면 자동으로 감지하여 다운로드합니다.
            </div>
          </div>

          {/* URL 입력 필드 */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#000",
                marginBottom: "8px",
              }}
            >
              영상 URL
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKeyDown}
                placeholder="https://www.tiktok.com/@gulum323/video/7595183372683463957"
                disabled={isDownloading || isLoading}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: error ? "2px solid #ff6b6b" : "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  backgroundColor: isDownloading || isLoading ? "#f5f5f5" : "#fff",
                  color: "#000",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  if (!error) {
                    e.currentTarget.style.borderColor = "#000";
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = error ? "#ff6b6b" : "#ddd";
                }}
              />
              <button
                onClick={handleDownload}
                disabled={isDownloading || isLoading || !input.trim()}
                style={{
                  padding: "12px 16px",
                  border: "none",
                  backgroundColor: isDownloading || isLoading || !input.trim() ? "#ccc" : "#000",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: isDownloading || isLoading || !input.trim() ? "not-allowed" : "pointer",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isDownloading && !isLoading && input.trim()) {
                    e.currentTarget.style.backgroundColor = "#333";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDownloading && !isLoading && input.trim()) {
                    e.currentTarget.style.backgroundColor = "#000";
                  }
                }}
              >
                {isDownloading ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: "12px",
                        height: "12px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTop: "2px solid white",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    다운로드 중...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    다운로드
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px",
                backgroundColor: "#ffe0e0",
                border: "1px solid #ffb3b3",
                borderRadius: "8px",
                color: "#d32f2f",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {/* 버튼 */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onClose}
              disabled={isDownloading || isLoading}
              style={{
                flex: 1,
                padding: "12px",
                border: "1px solid #ddd",
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: isDownloading || isLoading ? "not-allowed" : "pointer",
                color: "#666",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                !isDownloading &&
                !isLoading &&
                ((e.currentTarget.style.backgroundColor = "#efefef"), (e.currentTarget.style.borderColor = "#999"))
              }
              onMouseLeave={(e) =>
                !isDownloading &&
                !isLoading &&
                ((e.currentTarget.style.backgroundColor = "#f5f5f5"), (e.currentTarget.style.borderColor = "#ddd"))
              }
            >
              닫기
            </button>
          </div>

          <style>{`
            @keyframes slideUp {
              from {
                transform: translateY(20px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      </div>
    </>
  );
}
