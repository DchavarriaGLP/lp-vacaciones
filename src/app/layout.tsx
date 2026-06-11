import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="es" className="dark">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  )
}
