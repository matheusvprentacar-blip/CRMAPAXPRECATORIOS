import { redirect } from "next/navigation"

export function generateStaticParams() {
  return []
}

export default async function LegacyLegalOpinionDynamicRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/parecer-juridico/detalhes?id=${id}`)
}

