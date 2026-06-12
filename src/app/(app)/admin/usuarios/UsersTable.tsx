'use client'

import { useState, useTransition } from 'react'
import { resetUserPassword } from './actions'

type AppUser = {
id: string
username: string
role: string
password_changed: boolean
created_at: string
}

const ROLE_LABELS: Record<string, string> = {
admin: 'Administrador',
manager: 'Gerente',
employee: 'Empleado',
}

const ROLE_COLORS: Record<string, string> = {
admin: 'bg-purple-900 text-purple-300',
manager: 'bg-blue-900 text-blue-300',
employee: 'bg-gray-800 text-gray-400',
}

export function UsersTable({ users }: { users: AppUser[] }) {
const [search, setSearch] = useState('')
const [filterRole, setFilterRole] = useState<string>('all')
const [filterPwd, setFilterPwd] = useState<string>('all')
const [isPending, startTransition] = useTransition()
const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null)

const filtered = users.filter((u) => {
const matchSearch = u.username.toLowerCase().includes(search.toLowerCase())
const matchRole = filterRole === 'all' || u.role === filterRole
const matchPwd = filterPwd === 'all' || (filterPwd === 'default' && !u.password_changed) || (filterPwd === 'changed' && u.password_changed)
return matchSearch && matchRole && matchPwd
})

function handleReset(userId: string) {
if (!confirm('Resetear contrasena a 12345?')) return
startTransition(async () => {
const res = await resetUserPassword(userId)
setMessage({ id: userId, text: res.error ? res.error : 'Contrasena reseteada', ok: !res.error })
setTimeout(() => setMessage(null), 3000)
})
}

const defaultCount = users.filter((u) => !u.password_changed).length
const changedCount = users.filter((u) => u.password_changed).length

return (
<div>
<div className="grid grid-cols-3 gap-4 mb-6">
<div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
<p className="text-2xl font-bold text-white">{users.length}</p>
<p className="text-sm text-gray-400">Total usuarios</p>
</div>
<div className="bg-yellow-950 rounded-xl p-4 border border-yellow-900">
<p className="text-2xl font-bold text-yellow-300">{defaultCount}</p>
<p className="text-sm text-yellow-500">Contrasena por defecto</p>
</div>
<div className="bg-green-950 rounded-xl p-4 border border-green-900">
<p className="text-2xl font-bold text-green-300">{changedCount}</p>
<p className="text-sm text-green-500">Contrasena actualizada</p>
</div>
</div>
<div className="flex flex-wrap gap-3 mb-4">
<input type="text" placeholder="Buscar usuario..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-64" />
<select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
<option value="all">Todos los roles</option>
<option value="admin">Administrador</option>
<option value="manager">Gerente</option>
<option value="employee">Empleado</option>
</select>
<select value={filterPwd} onChange={(e) => setFilterPwd(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
<option value="all">Todas las contrasenas</option>
<option value="default">Contrasena por defecto</option>
<option value="changed">Contrasena actualizada</option>
</select>
<span className="text-sm text-gray-500 self-center">{filtered.length} resultados</span>
</div>
<div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
<div className="overflow-x-auto">
<table className="w-full text-sm">
<thead>
<tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
<th className="text-left px-4 py-3">Usuario</th>
<th className="text-left px-4 py-3">Rol</th>
<th className="text-left px-4 py-3">Contrasena</th>
<th className="text-right px-4 py-3">Acciones</th>
</tr>
</thead>
<tbody>
{filtered.map((user) => (
<tr key={user.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors">
<td className="px-4 py-3 font-mono text-white">{user.username}</td>
<td className="px-4 py-3">
<span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? 'bg-gray-800 text-gray-400'}`}>{ROLE_LABELS[user.role] ?? user.role}</span>
</td>
<td className="px-4 py-3">
{user.password_changed ? (
<span className="text-xs font-medium text-green-400">Actualizada</span>
) : (
<span className="text-xs font-medium text-yellow-400">Por defecto (12345)</span>
)}
{message?.id === user.id && (
<span className={`ml-2 text-xs ${message.ok ? 'text-green-400' : 'text-red-400'}`}>{message.text}</span>
)}
</td>
<td className="px-4 py-3 text-right">
<button onClick={() => handleReset(user.id)} disabled={isPending} className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline disabled:opacity-40">
Resetear
</button>
</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
</div>
)
}