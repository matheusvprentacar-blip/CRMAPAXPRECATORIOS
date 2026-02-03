import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { TIPO_DOCUMENTO_LABELS } from "@/lib/types/documento"

const PUBLIC_BUCKETS = new Set([
  "ocr-uploads",
  "precatorios-pdf",
  "chat-attachments",
  "documentos",
  "logos",
])

const toTitulo = (tipo?: string | null, nome?: string | null, titulo?: string | null) => {
  if (titulo) return titulo
  if (tipo && (TIPO_DOCUMENTO_LABELS as Record<string, string>)[tipo]) {
    return (TIPO_DOCUMENTO_LABELS as Record<string, string>)[tipo]
  }
  return nome || "Documento"
}

const normalizeFromView = async (supabase: any, rows: any[]) => {
  return Promise.all(
    rows.map(async (doc) => {
      const tipo = doc?.tipo_documento ?? doc?.tipo
      const titulo = toTitulo(tipo, doc?.nome_arquivo, doc?.titulo)
      const storagePath = doc?.storage_path ?? doc?.path ?? null
      const bucket = doc?.bucket ?? "precatorios-documentos"

      if (!storagePath) {
        return {
          id: doc.id,
          precatorio_id: doc.precatorio_id,
          titulo,
          tipo,
          bucket,
          path: storagePath,
          mime_type: doc?.mime_type ?? null,
          created_at: doc?.created_at ?? null,
          viewUrl: null,
          urlType: "invalid" as const,
        }
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 60 * 5)

      if (!signErr && signed?.signedUrl) {
        return {
          id: doc.id,
          precatorio_id: doc.precatorio_id,
          titulo,
          tipo,
          bucket,
          path: storagePath,
          mime_type: doc?.mime_type ?? null,
          created_at: doc?.created_at ?? null,
          viewUrl: signed.signedUrl,
          urlType: "signed" as const,
        }
      }

      if (doc?.storage_url) {
        return {
          id: doc.id,
          precatorio_id: doc.precatorio_id,
          titulo,
          tipo,
          bucket,
          path: storagePath,
          mime_type: doc?.mime_type ?? null,
          created_at: doc?.created_at ?? null,
          viewUrl: doc.storage_url,
          urlType: "public" as const,
          signError: signErr?.message,
        }
      }

      return {
        id: doc.id,
        precatorio_id: doc.precatorio_id,
        titulo,
        tipo,
        bucket,
        path: storagePath,
        mime_type: doc?.mime_type ?? null,
        created_at: doc?.created_at ?? null,
        viewUrl: null,
        urlType: "signed" as const,
        signError: signErr?.message,
      }
    })
  )
}

const normalizeFromPrecatorioDocumentos = async (supabase: any, rows: any[]) => {
  return Promise.all(
    rows.map(async (doc) => {
      const tipo = doc?.tipo ?? null
      const titulo = toTitulo(tipo, doc?.nome_arquivo, doc?.titulo)
      const bucket = doc?.bucket
      const path = doc?.path

      if (!bucket || !path) {
        return { ...doc, titulo, tipo, viewUrl: null, urlType: "invalid" as const }
      }

      if (PUBLIC_BUCKETS.has(bucket)) {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
        return { ...doc, titulo, tipo, viewUrl: pub?.publicUrl ?? null, urlType: "public" as const }
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 5)

      if (signErr) {
        return {
          ...doc,
          titulo,
          tipo,
          viewUrl: null,
          urlType: "signed" as const,
          signError: signErr.message,
        }
      }

      return { ...doc, titulo, tipo, viewUrl: signed?.signedUrl ?? null, urlType: "signed" as const }
    })
  )
}

