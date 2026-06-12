import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { EmpleadosClient } from './EmpleadosClient'

export const dynamic = 'force-dynamic'

export default async function EmpleadosPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const supabase = createAdminClient()

  const role = session.role
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
