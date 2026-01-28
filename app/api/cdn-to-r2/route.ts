import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * CDN URL을 R2 URL로 변환 (해시 기반)
 * 용도: 프론트엔드에서 로드 실패한 CDN 썸네일을 R2 URL로 재시도
 */

function generateR2Url(cdnUrl: string): string {
  const hash = crypto.createHash('sha256').update(cdnUrl).digest('hex').substring(0, 16)
  const PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'https://pub-e7c1a9fcc1354653a54a231bf19ecf7b.r2.dev'
  return `${PUBLIC_DOMAIN}/thumbnails/${hash}.jpg`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cdnUrl } = body

    if (!cdnUrl) {
      return NextResponse.json(
        { error: 'Missing cdnUrl parameter' },
        { status: 400 }
      )
    }

    // CDN URL을 R2 URL로 변환
    const r2Url = generateR2Url(cdnUrl)

    console.log(`[CDN2R2] Converting CDN URL to R2`)
    console.log(`[CDN2R2] CDN: ${cdnUrl.substring(0, 80)}...`)
    console.log(`[CDN2R2] R2:  ${r2Url}`)

    return NextResponse.json({
      success: true,
      r2Url,
    })
  } catch (error) {
    console.error('[CDN2R2] Conversion failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Conversion failed' },
      { status: 500 }
    )
  }
}
