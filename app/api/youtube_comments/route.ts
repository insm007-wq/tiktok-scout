import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkApiUsage } from '@/lib/apiUsage'

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3'

export async function GET(request: NextRequest) {
  // ✅ 인증 확인 및 비활성화 체크
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: '인증이 필요합니다. 로그인해주세요.' },
      { status: 401 }
    )
  }

  const userEmail = session.user.email || 'unknown@example.com'

  // ✅ 비활성화 사용자 체크
  try {
    const usageCheck = await checkApiUsage(userEmail)
    if (!usageCheck.allowed && usageCheck.limit === 0) {
      return NextResponse.json(
        {
          error: '계정이 비활성화되었습니다',
          message: '더 이상 서비스를 이용할 수 없습니다. 관리자에게 문의하세요.',
          deactivated: true
        },
        { status: 403 }
      )
    }
  } catch (error) {
    console.error('❌ 비활성화 체크 에러:', error)
    // 에러가 발생해도 진행
  }

  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('videoId')?.trim()
  const apiKey = process.env.YOUTUBE_API_KEY

  // ✅ 입력값 검증
  if (!videoId || videoId.length < 1 || videoId.length > 50) {
    return NextResponse.json(
      { error: '올바른 비디오 ID가 필요합니다' },
      { status: 400 }
    )
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API 키가 설정되지 않았습니다' },
      { status: 500 }
    )
  }

  try {
    // ✅ URLSearchParams 사용 (API 키 안전하게 처리)
    const url = new URL(`${YOUTUBE_API_URL}/commentThreads`)
    url.searchParams.append('part', 'snippet')
    url.searchParams.append('videoId', videoId)
    url.searchParams.append('maxResults', '100')
    url.searchParams.append('textFormat', 'plainText')
    url.searchParams.append('key', apiKey)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: '댓글을 불러올 수 없습니다' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const comments = data.items || []

    // 댓글 통계 계산
    let totalReplies = 0
    let totalLikes = 0

    const formattedComments = comments.slice(0, 20).map((thread: any) => {
      const snippet = thread.snippet
      const topComment = snippet.topLevelComment.snippet

      totalReplies += snippet.totalReplyCount || 0
      totalLikes += topComment.likeCount || 0

      return {
        author: topComment.authorDisplayName,
        text: topComment.textDisplay,
        likes: topComment.likeCount || 0,
        replies: snippet.totalReplyCount || 0,
      }
    })

    return NextResponse.json({
      comments: formattedComments,
      totalComments: comments.length,
      totalReplies,
      totalLikes,
      avgLikes: comments.length > 0 ? Math.round(totalLikes / comments.length) : 0,
    })
  } catch (error) {
    console.error('댓글 조회 오류:', error)
    return NextResponse.json(
      { error: '댓글 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
