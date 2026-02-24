"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, MoreVertical } from "lucide-react";

const POLL_INTERVAL_MS = 1000;

type Platform = "tiktok" | "douyin";

interface SearchResult {
  id: string;
  nickname: string;
  followers: number;
  likes: number;
  bio: string;
  verified: boolean;
  profilePicUrl?: string;
}

interface JobStatus {
  status: string;
  progress: number;
  message: string;
  queuePosition?: number;
}

export default function SearchPage() {
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(10);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobMessage, setJobMessage] = useState("");
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const prevProgressRef = useRef(0);

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/search/${jobId}`);
        const data = await response.json();

        if (data.status === "completed") {
          setResults(data.data || []);
          setLoading(false);
          setJobId(null);
          setJobMessage("");
          setQueuePosition(null);
          prevProgressRef.current = 100;
          setProgress(100);
        } else if (data.status === "failed") {
          setError(data.error || "검색 중 오류가 발생했습니다.");
          setLoading(false);
          setJobId(null);
          setJobMessage("");
          setQueuePosition(null);
          prevProgressRef.current = 0;
          setProgress(0);
        } else {
          const newProgress = data.progress || 0;
          if (newProgress !== prevProgressRef.current) {
            prevProgressRef.current = newProgress;
            setProgress(newProgress);
          }
          if (data.message) setJobMessage(data.message);
          if (data.queuePosition) setQueuePosition(data.queuePosition);
        }
      } catch (err) {
        console.error("Failed to fetch job status:", err);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [jobId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError("검색어를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setJobId(null);
    setJobMessage("");
    setQueuePosition(null);
    prevProgressRef.current = 0;
    setProgress(0);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          platform,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.error || "검색 요청 처리 중 오류가 발생했습니다.");
        (error as any).status = response.status;
        (error as any).details = errorData.details;
        throw error;
      }

      const data = await response.json();

      // 캐시에서 바로 반환된 경우
      if (data.status === "completed") {
        setResults(data.data || []);
        setLoading(false);
        prevProgressRef.current = 100;
        setProgress(100);
      } else {
        // 큐에 추가된 경우
        setJobId(data.jobId);
        setJobMessage(data.message);
        setQueuePosition(data.queuePosition);
        prevProgressRef.current = 0;
        setProgress(0);
      }
    } catch (err: any) {
      let errorMessage = "오류가 발생했습니다.";

      if (err instanceof Error) {
        // 할당량 초과 (429 - 사용자 검색 한도)
        if ((err as any).status === 429 && err.message.includes("일일 검색 한도")) {
          const details = (err as any).details;
          errorMessage = `❌ 일일 검색 한도를 초과했습니다!\n사용: ${details?.used}/${details?.limit}회\n내일 자정에 리셋됩니다.`;
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setResults([]);
      setLoading(false);
      setJobMessage("");
      setQueuePosition(null);
      prevProgressRef.current = 0;
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-black">
      {/* 헤더 */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            플랫폼 검색
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            TikTok과 Douyin에서 크리에이터를 검색하세요
          </p>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 검색 폼 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg mb-8">
          <form onSubmit={handleSearch} className="space-y-6">
            {/* 플랫폼 선택 탭 */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
                플랫폼 선택
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPlatform("tiktok")}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    platform === "tiktok"
                      ? "bg-gradient-to-r from-sky-500 to-violet-600 text-white shadow-lg scale-105"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  🎵 TikTok
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform("douyin")}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    platform === "douyin"
                      ? "bg-gradient-to-r from-sky-500 to-violet-600 text-white shadow-lg scale-105"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  🐉 Douyin
                </button>
              </div>
            </div>

            {/* 검색 입력 */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
                검색어
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 뷰티, 댄스, 요리, Gaming 등..."
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* 결과 개수 */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
                결과 개수: <span className="text-sky-600 dark:text-sky-400">{limit}개</span>
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                  {error}
                </p>
              </div>
            )}

            {/* 진행 상태 */}
            {jobId && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-blue-700 dark:text-blue-300 font-medium">
                    {jobMessage}
                  </p>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full"
                    style={{ width: `${progress}%`, transition: 'width 800ms ease-out' }}
                  />
                </div>
                {queuePosition && queuePosition > 1 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
                    대기열: {queuePosition}번 위치
                  </p>
                )}
              </div>
            )}

            {/* 검색 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {jobId ? "처리 중..." : "요청 중..."}
                </>
              ) : (
                <>
                  <Search size={20} />
                  검색하기
                </>
              )}
            </button>
          </form>
        </div>

        {/* 검색 결과 영역 */}
        <div className="space-y-4">
          {results.length > 0 && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                검색 결과
                <span className="text-sky-600 dark:text-sky-400 ml-2">
                  ({results.length}개)
                </span>
              </h2>
            </div>
          )}

          {/* 비디오 카드 그리드 */}
          {results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex flex-col"
                >
                  {/* 카드 헤더 (배경) */}
                  <div className="h-32 bg-gradient-to-br from-sky-400 to-violet-500 relative">
                    <button className="absolute top-2 right-2 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-all">
                      <MoreVertical size={18} className="text-white" />
                    </button>
                  </div>

                  {/* 프로필 섹션 */}
                  <div className="px-4 pb-4 flex flex-col items-center text-center relative -mt-12 z-10">
                    {/* 프로필 이미지 */}
                    <div className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shadow-lg">
                      {result.profilePicUrl ? (
                        <img
                          src={result.profilePicUrl}
                          alt={result.nickname}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-2xl">👤</div>
                      )}
                    </div>

                    {/* 닉네임 */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3 break-words">
                      {result.nickname}
                      {result.verified && (
                        <span className="ml-1 text-sky-600 dark:text-sky-400">✓</span>
                      )}
                    </h3>

                    {/* 바이오 */}
                    {result.bio && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {result.bio}
                      </p>
                    )}
                  </div>

                  {/* 통계 영역 */}
                  <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700 mt-auto">
                    <div className="grid grid-cols-2 gap-4">
                      {/* 팔로워 */}
                      <div className="text-center p-3 rounded-lg bg-sky-50 dark:bg-sky-900/30">
                        <p className="text-xl font-bold text-sky-600 dark:text-sky-400">
                          {(result.followers / 1000).toFixed(1)}K
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          팔로워
                        </p>
                      </div>

                      {/* 좋아요 */}
                      <div className="text-center p-3 rounded-lg bg-violet-50 dark:bg-violet-900/30">
                        <p className="text-xl font-bold text-violet-600 dark:text-violet-400">
                          {(result.likes / 1000).toFixed(1)}K
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          좋아요
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                    <button className="flex-1 py-2 px-3 text-sm font-semibold rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-all">
                      프로필
                    </button>
                    <button className="flex-1 py-2 px-3 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                      분석
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 빈 상태 */}
          {!loading && results.length === 0 && !error && (
            <div className="text-center py-32">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                검색어를 입력하고 플랫폼을 선택한 후 검색하세요
              </p>
            </div>
          )}

          {/* 로딩 상태 */}
          {loading && (
            <div className="text-center py-32">
              <Loader2 className="animate-spin mx-auto mb-4 text-sky-600" size={48} />
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                검색 중입니다...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
