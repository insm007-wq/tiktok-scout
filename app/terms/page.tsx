'use client'

import Link from 'next/link'
import './terms.css'

export default function Terms() {
  return (
    <div className="terms-container">
      <div className="terms-content">
        <Link href="/login" className="back-link">
          ← 뒤로가기
        </Link>

        <div className="terms-card">
          <h1 className="terms-title">이용약관</h1>

          <div className="terms-body">
            <section className="terms-section">
              <h2>1. 총칙</h2>
              <p>
                본 이용약관은 유튜브 스카우트 서비스(이하 "서비스")를 이용하기 위해 필수적인 사항들을 규정합니다.
                서비스를 이용함으로써 사용자는 본 약관의 모든 조항에 동의한 것으로 간주됩니다.
              </p>
            </section>

            <section className="terms-section">
              <h2>2. 서비스 개요</h2>
              <p>
                유튜브 스카우트는 YouTube 동영상 검색 및 분석 도구를 제공합니다.
                사용자는 본 서비스를 통해 YouTube 콘텐츠를 검색하고 분석할 수 있습니다.
              </p>
            </section>

            <section className="terms-section">
              <h2>3. 사용자 의무</h2>
              <ul>
                <li>사용자는 본 서비스를 적법한 목적으로만 이용해야 합니다.</li>
                <li>사용자는 타인의 개인정보를 수집하거나 부정한 방법으로 이용해서는 안 됩니다.</li>
                <li>사용자는 서비스의 안정성을 해치는 행위를 해서는 안 됩니다.</li>
                <li>사용자는 서비스 이용 중 얻은 정보를 상업적 목적으로 악용해서는 안 됩니다.</li>
              </ul>
            </section>

            <section className="terms-section">
              <h2>4. 서비스 제공 및 변경</h2>
              <p>
                운영자는 서비스의 품질 향상을 위해 예고 없이 서비스 내용을 변경할 수 있습니다.
                중요한 변경이 있을 경우 공지를 통해 안내합니다.
              </p>
            </section>

            <section className="terms-section">
              <h2>5. 사용자 계정</h2>
              <p>
                사용자 계정은 소셜 로그인(Google, Kakao, Naver)을 통해 생성됩니다.
                사용자는 본인의 계정 보안을 유지할 책임이 있습니다.
              </p>
            </section>

            <section className="terms-section">
              <h2>6. 면책 조항</h2>
              <p>
                본 서비스는 "현재 상태대로" 제공됩니다. 운영자는 서비스의 정확성, 완전성, 적시성을 보장하지 않습니다.
                서비스 이용으로 인한 간접적, 결과적 손해에 대해 책임을 지지 않습니다.
              </p>
            </section>

            <section className="terms-section">
              <h2>7. 약관 변경</h2>
              <p>
                운영자는 법률의 변경이나 서비스 정책 변경에 따라 본 약관을 변경할 수 있습니다.
                변경된 약관은 공지 후 즉시 적용됩니다.
              </p>
            </section>

            <section className="terms-section">
              <h2>8. 준거법 및 분쟁 해결</h2>
              <p>
                본 약관은 대한민국 법률에 따라 해석되고 관할권은 관할 법원에 있습니다.
              </p>
            </section>

            <div className="terms-footer">
              <p>최종 수정일: 2025년 11월 11일</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
