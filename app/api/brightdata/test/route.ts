import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.BRIGHTDATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Bright Data API 키가 설정되지 않았습니다' },
        { status: 400 }
      );
    }

    console.log('Bright Data API 테스트 시작...');
    console.log('사용 중인 API 키:', apiKey.substring(0, 10) + '...');

    // TikTok Profiles API 테스트
    // 실제 프로필 URL이 필요하지만, API 키 유효성만 확인
    const testUrl = 'https://api.brightdata.com/datasets/v3/snapshots/gp/tiktok_profiles';

    console.log('요청 URL:', testUrl);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('응답 상태:', response.status);
    console.log('응답 헤더:', Object.fromEntries(response.headers));

    let data;
    const contentType = response.headers.get('content-type');

    try {
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { responseText: text.substring(0, 200) };
      }
    } catch (e) {
      data = { parseError: e instanceof Error ? e.message : 'Unknown parse error' };
    }

    console.log('응답 데이터:', data);

    // API 키가 유효하면 200, 401, 403 등이 나옴 (404는 엔드포인트 문제)
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'API 키 인증 실패',
          status: response.status,
          message: '입력한 API 키가 올바르지 않습니다.'
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bright Data API 연결 테스트 완료',
      status: response.status,
      apiKeyValid: response.status !== 401 && response.status !== 403,
      data: data,
    });
  } catch (error) {
    console.error('테스트 중 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
