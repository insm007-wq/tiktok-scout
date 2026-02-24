"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Play, Heart, MessageCircle, Share2, Bookmark, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import Toast, { type Toast as ToastType } from "@/app/components/Toast/Toast";
import { formatNumber, formatVideoDuration } from "@/lib/formatters";
import { getRelativeDateString } from "@/lib/dateUtils";
import "./bookmarks.css";

interface Video {
  id: string;
  title: string;
  description: string;
  creator: string;
  creatorUrl?: string;
  followerCount?: number;
  playCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createTime: number;
  videoDuration: number;
  hashtags: string[];
  thumbnail?: string;
  videoUrl?: string;
  webVideoUrl?: string;
}

interface BookmarkItem {
  _id: string;
  videoId: string;
  platform: string;
  videoData: Video;
  createdAt: string;
}

export default function BookmarksPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const addToast = useCallback((type: "success" | "error" | "warning" | "info", message: string, title?: string, duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastType = { id, type, message, title, duration };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then((data) => {
        if (data.bookmarks) {
          setBookmarks(data.bookmarks);
        }
      })
      .catch(() => {
        addToast("error", "즐겨찾기를 불러오지 못했습니다.");
      })
      .finally(() => setIsLoading(false));
  }, [addToast]);

  const handleRemoveBookmark = async (item: BookmarkItem) => {
    try {
      await fetch(`/api/bookmarks/${item.videoId}?platform=${item.platform}`, { method: "DELETE" });
      setBookmarks((prev) => prev.filter((b) => b.videoId !== item.videoId || b.platform !== item.platform));
      addToast("info", "즐겨찾기에서 제거되었습니다.", "🗑️ 제거", 2000);
    } catch {
      addToast("error", "제거에 실패했습니다.");
    }
  };

  const getDisplayThumbnail = (video: Video): string | undefined => {
    const raw = video.thumbnail;
    if (typeof raw === "string") return raw || undefined;
    if (raw && typeof raw === "object" && "url" in raw) return (raw as { url: string }).url || undefined;
    return undefined;
  };

  return (
    <div className="bookmarks-page">
      <div className="bookmarks-header">
        <button className="bookmarks-back-btn" onClick={() => router.push("/dashboard")}>
          <ArrowLeft size={14} />
          검색으로 돌아가기
        </button>
        <h1 className="bookmarks-title">즐겨찾기</h1>
        {!isLoading && (
          <span className="bookmarks-count">총 {bookmarks.length}개</span>
        )}
      </div>

      {isLoading ? (
        <div className="bookmarks-loading">불러오는 중...</div>
      ) : bookmarks.length === 0 ? (
        <div className="bookmarks-empty">
          <div className="bookmarks-empty-icon">⭐</div>
          <p className="bookmarks-empty-title">저장한 영상이 없습니다</p>
          <p className="bookmarks-empty-desc">검색 페이지에서 마음에 드는 영상을 즐겨찾기에 추가해보세요</p>
        </div>
      ) : (
        <div className="bookmarks-grid">
          {bookmarks.map((item) => {
            const video = item.videoData;
            const thumb = getDisplayThumbnail(video);
            return (
              <div key={`${item.platform}-${item.videoId}`} className="bookmark-card">
                <div
                  className="bookmark-thumbnail-container"
                  onClick={() => video.webVideoUrl && window.open(video.webVideoUrl, "_blank", "noopener,noreferrer")}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={video.title}
                      className="bookmark-thumbnail"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="bookmark-thumbnail-fallback">🎬</div>
                  )}

                  <div className="bookmark-duration-badge">{formatVideoDuration(video.videoDuration)}</div>
                  {video.createTime && (
                    <div className="bookmark-date-badge">{getRelativeDateString(new Date(video.createTime))}</div>
                  )}

                  <div className="bookmark-overlay">
                    <div className="bookmark-overlay-creator">
                      <span>@{video.creator}</span>
                      {video.followerCount && (
                        <span style={{ fontSize: "10px", opacity: 0.9 }}>· {formatNumber(video.followerCount)}</span>
                      )}
                    </div>
                    <div className="bookmark-overlay-title">{video.title}</div>
                    <div className="bookmark-overlay-stats">
                      <div className="bookmark-stat-item">
                        <Play className="bookmark-stat-icon" />
                        <span>{video.playCount ? formatNumber(video.playCount) : "—"}</span>
                      </div>
                      <div className="bookmark-stat-item">
                        <Heart className="bookmark-stat-icon" />
                        <span>{formatNumber(video.likeCount)}</span>
                      </div>
                      <div className="bookmark-stat-item">
                        <MessageCircle className="bookmark-stat-icon" />
                        <span>{formatNumber(video.commentCount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bookmark-actions">
                  {video.webVideoUrl && (
                    <a
                      href={video.webVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bookmark-action-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="bookmark-action-icon" />
                      열기
                    </a>
                  )}
                  <button
                    className="bookmark-action-btn danger"
                    onClick={() => handleRemoveBookmark(item)}
                  >
                    <Bookmark className="bookmark-action-icon" />
                    해제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
