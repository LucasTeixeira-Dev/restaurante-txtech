import { useAuthStore } from '@/stores/authStore'

export default function DashboardPage() {
  const usuario = useAuthStore((s) => s.usuario)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Olá, {usuario?.nome}!
      </h1>
      <p className="text-gray-500 mt-1">Bem-vindo ao painel de controle.</p>
    </div>
  )
}
