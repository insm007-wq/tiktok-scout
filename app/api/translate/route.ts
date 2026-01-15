import { NextRequest, NextResponse } from 'next/server';
import { getTranslationFromCache, setTranslationCache } from '@/lib/cache';

// MyMemory API (Google Translate 무료 래퍼) 호출
async function translateWithGoogle(text: string, sourceLang: string, targetLang: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`번역 API 오류: ${response.status}`);
    }

    const data = await response.json();

    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    } else {
      throw new Error('번역 실패');
    }
  } catch (error) {
    console.error('[Translate] MyMemory 오류:', error);
    throw error;
  }
}

interface TranslateRequest {
  text: string;
  sourceLanguage: 'ko' | 'zh' | 'en';
  targetLanguage: 'ko' | 'zh' | 'en';
}

export async function POST(req: NextRequest) {
  try {
    const { text, sourceLanguage, targetLanguage }: TranslateRequest = await req.json();

    if (!text?.trim()) {
      return NextResponse.json(
        { error: '번역할 텍스트를 입력해주세요' },
        { status: 400 }
      );
    }

    // 캐시 확인
    const cached = getTranslationFromCache(text, targetLanguage);
    if (cached) {
      return NextResponse.json({
        success: true,
        originalText: text,
        translatedText: cached,
        sourceLanguage,
        targetLanguage,
        fromCache: true,
      });
    }

    // 소스/타겟 언어가 같으면 번역 불필요
    if (sourceLanguage === targetLanguage) {
      return NextResponse.json({
        success: true,
        originalText: text,
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        skipped: true,
      });
    }

    // Google Translate (MyMemory API) - 무료 번역
    const targetLangCode = targetLanguage === 'zh' ? 'zh-CN' : targetLanguage;
    const sourceLangCode = sourceLanguage === 'zh' ? 'zh-CN' : sourceLanguage;

    const translatedText = await translateWithGoogle(text, sourceLangCode, targetLangCode);

    // 캐시 저장
    setTranslationCache(text, targetLanguage, translatedText);

    return NextResponse.json({
      success: true,
      originalText: text,
      translatedText,
      sourceLanguage,
      targetLanguage,
      fromCache: false,
    });

  } catch (error) {
    console.error('[Translation] 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '번역 중 오류 발생',
      },
      { status: 500 }
    );
  }
}
