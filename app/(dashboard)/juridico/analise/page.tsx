import { redirect } from "next/navigation"

export default async function JuridicoAnaliseLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const params = await searchParams
  const id = params.id
  if (id) {
    redirect(`/parecer-juridico?precatorioId=${id}`)
  }
  redirect("/parecer-juridico")
}
