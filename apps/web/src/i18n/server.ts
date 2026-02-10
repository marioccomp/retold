import { cookies, headers } from 'next/headers';
import pt from '@/src/locales/pt.json';
import en from '@/src/locales/en.json';

export async function getDictionary() {
    const lang = await getLocale();
    return lang === 'pt' ? pt : en;
}

export async function getLocale() {
    const cookieStore = await cookies();
    const cookieLang = cookieStore.get('NEXT_LOCALE')?.value;

    if (cookieLang) return cookieLang;

    // Se não tiver cookie, tenta detectar pelo Header do browser
    const headerStack = await headers();
    const acceptLanguage = headerStack.get('accept-language');

    if (acceptLanguage?.toLowerCase().includes('pt')) {
        return 'pt';
    }

    return 'en';
}

export async function getAnalysisLocale() {
    const cookieStore = await cookies();
    const analysisLang = cookieStore.get('ANALYSIS_LOCALE')?.value;

    // If set to a specific language, use it
    if (analysisLang && analysisLang !== 'auto') {
        return analysisLang;
    }

    // Default: same as interface language
    return getLocale();
}
