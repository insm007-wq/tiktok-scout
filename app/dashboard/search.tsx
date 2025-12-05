"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import { LayoutGrid, Table2, Download } from "lucide-react";
import SearchResults from "@/app/components/SearchResults/SearchResults";
import PeriodFilter from "@/app/components/Filters/PeriodFilter/PeriodFilter";
import VideoLengthFilter from "@/app/components/Filters/VideoLengthFilter/VideoLengthFilter";
import EngagementRatioFilter from "@/app/components/Filters/EngagementRatioFilter/EngagementRatioFilter";
import CommentsModal from "@/app/components/CommentsModal/CommentsModal";
import ChannelModal from "@/app/components/ChannelModal/ChannelModal";
import ApiLimitBanner from "@/app/components/ApiLimitBanner/ApiLimitBanner";
import "./search.css";

interface Comment {
  author: string;
  text: string;
  likes: number;
  replies: number;
}

interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  provider?: string;
}

interface ApiLimitError {
  message: string;
  used?: number;
  limit?: number;
  remaining?: number;
  resetTime?: string;
  deactivated?: boolean;
}

export default function Search({ user, signOut }: { user?: User; signOut?: (options?: any) => void }) {
  const [searchInput, setSearchInput] = useState("");
  const [uploadPeriod, setUploadPeriod] = useState("all");
  const [videoLength, setVideoLength] = useState("all");
  const [engagementRatios, setEngagementRatios] = useState<string[]>(["4", "5"]);
  const [isLoading, setIsLoading] = useState(false);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [sortBy, setSortBy] = useState("relevance");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isTitleRefreshing, setIsTitleRefreshing] = useState(false);

  const handleTitleClick = () => {
    setIsTitleRefreshing(true);
    setTimeout(() => {
      setIsTitleRefreshing(false);
      window.location.reload();
    }, 600);
  };

  // OAuth 제공자별 색상 매핑
  const getProviderColor = (providerId?: string): string => {
    if (!providerId) return "#667eea";
    const provider = providerId.split(":")[0].toLowerCase();
    const colorMap: { [key: string]: string } = {
      google: "#4285f4",      // 구글 블루
      kakao: "#fee500",       // 카카오 옐로우
      naver: "#00c73c",       // 네이버 그린
    };
    return colorMap[provider] || "#667eea";
  };
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [apiLimitError, setApiLimitError] = useState<ApiLimitError | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // 사이드바 너비 조정
  const [sidebarWidth, setSidebarWidth] = useState<number>(800);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // 저장된 너비 복원
  useEffect(() => {
    const savedWidth = localStorage.getItem("youtube-scout-sidebar-width");
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth, 10));
    }
  }, []);

  // 검색 히스토리 로드
  useEffect(() => {
    const savedHistory = localStorage.getItem("youtube-scout-search-history");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // 드래그로 너비 조정
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      const minWidth = 420;
      const maxWidth = 1000;

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
    localStorage.setItem("youtube-scout-sidebar-width", sidebarWidth.toString());
  }, [sidebarWidth]);

  // 프로필 드롭다운 닫기 (클릭 외부 감지)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // 댓글 모달 상태
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsModalData, setCommentsModalData] = useState({
    videoTitle: "",
    comments: [] as Comment[],
    totalReplies: 0,
    totalLikes: 0,
    isLoading: false,
  });

  // 채널 모달 상태
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelModalData, setChannelModalData] = useState({
    channelTitle: "",
    channelDescription: "",
    viewCount: 0,
    subscriberCount: false,
    subscriberCountValue: 0,
    videoCount: 0,
    customUrl: "",
    channelId: "",
    isLoading: false,
  });

  // ✅ 로그아웃 처리 함수 (오프라인 상태 설정)
  const handleLogout = async () => {
    try {
      if (user?.email) {
        // setUserOffline API 호출
        await fetch("/api/set-user-offline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        })
      }
    } catch (error) {
      console.error("❌ 오프라인 처리 실패:", error)
    } finally {
      // signOut 호출
      signOut?.({ redirectTo: "/" })
    }
  }

  // ✅ 브라우저 종료 감지 - 사용자를 오프라인 상태로 변경
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user?.email) {
        // sendBeacon 사용하여 브라우저 종료 시에도 요청 보장
        const blob = new Blob(
          [JSON.stringify({ email: user.email })],
          { type: "application/json" }
        )
        navigator.sendBeacon("/api/set-user-offline", blob)
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [user?.email])

  // 기간 필터링 함수
  const filterResultsByPeriod = (items: any[], period: string) => {
    if (period === "all") return items;

    const now = Date.now();
    return items.filter((video) => {
      const publishDate = new Date(video.publishedAt || "").getTime();
      const daysAgo = (now - publishDate) / (1000 * 60 * 60 * 24);

      // 단기 필터
      if (period === "3days" && daysAgo > 3) return false;
      if (period === "5days" && daysAgo > 5) return false;
      if (period === "7days" && daysAgo > 7) return false;
      if (period === "10days" && daysAgo > 10) return false;

      // 장기 필터
      if (period === "1month" && daysAgo > 30) return false;
      if (period === "2months" && daysAgo > 60) return false;
      if (period === "6months" && daysAgo > 180) return false;
      if (period === "1year" && daysAgo > 365) return false;

      return true;
    });
  };

  // Engagement 레벨 계산 함수
  const getEngagementLevel = (ratio: number): number => {
    if (ratio >= 3.0) return 5;
    if (ratio >= 1.4) return 4;
    if (ratio >= 0.6) return 3;
    if (ratio >= 0.2) return 2;
    return 1;
  };

  // 기간, 길이, engagement ratio로 필터링하는 함수
  const filterResults = (items: any[], period: string, length: string, ratios: string[]) => {
    let filtered = filterResultsByPeriod(items, period);

    // 길이 필터
    if (length !== "all") {
      filtered = filtered.filter((video) => {
        const durationStr = video.duration || "";
        // ISO 8601 duration 파싱 (예: PT1H30M45S)
        const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return true;

        const hours = parseInt(match[1] || "0");
        const minutes = parseInt(match[2] || "0");
        const seconds = parseInt(match[3] || "0");
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;

        // 180초(3분)를 기준으로 필터
        if (length === "short" && totalSeconds > 180) return false;
        if (length === "long" && totalSeconds <= 180) return false;

        return true;
      });
    }

    // Engagement ratio 필터
    if (ratios.length > 0 && !ratios.includes("all")) {
      filtered = filtered.filter((video) => {
        const subscriberCount = video.subscriberCount || 0;
        const viewCount = video.viewCount || 0;

        if (subscriberCount === 0) return false;

        const ratio = viewCount / subscriberCount;
        const level = getEngagementLevel(ratio);

        return ratios.includes(level.toString());
      });
    }

    return filtered;
  };

  // 정렬 함수
  const sortResults = (items: any[], sortOption: string) => {
    const sorted = [...items];

    switch (sortOption) {
      case "viewCount":
        sorted.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        break;
      case "vph":
        sorted.sort((a, b) => {
          const vphA = a.subscriberCount > 0 ? a.viewCount / a.subscriberCount : 0;
          const vphB = b.subscriberCount > 0 ? b.viewCount / b.subscriberCount : 0;
          return vphB - vphA;
        });
        break;
      case "engagementRatio":
        sorted.sort((a, b) => {
          const ratioA = a.subscriberCount > 0 ? a.viewCount / a.subscriberCount : 0;
          const ratioB = b.subscriberCount > 0 ? b.viewCount / b.subscriberCount : 0;
          return ratioB - ratioA;
        });
        break;
      case "subscriberCount":
        sorted.sort((a, b) => (b.subscriberCount || 0) - (a.subscriberCount || 0));
        break;
      case "duration":
        sorted.sort((a, b) => {
          const getDurationSeconds = (durationStr: string) => {
            const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (!match) return 0;
            const hours = parseInt(match[1] || "0");
            const minutes = parseInt(match[2] || "0");
            const seconds = parseInt(match[3] || "0");
            return hours * 3600 + minutes * 60 + seconds;
          };
          const durationA = getDurationSeconds(a.duration || "");
          const durationB = getDurationSeconds(b.duration || "");
          return durationB - durationA;
        });
        break;
      case "likeCount":
        sorted.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
        break;
      case "publishedAt":
        sorted.sort((a, b) => {
          const dateA = new Date(a.publishedAt || "").getTime();
          const dateB = new Date(b.publishedAt || "").getTime();
          return dateB - dateA;
        });
        break;
      case "relevance":
      default:
        // relevance: 조회수 + 내림차순
        sorted.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        break;
    }

    return sorted;
  };

  // 필터링된 결과 계산 (메모이제이션)
  const results = useMemo(
    () => {
      let filtered = filterResults(allResults, uploadPeriod, videoLength, engagementRatios);
      return sortResults(filtered, sortBy);
    },
    [allResults, uploadPeriod, videoLength, engagementRatios, sortBy]
  );

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    if (results.length === 0) {
      alert("검색 결과가 없습니다");
      return;
    }

    // CSV 헤더
    const csvHeader = ["제목", "채널명", "조회수", "구독자", "조회수/구독자", "단계", "영상길이", "업로드일", "태그", "YouTube링크"];
    const csvRows: string[][] = [];

    // 데이터 행 생성
    results.forEach((video) => {
      const title = video.title;
      const channel = video.channelTitle;
      const viewCount = video.viewCount || 0;
      const subscriberCount = video.subscriberCount || 0;
      const ratio = subscriberCount > 0 ? (viewCount / subscriberCount).toFixed(2) : "N/A";
      const level = getEngagementLevel(subscriberCount > 0 ? viewCount / subscriberCount : 0);

      // 길이 포맷팅
      let durationText = "-";
      if (video.duration) {
        const match = video.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
          const hours = parseInt(match[1] || "0");
          const minutes = parseInt(match[2] || "0");
          const seconds = parseInt(match[3] || "0");
          if (hours > 0) {
            durationText = `${hours}시간 ${minutes}분`;
          } else if (minutes > 0) {
            durationText = `${minutes}분 ${seconds}초`;
          } else {
            durationText = `${seconds}초`;
          }
        }
      }

      // 업로드 날짜 포맷팅
      const uploadDate = new Date(video.publishedAt || "").toLocaleDateString("ko-KR");

      // 태그
      const tags = video.tags ? video.tags.join(";") : "";

      // YouTube 링크
      const videoLink = `https://www.youtube.com/watch?v=${video.id}`;

      csvRows.push([
        `"${title.replace(/"/g, '""')}"`,
        `"${channel.replace(/"/g, '""')}"`,
        viewCount.toString(),
        subscriberCount.toString(),
        ratio,
        level.toString(),
        durationText,
        uploadDate,
        `"${tags.replace(/"/g, '""')}"`,
        videoLink,
      ]);
    });

    // CSV 문자열 생성
    const csv = [csvHeader.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

    // 다운로드
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `youtube-search-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) {
      alert("검색어를 입력해주세요");
      return;
    }

    // 검색 히스토리 저장
    const newHistory = [searchInput, ...searchHistory.filter(item => item !== searchInput)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("youtube-scout-search-history", JSON.stringify(newHistory));

    setIsLoading(true);
    setApiLimitError(null); // 새 검색 시 이전 에러 제거
    try {
      const params = new URLSearchParams({
        q: searchInput,
        maxResults: "50",
      });

      const response = await fetch(`/api/youtube_search?${params}`);
      const data = await response.json();

      if (!response.ok) {
        // 403 에러: 계정이 비활성화됨
        if (response.status === 403) {
          setApiLimitError({
            message: data.message,
            deactivated: true,
          });
          return;
        }

        // 429 에러: API 사용 제한 초과
        if (response.status === 429) {
          setApiLimitError({
            message: data.message,
            used: data.apiUsageToday.used,
            limit: data.apiUsageToday.limit,
            remaining: data.apiUsageToday.remaining,
            resetTime: data.resetTime,
          });
          return;
        }

        // 기타 에러
        alert(`검색 실패: ${data.error || "알 수 없는 오류"}`);
        return;
      }

      setAllResults(data.items || []);
      setTotalResults(data.totalResults || 0);

      // ✅ 성공 시 에러 상태 초기화 (이전의 제한 상태를 제거)
      setApiLimitError(null);

      // ✅ 사용량 정보 로깅
      if (data.apiUsageToday) {
        console.log(`✅ 검색 성공 - 사용량: ${data.apiUsageToday.used}/${data.apiUsageToday.limit}`);
        console.log(`📊 남은 횟수: ${data.apiUsageToday.remaining}회`);
      }
    } catch (error) {
      console.error("검색 오류:", error);
      alert("검색 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [searchInput, searchHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 히스토리 항목 클릭
  const handleHistoryClick = (keyword: string) => {
    setSearchInput(keyword);
  };

  // 히스토리 항목 삭제
  const handleDeleteHistory = (e: React.MouseEvent, keyword: string) => {
    e.stopPropagation();
    const newHistory = searchHistory.filter(item => item !== keyword);
    setSearchHistory(newHistory);
    localStorage.setItem("youtube-scout-search-history", JSON.stringify(newHistory));
  };


  // 댓글 조회 함수
  const handleCommentsClick = useCallback(async (videoId: string, videoTitle: string) => {
    setCommentsModalData((prev) => ({
      ...prev,
      isLoading: true,
      videoTitle,
    }));
    setShowCommentsModal(true);

    try {
      const response = await fetch(`/api/youtube_comments?videoId=${videoId}`);
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "댓글을 불러올 수 없습니다");
        setCommentsModalData((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      setCommentsModalData((prev) => ({
        ...prev,
        comments: data.comments,
        totalReplies: data.totalReplies,
        totalLikes: data.totalLikes,
        isLoading: false,
      }));
    } catch (error) {
      console.error("댓글 조회 오류:", error);
      alert("댓글 조회 중 오류가 발생했습니다");
      setCommentsModalData((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // 채널 조회 함수
  const handleChannelClick = useCallback(async (channelId: string, channelTitle: string) => {
    setChannelModalData((prev) => ({
      ...prev,
      isLoading: true,
      channelTitle,
      channelId,
    }));
    setShowChannelModal(true);

    try {
      const response = await fetch(`/api/youtube_channel?channelId=${channelId}`);
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "채널 정보를 불러올 수 없습니다");
        setChannelModalData((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      setChannelModalData((prev) => ({
        ...prev,
        channelDescription: data.description,
        viewCount: data.viewCount,
        subscriberCount: data.hiddenSubscriberCount,
        subscriberCountValue: data.subscriberCount,
        videoCount: data.videoCount,
        customUrl: data.customUrl,
        isLoading: false,
      }));
    } catch (error) {
      console.error("채널 조회 오류:", error);
      alert("채널 정보 조회 중 오류가 발생했습니다");
      setChannelModalData((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  return (
    <>
      <div className="main-container">
        {/* 왼쪽 패널 */}
        <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          <div className="sidebar-title" onClick={handleTitleClick} style={{ cursor: "pointer", transition: "opacity 0.3s", opacity: isTitleRefreshing ? 0.5 : 1 }}>
            유튜브 스카우트
          </div>

          <div className="search-section">
            <div className="search-input-wrapper">
              <div className="search-label">검색어</div>
              <div className="search-container-with-button">
                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    placeholder=""
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

            {/* API 사용 제한 배너 */}
            <AnimatePresence>
              {apiLimitError && (
                <ApiLimitBanner
                  used={apiLimitError.used}
                  limit={apiLimitError.limit}
                  resetTime={apiLimitError.resetTime}
                  deactivated={apiLimitError.deactivated}
                  onClose={() => setApiLimitError(null)}
                />
              )}
            </AnimatePresence>
          </div>


          {/* 필터 섹션 */}
          <div className="filters-wrapper">
            <PeriodFilter value={uploadPeriod} onChange={setUploadPeriod} />
            <VideoLengthFilter value={videoLength} onChange={setVideoLength} />
            <EngagementRatioFilter selectedValues={engagementRatios} onChange={setEngagementRatios} />
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
                <option value="relevance">조회수 + 내림차순</option>
                <option value="viewCount">조회수순</option>
                <option value="vph">VPH순 (높음)</option>
                <option value="engagementRatio">비율순 (높음)</option>
                <option value="subscriberCount">구독자순</option>
                <option value="duration">길이순 (길음)</option>
                <option value="likeCount">좋아요순</option>
                <option value="publishedAt">최신순</option>
              </select>
              <button className="btn-excel" onClick={handleExcelDownload}>
                <Download size={16} style={{ display: "inline", marginRight: "4px" }} />
                엑셀
              </button>

              {/* 프로필 드롭다운 */}
              <div className="profile-dropdown-container" ref={profileDropdownRef}>
                <div className="profile-divider">|</div>
                <button
                  className="profile-avatar-btn"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  title="프로필 메뉴"
                  style={{ borderColor: getProviderColor(user?.id) }}
                >
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt={user?.name || "User"}
                      className="profile-avatar"
                    />
                  ) : (
                    <div
                      className="profile-avatar-fallback"
                      style={{ background: getProviderColor(user?.id) }}
                    >
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </button>

                {profileDropdownOpen && (
                  <div className="profile-dropdown-menu">
                    {/* 프로필 정보 */}
                    <div className="profile-dropdown-header">
                      <div className="profile-dropdown-name">{user?.name || "사용자"}</div>
                      <div className="profile-dropdown-email">{user?.email}</div>
                    </div>

                    {/* 로그아웃 */}
                    <button
                      className="profile-dropdown-logout"
                      onClick={() => handleLogout()}
                    >
                      🚪 로그아웃
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <SearchResults
            results={results}
            totalResults={totalResults}
            isLoading={isLoading}
            showVPH={true}
            viewMode={viewMode}
            onChannelClick={handleChannelClick}
            onCommentsClick={handleCommentsClick}
          />
        </div>
      </div>

      {/* 댓글 분석 모달 */}
      <CommentsModal
        isOpen={showCommentsModal}
        videoTitle={commentsModalData.videoTitle}
        comments={commentsModalData.comments}
        totalReplies={commentsModalData.totalReplies}
        totalLikes={commentsModalData.totalLikes}
        isLoading={commentsModalData.isLoading}
        onClose={() => setShowCommentsModal(false)}
      />

      {/* 채널 분석 모달 */}
      <ChannelModal
        isOpen={showChannelModal}
        channelTitle={channelModalData.channelTitle}
        channelDescription={channelModalData.channelDescription}
        viewCount={channelModalData.viewCount}
        subscriberCount={channelModalData.subscriberCount}
        subscriberCountValue={channelModalData.subscriberCountValue}
        videoCount={channelModalData.videoCount}
        customUrl={channelModalData.customUrl}
        channelId={channelModalData.channelId}
        isLoading={channelModalData.isLoading}
        onClose={() => setShowChannelModal(false)}
      />
    </>
  );
}
