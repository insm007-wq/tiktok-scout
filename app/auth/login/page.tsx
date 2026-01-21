import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "@/app/components/auth/LoginForm";

export const metadata = {
  title: "로그인 | 틱톡 킬라",
  description: "틱톡 킬라 계정으로 로그인하세요",
};

export default async function LoginPage() {
  // 이미 로그인되어 있으면 대시보드로 리다이렉트
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center p-4">
      {/* 배경 Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] bg-gradient-to-br from-pink-500 to-transparent rounded-full blur-[100px] opacity-15 -top-64 -right-32 animate-pulse"></div>
        <div
          className="absolute w-[500px] h-[500px] bg-gradient-to-br from-cyan-400 to-transparent rounded-full blur-[100px] opacity-15 -bottom-32 -left-32 animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute w-[400px] h-[400px] bg-gradient-to-br from-red-500 to-transparent rounded-full blur-[100px] opacity-15 top-1/2 left-1/3 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      ></div>

      <div className="relative z-10 w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-pink-400 to-cyan-400 mb-2 drop-shadow-[0_0_10px_rgba(254,44,85,0.5)]">
            틱톡킬라
          </h1>
          <p className="text-white/70 text-lg">계정에 로그인하세요</p>
        </div>

        {/* 폼 컨테이너 */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl hover:border-white/30 transition-all">
          {/* 로그인 폼 */}
          <LoginForm />

          {/* 회원가입 링크 */}
          <div className="mt-6 text-center">
            <p className="text-white/70">
              계정이 없으신가요?{" "}
              <Link href="/auth/signup" className="text-pink-400 hover:text-pink-300 font-semibold transition-colors">
                회원가입
              </Link>
            </p>
          </div>
        </div>

        {/* 메인으로 버튼 */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-semibold text-white/90 hover:text-white bg-white/15 hover:bg-white/20 border border-white/30 hover:border-white/40 rounded-lg transition-all"
          >
            ← 메인으로
          </Link>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-6 text-sm text-white/50">
          <p>
            문제가 있으신가요?{" "}
            <a href="mailto:support@tiktokscout.com" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              고객 지원
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
