'use server'

import { cookies } from 'next/headers'

export async function setLanguageAction(formData: FormData) {
    const locale = formData.get('locale') as string
    const cookieStore = await cookies()
    // Set cookie for 1 year
    cookieStore.set('NEXT_LOCALE', locale, { maxAge: 60 * 60 * 24 * 365, path: '/' })
}

export async function setAnalysisLanguageAction(formData: FormData) {
    const locale = formData.get('analysisLocale') as string
    const cookieStore = await cookies()
    cookieStore.set('ANALYSIS_LOCALE', locale, { maxAge: 60 * 60 * 24 * 365, path: '/' })
}

export async function getAnalysisLanguageCookie() {
    const cookieStore = await cookies()
    return cookieStore.get('ANALYSIS_LOCALE')?.value ?? 'auto'
}
