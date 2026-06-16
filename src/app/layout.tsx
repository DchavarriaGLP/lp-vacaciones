import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'LP Development — Gestión de Vacaciones',
  description: 'Sistema de gestión de vacaciones para LP Development Corp, Panamá',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-white text-gray-900 dark:bg-gray-950 dark:text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
