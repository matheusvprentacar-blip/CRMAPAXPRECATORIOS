import { createBrowserClient as createSupabaseClient } from "@supabase/ssr"

function isMissingSessionError(error: { message?: string } | null | undefined) {
  return /auth session missing/i.test(error?.message || "")
}

// ✅ Stub para destravar tipagem do Supabase (substitua por tipos gerados depois)
type Database = Record<string, never>

interface CookieOptions {
  path?: string
  maxAge?: number
  domain?: string
  sameSite?: string
  secure?: boolean
}

export interface SupabasePublicConfig {
  url: string | null
  anonKey: string | null
}

export type SupabaseAuthConnectivityResult =
  | {
      ok: true
      url: string
      host: string
      status: number
    }
  | {
      ok: false
      url: string | null
      host: string | null
      reason: "missing_config" | "network_error"
      errorMessage: string
    }

let supabaseInstance: ReturnType<
  typeof createSupabaseClient<Database>
> | null = null

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function getHostFromUrl(value: string | null) {
  if (!value) return null

  try {
    return new URL(value).host
  } catch {
    return value
  }
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") return undefined
  const prefix = `${name}=`
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix))
  if (!raw) return undefined
  return decodeURIComponent(raw.slice(prefix.length))
}

function setCookieValue(name: string, value: string, options?: CookieOptions) {
  if (typeof document === "undefined") return
  const parts = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`path=${options?.path || "/"}`)
  if (typeof options?.maxAge === "number") parts.push(`max-age=${options.maxAge}`)
  if (options?.domain) parts.push(`domain=${options.domain}`)
  if (options?.sameSite) parts.push(`samesite=${String(options.sameSite).toLowerCase()}`)
  if (options?.secure) parts.push("secure")
  document.cookie = parts.join("; ")
}

function clearSupabaseAuthCookies() {
  if (typeof document === "undefined") return

  document.cookie.split(";").forEach((chunk) => {
    const [rawName] = chunk.split("=")
    const name = rawName?.trim()
    if (!name) return
    if (!name.startsWith("sb-")) return
    setCookieValue(name, "", { maxAge: 0, path: "/" })
  })
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null

  return {
    url: url ? trimTrailingSlash(url) : null,
    anonKey,
  }
}

export async function probeSupabaseAuthConnectivity(): Promise<SupabaseAuthConnectivityResult> {
  const { url, anonKey } = getSupabasePublicConfig()
  const host = getHostFromUrl(url)

  if (!url || !anonKey) {
    return {
      ok: false,
      url,
      host,
      reason: "missing_config",
      errorMessage: "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY nao esta configurada.",
    }
  }

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: anonKey,
      },
      cache: "no-store",
    })

    return {
      ok: true,
      url,
      host: host || url,
      status: response.status,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Falha de rede ao acessar o host publico do Supabase."

    return {
      ok: false,
      url,
      host,
      reason: "network_error",
      errorMessage,
    }
  }
}

function patchMissingSessionGuards(client: NonNullable<typeof supabaseInstance>) {
  const originalGetUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = (async (...args: Parameters<typeof originalGetUser>) => {
    try {
      const result = await originalGetUser(...args)
      if (isMissingSessionError(result.error)) {
        clearSupabaseAuthCookies()
        return { data: { user: null }, error: null } as Awaited<ReturnType<typeof originalGetUser>>
      }
      return result
    } catch (error) {
      if (isMissingSessionError(error as { message?: string })) {
        clearSupabaseAuthCookies()
        return { data: { user: null }, error: null } as Awaited<ReturnType<typeof originalGetUser>>
      }
      throw error
    }
  }) as typeof client.auth.getUser

  const originalGetSession = client.auth.getSession.bind(client.auth)
  client.auth.getSession = (async (...args: Parameters<typeof originalGetSession>) => {
    try {
      const result = await originalGetSession(...args)
      if (isMissingSessionError(result.error)) {
        clearSupabaseAuthCookies()
        return { data: { session: null }, error: null } as Awaited<ReturnType<typeof originalGetSession>>
      }
      return result
    } catch (error) {
      if (isMissingSessionError(error as { message?: string })) {
        clearSupabaseAuthCookies()
        return { data: { session: null }, error: null } as Awaited<ReturnType<typeof originalGetSession>>
      }
      throw error
    }
  }) as typeof client.auth.getSession

  const originalSignOut = client.auth.signOut.bind(client.auth)
  client.auth.signOut = (async (...args: Parameters<typeof originalSignOut>) => {
    try {
      const result = await originalSignOut(...args)
      if (isMissingSessionError(result.error)) {
        clearSupabaseAuthCookies()
        return { error: null } as Awaited<ReturnType<typeof originalSignOut>>
      }
      return result
    } catch (error) {
      if (isMissingSessionError(error as { message?: string })) {
        clearSupabaseAuthCookies()
        return { error: null } as Awaited<ReturnType<typeof originalSignOut>>
      }
      throw error
    }
  }) as typeof client.auth.signOut
}

export function createBrowserClient() {
  // 🔒 GARANTIA TOTAL: não executa nada no servidor
  if (typeof window === "undefined") {
    return null
  }

  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabasePublicConfig()

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
            return getCookieValue(name)
          },
          set(name: string, value: string, options: CookieOptions) {
            setCookieValue(name, value, options)
          },
          remove(name: string) {
            setCookieValue(name, "", { maxAge: 0, path: "/" })
          },
        },
      }
    )

    patchMissingSessionGuards(supabaseInstance)
  }

  return supabaseInstance
}

export function getSupabase() {
  return createBrowserClient()
}

export { createBrowserClient as createClient }
