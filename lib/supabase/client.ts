import { createBrowserClient as createSupabaseClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database"

let supabaseInstance: ReturnType<
  typeof createSupabaseClient<Database>
> | null = null

export function createBrowserClient() {
  // 🔒 GARANTIA TOTAL: não executa nada no servidor
  if (typeof window === "undefined") {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[CRM] Supabase não configurado")
    return null
  }

  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            if (typeof document === "undefined") return undefined
            return document.cookie
              .split("; ")
              .find((row) => row.startsWith(`${name}=`))
              ?.split("=")[1]
          },
          set(name: string, value: string, options: any) {
            if (typeof document === "undefined") return
            document.cookie = `${name}=${value}; path=/; ${
              options?.maxAge ? `max-age=${options.maxAge}` : ""
            }`
          },
          remove(name: string) {
            if (typeof document === "undefined") return
            document.cookie = `${name}=; path=/; max-age=0`
          },
        },
      }
    )
  }

  return supabaseInstance
}

export function getSupabase() {
  return createBrowserClient()
}

export { createBrowserClient as createClient }