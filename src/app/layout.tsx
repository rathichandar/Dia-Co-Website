import type { Metadata } from "next"
import {
  Geist,
  Geist_Mono,
  Playfair_Display,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
} from "next/font/google"
import "./globals.css"
import "./diaco-design.css"
// TopNav moved to src/app/(authenticated)/layout.tsx so it only renders on
// authenticated pages — auth pages (/login, /forgot-password, /reset-password)
// don't need or want the app nav.

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// Dia-Co design system fonts. Exposed as CSS variables that diaco-design.css consumes.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
})

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
})

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: {
    default: "Dia-Co",
    template: "%s",
  },
  description: "Dia-Co customer portal",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${plexSans.variable} ${plexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
