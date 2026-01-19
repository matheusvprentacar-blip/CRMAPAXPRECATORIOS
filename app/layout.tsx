import type React from "react"
import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/lib/auth/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { ClientToaster } from "@/components/client-toaster"
import { PDFViewerProvider } from "@/components/providers/pdf-viewer-provider"

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "CRM de Precatórios | Sistema de Gestão",
  description: "Sistema completo de gestão de precatórios com cálculos, workflows e relatórios",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${plusJakarta.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <PDFViewerProvider>{children}</PDFViewerProvider>
          </AuthProvider>
        </ThemeProvider>
        <ClientToaster />
        <Analytics />
      </body>
    </html>
  )
}