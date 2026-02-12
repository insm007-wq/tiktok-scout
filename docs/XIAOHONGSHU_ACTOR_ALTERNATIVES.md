# 샤오홍슈 검색 액터 대안 (Apify)

현재 사용 중: **easyapi/rednote-xiaohongshu-search-scraper** ($19.99/월)  
결과가 적게 나올 때 사용할 수 있는 대안입니다.

---

## 1. kuaima/xiaohongshu-search (추천)

| 항목 | 내용 |
|------|------|
| **Apify** | https://apify.com/kuaima/xiaohongshu-search |
| **요금** | $20.00/월 + 사용량 |
| **특징** | **자동 페이지네이션**으로 더 많은 결과 수집 가능, 최신/인기 정렬 |
| **입력** | `search_key`, `filter`(最新/最热), `maxItems`, `categories`(전체) |
| **출력** | title, author, like_count, href, date, noteType 등 (구조가 현재 액터와 다름) |
| **사용자** | 175 total, 11 monthly active |

→ **결과 수를 늘리기에 유리** (페이지네이션 지원).

---

## 2. easyapi/all-in-one-rednote-xiaohongshu-scraper

| 항목 | 내용 |
|------|------|
| **Apify** | https://apify.com/easyapi/all-in-one-rednote-xiaohongshu-scraper |
| **요금** | $29.99/월 + 사용량 |
| **특징** | 검색/댓글/프로필/유저포스트 모드, 검색 모드에서 키워드 검색 |
| **입력** | `mode: "search"`, `keywords: ["키워드"]`, `maxItems` |
| **출력** | 현재 RedNote Search와 비슷한 구조 (item.note_card, link 등) |
| **평점** | 2.7 (5) |

→ 같은 EasyApi 제작, **출력 구조가 비슷해 연동이 쉬움**. 단가만 더 높음.

---

## 3. laishaohang/all-in-one-rednote-xiaohongshu-scraper

| 항목 | 내용 |
|------|------|
| **Apify** | https://apify.com/laishaohang/all-in-one-rednote-xiaohongshu-scraper |
| **요금** | $15.00/월 + 사용량 |
| **특징** | 키워드/트래킹 검색, 미디어 다운로드, 5.0 평점 |
| **참고** | 현재 “under maintenance” 표시된 경우 있음 |

→ 가격·평점은 좋으나 **유지보수 상태 확인 후** 사용 권장.

---

## 선택 가이드

- **결과를 최대한 많이** 받고 싶다 → **kuaima/xiaohongshu-search** (페이지네이션).
- **지금과 비슷한 구조**로 바꾸기 쉽다 → **easyapi/all-in-one-rednote-xiaohongshu-scraper**.
- **비용을 낮추고** 시험해보고 싶다 → **laishaohang** (유지보수 상태 확인 후).

현재 프로젝트에서는 **kuaima** 연동을 추가해 두었습니다.  
`XIAOHONGSHU_SEARCH_ACTOR=kuaima` 로 두면 kuaima 액터를 사용합니다.

---

## TikTok처럼 프리뷰·다운이 잘 되는 단일 스크래퍼가 있나?

**결론: Apify에는 검색 결과에 비디오 URL을 바로 넣어 주는 RedNote 전용 스크래퍼는 없습니다.**

- **TikTok**: 검색 액터가 포스트 목록 + **비디오 CDN URL**을 함께 주는 경우가 많아서, 프리뷰/다운로드가 별도 액터 없이 가능한 구조입니다.
- **RedNote(샤오홍슈)**: 검색 액터(easyapi Search, kuaima, All-in-One 등)는 **포스트 링크(href)** 와 메타만 주고, **실제 비디오 URL은 주지 않습니다.**  
  그래서 **프리뷰/다운로드**를 하려면 포스트 URL마다 **Video Downloader** 액터를 한 번씩 호출해야 합니다.

**현재 구조 (권장)**

| 용도     | 액터 |
|----------|------|
| 검색(목록) | kuaima 또는 easyapi Search |
| 프리뷰/다운로드 | easyapi **RedNote Xiaohongshu Video Downloader** (별도 렌탈 $19.99/월) |

검색만 쓰면 Search 액터 1개, **프리뷰·다운까지 쓰면 Video Downloader를 추가**해야 합니다.  
한 개 액터로 TikTok처럼 검색+프리뷰+다운까지 되는 RedNote 스크래퍼는 Apify에 없습니다.
