import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { contaService } from '@/services/contaService'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import ComprovanteConta from '@/components/conta/ComprovanteConta'

/** Página de impressão do comprovante (sem valor fiscal), aberta pelo caixa. */
export default function ComprovantePage() {
  const { id } = useParams<{ id: string }>()
  const { data: conta, isLoading } = useQuery({
    queryKey: ['conta', Number(id)],
    queryFn: () => contaService.buscar(Number(id)),
  })

  if (isLoading || !conta) return <PageLoading />

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white flex flex-col items-center py-8 print:py-0">
      <div className="w-full max-w-sm bg-white border border-gray-100 rounded-2xl p-6 print:border-0 print:rounded-none print:p-2">
        <ComprovanteConta conta={conta} />
      </div>
      <button
        onClick={() => window.print()}
        className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold print:hidden"
      >
        <Printer className="w-4 h-4" /> Imprimir
      </button>
    </div>
  )
}
