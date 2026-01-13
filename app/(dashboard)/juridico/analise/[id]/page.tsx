import { Suspense } from "react"
import AnaliseJuridicaClient from "./analise-juridica-client"

// Generate static params for export output
export async function generateStaticParams() {
    return []
}

export default function AnaliseJuridicaPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <AnaliseJuridicaClient />
        </Suspense>
    )
}
