import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { UsersTable } from './UsersTable'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const session = await getSession()
    if (!session || session.role !== 'admin') redirect('/dashboard')

      const supabase = createAdminClient()
        const { data: users, error } = await supabase
            .from('app_users')
                .select('id, username, role, password_changed, created_at')
                    .order('username', { ascending: true })

                      if (error) {
                          return (
                                <div className="text-red-400 p-4">
                                        Error cargando usuarios: {error.message}
                                              </div>
                                                  )
                                                    }

                                                      return (
                                                          <div>
                                                                <div className="mb-6">
                                                                        <h1 className="text-2xl font-bold text-white">Panel de Usuarios</h1>
                                                                                <p className="text-gray-400 mt-1">
                                                                                          {users?.length ?? 0} usuarios registrados
                                                                                                  </p>
                                                                                                        </div>
                                                                                                              <UsersTable users={users ?? []} />
                                                                                                                  </div>
                                                                                                                    )
                                                                                                                    }