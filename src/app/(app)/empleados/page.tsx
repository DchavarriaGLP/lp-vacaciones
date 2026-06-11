import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmpleadosClient } from './EmpleadosClient'

export const dynamic = 'force-dynamic'

export default async function EmpleadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: appUser } = await supabase
    .from('app_users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = appUser?.role ?? 'employee'
  if (role === 'employee') redirect('/dashboard')

  // Fetch all employees with their company and project
  const { data: employees } = await supabase
    .from('employees')
    .select(`
      id, employee_code, full_name, position, email, username,
      hire_date, dias_pendientes, status, role, jefe_directo,
      companies(id, name),
      projects(id, name)
    `)
    .order('full_name', { ascending: true })

  // Fetch companies for filter
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  // Fetch projects for filter
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, company_id')
    .order('name')

  return (
    <EmpleadosClient
      employees={employees ?? []}
      companies={companies ?? []}
      projects={projects ?? []}
      currentUserRole={role}
    />
  )
}
