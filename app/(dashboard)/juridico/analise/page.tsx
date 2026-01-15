/* eslint-disable */
import { Suspense } from "react"
import AnaliseJuridicaClient from "./analise-juridica-client"

export default function AnaliseJuridicaPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <AnaliseJuridicaClient />
        </Suspense>
    )
}
