"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { FloatingWindow } from "@/components/ui/floating-window"
import { getFileDownloadUrl } from "@/lib/utils/file-upload"

interface PDFViewerContextType {
    openPDF: (url: string, title?: string) => void
    closePDF: () => void
}

const PDFViewerContext = createContext<PDFViewerContextType | undefined>(undefined)

export function PDFViewerProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [title, setTitle] = useState("Visualizador de Documento")

    const openPDF = async (url: string, headerTitle?: string) => {
        let finalUrl = url
        // If it's a storage path, resolve it
        if (!url.startsWith("http") && !url.startsWith("blob:")) {
            const resolved = await getFileDownloadUrl(url)
            if (resolved) finalUrl = resolved
        }

        setPdfUrl(finalUrl)
        setTitle(headerTitle || "Visualizador de Documento")
        setIsOpen(true)
    }

    const closePDF = () => {
        setIsOpen(false)
        setPdfUrl(null)
    }

    return (
        <PDFViewerContext.Provider value={{ openPDF, closePDF }}>
            {children}
            {isOpen && pdfUrl && (
                <FloatingWindow title={title} onClose={closePDF} initialWidth={900} initialHeight={700}>
                    <iframe
                        src={pdfUrl}
                        className="w-full h-full border-none"
                        scrolling="yes"
                        title={title}
                    />
                </FloatingWindow>
            )}
        </PDFViewerContext.Provider>
    )
}

export function usePDFViewer() {
    const context = useContext(PDFViewerContext)
    if (context === undefined) {
        throw new Error("usePDFViewer must be used within a PDFViewerProvider")
    }
    return context
}
