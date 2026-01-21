import Link from "next/link";
import { CheckCircle, Mail, ArrowRight } from "lucide-react";

export const metadata = {
  title: "회원가입 완료 | 틱톡 킬라",
  description: "회원가입이 완료되었습니다. 로그인하여 서비스를 시작하세요.",
};

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center p-4">
      {/* 배경 Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] bg-gradient-to-br from-green-500 to-transparent rounded-full blur-[100px] opacity-15 -top-64 -right-32 animate-pulse"></div>
        <div
          className="absolute w-[500px] h-[500px] bg-gradient-to-br from-cyan-400 to-transparent rounded-full blur-[100px] opacity-15 -bottom-32 -left-32 animate-pulse"
          style={{ animationDelay: "1s" }}
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
        {/* 성공 아이콘 */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-cyan-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <CheckCircle size={80} className="text-green-400 relative" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 mb-2 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
            회원가입 완료!
          </h1>
          <p className="text-white/70 text-lg">씨너지나노 계정이 생성되었습니다</p>
        </div>

        {/* 정보 카드 */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl mb-6">
          {/* 체크 항목들 */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
              <span className="text-white/80">계정이 생성되었습니다</span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
              <span className="text-white/80">자동으로 승인되었습니다</span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <Mail size={20} className="text-cyan-400 flex-shrink-0" />
              <span className="text-white/80">이제 로그인할 수 있습니다</span>
            </div>
          </div>

          {/* 다음 단계 */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-blue-300 text-sm">
              <strong>다음 단계:</strong> 아래의 "로그인" 버튼을 클릭하여 계정에 로그인하세요. 가입 시 입력하신 이메일과 비밀번호를 사용하면 됩니다.
            </p>
          </div>

          {/* 버튼 */}
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-400 text-black rounded-xl hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all font-semibold text-lg"
            >
              로그인하기
              <ArrowRight size={20} />
            </Link>

            <Link
              href="/"
              className="w-full flex items-center justify-center px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all font-semibold"
            >
              메인으로
            </Link>
          </div>
        </div>

        {/* 팁 섹션 */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            💡 팁
          </h3>
          <ul className="text-white/70 text-sm space-y-2">
            <li>• 브라우저에서 비밀번호를 저장하면 다음에 쉽게 로그인할 수 있습니다</li>
            <li>• 로그인 후 프로필 설정에서 정보를 수정할 수 있습니다</li>
            <li>• 문제가 발생하면 <a href="mailto:aiyumisejong@gmail.com" className="text-cyan-400 hover:text-cyan-300">aiyumisejong@gmail.com</a>으로 연락하세요</li>
          </ul>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-6 text-xs text-white/40">
          <p>씨너지나노 © 2025. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
