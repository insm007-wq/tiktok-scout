import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

/**
 * 캐시 전체 삭제 API
 * /api/admin/cache/clear
 */
export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 확인 (필요시 추가)
    // if (session.user.email !== process.env.ADMIN_EMAIL) {
    //   return NextResponse.json(
    //     { error: '관리자만 접근 가능합니다.' },
    //     { status: 403 }
    //   );
    // }

    const db = await getDb();

    // video_cache 컬렉션의 모든 문서 삭제
    const result = await db.collection('video_cache').deleteMany({});

    console.log(`[Cache] 캐시 삭제 완료: ${result.deletedCount}개 문서 제거`);

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount}개의 캐시 항목이 삭제되었습니다.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('[Cache Clear] 오류:', error);
    return NextResponse.json(
      { error: '캐시 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
