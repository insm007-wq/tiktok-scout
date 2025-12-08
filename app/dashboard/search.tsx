"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { LayoutGrid, Table2, Download } from "lucide-react";
import Spinner from "@/app/components/ui/Spinner";
import "./search.css";

type Platform = "tiktok" | "douyin" | "xiaohongshu";

interface Video {
  id: string;
  title: string;
  description: string;
  creator: string;
  creatorUrl?: string;
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

export default function Search() {
  const [searchInput, setSearchInput] = useState("");
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [isLoading, setIsLoading] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [sortBy, setSortBy] = useState("plays");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isTitleRefreshing, setIsTitleRefreshing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(350);
  const [isResizing, setIsResizing] = useState(false);
  const [error, setError] = useState("");
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleTitleClick = () => {
    setIsTitleRefreshing(true);
    setTimeout(() => {
      setIsTitleRefreshing(false);
      window.location.reload();
    }, 600);
  };

  // 저장된 너비 복원
  useEffect(() => {
    const savedWidth = localStorage.getItem("tiktok-scout-sidebar-width");
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth, 10));
    }
  }, []);

  // 검색 히스토리 로드
  useEffect(() => {
    const savedHistory = localStorage.getItem("tiktok-scout-search-history");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // 드래그로 너비 조정
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      const minWidth = 300;
      const maxWidth = 600;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "auto";
      document.body.style.userSelect = "auto";
    };
  }, [isResizing]);

  // 너비 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem("tiktok-scout-sidebar-width", sidebarWidth.toString());
  }, [sidebarWidth]);

  // 영상 정렬 함수
  const sortVideos = (items: Video[], sortOption: string) => {
    const sorted = [...items];

    switch (sortOption) {
      case "plays":
        sorted.sort((a, b) => b.playCount - a.playCount);
        break;
      case "likes":
        sorted.sort((a, b) => b.likeCount - a.likeCount);
        break;
      case "comments":
        sorted.sort((a, b) => b.commentCount - a.commentCount);
        break;
      case "recent":
        sorted.sort((a, b) => b.createTime - a.createTime);
        break;
      default:
        sorted.sort((a, b) => b.playCount - a.playCount);
        break;
    }

    return sorted;
  };

  const results = useMemo(() => {
    return sortVideos(videos, sortBy);
  }, [videos, sortBy]);

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) {
      setError("검색어를 입력해주세요");
      return;
    }

    // 검색 히스토리 저장
    const newHistory = [searchInput, ...searchHistory.filter(item => item !== searchInput)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("tiktok-scout-search-history", JSON.stringify(newHistory));

    setIsLoading(true);
    setError("");
    setVideos([]);

    try {
      // Bright Data API 호출
      const response = await fetch("/api/brightdata/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchInput,
          platform,
          limit: 50,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "검색 중 오류가 발생했습니다");
      }

      const data = await response.json();

      if (data.success && data.videos && data.videos.length > 0) {
        setVideos(data.videos);
        setError("");
      } else {
        setVideos([]);
        setError(data.error || "검색 결과가 없습니다");
      }
    } catch (error) {
      console.error("검색 오류:", error);
      setError(error instanceof Error ? error.message : "검색 중 오류가 발생했습니다");
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchInput, platform, searchHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 히스토리 항목 클릭 후 자동 검색
  const handleHistoryClick = useCallback(async (keyword: string) => {
    setSearchInput(keyword);

    // 검색 히스토리 업데이트
    const newHistory = [keyword, ...searchHistory.filter(item => item !== keyword)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("tiktok-scout-search-history", JSON.stringify(newHistory));

    // 자동 검색 시작
    setIsLoading(true);
    setError("");
    setVideos([]);

    try {
      const response = await fetch("/api/brightdata/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: keyword,
          platform,
          limit: 50,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "검색 중 오류가 발생했습니다");
      }

      const data = await response.json();

      if (data.success && data.videos && data.videos.length > 0) {
        setVideos(data.videos);
        setError("");
      } else {
        setVideos([]);
        setError(data.error || "검색 결과가 없습니다");
      }
    } catch (error) {
      console.error("검색 오류:", error);
      setError(error instanceof Error ? error.message : "검색 중 오류가 발생했습니다");
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, [platform, searchHistory]);

  // 히스토리 항목 삭제
  const handleDeleteHistory = (e: React.MouseEvent, keyword: string) => {
    e.stopPropagation();
    const newHistory = searchHistory.filter(item => item !== keyword);
    setSearchHistory(newHistory);
    localStorage.setItem("tiktok-scout-search-history", JSON.stringify(newHistory));
  };

  const handleExcelDownload = () => {
    if (results.length === 0) {
      setError("검색 결과가 없습니다");
      return;
    }

    const csvHeader = ["제목", "크리에이터", "조회수", "좋아요", "댓글", "공유", "해시태그"];
    const csvRows: string[][] = [];

    (results as Video[]).forEach((video) => {
      csvRows.push([
        `"${video.title.replace(/"/g, '""')}"`,
        `"${video.creator.replace(/"/g, '""')}"`,
        video.playCount.toString(),
        video.likeCount.toString(),
        video.commentCount.toString(),
        video.shareCount.toString(),
        `"${video.hashtags.join(", ")}"`,
      ]);
    });

    const csv = [csvHeader.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${platform}-videos-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // TikTok 앱/웹사이트로 이동
  const handleOpenTikTok = (video: Video) => {
    if (video.creatorUrl) {
      window.open(video.creatorUrl, "_blank");
    }
  };

  // 영상 다운로드 (서버 프록시 방식)
  const handleDownloadVideo = (video: Video) => {
    if (!video.videoUrl) {
      alert("영상 다운로드 URL을 사용할 수 없습니다.\n\n💡 다운로드 방법:\n1. TikTok 페이지에서 공유 버튼 클릭\n2. '다운로드' 선택\n\n또는 외부 사이트(예: savettik.com)를 이용해주세요.");
      if (video.webVideoUrl) {
        window.open(video.webVideoUrl, "_blank");
      }
      return;
    }

    try {
      // 서버 프록시를 통한 다운로드
      const downloadUrl = `/api/brightdata/download?url=${encodeURIComponent(video.videoUrl)}&name=${encodeURIComponent(`${video.id}.mp4`)}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("다운로드 시작:", video.id);
    } catch (error) {
      console.error("다운로드 오류:", error);
      alert("영상 다운로드 중 오류가 발생했습니다");
    }
  };

  // 영상 상세 페이지 모달 (간단한 버전)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  return (
    <>
      <div className="main-container">
        {/* 왼쪽 패널 */}
        <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          <div
            className="sidebar-title"
            onClick={handleTitleClick}
            style={{ cursor: "pointer", transition: "opacity 0.3s", opacity: isTitleRefreshing ? 0.5 : 1 }}
          >
            TikTok Scout
          </div>

          <div className="search-section">
            {/* 검색 입력 - 맨 위에 */}
            <div className="search-input-wrapper">
              <div className="search-label">검색어</div>
              <div className="search-container-with-button">
                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="검색할 키워드를 입력하세요"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  {searchHistory.length > 0 && searchInput === "" && (
                    <div className="search-history-dropdown active">
                      {searchHistory.map((keyword) => (
                        <div
                          key={keyword}
                          className="history-item"
                          onClick={() => handleHistoryClick(keyword)}
                        >
                          <span>{keyword}</span>
                          <button
                            className="history-delete"
                            onClick={(e) => handleDeleteHistory(e, keyword)}
                            title="삭제"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn-search" onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? "검색 중..." : "검색"}
                </button>
              </div>
            </div>

            {/* 플랫폼 선택 */}
            <div className="search-input-wrapper">
              <div className="search-label">플랫폼 선택</div>
              <div className="platform-selector">
                <label
                  className={`platform-option ${platform === "tiktok" ? "active" : ""}`}
                  onClick={() => setPlatform("tiktok")}
                >
                  <input
                    type="radio"
                    name="platform"
                    value="tiktok"
                    checked={platform === "tiktok"}
                    onChange={() => setPlatform("tiktok")}
                    style={{ display: "none" }}
                  />
                  <span className="platform-icon">🎵</span>
                  <span className="platform-name">TikTok</span>
                </label>
                <label
                  className={`platform-option ${platform === "douyin" ? "active" : ""}`}
                  onClick={() => setPlatform("douyin")}
                >
                  <input
                    type="radio"
                    name="platform"
                    value="douyin"
                    checked={platform === "douyin"}
                    onChange={() => setPlatform("douyin")}
                    style={{ display: "none" }}
                  />
                  <span className="platform-icon">🐉</span>
                  <span className="platform-name">Douyin</span>
                </label>
                <label
                  className={`platform-option ${platform === "xiaohongshu" ? "active" : ""}`}
                  onClick={() => setPlatform("xiaohongshu")}
                >
                  <input
                    type="radio"
                    name="platform"
                    value="xiaohongshu"
                    checked={platform === "xiaohongshu"}
                    onChange={() => setPlatform("xiaohongshu")}
                    style={{ display: "none" }}
                  />
                  <span className="platform-icon">❤️</span>
                  <span className="platform-name">Xiaohongshu</span>
                </label>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "10px", padding: "10px", backgroundColor: "#fee2e2", borderRadius: "4px" }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* 리사이저 */}
        <div
          ref={resizeRef}
          className="sidebar-resizer"
          onMouseDown={() => setIsResizing(true)}
        ></div>

        {/* 오른쪽 컨텐츠 영역 */}
        <div className="content">
          <div className="content-header">
            <div className="content-title">검색결과</div>
            <div className="controls-right">
              <div className="view-toggle">
                <button className={`view-btn ${viewMode === "card" ? "active" : ""}`} onClick={() => setViewMode("card")}>
                  <LayoutGrid size={16} style={{ display: "inline", marginRight: "4px" }} />
                  카드
                </button>
                <button className={`view-btn ${viewMode === "table" ? "active" : ""}`} onClick={() => setViewMode("table")}>
                  <Table2 size={16} style={{ display: "inline", marginRight: "4px" }} />
                  테이블
                </button>
              </div>
              <select className="sort-dropdown" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="plays">조회수순</option>
                <option value="likes">좋아요순</option>
                <option value="comments">댓글순</option>
                <option value="recent">최신순</option>
              </select>
              <button className="btn-excel" onClick={handleExcelDownload}>
                <Download size={16} style={{ display: "inline", marginRight: "4px" }} />
                엑셀
              </button>
            </div>
          </div>

          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: isLoading || results.length === 0 ? 'center' : 'flex-start',
            justifyContent: 'center',
            overflowY: 'auto'
          }}>
            {isLoading ? (
              <Spinner text="검색 중..." />
            ) : results.length === 0 ? (
              <div className="no-results">
                <p>{error || "검색 결과가 없습니다"}</p>
              </div>
            ) : (
              <>
                <div style={{ width: '100%' }}>
                  <div className="results-count">총 {results.length}개의 영상</div>
                  {viewMode === "card" ? (
                    <div className="results-grid">
                  {(results as Video[]).map((video) => (
                    <div key={video.id} className="result-card">
                      <div
                    className="card-thumbnail"
                    style={{ height: "130px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", cursor: "pointer" }}
                    onClick={() => {
                      if (video.webVideoUrl) {
                        window.open(video.webVideoUrl, "_blank");
                      }
                    }}
                  >
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ fontSize: "30px" }}>🎬</div>
                        )}
                        <div style={{ position: "absolute", bottom: "4px", right: "4px", backgroundColor: "rgba(0,0,0,0.7)", color: "white", padding: "2px 6px", borderRadius: "2px", fontSize: "12px" }}>
                          {Math.floor(video.videoDuration / 60)}:{(video.videoDuration % 60).toString().padStart(2, "0")}
                        </div>
                      </div>
                      <div className="card-content">
                        <h3 className="card-title">{video.title}</h3>
                        <p className="card-author">{video.creator}</p>
                        <div className="card-stats">
                          <span>▶️ {(video.playCount / 1000000).toFixed(1)}M 조회</span>
                          <span>❤️ {(video.likeCount / 1000).toFixed(1)}K 좋아요</span>
                        </div>
                        <div className="card-stats" style={{ marginTop: "4px" }}>
                          <span>💬 {(video.commentCount / 1000).toFixed(1)}K 댓글</span>
                          <span>↗️ {(video.shareCount / 1000).toFixed(1)}K 공유</span>
                        </div>
                        <div className="card-actions" style={{ marginTop: "auto", display: "flex", gap: "6px" }}>
                          <button
                            className="card-btn"
                            onClick={() => setSelectedVideo(video)}
                            style={{ flex: 1, padding: "6px", fontSize: "12px", backgroundColor: "#667eea", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                          >
                            📋 상세
                          </button>
                          <button
                            className="card-btn"
                            onClick={() => handleOpenTikTok(video)}
                            style={{ flex: 1, padding: "6px", fontSize: "12px", backgroundColor: "#764ba2", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                          >
                            🔗 열기
                          </button>
                          <button
                            className="card-btn"
                            onClick={() => handleDownloadVideo(video)}
                            style={{ flex: 1, padding: "6px", fontSize: "12px", backgroundColor: "#e74c3c", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                          >
                            ⬇️ 다운
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="results-table-wrapper">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>썸네일</th>
                        <th>제목</th>
                        <th>크리에이터</th>
                        <th>조회수</th>
                        <th>좋아요</th>
                        <th>댓글</th>
                        <th>공유</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(results as Video[]).map((video) => (
                        <tr key={video.id}>
                          <td style={{ textAlign: "center", cursor: "pointer" }} onClick={() => {
                            if (video.webVideoUrl) {
                              window.open(video.webVideoUrl, "_blank");
                            }
                          }}>
                            {video.thumbnail ? (
                              <img src={video.thumbnail} alt={video.title} className="table-thumbnail" style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "2px" }} />
                            ) : (
                              <span>🎬</span>
                            )}
                          </td>
                          <td className="table-title">{video.title}</td>
                          <td className="table-author">{video.creator}</td>
                          <td className="table-number">{(video.playCount / 1000000).toFixed(1)}M</td>
                          <td className="table-number">{(video.likeCount / 1000).toFixed(1)}K</td>
                          <td className="table-number">{(video.commentCount / 1000).toFixed(1)}K</td>
                          <td className="table-number">{(video.shareCount / 1000).toFixed(1)}K</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 상세 모달 */}
      {selectedVideo && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 스크롤 가능한 콘텐츠 */}
            <div className="modal-scroll">
              {/* 썸네일 */}
              {selectedVideo.thumbnail && (
                <img
                  src={selectedVideo.thumbnail}
                  alt={selectedVideo.title}
                  style={{
                    width: "100%",
                    height: "300px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    marginBottom: "16px",
                  }}
                />
              )}

              {/* 제목 */}
              <h2 style={{ margin: "0 0 12px 0", fontSize: "18px" }}>{selectedVideo.title}</h2>

              {/* 크리에이터 */}
              <p style={{ margin: "0 0 16px 0", color: "#666", fontSize: "14px" }}>
                <strong>크리에이터:</strong> {selectedVideo.creator}
              </p>

              {/* 통계 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div style={{ backgroundColor: "#f5f5f5", padding: "12px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "12px", color: "#666" }}>조회수</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                    {(selectedVideo.playCount / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div style={{ backgroundColor: "#f5f5f5", padding: "12px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "12px", color: "#666" }}>좋아요</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                    {(selectedVideo.likeCount / 1000).toFixed(1)}K
                  </div>
                </div>
                <div style={{ backgroundColor: "#f5f5f5", padding: "12px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "12px", color: "#666" }}>댓글</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                    {(selectedVideo.commentCount / 1000).toFixed(1)}K
                  </div>
                </div>
                <div style={{ backgroundColor: "#f5f5f5", padding: "12px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "12px", color: "#666" }}>공유</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                    {(selectedVideo.shareCount / 1000).toFixed(1)}K
                  </div>
                </div>
              </div>

              {/* 해시태그 */}
              {selectedVideo.hashtags.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <strong style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>해시태그:</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {selectedVideo.hashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: "#667eea",
                          color: "white",
                          padding: "4px 8px",
                          borderRadius: "16px",
                          fontSize: "12px",
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 하단 고정 버튼 */}
            <div className="modal-footer">
              <button
                onClick={() => setSelectedVideo(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: "#e0e0e0",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                닫기
              </button>
              <button
                onClick={() => {
                  handleOpenTikTok(selectedVideo);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: "#764ba2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                🔗 TikTok에서 열기
              </button>
              <button
                onClick={() => {
                  handleDownloadVideo(selectedVideo);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: "#e74c3c",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ⬇️ 다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
