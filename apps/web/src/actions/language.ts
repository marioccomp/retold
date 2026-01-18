'use server'

import { cookies } from 'next/headers'

export async function setLanguageAction(formData: FormData) {
    const locale = formData.get('locale') as string
    const cookieStore = await cookies()
    // Set cookie for 1 year
    cookieStore.set('NEXT_LOCALE', locale, { maxAge: 60 * 60 * 24 * 365, path: '/' })
}
