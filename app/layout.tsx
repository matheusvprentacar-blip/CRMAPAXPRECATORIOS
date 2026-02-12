import type React from "react"
import type { Metadata } from "next"
import { Manrope, Roboto_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/lib/auth/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { ClientToaster } from "@/components/client-toaster"
import { PDFViewerProvider } from "@/components/providers/pdf-viewer-provider"
import { GlobalUpdateNotifier } from "@/components/settings/global-update-notifier"

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
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
    <html lang="pt-BR" className={`${manrope.variable} ${robotoMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <PDFViewerProvider>{children}</PDFViewerProvider>
            <GlobalUpdateNotifier />
          </AuthProvider>
        </ThemeProvider>
        <ClientToaster />
        <Analytics />
      </body>
    </html>
  )
}
