import { createBrowserClient } from "@/lib/supabase/client"

export async function fetchUserNames(userIds: string[]): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]

  if (uniqueIds.length === 0) {
    return {}
  }

  const supabase = createBrowserClient()
  const { data, error } = await supabase.from("usuarios").select("id, nome, email").in("id", uniqueIds)

  if (error) {
    console.error("[USER_NAMES] Error fetching:", error)
    return {}
  }

  const nameMap: Record<string, string> = {}
  data?.forEach((user) => {
    nameMap[user.id] = user.nome || user.email || user.id
  })

  return nameMap
}
