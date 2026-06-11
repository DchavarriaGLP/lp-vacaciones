import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from './components/AppSidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get role from app_users
  const { data: appUser } = await supabase
    .from('app_users')
    .select('role, username')
    .eq('id', user.id)
    .single()

  const role = appUser?.role ?? 'employee'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
      <AppSidebar role={role} userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
