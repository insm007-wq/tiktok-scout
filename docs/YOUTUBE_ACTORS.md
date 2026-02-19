# YouTube 액터 가이드 (검색 · 프리뷰 · 다운로드)

한 개의 액터가 **검색 + 프리뷰 + 다운로드**를 모두 처리하는 것은 없습니다.  
아래처럼 **역할별로 액터를 나누어** 사용하는 구성을 권장합니다.

---

## 공식 API 미사용 — 스크래핑 액터만 사용

- **YouTube Data API (공식)**  
  - 할당량(quota)이 매우 제한적이라 상용 서비스에서 쓰기 어렵습니다.  
  - 이 프로젝트에서는 **공식 API를 사용하지 않고**, Apify **스크래핑 액터**만 사용합니다.

- **스크래핑 액터**  
  - YouTube 웹을 파싱해 검색 결과를 가져오는 방식.  
  - Apify 과금만 따르면 되고, 공식 API 할당량 제한과 무관합니다.

---

## 1. 검색 (Search)

검색 결과 목록(제목, 썸네일, 조회수, URL 등)을 가져올 때 사용합니다. **모두 스크래핑 방식**입니다.

| 액터 | 쇼츠 | 썸네일 | 비고 |
|------|------|--------|------|
| **api-ninja/youtube-search-scraper** | ✅ `type: "shorts"` | ✅ | **현재 기본값**. $0.25/1,000건 |
| **grow_media/youtube-search-scraper** | ✅ `videoType: "short"` | ✅ `thumbnailUrl` | 내부적으로 공식 API 쓸 수 있음. $0.60/1,000건 |

- **선택**: `.env`에 `YOUTUBE_SEARCH_ACTOR=grow_media` 없으면 **api-ninja** 사용(스크래핑 전용).

---

## 2. 프리뷰 (Preview)

앱 안에서 영상을 재생할 때 사용합니다. **별도 액터 없이** YouTube embed URL로 처리합니다.

- **URL 형식**: `https://www.youtube.com/embed/{videoId}`
- **구현 위치**: `lib/utils/fetch-single-video-url.ts` — YouTube인 경우 videoId만 추출해 embed URL 반환.
- 액터 호출 없이 가능하므로 비용/제한 없음.

---

## 3. 영상 다운로드 (Download)

실제 MP4 등 **다운로드 가능한 URL**을 얻을 때 사용하는 액터입니다.

| 액터 | 다운로드 URL | 쇼츠 | 가격 | 비고 |
|------|----------------|------|------|------|
| **scrapearchitect/youtube-video-downloader** | ✅ `downloadable_video_link`, `merged_downloadable_link` | ✅ | $9.99/월 + 사용량 | 8K~360p, MP4/MP3. **다운로드용 권장** |
| **epctex/youtube-video-downloader** | ✅ | ✅ | 사용량 과금 | 사용자 많음 (2.5K), 평점 4.1 |
| **frederikhbb/youtube-downloader** | ✅ direct links | ✅ | $0.01/1,000 links | yt-dlp 기반. 현재 Under maintenance |

현재 앱에서는 **YouTube 다운로드** 시 embed URL만 반환하고 있어, “브라우저에서 보기”만 안내합니다.  
실제 파일 다운로드를 지원하려면 위 다운로드 전용 액터 중 하나를 연동해야 합니다.

---

## 권장 조합 (검색 + 프리뷰 + 다운로드)

- **검색**: `grow_media/youtube-search-scraper` (또는 `api-ninja/youtube-search-scraper`)
- **프리뷰**: 액터 없음 — `youtube.com/embed/{videoId}` 사용 (현재 구현됨)
- **다운로드**: `scrapearchitect/youtube-video-downloader`  
  - Input: `video_urls: [{ url: "https://www.youtube.com/watch?v=xxx" }]`  
  - Output: `downloadable_video_link` 또는 `merged_downloadable_link` 를 다운로드 URL로 사용

이 조합이면 **검색 → 프리뷰 → 영상 다운로드**까지 모두 처리할 수 있습니다.
