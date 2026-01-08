"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  LayoutGrid,
  Table2,
  Download,
  Play,
  Heart,
  MessageCircle,
  Share2,
  Info,
  ExternalLink,
  Loader
} from "lucide-react";
import Toast, { type Toast as ToastType } from "@/app/components/Toast/Toast";
import Spinner from "@/app/components/ui/Spinner";
import ViewCountFilter from "@/app/components/Filters/ViewCountFilter/ViewCountFilter";
import PeriodFilter from "@/app/components/Filters/PeriodFilter/PeriodFilter";
import VideoLengthFilter from "@/app/components/Filters/VideoLengthFilter/VideoLengthFilter";
import EngagementRatioFilter from "@/app/components/Filters/EngagementRatioFilter/EngagementRatioFilter";
import { formatDateWithTime } from "@/lib/dateUtils";
import { formatNumber } from "@/lib/formatters";
import "./search.css";

type Platform = "tiktok" | "douyin" | "xiaohongshu";
type Language = "ko" | "zh" | "en";

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

interface FilterState {
  minPlayCount: number;
  maxPlayCount: number | null;
  uploadPeriod: string;
  videoLength: string;
  engagementScore: string[];
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
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    minPlayCount: 0,
    maxPlayCount: null,
    uploadPeriod: "all",
    videoLength: "all",
    engagementScore: [],
  });
  const [targetLanguage, setTargetLanguage] = useState<Language>("ko");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedQuery, setTranslatedQuery] = useState<string>("");
  const [detectedLanguage, setDetectedLanguage] = useState<Language | null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const resizeRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef<string>('');

  // Toast 추가 함수
  const addToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string, duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastType = { id, type, message, title, duration };
    setToasts((prev) => [...prev, newToast]);

    // 자동 제거
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const handleTitleClick = () => {
    setIsTitleRefreshing(true);
    setTimeout(() => {
      setIsTitleRefreshing(false);
      window.location.reload();
    }, 600);
  };

  // 언어 감지 함수
  const detectLanguage = (text: string): Language => {
    const trimmed = text.trim();

    // 한국어 감지 (한글 유니코드 범위)
    if (/[\u3131-\u314e\u314f-\u3163\uac00-\ud7a3]/g.test(trimmed)) {
      return "ko";
    }

    // 중국어 감지 (중국어 한자 유니코드 범위)
    if (/[\u4e00-\u9fff]/g.test(trimmed)) {
      return "zh";
    }

    // 기본값: 영어
    return "en";
  };

  // 저장된 너비 복원
  useEffect(() => {
    const savedWidth = localStorage.getItem("titok killa-sidebar-width");
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth, 10));
    }
  }, []);

  // 검색 히스토리 로드
  useEffect(() => {
    const savedHistory = localStorage.getItem("titok killa-search-history");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // 저장된 언어 설정 복원
  useEffect(() => {
    const savedLanguage = localStorage.getItem("titok killa-language-preference");
    if (savedLanguage) {
      setTargetLanguage(savedLanguage as Language);
    }
  }, []);

  // 언어 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem("titok killa-language-preference", targetLanguage);
  }, [targetLanguage]);

  // 검색어 입력 시 자동으로 언어 감지
  useEffect(() => {
    if (searchInput.trim()) {
      const detected = detectLanguage(searchInput);
      setDetectedLanguage(detected);
    } else {
      setDetectedLanguage(null);
    }
  }, [searchInput]);

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
    localStorage.setItem("titok killa-sidebar-width", sidebarWidth.toString());
  }, [sidebarWidth]);

  // 플랫폼 변경 시 기간 필터 초기화 (플랫폼별로 지원하는 옵션이 다르므로)
  useEffect(() => {
    setFilters({ ...filters, uploadPeriod: "all" });
    setVideos([]);  // 검색 결과도 초기화
    setError("");
  }, [platform]);

  // 영상 필터링 함수
  const filterVideos = (items: Video[], filterState: FilterState) => {
    return items.filter((video) => {
      // 1. 조회수 필터
      if (filterState.minPlayCount > 0 && video.playCount < filterState.minPlayCount) {
        return false;
      }
      if (filterState.maxPlayCount && video.playCount > filterState.maxPlayCount) {
        return false;
      }

      // 2. 업로드 기간 필터 - API에서 이미 필터링됨

      // 3. 영상 길이 필터
      if (filterState.videoLength !== "all") {
        const isShort = video.videoDuration < 20; // 20초 미만
        if (filterState.videoLength === "short" && !isShort) return false;
        if (filterState.videoLength === "long" && isShort) return false;
      }

      // 4. Engagement 점수 필터 (좋아요 + 댓글 + 공유 합산)
      if (
        filterState.engagementScore.length > 0 &&
        !filterState.engagementScore.includes("all")
      ) {
        const totalEngagement = video.likeCount + video.commentCount + video.shareCount;
        const engagementRatio = video.playCount > 0 ? totalEngagement / video.playCount : 0;

        // 5단계 구분 (백분율)
        let level = 1;
        if (engagementRatio >= 0.5) level = 5; // 50% 이상
        else if (engagementRatio >= 0.3) level = 4; // 30~50%
        else if (engagementRatio >= 0.15) level = 3; // 15~30%
        else if (engagementRatio >= 0.05) level = 2; // 5~15%
        // else level = 1; // 5% 미만

        if (!filterState.engagementScore.includes(level.toString())) {
          return false;
        }
      }

      return true;
    });
  };

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
    // 중복 제거 (같은 ID를 가진 영상이 여러 번 나타나는 경우 방지)
    const uniqueVideos = Array.from(
      new Map(videos.map((video) => [video.id, video])).values()
    );
    const filtered = filterVideos(uniqueVideos, filters);
    return sortVideos(filtered, sortBy);
  }, [videos, filters, sortBy]);

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) {
      setError("검색어를 입력해주세요");
      return;
    }

    let searchQuery = searchInput;
    setTranslatedQuery("");

    // 1. 입력 언어 감지
    const inputLanguage = detectLanguage(searchInput);
    setDetectedLanguage(inputLanguage);
    console.log(`[Language Detection] Detected: ${inputLanguage}, Target: ${targetLanguage}`);

    // 2. 번역이 필요한지 확인 (입력 언어 ≠ 선택 언어)
    const needsTranslation = inputLanguage !== targetLanguage;

    if (needsTranslation) {
      setIsTranslating(true);
      try {
        const translateRes = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: searchInput,
            sourceLanguage: inputLanguage,
            targetLanguage,
          }),
        });

        const translateData = await translateRes.json();
        console.log(`[Translation API Response]:`, translateData);

        if (!translateRes.ok) {
          console.error(`[Translation] API Error: ${translateRes.status}`, translateData);
          setError(`번역 실패: ${translateData.error || '알 수 없는 오류'}`);
          throw new Error(translateData.error || `HTTP ${translateRes.status}`);
        }

        if (translateData.success && translateData.translatedText) {
          searchQuery = translateData.translatedText;
          setTranslatedQuery(searchQuery);
          console.log(`[Translation] ✅ ${searchInput} (${inputLanguage}) → ${searchQuery} (${targetLanguage})`);
        } else {
          console.warn("[Translation] Invalid response:", translateData);
          setError(`번역 실패: 잘못된 응답 형식`);
        }
      } catch (error) {
        console.error("[Translation] Exception:", error);
        setError(`번역 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      } finally {
        setIsTranslating(false);
      }
    } else {
      console.log(`[Translation] Skipped: Input is already in ${targetLanguage}`);
    }

    // 검색 히스토리 저장
    const newHistory = [searchInput, ...searchHistory.filter(item => item !== searchInput)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("titok killa-search-history", JSON.stringify(newHistory));

    setIsLoading(true);
    setError("");
    setVideos([]);

    try {
      // Bright Data API 호출 (번역된 쿼리 사용)
      // Xiaohongshu는 기간 필터를 지원하지 않으므로 "all"로 고정
      const dateRange = platform === 'xiaohongshu' ? 'all' : filters.uploadPeriod;

      const response = await fetch("/api/brightdata/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          platform,
          limit: 50,
          dateRange: dateRange,
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
  }, [searchInput, platform, targetLanguage, searchHistory]);

  // 디바운싱된 검색 함수
  const debouncedSearch = useCallback(() => {
    // 동일한 검색어 연속 실행 방지 (날짜 필터도 포함)
    const currentQuery = `${searchInput}-${platform}-${targetLanguage}-${filters.uploadPeriod}`;
    if (lastSearchRef.current === currentQuery && !isLoading) {
      console.log('[Search] 중복 검색 방지:', currentQuery);
      return;
    }

    lastSearchRef.current = currentQuery;

    // 디바운싱 (300ms)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch();
    }, 300);
  }, [searchInput, platform, targetLanguage, handleSearch, isLoading, filters.uploadPeriod]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && !isTranslating) {
      debouncedSearch();
    }
  };

  // 히스토리 항목 클릭 - 검색 입력 필드에만 값 설정
  const handleHistoryClick = useCallback((keyword: string) => {
    setSearchInput(keyword);
  }, []);

  // 히스토리 항목 삭제
  const handleDeleteHistory = (e: React.MouseEvent, keyword: string) => {
    e.stopPropagation();
    const newHistory = searchHistory.filter(item => item !== keyword);
    setSearchHistory(newHistory);
    localStorage.setItem("titok killa-search-history", JSON.stringify(newHistory));
  };

  const handleExcelDownload = () => {
    if (results.length === 0) {
      setError("검색 결과가 없습니다");
      return;
    }

    const csvHeader = [
      "제목",
      "크리에이터",
      "팔로워수",
      "게시일시",
      "영상길이",
      "조회수",
      "좋아요",
      "댓글",
      "공유",
      "참여율(%)",
      "설명",
      "해시태그",
      "링크",
    ];
    const csvRows: string[][] = [];

    (results as Video[]).forEach((video) => {
      const engagementRate =
        video.playCount > 0
          ? (
              ((video.likeCount + video.commentCount + video.shareCount) /
                video.playCount) *
              100
            ).toFixed(2)
          : "-";
      const videoDurationStr = `${Math.floor(video.videoDuration / 60)}:${(
        video.videoDuration % 60
      )
        .toString()
        .padStart(2, "0")}`;

      csvRows.push([
        `"${video.title.replace(/"/g, '""')}"`,
        `"${video.creator.replace(/"/g, '""')}"`,
        video.followerCount ? video.followerCount.toString() : "-",
        formatDateWithTime(video.createTime),
        videoDurationStr,
        video.playCount.toString(),
        video.likeCount.toString(),
        video.commentCount.toString(),
        video.shareCount.toString(),
        engagementRate,
        `"${video.description.substring(0, 100).replace(/"/g, '""')}"`,
        `"${video.hashtags.join(", ")}"`,
        `"${video.webVideoUrl || video.videoUrl || ""}"`,
      ]);
    });

    const csv = [
      csvHeader.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${platform}-videos-${new Date().toISOString().split("T")[0]}.csv`
    );
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

  // 영상 다운로드 (클립보드 복사 + 외부 다운로더 열기)
  const handleDownloadVideo = async (video: Video) => {
    if (!video.videoUrl && !video.webVideoUrl) {
      addToast('error', '영상 다운로드 정보를 불러올 수 없습니다.', '❌ 오류');
      return;
    }

    setDownloadingVideoId(video.id);

    try {
      // videoUrl이 있으면 서버 API로 다운로드
      if (video.videoUrl) {
        console.log("[Download] API를 통한 다운로드:", video.id);

        const response = await fetch("/api/download-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoUrl: video.videoUrl,
            videoId: video.id,
            platform,  // ✅ 플랫폼 정보 전달
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "다운로드 실패");
        }

        // Blob으로 변환
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        // 플랫폼별 파일명 설정
        const filePrefix = platform === 'douyin' ? 'douyin' :
                          platform === 'xiaohongshu' ? 'xiaohongshu' : 'tiktok';
        link.download = `${filePrefix}_${video.id}.mp4`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log("[Download] ✅ 다운로드 완료:", video.title);
        addToast('success', '영상이 다운로드 폴더에 저장되었습니다', '✅ 다운로드 완료', 3000);
      } else if (video.webVideoUrl) {
        // webVideoUrl만 있으면 링크 복사만 진행 (외부 사이트 제거)
        console.log("[Download] 링크 복사:", video.webVideoUrl);

        await navigator.clipboard.writeText(video.webVideoUrl);
        addToast('info', '영상 링크가 클립보드에 복사되었습니다.', '📋 링크 복사됨', 3000);
      }
    } catch (error) {
      console.error("[Download] Error:", error);
      const errorMsg = error instanceof Error ? error.message : "알 수 없는 오류";
      addToast('error', errorMsg, '❌ 다운로드 실패', 5000);
    } finally {
      setDownloadingVideoId(null);
    }
  };

  // 영상 상세 페이지 모달 (간단한 버전)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  return (
    <>
      <Toast
        toasts={toasts}
        onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        position="top-center"
      />
      <div className="main-container">
        {/* 왼쪽 패널 */}
        <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          <div
            className="sidebar-title"
            onClick={handleTitleClick}
            style={{ cursor: "pointer", transition: "opacity 0.3s", opacity: isTitleRefreshing ? 0.5 : 1 }}
          >
            Titok Killa
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
                <button className="btn-search" onClick={debouncedSearch} disabled={isTranslating || isLoading}>
                  {isTranslating ? "번역 중..." : isLoading ? "검색 중..." : "검색"}
                </button>
              </div>
            </div>

            {/* 번역 정보 표시 (검색어 입력 바로 아래) */}
            {searchInput && (
              <div style={{
                marginTop: "12px",
                padding: "12px",
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                border: "1px solid #e0e0e0"
              }}>
                <div style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#666",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px"
                }}>
                  📝 검색 정보
                </div>

                {/* 원문 표시 */}
                <div style={{
                  marginBottom: "8px",
                  padding: "8px",
                  backgroundColor: "white",
                  borderRadius: "6px",
                  border: "1px solid #ddd"
                }}>
                  <div style={{
                    fontSize: "10px",
                    color: "#999",
                    marginBottom: "4px"
                  }}>
                    📋 원문 ({detectedLanguage === "ko" ? "한국어" : detectedLanguage === "zh" ? "中文" : "English"})
                  </div>
                  <div style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#333",
                    wordBreak: "break-word"
                  }}>
                    "{searchInput}"
                  </div>
                </div>

                {/* 번역본 표시 (필요시) */}
                {translatedQuery && translatedQuery !== searchInput && (
                  <>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "8px",
                      fontSize: "12px",
                      color: "#666"
                    }}>
                      ↓ 번역됨 ↓
                    </div>
                    <div style={{
                      marginBottom: "8px",
                      padding: "8px",
                      backgroundColor: "#e8f5e9",
                      borderRadius: "6px",
                      border: "1px solid #c8e6c9"
                    }}>
                      <div style={{
                        fontSize: "10px",
                        color: "#4caf50",
                        marginBottom: "4px",
                        fontWeight: "600"
                      }}>
                        🌐 번역본 ({targetLanguage === "ko" ? "한국어" : targetLanguage === "zh" ? "中文" : "English"})
                      </div>
                      <div style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#1b5e20",
                        wordBreak: "break-word",
                        marginBottom: "8px"
                      }}>
                        "{translatedQuery}"
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(translatedQuery);
                          addToast('success', '번역 결과가 클립보드에 복사되었습니다!', '📋 복사 완료');
                        }}
                        style={{
                          width: "100%",
                          padding: "6px",
                          backgroundColor: "#4caf50",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "11px",
                          fontWeight: "600"
                        }}
                      >
                        📋 복사
                      </button>
                    </div>
                  </>
                )}

                {/* 번역 안 됨 표시 */}
                {!translatedQuery && searchInput && detectedLanguage === targetLanguage && (
                  <div style={{
                    padding: "8px",
                    backgroundColor: "#fff3e0",
                    borderRadius: "6px",
                    border: "1px solid #ffe0b2",
                    fontSize: "12px",
                    color: "#f57c00",
                    fontWeight: "500"
                  }}>
                    ℹ️ 입력 언어와 선택 언어가 동일하여 번역하지 않습니다
                  </div>
                )}
              </div>
            )}

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

            {/* 언어 선택 */}
            <div className="search-input-wrapper" style={{ marginTop: "16px" }}>
              <div className="search-label">검색 언어</div>
              <div className="platform-selector">
                <label
                  className={`platform-option ${targetLanguage === "ko" ? "active" : ""}`}
                  onClick={() => setTargetLanguage("ko")}
                >
                  <input
                    type="radio"
                    name="language"
                    value="ko"
                    checked={targetLanguage === "ko"}
                    onChange={() => setTargetLanguage("ko")}
                    style={{ display: "none" }}
                  />
                  <span className="platform-icon">🇰🇷</span>
                  <span className="platform-name">한국어</span>
                </label>
                <label
                  className={`platform-option ${targetLanguage === "zh" ? "active" : ""}`}
                  onClick={() => setTargetLanguage("zh")}
                >
                  <input
                    type="radio"
                    name="language"
                    value="zh"
                    checked={targetLanguage === "zh"}
                    onChange={() => setTargetLanguage("zh")}
                    style={{ display: "none" }}
                  />
                  <span className="platform-icon">🇨🇳</span>
                  <span className="platform-name">中文</span>
                </label>
                <label
                  className={`platform-option ${targetLanguage === "en" ? "active" : ""}`}
                  onClick={() => setTargetLanguage("en")}
                >
                  <input
                    type="radio"
                    name="language"
                    value="en"
                    checked={targetLanguage === "en"}
                    onChange={() => setTargetLanguage("en")}
                    style={{ display: "none" }}
                  />
                  <span className="platform-icon">🇺🇸</span>
                  <span className="platform-name">English</span>
                </label>
              </div>

              {/* 플랫폼별 추천 표시 */}
              {(platform === "douyin" || platform === "xiaohongshu") && targetLanguage !== "zh" && (
                <div style={{
                  fontSize: "11px",
                  color: "#ff9800",
                  marginTop: "6px",
                  padding: "6px 8px",
                  backgroundColor: "#fff3e0",
                  borderRadius: "4px"
                }}>
                  💡 팁: {platform === "douyin" ? "Douyin" : "Xiaohongshu"}은 중국어 검색이 더 정확합니다
                </div>
              )}
            </div>

            {/* 필터 섹션 */}
            <div style={{
              marginTop: "24px",
              paddingTop: "0",
            }}>
              <div style={{
                fontSize: "13px",
                fontWeight: "700",
                marginBottom: "16px",
                color: "#000",
                letterSpacing: "0.5px",
              }}>
                필터
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{
                  background: "linear-gradient(135deg, #f5f7fa 0%, #f8fafb 100%)",
                  borderRadius: "8px",
                  padding: "10px 8px",
                }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#666", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    조회수
                  </div>
                  <ViewCountFilter
                    minValue={filters.minPlayCount}
                    maxValue={filters.maxPlayCount}
                    onChange={(min, max) => setFilters({ ...filters, minPlayCount: min, maxPlayCount: max })}
                  />
                </div>

                {platform !== 'xiaohongshu' && (
                  <div style={{
                    background: "linear-gradient(135deg, #f5f7fa 0%, #f8fafb 100%)",
                    borderRadius: "8px",
                    padding: "10px 8px",
                  }}>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "#666", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                      기간
                    </div>
                    <PeriodFilter
                      value={filters.uploadPeriod}
                      onChange={(value) => setFilters({ ...filters, uploadPeriod: value })}
                      platform={platform}
                    />
                  </div>
                )}

                <div style={{
                  background: "linear-gradient(135deg, #f5f7fa 0%, #f8fafb 100%)",
                  borderRadius: "8px",
                  padding: "10px 8px",
                }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#666", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    길이
                  </div>
                  <VideoLengthFilter
                    value={filters.videoLength}
                    onChange={(value) => setFilters({ ...filters, videoLength: value })}
                  />
                </div>

                <div style={{
                  background: "linear-gradient(135deg, #f5f7fa 0%, #f8fafb 100%)",
                  borderRadius: "8px",
                  padding: "10px 8px",
                }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#666", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    인기도
                  </div>
                  <EngagementRatioFilter
                    selectedValues={filters.engagementScore}
                    onChange={(values) => setFilters({ ...filters, engagementScore: values })}
                  />
                </div>
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
                <p style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
                  😔 {error || "검색 결과가 없습니다"}
                </p>
                <p style={{ fontSize: "14px", color: "#666" }}>
                  다른 키워드로 다시 검색해보세요
                </p>
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
                        className="card-thumbnail-container"
                        onClick={() => {
                          if (video.webVideoUrl) {
                            window.open(video.webVideoUrl, "_blank");
                          }
                        }}
                      >
                        {/* 썸네일 */}
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="card-thumbnail"
                            loading="lazy"
                          />
                        ) : (
                          <div className="card-thumbnail-fallback">🎬</div>
                        )}

                        {/* Duration 뱃지 - 왼쪽 상단 */}
                        <div className="card-duration-badge">
                          {Math.floor(video.videoDuration / 60)}:{(video.videoDuration % 60).toString().padStart(2, "0")}
                        </div>

                        {/* 그라데이션 오버레이 - 하단 */}
                        <div className="card-overlay">
                          {/* 크리에이터 */}
                          <div className="card-overlay-creator">
                            <span>@{video.creator}</span>
                            {video.followerCount && (
                              <span style={{ fontSize: "10px", opacity: 0.9 }}>
                                · {formatNumber(video.followerCount)}
                              </span>
                            )}
                          </div>

                          {/* 제목 */}
                          <div className="card-overlay-title">{video.title}</div>

                          {/* 통계 */}
                          <div className="card-overlay-stats">
                            <div className="card-overlay-stat-item">
                              <Play className="card-overlay-stat-icon" />
                              <span>{formatNumber(video.playCount)}</span>
                            </div>
                            <div className="card-overlay-stat-item">
                              <Heart className="card-overlay-stat-icon" />
                              <span>{formatNumber(video.likeCount)}</span>
                            </div>
                            <div className="card-overlay-stat-item">
                              <MessageCircle className="card-overlay-stat-icon" />
                              <span>{formatNumber(video.commentCount)}</span>
                            </div>
                            <div className="card-overlay-stat-item">
                              <Share2 className="card-overlay-stat-icon" />
                              <span>{formatNumber(video.shareCount)}</span>
                            </div>
                          </div>
                        </div>

                        {/* 오른쪽 액션 버튼 */}
                        <div className="card-actions-vertical">
                          {/* 상세 버튼 */}
                          <button
                            className="card-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVideo(video);
                            }}
                            title="상세 정보"
                          >
                            <Info className="card-action-icon" />
                            <span className="card-action-label">상세</span>
                          </button>

                          {/* 다운로드 버튼 */}
                          <button
                            className="card-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadVideo(video);
                            }}
                            disabled={downloadingVideoId === video.id}
                            title="다운로드"
                          >
                            {downloadingVideoId === video.id ? (
                              <Loader className="card-action-icon animate-spin" />
                            ) : (
                              <Download className="card-action-icon" />
                            )}
                            <span className="card-action-label">
                              {downloadingVideoId === video.id ? "준비중" : "다운"}
                            </span>
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
                        <th style={{ width: "50px" }}>썸네일</th>
                        <th style={{ width: "150px" }}>제목</th>
                        <th style={{ width: "100px" }}>크리에이터</th>
                        <th style={{ width: "80px" }}>팔로워</th>
                        <th style={{ width: "100px" }}>게시일</th>
                        <th style={{ width: "70px" }}>길이</th>
                        <th style={{ width: "70px" }}>조회수</th>
                        <th style={{ width: "70px" }}>좋아요</th>
                        <th style={{ width: "70px" }}>댓글</th>
                        <th style={{ width: "70px" }}>공유</th>
                        <th style={{ width: "60px" }}>참여율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(results as Video[]).map((video) => (
                        <tr key={video.id} style={{ fontSize: "12px" }}>
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
                          <td className="table-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video.title}</td>
                          <td className="table-author" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video.creator}</td>
                          <td className="table-number">{video.followerCount ? formatNumber(video.followerCount) : "-"}</td>
                          <td className="table-number" style={{ fontSize: "11px" }}>{formatDateWithTime(video.createTime)}</td>
                          <td className="table-number">{Math.floor(video.videoDuration / 60)}:{(video.videoDuration % 60).toString().padStart(2, "0")}</td>
                          <td className="table-number">{formatNumber(video.playCount)}</td>
                          <td className="table-number">{formatNumber(video.likeCount)}</td>
                          <td className="table-number">{formatNumber(video.commentCount)}</td>
                          <td className="table-number">{formatNumber(video.shareCount)}</td>
                          <td className="table-number" style={{ color: "#e74c3c", fontWeight: "600" }}>
                            {video.playCount > 0 ? ((video.likeCount + video.commentCount + video.shareCount) / video.playCount * 100).toFixed(2) : "-"}%
                          </td>
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
                    height: "240px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    marginBottom: "16px",
                  }}
                />
              )}

              {/* 제목 */}
              <h2 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "#1a1a1a", lineHeight: 1.4 }}>{selectedVideo.title}</h2>

              {/* 크리에이터 */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                background: "linear-gradient(135deg, #f5f7fa 0%, #f8fafb 100%)",
                borderRadius: "10px",
                marginBottom: "16px",
                border: "1px solid rgba(0, 0, 0, 0.05)"
              }}>
                <span style={{ fontSize: "16px" }}>👤</span>
                <div>
                  <div style={{ fontSize: "11px", color: "#999", marginBottom: "2px" }}>크리에이터</div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>{selectedVideo.creator}</div>
                </div>
              </div>

              {/* 통계 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <div style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  padding: "12px",
                  borderRadius: "10px",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)"
                }}>
                  <div style={{ fontSize: "11px", opacity: 0.9, marginBottom: "6px" }}>조회수</div>
                  <div style={{ fontSize: "20px", fontWeight: "700" }}>
                    {(selectedVideo.playCount / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div style={{
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  padding: "12px",
                  borderRadius: "10px",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(245, 87, 108, 0.2)"
                }}>
                  <div style={{ fontSize: "11px", opacity: 0.9, marginBottom: "6px" }}>좋아요</div>
                  <div style={{ fontSize: "20px", fontWeight: "700" }}>
                    {(selectedVideo.likeCount / 1000).toFixed(1)}K
                  </div>
                </div>
                <div style={{
                  background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                  padding: "12px",
                  borderRadius: "10px",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(79, 172, 254, 0.2)"
                }}>
                  <div style={{ fontSize: "11px", opacity: 0.9, marginBottom: "6px" }}>댓글</div>
                  <div style={{ fontSize: "20px", fontWeight: "700" }}>
                    {(selectedVideo.commentCount / 1000).toFixed(1)}K
                  </div>
                </div>
                <div style={{
                  background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                  padding: "12px",
                  borderRadius: "10px",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(250, 112, 154, 0.2)"
                }}>
                  <div style={{ fontSize: "11px", opacity: 0.9, marginBottom: "6px" }}>공유</div>
                  <div style={{ fontSize: "20px", fontWeight: "700" }}>
                    {(selectedVideo.shareCount / 1000).toFixed(1)}K
                  </div>
                </div>
              </div>

              {/* 해시태그 */}
              {selectedVideo.hashtags.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <strong style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#1a1a1a" }}>🏷️ 해시태그</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {selectedVideo.hashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                          padding: "4px 10px",
                          borderRadius: "16px",
                          fontSize: "11px",
                          fontWeight: "600",
                          boxShadow: "0 2px 8px rgba(102, 126, 234, 0.2)"
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
                  if (selectedVideo) handleDownloadVideo(selectedVideo);
                }}
                disabled={selectedVideo ? downloadingVideoId === selectedVideo.id : true}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor:
                    selectedVideo && downloadingVideoId === selectedVideo.id
                      ? "#999"
                      : "#e74c3c",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    selectedVideo && downloadingVideoId === selectedVideo.id
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "bold",
                  opacity:
                    selectedVideo && downloadingVideoId === selectedVideo.id ? 0.6 : 1,
                }}
              >
                {selectedVideo && downloadingVideoId === selectedVideo.id
                  ? "⏳ 준비 중..."
                  : "⬇️ 다운로드"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
