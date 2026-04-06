/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { UploadExtractor } from "@/components/upload-extractor"

const ICArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
)
const ICUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
)
const ICCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

interface StepUploadProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  pdfUrl: string | null
  setPdfUrl: (url: string | null) => void
  precatorioId?: string
}

export function StepUpload({ dados, setDados, onCompletar, pdfUrl, setPdfUrl }: StepUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [extracted, setExtracted] = useState(false)

  const handleCompleteExtraction = (dadosExtraidos: any) => {
    setExtracted(true)
    onCompletar(dadosExtraidos)
  }

  const handleAvancar = () => onCompletar({ pdfUrl, extracted })

  return (
    <div
      className="rounded-[22px] bg-white overflow-hidden"
      style={{
        border: "1.5px solid rgba(0,0,0,0.07)",
        boxShadow: "16px 16px 36px rgba(0,0,0,0.08),-8px -8px 20px rgba(255,255,255,0.94),inset 1px 1px 4px rgba(255,255,255,0.9),inset -1px -1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-start gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]"
          style={{ background: "rgba(14,77,106,0.08)", border: "1px solid rgba(14,77,106,0.15)", color: "#0e4d6a" }}>
          <ICUpload />
        </div>
        <div>
          <p className="text-[17px] font-black tracking-tight" style={{ color: "#0b0c10" }}>Upload e Extração de Dados</p>
          <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>Faça upload do PDF ou documento do precatório para extração automática de dados.</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        <UploadExtractor
          dados={dados}
          setDados={setDados}
          pdfUrl={pdfUrl}
          setPdfUrl={setPdfUrl}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          onCompleteExtraction={handleCompleteExtraction}
        />

        {extracted && (
          <div className="flex items-center gap-2 rounded-[12px] p-3"
            style={{ background: "rgba(21,128,61,0.06)", border: "1px solid rgba(21,128,61,0.2)" }}>
            <span style={{ color: "#15803d" }}><ICCheck /></span>
            <p className="text-[12.5px] font-semibold" style={{ color: "#15803d" }}>
              Dados extraídos com sucesso! Você pode revisar e editar nas próximas etapas.
            </p>
          </div>
        )}

        <div className="flex justify-end" style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 16, marginTop: 8 }}>
          <button
            type="button"
            onClick={handleAvancar}
            disabled={isUploading}
            className="inline-flex h-11 items-center gap-2 rounded-[13px] px-6 text-[13px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "#0e4d6a", border: "none", color: "#fff",
              boxShadow: "8px 8px 20px rgba(14,77,106,0.42),-3px -3px 8px rgba(255,255,255,0.3),inset 1px 1px 3px rgba(255,255,255,0.14)",
            }}
            onMouseEnter={(e) => { if (!isUploading) e.currentTarget.style.background = "#1a6080" }}
            onMouseLeave={(e) => { if (!isUploading) e.currentTarget.style.background = "#0e4d6a" }}
          >
            Avançar
            <ICArrowRight />
          </button>
        </div>
      </div>
    </div>
  )
}
