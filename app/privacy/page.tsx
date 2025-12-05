'use client'

import Link from 'next/link'
import './privacy.css'

export default function Privacy() {
  return (
    <div className="privacy-container">
      <div className="privacy-content">
        <Link href="/login" className="back-link">
          ← 뒤로가기
        </Link>

        <div className="privacy-card">
          <h1 className="privacy-title">개인정보처리방침</h1>

          <div className="privacy-body">
            <section className="privacy-section">
              <h2>1. 개인정보 수집 개요</h2>
              <p>
                유튜브 스카우트(이하 "회사")는 서비스 제공을 위해 필요한 최소한의 개인정보만을 수집합니다.
                사용자의 개인정보는 철저히 보호되며, 관련 법규를 준수합니다.
              </p>
            </section>

            <section className="privacy-section">
              <h2>2. 수집하는 개인정보</h2>
              <p>회사는 다음과 같은 개인정보를 수집합니다:</p>
              <ul>
                <li><strong>필수정보:</strong> 이메일, 이름, 프로필 이미지 (소셜 로그인 시)</li>
                <li><strong>이용정보:</strong> 검색 기록, 분석 데이터, 접속 로그</li>
                <li><strong>기술정보:</strong> IP 주소, 브라우저 정보, 기기 정보</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>3. 개인정보 수집 방법</h2>
              <ul>
                <li>Google, Kakao, Naver 소셜 로그인</li>
                <li>서비스 이용 중 자동으로 수집되는 정보</li>
                <li>사용자가 자발적으로 제공하는 정보</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>4. 개인정보 이용 목적</h2>
              <p>수집한 개인정보는 다음의 목적으로만 이용됩니다:</p>
              <ul>
                <li>서비스 제공 및 유지</li>
                <li>사용자 인증 및 계정 관리</li>
                <li>서비스 개선 및 최적화</li>
                <li>통계 분석 및 연구</li>
                <li>법적 의무 이행</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>5. 개인정보 보관 기간</h2>
              <p>
                개인정보는 이용 목적 달성 후 지체 없이 파기됩니다.
                단, 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관됩니다.
              </p>
            </section>

            <section className="privacy-section">
              <h2>6. 제3자 제공</h2>
              <p>
                회사는 사용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
                다만, 법령에 따른 요청이 있을 경우 제한적으로 제공할 수 있습니다.
              </p>
            </section>

            <section className="privacy-section">
              <h2>7. 보안 조치</h2>
              <p>
                회사는 개인정보의 안전성을 보장하기 위해 다음과 같은 조치를 취합니다:
              </p>
              <ul>
                <li>암호화를 통한 데이터 보호</li>
                <li>접근 권한 제한</li>
                <li>정기적인 보안 감시</li>
                <li>직원 보안 교육</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>8. 사용자 권리</h2>
              <p>
                사용자는 언제든지 개인정보에 대해 다음의 권리를 행사할 수 있습니다:
              </p>
              <ul>
                <li>열람 및 정정 요청</li>
                <li>삭제 요청</li>
                <li>처리 정지 요청</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>9. 쿠키 및 추적 기술</h2>
              <p>
                회사는 사용자 경험 개선을 위해 쿠키 및 유사한 기술을 사용합니다.
                사용자는 브라우저 설정을 통해 쿠키를 거부할 수 있습니다.
              </p>
            </section>

            <section className="privacy-section">
              <h2>10. 문의 및 불만 처리</h2>
              <p>
                개인정보 처리와 관련된 문의사항이나 불만이 있으신 경우,
                언제든지 회사로 연락주시기 바랍니다.
              </p>
            </section>

            <section className="privacy-section">
              <h2>11. 정책 변경</h2>
              <p>
                본 개인정보처리방침은 법률 변경이나 서비스 정책 변경에 따라
                변경될 수 있으며, 변경사항은 공지를 통해 안내됩니다.
              </p>
            </section>

            <div className="privacy-footer">
              <p>최종 수정일: 2025년 11월 11일</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