const resolveStorageRef = async (supabase: any, ref: string | null) => {
  if (!ref) return { viewUrl: null, bucket: null, path: null, urlType: "invalid" as const }
  if (ref.startsWith("http")) {
    return { viewUrl: ref, bucket: null, path: null, urlType: "public" as const }
  }
  if (!ref.startsWith("storage:")) {
    return { viewUrl: ref, bucket: null, path: null, urlType: "public" as const }
  }

  const match = ref.match(/^storage:([^/]+)\/(.+)$/)
  if (!match) {
    return { viewUrl: null, bucket: null, path: null, urlType: "invalid" as const }
  }

  const [, bucket, path] = match

  if (PUBLIC_BUCKETS.has(bucket)) {
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
    return { viewUrl: pub?.publicUrl ?? null, bucket, path, urlType: "public" as const }
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 5)

  if (signErr) {
    return { viewUrl: null, bucket, path, urlType: "signed" as const, signError: signErr.message }
  }

  return { viewUrl: signed?.signedUrl ?? null, bucket, path, urlType: "signed" as const }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 500 })
  }

  let authUser = (await supabase.auth.getUser()).data.user
  let authClient: any = supabase

  const authHeader = typeof _.headers?.get === "function" ? _.headers.get("authorization") : null
  if (!authUser && authHeader) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (supabaseUrl && supabaseAnonKey) {
      authClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      })
      authUser = (await authClient.auth.getUser()).data.user
    }
  }

  if (!authUser) {
    return NextResponse.json({ error: "Usuario nao autenticado" }, { status: 401 })
  }

  const { data: precatorio, error: precatorioError } = await authClient
    .from("precatorios")
    .select("id")
    .eq("id", params.id)
    .maybeSingle()

  if (precatorioError || !precatorio) {
    return NextResponse.json({ error: "Sem permissao para acessar este precatorio" }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const serviceClient =
    supabaseUrl && serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
      : null

  const dataClient = serviceClient ?? authClient

  let documentosBase: any[] = []
  let baseError: string | null = null

  // 1) Preferir view existente (documentos_precatorio_view)
  const { data: viewData, error: viewError } = await dataClient
    .from("documentos_precatorio_view")
    .select("id, precatorio_id, tipo_documento, nome_arquivo, storage_path, storage_url, mime_type, created_at")
    .eq("precatorio_id", params.id)
    .order("created_at", { ascending: false })

  if (!viewError) {
    documentosBase = await normalizeFromView(dataClient, viewData ?? [])
  } else {
    // 2) Fallback: tabela documentos_precatorio (sem view)
    const { data: tableData, error: tableError } = await dataClient
      .from("documentos_precatorio")
      .select("id, precatorio_id, tipo_documento, nome_arquivo, storage_path, storage_url, mime_type, created_at, deleted_at")
      .eq("precatorio_id", params.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (!tableError) {
      documentosBase = await normalizeFromView(dataClient, tableData ?? [])
    } else {
      // 3) Fallback final: precatorio_documentos (cadastro sugerido)
      const { data, error } = await dataClient
        .from("precatorio_documentos")
        .select("id, precatorio_id, titulo, tipo, bucket, path, mime_type, created_at")
        .eq("precatorio_id", params.id)
        .order("created_at", { ascending: false })

      if (error) {
        baseError = viewError?.message || tableError.message || error.message
      } else {
        documentosBase = await normalizeFromPrecatorioDocumentos(dataClient, data ?? [])
      }
    }
  }

  // 4) Itens do checklist (DOC_CREDOR / CERTIDAO) com arquivo_url
  const { data: itensData, error: itensError } = await dataClient
    .from("precatorio_itens")
    .select("id, precatorio_id, tipo_grupo, nome_item, arquivo_url, observacao, created_at")
    .eq("precatorio_id", params.id)
    .not("arquivo_url", "is", null)
    .order("created_at", { ascending: false })

  const itensDocs = await Promise.all(
    (itensData ?? [])
      .filter((item: any) => item?.observacao !== "__EXCLUIDO__")
      .map(async (item: any) => {
        const resolved = await resolveStorageRef(dataClient, item?.arquivo_url ?? null)
        return {
          id: `item-${item.id}`,
          precatorio_id: item.precatorio_id,
          titulo: item.nome_item || "Documento",
          tipo: item.tipo_grupo || "checklist",
          bucket: resolved.bucket,
          path: resolved.path,
          mime_type: null,
          created_at: item.created_at,
          viewUrl: resolved.viewUrl,
          urlType: resolved.urlType,
          signError: (resolved as any).signError,
        }
      })
  )

  const documentos = [...documentosBase, ...itensDocs].sort((a, b) => {
    const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })

  if (baseError && documentos.length === 0) {
    return NextResponse.json({ error: baseError }, { status: 400 })
  }

  if (itensError && documentos.length === 0) {
    return NextResponse.json({ error: itensError.message }, { status: 400 })
  }

  return NextResponse.json({ documentos })
}
