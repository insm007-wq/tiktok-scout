"use client";

import { useState, useEffect, useCallback } from "react";
import type React from "react";
import { ArrowLeft, Play, Heart, MessageCircle, Share2, Bookmark, ExternalLink, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import Toast, { type Toast as ToastType } from "@/app/components/Toast/Toast";
import { formatNumber, formatVideoDuration } from "@/lib/formatters";
import { getRelativeDateString } from "@/lib/dateUtils";
import { isCdnUrl } from "@/lib/utils/validateMediaUrl";
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
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(new Set());
  const [refreshingThumbnailId, setRefreshingThumbnailId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

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

  const handleThumbnailError = useCallback(
    (item: BookmarkItem, e: React.SyntheticEvent<HTMLImageElement>) => {
      setFailedThumbnails((prev) => {
        const next = new Set(prev);
        next.add(item._id);
        return next;
      });

      e.currentTarget.src =
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23111111" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" font-size="50" fill="%23999"%3E🎬%3C/text%3E%3C/svg%3E';
      e.currentTarget.alt = "썸네일을 불러올 수 없습니다";
    },
    [],
  );

  const handleRefreshThumbnail = useCallback(
    async (item: BookmarkItem) => {
      try {
        setRefreshingThumbnailId(item._id);

        const res = await fetch("/api/bookmarks/refresh-thumbnail", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            videoId: item.videoId,
            platform: item.platform,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.thumbnail) {
          const message = data?.error || "새 썸네일을 가져오지 못했습니다.";
          addToast("error", message, "❌ 갱신 실패");
          return;
        }

        // 북마크 상태 안의 썸네일/프리뷰 URL 갱신
        setBookmarks((prev) =>
          prev.map((b) =>
            b._id === item._id
              ? {
                  ...b,
                  videoData: {
                    ...b.videoData,
                    thumbnail: data.thumbnail as string,
                    ...(data.videoUrl ? { videoUrl: data.videoUrl as string } : {}),
                  },
                }
              : b,
          ),
        );

        // 실패 목록에서 제거
        setFailedThumbnails((prev) => {
          const next = new Set(prev);
          next.delete(item._id);
          return next;
        });

        addToast("success", "썸네일을 새로고침했습니다.", "🔄 갱신 완료", 2500);
      } catch (error) {
        console.error("[Bookmarks] Refresh thumbnail error:", error);
        addToast("error", "썸네일 새로고침 중 오류가 발생했습니다.", "❌ 갱신 실패");
      } finally {
        setRefreshingThumbnailId(null);
      }
    },
    [addToast],
  );

  const handleRefreshAll = useCallback(async () => {
    try {
      setIsRefreshingAll(true);

      const res = await fetch("/api/bookmarks/refresh-all", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        addToast("error", data?.error || "전체 새로고침에 실패했습니다.", "❌ 전체 새로고침 실패");
        return;
      }

      // 응답에 포함된 최신 목록으로 바로 반영 (추가 GET 요청 없음)
      if (Array.isArray(data.bookmarks)) {
        setBookmarks(data.bookmarks);
        setFailedThumbnails(new Set());
      } else {
        const listRes = await fetch("/api/bookmarks");
        const listData = await listRes.json();
        if (listData.bookmarks) {
          setBookmarks(listData.bookmarks);
          setFailedThumbnails(new Set());
        }
      }

      const updated = data.updatedCount ?? 0;
      const failedCount = data.failedCount ?? 0;
      const skippedCount = data.skippedCount ?? 0;
      const message =
        updated === 0 && failedCount === 0 && skippedCount > 0
          ? "갱신할 항목이 없습니다. 썸네일/비디오 URL이 이미 최신 상태입니다."
          : failedCount > 0
            ? `썸네일/프리뷰 ${updated}개 새로고침 완료 (${failedCount}개 실패)`
            : `썸네일/프리뷰 ${updated}개 새로고침 완료`;
      addToast("success", message, "🔄 전체 새로고침", 3500);
    } catch (error) {
      console.error("[Bookmarks] Refresh all error:", error);
      addToast("error", "전체 새로고침 중 오류가 발생했습니다.", "❌ 전체 새로고침 실패");
    } finally {
      setIsRefreshingAll(false);
    }
  }, [addToast]);

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
          <>
            <span className="bookmarks-count">총 {bookmarks.length}개</span>
            {bookmarks.length > 0 && (
              <button
                type="button"
                className="bookmarks-refresh-all-btn"
                onClick={handleRefreshAll}
                disabled={isRefreshingAll}
              >
                {isRefreshingAll ? (
                  <>
                    <Loader
                      className="spinner-icon"
                      style={{ width: 14, height: 14, marginRight: 6, color: "#facc15" }}
                    />
                    전체 새로고침 중...
                  </>
                ) : (
                  <>전체 새로고침</>
                )}
              </button>
            )}
          </>
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
            const isCdnThumb = thumb ? isCdnUrl(thumb) : false;
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
                      onError={(e) => handleThumbnailError(item, e)}
                    />
                  ) : (
                    <div className="bookmark-thumbnail-fallback">🎬</div>
                  )}

                  {failedThumbnails.has(item._id) && (
                    <div
                      className="bookmark-refresh-overlay"
                      onClick={(e) => {
                        // 카드 전체 클릭(영상 열기)와 분리
                        e.stopPropagation();
                      }}
                    >
                      <span className="bookmark-refresh-text">썸네일이 만료되었어요</span>
                      <button
                        className="bookmark-refresh-button"
                        type="button"
                        onClick={() => handleRefreshThumbnail(item)}
                        disabled={refreshingThumbnailId === item._id}
                      >
                        {refreshingThumbnailId === item._id ? "갱신 중..." : "썸네일 새로고침"}
                      </button>
                    </div>
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
                  {thumb && isCdnThumb && (
                    <button
                      className="bookmark-action-btn"
                      onClick={() => handleRefreshThumbnail(item)}
                      disabled={refreshingThumbnailId === item._id}
                    >
                      {refreshingThumbnailId === item._id ? "썸네일 갱신 중..." : "썸네일 새로고침"}
                    </button>
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
