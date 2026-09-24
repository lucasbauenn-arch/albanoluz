const env = import.meta.env

export const SUPABASE_URL = (env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') || ''
export const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY as string | undefined) || ''
export const TURNSTILE_SITE_KEY = (env.VITE_TURNSTILE_SITE_KEY as string | undefined) || ''
export const GA4_ID = (env.VITE_GA4_ID as string | undefined) || ''
export const META_PIXEL_ID = (env.VITE_META_PIXEL_ID as string | undefined) || ''

export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
