"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { LayoutGrid, Table2, Download, Play, Heart, MessageCircle, Share2, Info, ExternalLink, Loader } from "lucide-react";
import Toast, { type Toast as ToastType } from "@/app/components/Toast/Toast";
import Spinner from "@/app/components/ui/Spinner";
import ViewCountFilter from "@/app/components/Filters/ViewCountFilter/ViewCountFilter";
import PeriodFilter from "@/app/components/Filters/PeriodFilter/PeriodFilter";
import VideoLengthFilter from "@/app/components/Filters/VideoLengthFilter/VideoLengthFilter";
import EngagementRatioFilter from "@/app/components/Filters/EngagementRatioFilter/EngagementRatioFilter";
import { formatDateWithTime, getRelativeDateString } from "@/lib/dateUtils";
import { formatNumber, formatVideoDuration } from "@/lib/formatters";
import UserDropdown from "@/app/components/UserDropdown/UserDropdown";
import { SearchProgress } from "@/components/SearchProgress";
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
  const [sidebarWidth, setSidebarWidth] = useState<number>(600);
  const [isResizing, setIsResizing] = useState(false);
  const [error, setError] = useState("");
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    minPlayCount: 0,
    maxPlayCount: null,
    uploadPeriod: "all",
    videoLength: "all",
    engagementScore: ["all"],
  });
  const [targetLanguage, setTargetLanguage] = useState<Language>("ko");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedQuery, setTranslatedQuery] = useState<string>("");
  const [detectedLanguage, setDetectedLanguage] = useState<Language | null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [showTranslationPanel, setShowTranslationPanel] = useState(true);
  const [jobStatus, setJobStatus] = useState<{
    jobId: string;
    status: "waiting" | "active" | "delayed" | "paused";
    progress: number;
    queuePosition: number;
    message: string;
    totalQueueSize?: number;
    estimatedWaitSeconds?: number;
  } | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 검색 타임아웃 타이머 정리 (early definition for use in cleanup effect)
   */
  const clearSearchTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  // Toast 추가 함수
  const addToast = useCallback((type: "success" | "error" | "warning" | "info", message: string, title?: string, duration = 3000) => {
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

  // 비디오 카드 마우스 오버 핸들러 (모든 플랫폼: 즉시 재생)
  const handleVideoCardMouseEnter = useCallback((video: Video) => {
    setHoveredVideoId(video.id);

    // 0.2초 후 즉시 재생 (videoUrl이 있으면 재생)
    const delay = 200;

    hoverTimeoutRef.current = setTimeout(() => {
      if (video.videoUrl) {
        setPlayingVideoId(video.id);
      }
    }, delay);
  }, []);

  // 비디오 카드 마우스 아웃 핸들러
  const handleVideoCardMouseLeave = useCallback(() => {
    // 타이머 취소
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // 상태 초기화
    setHoveredVideoId(null);
    setPlayingVideoId(null);
  }, []);

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

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      clearSearchTimeout();    // 추가

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [clearSearchTimeout]);

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

  // 검색어 입력 시 자동으로 언어 감지 및 번역 패널 표시
  useEffect(() => {
    if (searchInput.trim()) {
      const detected = detectLanguage(searchInput);
      setDetectedLanguage(detected);
      setShowTranslationPanel(true); // ← 검색어가 있으면 패널 항상 표시
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
    // 비디오 결과는 유지하고, 필터만 초기화
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
      if (filterState.engagementScore.length > 0 && !filterState.engagementScore.includes("all")) {
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
    const uniqueVideos = Array.from(new Map(videos.map((video) => [video.id, video])).values());
    const filtered = filterVideos(uniqueVideos, filters);
    return sortVideos(filtered, sortBy);
  }, [videos, filters, sortBy]);

  const handleCancelSearch = useCallback(async () => {
    // 타임아웃 타이머 정리 (추가)
    clearSearchTimeout();

    // 1. HTTP 요청 중단
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      abortControllerRef.current = null;
    }

    // 2. 폴링 중단
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // 3. 백엔드 취소 API 호출 (job 제거 + 캐시 삭제)
    if (jobStatus?.jobId) {
      try {
        await fetch('/api/search/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: jobStatus.jobId,
            query: searchInput,
            platform,
            dateRange: filters.uploadPeriod
          })
        });
        console.log('[Search] Cancel API 호출 완료');
      } catch (error) {
        console.error('[Search] Cancel API 실패:', error);
        // 실패해도 프론트엔드 상태는 이미 정리되었으므로 계속 진행
      }
    }

    // 4. 상태 초기화
    setJobStatus(null);
  }, [
    clearSearchTimeout,
    jobStatus?.jobId,
    searchInput,
    platform,
    filters.uploadPeriod
  ]);

  /**
   * 자동 타임아웃 처리 (3분 초과)
   */
  const handleAutoTimeout = useCallback(async () => {
    console.log('[Search] Auto timeout after 3 minutes');

    // 기존 취소 로직 재사용 (백엔드 취소 API + 캐시 삭제)
    await handleCancelSearch();

    // 사용자 안내 토스트
    addToast(
      'warning',
      '검색 시간이 초과되었습니다.\n잠시 후 다시 시도해주세요.',
      '⏱️ 타임아웃',
      5000
    );

    // 에러 메시지 표시
    setError('검색 시간이 초과되었습니다. 서버 상태를 확인하거나 잠시 후 다시 시도해주세요.');
  }, [handleCancelSearch, addToast]);

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) {
      setError("검색어를 입력해주세요");
      return;
    }

    // 이전 검색의 타이머 정리 (추가)
    clearSearchTimeout();

    let searchQuery = searchInput;
    setTranslatedQuery("");

    // 1. 입력 언어 감지
    const inputLanguage = detectLanguage(searchInput);
    setDetectedLanguage(inputLanguage);

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

        if (!translateRes.ok) {
          console.error(`[Translation] API Error: ${translateRes.status}`, translateData);
          setError(`번역 실패: ${translateData.error || "알 수 없는 오류"}`);
          throw new Error(translateData.error || `HTTP ${translateRes.status}`);
        }

        if (translateData.success && translateData.translatedText) {
          searchQuery = translateData.translatedText;
          setTranslatedQuery(searchQuery);
        } else {
          console.warn("[Translation] Invalid response:", translateData);
          setError(`번역 실패: 잘못된 응답 형식`);
        }
      } catch (error) {
        console.error("[Translation] Exception:", error);
        setError(`번역 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
      } finally {
        setIsTranslating(false);
      }
    }

    // 검색 히스토리 저장
    const newHistory = [searchInput, ...searchHistory.filter((item) => item !== searchInput)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("titok killa-search-history", JSON.stringify(newHistory));

    // AbortController 생성
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError("");
    setVideos([]);

    try {
      // 새로운 비동기 큐 API 호출
      // Xiaohongshu는 기간 필터를 지원하지 않으므로 "all"로 고정
      const dateRange = platform === "xiaohongshu" ? "all" : filters.uploadPeriod;

      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          platform,
          dateRange: dateRange,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.error || "검색 중 오류가 발생했습니다");
        (error as any).status = response.status;
        (error as any).details = errorData.details;
        throw error;
      }

      const data = await response.json();

      // 캐시 히트 시 즉시 결과 표시
      if (data.status === "completed") {
        setError("");
        setIsLoading(false);

        if (data.data && data.data.length > 0) {
          setVideos(data.data);
          addToast("success", "검색 완료!", `${data.data.length}개의 결과를 찾았습니다`);
        } else {
          setVideos([]);
          addToast("info", "결과 없음", "다른 키워드나 필터로 다시 시도해보세요");
        }
      } else if (data.status === "queued") {
        // 큐에 추가됨 - jobId로 진행 상황 추적 가능
        setVideos([]);
        addToast("info", "검색을 시작했습니다");

        // 초기 큐 크기 저장
        const initialQueueSize = data.totalQueueSize || data.queueSize;

        // ========== 타임아웃 타이머 시작 (추가) ==========

        // 1) 2분 30초 경고
        warningTimeoutRef.current = setTimeout(() => {
          if (isLoading) {
            addToast(
              'info',
              '검색이 오래 걸리고 있습니다.\n30초 후 자동으로 취소됩니다.',
              '⏳ 잠시만요',
              5000
            );
          }
        }, 150000); // 2분 30초 = 150000ms

        // 2) 3분 타임아웃
        timeoutRef.current = setTimeout(() => {
          handleAutoTimeout();
        }, 180000); // 3분 = 180000ms

        // ================================================

        // 폴링 시작: 2초마다 상태 확인
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/search/${data.jobId}`, {
              signal: abortControllerRef.current?.signal,
            });

            if (!statusRes.ok) return;

            const statusData = await statusRes.json();

            // 실시간 상태 업데이트
            if (statusData.status && statusData.queuePosition !== undefined) {
              setJobStatus({
                jobId: data.jobId,
                status: statusData.status as "waiting" | "active" | "delayed" | "paused",
                progress: statusData.progress || 0,
                queuePosition: statusData.queuePosition,
                message: statusData.message || "",
                totalQueueSize: initialQueueSize,
                estimatedWaitSeconds: statusData.estimatedWaitSeconds,
              });
            }

            if (statusData.status === "completed") {
              clearSearchTimeout(); // 추가
              setIsLoading(false);
              setError("");
              setJobStatus(null);
              clearInterval(pollInterval);

              if (statusData.data && statusData.data.length > 0) {
                setVideos(statusData.data);
                addToast("success", "검색 완료!", `${statusData.data.length}개의 결과를 찾았습니다`);
              } else {
                setVideos([]);
                addToast("info", "결과 없음", "다른 키워드나 필터로 다시 시도해보세요");
              }
            } else if (statusData.status === "failed") {
              clearSearchTimeout(); // 추가
              // 에러 타입에 따라 다른 처리
              const errorMessage = statusData.error || "검색 중 오류가 발생했습니다";
              const errorType = statusData.errorType || "UNKNOWN_ERROR";

              setError(errorMessage);
              setIsLoading(false);
              setJobStatus(null);
              clearInterval(pollInterval);

              // 에러 타입별 토스트 메시지 표시
              if (errorType === "RATE_LIMIT") {
                addToast("warning", "Apify API 할당량이 제한되었습니다. 30초 후 다시 시도해주세요.", "⏳ 잠시만요");
              } else if (errorType === "NETWORK_ERROR") {
                addToast("error", "네트워크 연결을 확인해주세요.", "❌ 연결 오류");
              } else if (errorType === "AUTH_ERROR") {
                addToast("error", "API 인증에 실패했습니다. 관리자에게 연락해주세요.", "❌ 인증 오류");
              } else if (errorType === "APIFY_ERROR") {
                addToast("warning", "Apify 서비스가 일시적으로 불안정합니다.\n몇 분 후 다시 시도해주세요.", "🔧 서비스 점검 중");
              } else if (errorType === "NO_RESULTS") {
                addToast("info", "검색어를 바꿔서 다시 시도해보세요.", "🔍 결과 없음");
              } else {
                addToast("error", "검색 중 오류가 발생했습니다.", "❌ 오류");
              }
            }
          } catch (err) {
            // 폴링 중 에러는 무시
            console.error("[Poll] Error:", err);
          }
        }, 2000);

        pollIntervalRef.current = pollInterval;

        // 정리 함수: 폴링 중단
        abortControllerRef.current = new AbortController();
      } else {
        setVideos([]);
        setError(data.error || "검색 결과가 없습니다");
        setIsLoading(false);
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("[Search] 사용자가 검색을 취소했습니다.");
        addToast("info", "검색이 취소되었습니다.", "⏹️ 취소됨");
      } else {
        console.error("검색 오류:", error);

        // 에러 메시지를 사용자 친화적으로 변환
        let userMessage = "검색 중 오류가 발생했습니다.";

        if (error instanceof Error) {
          // 할당량 초과 (429 - 사용자 검색 한도)
          if ((error as any).status === 429 && error.message.includes("일일 검색 한도")) {
            const details = (error as any).details;
            userMessage = `일일 검색 한도를 초과했습니다.\n(${details?.used}/${details?.limit} 사용됨)`;
            addToast("error", `일일 검색 한도를 모두 사용했습니다!\n내일 자정에 리셋됩니다.`, "🔒 한도 초과");
          } else if (error.message.includes("Failed to fetch")) {
            userMessage = "네트워크 연결이 불안정합니다.\n잠시 후 다시 시도해주세요.";
            addToast("warning", "네트워크 연결을 확인해주세요.", "📡 네트워크 오류");
          } else if (error.message.includes("429")) {
            userMessage = "검색 서버가 과부하 상태입니다.\n30초 후 다시 시도해주세요.";
            addToast("warning", "검색 서버가 잠시 혼잡합니다. 30초 후 다시 시도해주세요.", "⏳ 잠시만요");
          } else {
            userMessage = error.message;
          }
        }

        setError(userMessage);
        setVideos([]);
      }
      setIsLoading(false);
    }
  }, [
    searchInput,
    platform,
    targetLanguage,
    searchHistory,
    filters.uploadPeriod,
    addToast,
    clearSearchTimeout,
    handleAutoTimeout
  ]);

  // 디바운싱된 검색 함수
  const debouncedSearch = useCallback(() => {
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
    const newHistory = searchHistory.filter((item) => item !== keyword);
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
        video.playCount > 0 ? (((video.likeCount + video.commentCount + video.shareCount) / video.playCount) * 100).toFixed(2) : "-";
      const videoDurationStr = formatVideoDuration(video.videoDuration);

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

    const csv = [csvHeader.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${platform}-videos-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 영상 페이지로 이동
  const handleOpenVideo = (video: Video) => {
    if (video.webVideoUrl) {
      window.open(video.webVideoUrl, "_blank");
    }
  };

  // 영상 다운로드 (클립보드 복사 + 외부 다운로더 열기)
  const handleDownloadVideo = async (video: Video) => {
    if (!video.videoUrl && !video.webVideoUrl) {
      addToast("error", "영상 다운로드 정보를 불러올 수 없습니다.", "❌ 오류");
      return;
    }

    setDownloadingVideoId(video.id);

    try {
      console.log("[Download] API를 통한 다운로드:", video.id);

      const response = await fetch("/api/download-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: video.videoUrl,
          videoId: video.id,
          platform,
          webVideoUrl: video.webVideoUrl, // Pass webVideoUrl for Xiaohongshu
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
      const filePrefix = platform === "douyin" ? "douyin" : platform === "xiaohongshu" ? "xiaohongshu" : "tiktok";
      link.download = `${filePrefix}_${video.id}.mp4`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("[Download] ✅ 다운로드 완료:", video.title);
      addToast("success", "영상이 다운로드 폴더에 저장되었습니다", "✅ 다운로드 완료", 3000);
    } catch (error) {
      console.error("[Download] Error:", error);
      const errorMsg = error instanceof Error ? error.message : "알 수 없는 오류";
      addToast("error", errorMsg, "❌ 다운로드 실패", 5000);
    } finally {
      setDownloadingVideoId(null);
    }
  };

  // 영상 상세 페이지 모달 (간단한 버전)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  return (
    <>
      <Toast toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} position="top-center" />
      <div className="main-container">
        {/* 왼쪽 패널 */}
        <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          <div
            className="sidebar-title"
            onClick={handleTitleClick}
            style={{ cursor: "pointer", transition: "opacity 0.3s", opacity: isTitleRefreshing ? 0.5 : 1 }}
          >
            틱톡킬라
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
                        <div key={keyword} className="history-item" onClick={() => handleHistoryClick(keyword)}>
                          <span>{keyword}</span>
                          <button className="history-delete" onClick={(e) => handleDeleteHistory(e, keyword)} title="삭제">
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

            {/* 번역 정보 표시 (검색어 입력 바로 아래) - 한 번 나타나면 계속 표시 */}
            {showTranslationPanel && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "14px",
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.95) 100%)",
                  border: "1px solid rgba(0, 0, 0, 0.12)",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                  minHeight: "80px",
                }}
              >
                {/* 원문 표시 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginBottom: translatedQuery || isTranslating ? "14px" : "0",
                    padding: "12px",
                    background: "rgba(248, 249, 250, 0.8)",
                    borderRadius: "10px",
                    border: "1px solid rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6b7280",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    📋 원문 ({detectedLanguage === "ko" ? "한국어" : detectedLanguage === "zh" ? "中文" : "English"})
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1a1a1a",
                      lineHeight: "1.5",
                    }}
                  >
                    - {searchInput}
                  </div>
                </div>

                {/* 번역 중 상태 */}
                {isTranslating && (
                  <div
                    style={{
                      padding: "14px",
                      background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)",
                      border: "1px solid rgba(59, 130, 246, 0.25)",
                      borderRadius: "10px",
                      textAlign: "center",
                      color: "#3b82f6",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    ⏳ 번역 중...
                  </div>
                )}

                {/* 번역본 표시 (translatedQuery가 있고 원문과 다를 때) */}
                {!isTranslating && translatedQuery && translatedQuery !== searchInput && (
                  <>
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: "11px",
                        color: "#9ca3af",
                        margin: "6px 0 12px 0",
                        fontWeight: "600",
                      }}
                    >
                      ↓ 번역됨 ↓
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        padding: "12px",
                        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.04) 100%)",
                        border: "1px solid rgba(34, 197, 94, 0.25)",
                        borderRadius: "10px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#16a34a",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        🌐 번역본 ({targetLanguage === "ko" ? "한국어" : targetLanguage === "zh" ? "中文" : "English"})
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#1a1a1a",
                          lineHeight: "1.5",
                        }}
                      >
                        - {translatedQuery}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(translatedQuery);
                          addToast("success", "번역 결과가 클립보드에 복사되었습니다!", "📋 복사 완료");
                        }}
                        style={{
                          marginTop: "4px",
                          padding: "8px 16px",
                          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.3s",
                          boxShadow: "0 2px 6px rgba(34, 197, 94, 0.2)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(34, 197, 94, 0.3)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 2px 6px rgba(34, 197, 94, 0.2)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        📋 복사
                      </button>
                    </div>
                  </>
                )}

                {/* 번역 안 됨 안내 (같은 언어) */}
                {!isTranslating && !translatedQuery && detectedLanguage === targetLanguage && (
                  <div
                    style={{
                      padding: "14px",
                      background: "linear-gradient(135deg, rgba(156, 163, 175, 0.08) 0%, rgba(156, 163, 175, 0.04) 100%)",
                      border: "1px solid rgba(156, 163, 175, 0.25)",
                      borderRadius: "10px",
                      textAlign: "center",
                      color: "#6b7280",
                      fontSize: "13px",
                      fontWeight: "500",
                    }}
                  >
                    ℹ️ 입력 언어와 선택 언어가 동일하여 번역하지 않습니다
                  </div>
                )}

                {/* 번역 대기 상태 (검색 전) */}
                {!isTranslating && !translatedQuery && detectedLanguage !== targetLanguage && (
                  <div
                    style={{
                      padding: "14px",
                      background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(124, 58, 237, 0.04) 100%)",
                      border: "1px solid rgba(124, 58, 237, 0.25)",
                      borderRadius: "10px",
                      textAlign: "center",
                      color: "#7c3aed",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    💬 검색 버튼을 클릭하면 번역 후 검색됩니다
                  </div>
                )}
              </div>
            )}

            {/* 플랫폼 선택 */}
            <div className="search-input-wrapper">
              <div className="search-label">플랫폼 선택</div>
              <div className="platform-selector">
                <label className={`platform-option ${platform === "tiktok" ? "active" : ""}`} onClick={() => setPlatform("tiktok")}>
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
                <label className={`platform-option ${platform === "douyin" ? "active" : ""}`} onClick={() => setPlatform("douyin")}>
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
                  className="platform-option"
                  style={{ opacity: 0.5, cursor: "not-allowed", pointerEvents: "none" }}
                  title="현재 사용 불가"
                >
                  <input
                    type="radio"
                    name="platform"
                    value="xiaohongshu"
                    disabled
                    style={{ display: "none" }}
                  />
                  <span className="platform-icon">❤️</span>
                  <span className="platform-name">Xiaohongshu</span>
                  <span style={{ fontSize: "10px", marginLeft: "4px", color: "#999" }}>(준비중)</span>
                </label>
              </div>
            </div>

            {/* 언어 선택 */}
            <div className="search-input-wrapper" style={{ marginTop: "16px" }}>
              <div className="search-label">검색 언어</div>
              <div className="platform-selector">
                <label className={`platform-option ${targetLanguage === "ko" ? "active" : ""}`} onClick={() => setTargetLanguage("ko")}>
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
                <label className={`platform-option ${targetLanguage === "zh" ? "active" : ""}`} onClick={() => setTargetLanguage("zh")}>
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
                <label className={`platform-option ${targetLanguage === "en" ? "active" : ""}`} onClick={() => setTargetLanguage("en")}>
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

              {/* 플랫폼별 추천 표시 - 항상 표시 */}
              <div
                style={{
                  fontSize: "12px",
                  marginTop: "6px",
                  padding: "8px 10px",
                  backgroundColor:
                    (platform === "douyin" || platform === "xiaohongshu") && targetLanguage !== "zh" ? "#f5f5f5" : "transparent",
                  borderRadius: "4px",
                  minHeight: "32px",
                  opacity: (platform === "douyin" || platform === "xiaohongshu") && targetLanguage !== "zh" ? 1 : 0,
                  transition: "opacity 0.2s ease, background-color 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {(platform === "douyin" || platform === "xiaohongshu") && targetLanguage !== "zh" && (
                  <span style={{ color: "#000000", fontWeight: "600" }}>
                    💡 팁: {platform === "douyin" ? "Douyin" : "Xiaohongshu"}은 중국어 검색이 더 정확합니다
                  </span>
                )}
              </div>
            </div>

            {/* 필터 섹션 */}
            <div
              style={{
                marginTop: "24px",
                paddingTop: "0",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  marginBottom: "16px",
                  color: "#000000",
                  letterSpacing: "0.5px",
                }}
              >
                필터
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
                    borderRadius: "8px",
                    padding: "10px 8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#000000",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    조회수
                  </div>
                  <ViewCountFilter
                    minValue={filters.minPlayCount}
                    maxValue={filters.maxPlayCount}
                    onChange={(min, max) => setFilters({ ...filters, minPlayCount: min, maxPlayCount: max })}
                  />
                </div>

                {platform !== "xiaohongshu" && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
                      borderRadius: "8px",
                      padding: "10px 8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#000000",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                      }}
                    >
                      기간
                    </div>
                    <PeriodFilter
                      value={filters.uploadPeriod}
                      onChange={(value) => setFilters({ ...filters, uploadPeriod: value })}
                      platform={platform}
                    />
                  </div>
                )}

                <div
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
                    borderRadius: "8px",
                    padding: "10px 8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#000000",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    길이
                  </div>
                  <VideoLengthFilter value={filters.videoLength} onChange={(value) => setFilters({ ...filters, videoLength: value })} />
                </div>

                <div
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
                    borderRadius: "8px",
                    padding: "10px 8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#000000",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
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
              <div
                style={{
                  color: "#ff6b6b",
                  fontSize: "12px",
                  marginTop: "10px",
                  padding: "10px",
                  backgroundColor: "rgba(255, 107, 107, 0.1)",
                  borderRadius: "4px",
                  border: "1px solid rgba(255, 107, 107, 0.3)",
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* 리사이저 */}
        <div ref={resizeRef} className="sidebar-resizer" onMouseDown={() => setIsResizing(true)}></div>

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
              <UserDropdown />
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: isLoading || results.length === 0 ? "center" : "flex-start",
              justifyContent: "center",
              overflowY: "auto",
            }}
          >
            {isLoading ? (
              <div style={{ width: "100%", maxWidth: "600px" }}>
                <SearchProgress
                  isSearching={isLoading}
                  onCancel={handleCancelSearch}
                  jobStatus={jobStatus?.status}
                  realProgress={jobStatus?.progress}
                  queuePosition={jobStatus?.queuePosition}
                  totalQueueSize={jobStatus?.totalQueueSize}
                  statusMessage={jobStatus?.message}
                  estimatedWaitSeconds={jobStatus?.estimatedWaitSeconds}
                />
              </div>
            ) : results.length === 0 ? (
              <div
                className="no-results"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  padding: "40px 20px",
                }}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    backgroundColor: "#f5f5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                    fontSize: "28px",
                  }}
                >
                  🔍
                </div>
                <p style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px", color: "#1a1a1a", textAlign: "center" }}>
                  {error ? "검색 결과가 없습니다" : "검색어를 입력하여 시작하세요"}
                </p>
                <p style={{ fontSize: "13px", color: "#6b6b6b", textAlign: "center", maxWidth: "300px" }}>
                  {error ? "다른 키워드나 필터로 다시 시도해보세요" : "관심있는 콘텐츠를 찾아보세요"}
                </p>
              </div>
            ) : (
              <>
                <div style={{ width: "100%" }}>
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
                            onMouseEnter={() => handleVideoCardMouseEnter(video)}
                            onMouseLeave={handleVideoCardMouseLeave}
                          >
                            {/* 썸네일 */}
                            {video.thumbnail ? (
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className={`card-thumbnail ${playingVideoId === video.id ? "card-thumbnail-hidden" : ""}`}
                                loading="lazy"
                              />
                            ) : (
                              <div className="card-thumbnail-fallback">🎬</div>
                            )}

                            {/* 비디오 미리보기 */}
                            {video.videoUrl && playingVideoId === video.id && (
                              <video className="card-video-preview" src={video.videoUrl} autoPlay muted loop playsInline preload="auto" />
                            )}

                            {/* Duration 뱃지 - 왼쪽 상단 (샤오홍슈 제외) */}
                            {platform !== "xiaohongshu" && (
                              <div className="card-duration-badge">{formatVideoDuration(video.videoDuration)}</div>
                            )}

                            {/* Date 뱃지 - 오른쪽 상단 */}
                            {video.createTime && <div className="card-date-badge">{getRelativeDateString(new Date(video.createTime))}</div>}

                            {/* 그라데이션 오버레이 - 하단 */}
                            <div className="card-overlay">
                              {/* 크리에이터 */}
                              <div className="card-overlay-creator">
                                <span>@{video.creator}</span>
                                {video.followerCount && (
                                  <span style={{ fontSize: "10px", opacity: 0.9 }}>· {formatNumber(video.followerCount)}</span>
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
                                <span className="card-action-label">{downloadingVideoId === video.id ? "준비중" : "다운"}</span>
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
                              <td
                                style={{ textAlign: "center", cursor: "pointer" }}
                                onClick={() => {
                                  if (video.webVideoUrl) {
                                    window.open(video.webVideoUrl, "_blank");
                                  }
                                }}
                              >
                                {video.thumbnail ? (
                                  <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="table-thumbnail"
                                    style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "2px" }}
                                  />
                                ) : (
                                  <span>🎬</span>
                                )}
                              </td>
                              <td className="table-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {video.title}
                              </td>
                              <td className="table-author" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {video.creator}
                              </td>
                              <td className="table-number">{video.followerCount ? formatNumber(video.followerCount) : "-"}</td>
                              <td className="table-number" style={{ fontSize: "11px" }}>
                                {formatDateWithTime(video.createTime)}
                              </td>
                              {platform !== "xiaohongshu" && <td className="table-number">{formatVideoDuration(video.videoDuration)}</td>}
                              <td className="table-number">{formatNumber(video.playCount)}</td>
                              <td className="table-number">{formatNumber(video.likeCount)}</td>
                              <td className="table-number">{formatNumber(video.commentCount)}</td>
                              <td className="table-number">{formatNumber(video.shareCount)}</td>
                              <td className="table-number" style={{ color: "#f4d03f", fontWeight: "600" }}>
                                {video.playCount > 0
                                  ? (((video.likeCount + video.commentCount + video.shareCount) / video.playCount) * 100).toFixed(2)
                                  : "-"}
                                %
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
        <div className="modal-overlay" onClick={() => setSelectedVideo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
              <h2 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "#000000", lineHeight: 1.4 }}>{selectedVideo.title}</h2>

              {/* 크리에이터 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                  background: "linear-gradient(135deg, rgba(0, 0, 0, 0.03) 0%, rgba(0, 0, 0, 0.02) 100%)",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  border: "1px solid rgba(0, 0, 0, 0.08)",
                }}
              >
                <span style={{ fontSize: "16px" }}>👤</span>
                <div>
                  <div style={{ fontSize: "11px", color: "#6b6b6b", marginBottom: "2px" }}>크리에이터</div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>{selectedVideo.creator}</div>
                </div>
              </div>

              {/* 통계 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(0, 0, 0, 0.03) 0%, rgba(0, 0, 0, 0.01) 100%)",
                    padding: "12px",
                    borderRadius: "10px",
                    color: "#000000",
                    border: "1px solid rgba(0, 0, 0, 0.08)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div style={{ fontSize: "11px", opacity: 0.9, marginBottom: "6px", color: "#6b6b6b" }}>조회수</div>
                  <div style={{ fontSize: "20px", fontWeight: "700" }}>{(selectedVideo.playCount / 1000000).toFixed(1)}M</div>
                </div>
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(0, 0, 0, 0.03) 0%, rgba(0, 0, 0, 0.01) 100%)",
                    padding: "12px",
                    borderRadius: "10px",
                    color: "#000000",
                    border: "1px solid rgba(0, 0, 0, 0.08)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div style={{ fontSize: "11px", opacity: 0.9, marginBottom: "6px", color: "#6b6b6b" }}>좋아요</div>
                  <div style={{ fontSize: "20px", fontWeight: "700" }}>{(selectedVideo.likeCount / 1000).toFixed(1)}K</div>
                </div>
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(0, 0, 0, 0.03) 0%, rgba(0, 0, 0, 0.01) 100%)",
                    padding: "12px",
                    borderRadius: "10px",
                    color: "#000000",
                    border: "1px solid rgba(0, 0, 0, 0.08)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div style={{ fontSize: "11px", opacity: 0.9, marginBottom: "6px", color: "#6b6b6b" }}>댓글</div>
                  <div style={{ fontSize: "20px", fontWeight: "700" }}>{(selectedVideo.commentCount / 1000).toFixed(1)}K</div>
                </div>
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(0, 0, 0, 0.03) 0%, rgba(0, 0, 0, 0.01) 100%)",
                    padding: "12px",
                    borderRadius: "10px",
                    color: "#000000",
                    border: "1px solid rgba(0, 0, 0, 0.08)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div style={{ fontSize: "11px", opacity: 0.9, marginBottom: "6px", color: "#6b6b6b" }}>공유</div>
                  <div style={{ fontSize: "20px", fontWeight: "700" }}>{(selectedVideo.shareCount / 1000).toFixed(1)}K</div>
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
                          background: "linear-gradient(135deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.02) 100%)",
                          color: "#1a1a1a",
                          padding: "4px 10px",
                          borderRadius: "16px",
                          fontSize: "11px",
                          fontWeight: "600",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
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
                  backgroundColor: "transparent",
                  color: "#6b6b6b",
                  border: "1px solid rgba(0, 0, 0, 0.12)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
                  e.currentTarget.style.color = "#000000";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#6b6b6b";
                }}
              >
                닫기
              </button>
              <button
                onClick={() => {
                  handleOpenVideo(selectedVideo);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                }}
              >
                🔗 {platform === "douyin" ? "도우인" : platform === "xiaohongshu" ? "샤오홍슈" : "TikTok"}에서 열기
              </button>
              <button
                onClick={() => {
                  if (selectedVideo) handleDownloadVideo(selectedVideo);
                }}
                disabled={selectedVideo ? downloadingVideoId === selectedVideo.id : true}
                style={{
                  flex: 1,
                  padding: "10px",
                  background:
                    selectedVideo && downloadingVideoId === selectedVideo.id
                      ? "linear-gradient(135deg, #9ca3af 0%, #c0c0c0 100%)"
                      : "linear-gradient(135deg, #6b6b6b 0%, #9ca3af 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: selectedVideo && downloadingVideoId === selectedVideo.id ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  opacity: selectedVideo && downloadingVideoId === selectedVideo.id ? 0.6 : 1,
                  boxShadow: selectedVideo && downloadingVideoId === selectedVideo.id ? "none" : "0 4px 12px rgba(0, 0, 0, 0.15)",
                }}
              >
                {selectedVideo && downloadingVideoId === selectedVideo.id ? "⏳ 준비 중..." : "⬇️ 다운로드"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
