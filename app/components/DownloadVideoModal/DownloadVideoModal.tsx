"use client";

import { useState, useRef } from "react";
import { X, Download, AlertCircle } from "lucide-react";

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

const DOWNLOAD_TIMEOUT_MS = 90_000; // 90초 초과 시 자동 종료

export default function DownloadVideoModal({ isOpen, onClose, onDownload, isLoading = false }: DownloadVideoModalProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<"tiktok" | "douyin" | "xiaohongshu" | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTriggeredRef = useRef(false);

  if (!isOpen) return null;

  const handleCancelDownload = (closeAfter = false) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setError("다운로드가 취소되었습니다.");
    setIsDownloading(false);
    if (closeAfter) onClose();
  };

  const detectPlatformFromUrl = (url: string): "tiktok" | "douyin" | "xiaohongshu" | null => {
    // Detect platform early for warnings
    let platform: "tiktok" | "douyin" | "xiaohongshu" | null = null;
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

    const webVideoUrl = input.trim();
    const platformDetected = detectPlatformFromUrl(webVideoUrl);
    if (!platformDetected) {
      setError("지원하지 않는 플랫폼입니다. TikTok, Douyin, 샤오홍슈 URL을 입력해주세요.");
      return;
    }

    const videoId = extractVideoIdFromUrl(webVideoUrl) || "video";
    setIsDownloading(true);
    timeoutTriggeredRef.current = false;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      timeoutTriggeredRef.current = true;
      abortControllerRef.current?.abort();
    }, DOWNLOAD_TIMEOUT_MS);

    try {
      const response = await fetch("/api/download-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webVideoUrl,
          videoId,
          platform: platformDetected,
        }),
        signal,
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.openInBrowser && data.webVideoUrl) {
          window.open(data.webVideoUrl, "_blank");
          setError("⚠️ Xiaohongshu는 웹 브라우저에서 직접 다운로드하셔야 합니다. 새 탭을 열었습니다.");
          return;
        }
        throw new Error(data.error || "다운로드 실패");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${platformDetected}_${videoId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setInput("");
      onClose();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError(timeoutTriggeredRef.current
          ? "다운로드 시간이 초과되었습니다. (90초) 다시 시도해 주세요."
          : "다운로드가 취소되었습니다.");
        return;
      }
      const message = err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      timeoutTriggeredRef.current = false;
      abortControllerRef.current = null;
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
          backgroundColor: "rgba(10, 10, 15, 0.85)",
          backdropFilter: "blur(12px)",
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
            background: "linear-gradient(135deg, rgba(37, 37, 48, 0.98) 0%, rgba(26, 26, 36, 0.98) 100%)",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "600px",
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 24px 80px rgba(0, 0, 0, 0.7)",
            animation: "slideUp 0.3s ease-out",
            border: "1px solid rgba(0, 229, 115, 0.2)",
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
                color: "#FFFFFF",
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
              type="button"
              onClick={() => (isDownloading ? handleCancelDownload(true) : onClose())}
              disabled={isLoading}
              style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: isLoading ? "not-allowed" : "pointer",
                color: "rgba(255, 255, 255, 0.5)",
                padding: "0",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.color = "#00E573")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)")}
              title={isDownloading ? "다운로드 취소" : "닫기"}
            >
              <X size={20} />
            </button>
          </div>

          {/* 정보 메시지 */}
          <div
            style={{
              padding: "12px",
              backgroundColor: "rgba(0, 229, 115, 0.1)",
              border: "1px solid rgba(0, 229, 115, 0.3)",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "13px",
              color: "#00E573",
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>TikTok</strong> 영상 URL을 붙여넣기하면 자동으로 감지하여 다운로드합니다.
            </div>
          </div>

          {/* Xiaohongshu 경고 */}
          {detectedPlatform === "xiaohongshu" && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "rgba(157, 78, 221, 0.1)",
                border: "1px solid rgba(157, 78, 221, 0.3)",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#C77DFF",
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>⚠️ 참고:</strong> Xiaohongshu는 앱 기반 보호로 인해 웹에서 직접 보기만 지원됩니다. 새 탭에서 브라우저로 열리며,
                그곳에서 다운로드할 수 있습니다.
              </div>
            </div>
          )}

          {/* 진행 중 표시 + 취소 안내 */}
          {isDownloading && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px",
                backgroundColor: "rgba(0, 229, 115, 0.1)",
                border: "1px solid rgba(0, 229, 115, 0.3)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#00E573",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    display: "inline-block",
                    width: "12px",
                    height: "12px",
                    border: "2px solid rgba(0, 229, 115, 0.2)",
                    borderTop: "2px solid #00E573",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                비디오를 찾는 중입니다... (90초 초과 시 자동 취소)
              </span>
              <button
                type="button"
                onClick={() => handleCancelDownload()}
                style={{
                  padding: "6px 12px",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  background: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "rgba(255, 255, 255, 0.9)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                취소
              </button>
            </div>
          )}

          {/* URL 입력 필드 */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "rgba(255, 255, 255, 0.75)",
                marginBottom: "8px",
              }}
            >
              영상 URL
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  const newInput = e.target.value;
                  setInput(newInput);
                  setError("");
                  // Detect platform as user types
                  setDetectedPlatform(detectPlatformFromUrl(newInput));
                }}
                onKeyDown={handleKeyDown}
                placeholder="https://www.tiktok.com/@gulum323/video/7595183372683463957"
                disabled={isDownloading || isLoading}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: error ? "2px solid #ff6b6b" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  backgroundColor: isDownloading || isLoading ? "rgba(37, 37, 48, 0.4)" : "rgba(37, 37, 48, 0.6)",
                  color: "#FFFFFF",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                className="download-modal-input"
                onFocus={(e) => {
                  if (!error) {
                    e.currentTarget.style.borderColor = "#00E573";
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = error ? "#ff6b6b" : "rgba(255, 255, 255, 0.08)";
                }}
              />
              <button
                onClick={handleDownload}
                disabled={isDownloading || isLoading || !input.trim()}
                style={{
                  padding: "12px 16px",
                  border: "none",
                  background:
                    isDownloading || isLoading || !input.trim()
                      ? "rgba(0, 229, 115, 0.3)"
                      : "linear-gradient(135deg, #00E573 0%, #00B85C 100%)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: isDownloading || isLoading || !input.trim() ? "not-allowed" : "pointer",
                  color: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.3s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isDownloading && !isLoading && input.trim()) {
                    e.currentTarget.style.background = "linear-gradient(135deg, #00FF7F 0%, #00E573 100%)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDownloading && !isLoading && input.trim()) {
                    e.currentTarget.style.background = "linear-gradient(135deg, #00E573 0%, #00B85C 100%)";
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

          {/* 에러 메시지 + 다시 시도 */}
          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px",
                backgroundColor: "rgba(255, 107, 107, 0.1)",
                border: "1px solid rgba(255, 107, 107, 0.3)",
                borderRadius: "8px",
                color: "#ff6b6b",
                fontSize: "13px",
              }}
            >
              <div style={{ marginBottom: !error.includes("취소") ? "10px" : 0 }}>{error}</div>
              {!error.includes("취소") && (
                <button
                  type="button"
                  onClick={() => setError("")}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid rgba(255, 107, 107, 0.5)",
                    background: "rgba(255, 107, 107, 0.15)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#ff8a8a",
                    cursor: "pointer",
                  }}
                >
                  다시 시도
                </button>
              )}
            </div>
          )}

          {/* 하단 버튼: 다운로드 중이면 취소만, 아니면 닫기 */}
          <div style={{ display: "flex", gap: "12px" }}>
            {isDownloading ? (
              <button
                type="button"
                onClick={() => handleCancelDownload()}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  backgroundColor: "rgba(255, 100, 100, 0.2)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  color: "#ff8a8a",
                  transition: "all 0.2s",
                }}
              >
                취소
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: "rgba(37, 37, 48, 0.4)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  color: "rgba(255, 255, 255, 0.75)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = "rgba(37, 37, 48, 0.7)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(37, 37, 48, 0.4)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                }}
              >
                닫기
              </button>
            )}
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
