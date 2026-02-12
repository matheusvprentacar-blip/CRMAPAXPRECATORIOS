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
  title: "CRM APAX Precat\u00f3rios | Sistema de Gest\u00e3o",
  description: "Sistema completo de gest\u00e3o de precat\u00f3rios com c\u00e1lculos, workflows e relat\u00f3rios",
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
        url: "/logo-apax.png",
        type: "image/png",
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
