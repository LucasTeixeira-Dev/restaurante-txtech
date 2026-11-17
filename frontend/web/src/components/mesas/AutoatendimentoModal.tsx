import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { mesaService } from '@/services/mesaService'
import { Modal } from '@/components/ui/Modal'
import type { Mesa } from '@/types'

/** Gerente liga/desliga o tablet de autoatendimento de uma mesa e define a senha. */
export default function AutoatendimentoModal({ mesa, onClose }: { mesa: Mesa; onClose: () => void }) {
  const queryClient = useQueryClient()
  const atual = mesa.autoatendimento
  const jaConfigurado = !!atual?.login
  const [ativo, setAtivo] = useState(atual?.ativo ?? true)
  const [senha, setSenha] = useState('')

  const { mutate: salvar, isPending } = useMutation({
    mutationFn: () =>
      mesaService.configurarAutoatendimento(mesa.id, { ativo, senha: senha || undefined }),
    onSuccess: (m) => {
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      toast.success(
        m.autoatendimento?.ativo
          ? `Tablet da Mesa ${m.numero} ativo. Login: ${m.autoatendimento.login}`
          : `Tablet da Mesa ${m.numero} desativado.`,
        { duration: 6000 },
      )
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao configurar o tablet.'),
  })

  const precisaSenha = ativo && !jaConfigurado

  return (
    <Modal
      open
      onClose={onClose}
      title={`Tablet da Mesa ${mesa.numero}`}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => salvar()}
            disabled={isPending || (precisaSenha && senha.length < 6) || (senha !== '' && senha.length < 6)}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50"
          >
            {isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Com o autoatendimento ligado, o cliente faz pedidos, chama o garçom e pede a conta pelo tablet.
          O atendimento pelo garçom continua funcionando normalmente nesta mesa.
        </p>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm font-medium text-gray-800">Autoatendimento ligado nesta mesa</span>
        </label>

        {ativo && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              {jaConfigurado ? 'Nova senha do tablet (deixe vazio para manter)' : 'Senha do tablet *'}
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="mínimo 6 caracteres"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {jaConfigurado && (
              <p className="text-xs text-gray-400 mt-1">Trocar a senha desconecta o tablet, que precisa entrar de novo.</p>
            )}
          </div>
        )}

        {jaConfigurado && (
          <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm">
            <p className="text-gray-500 text-xs mb-0.5">Login do tablet</p>
            <p className="font-mono text-gray-900">{atual?.login}</p>
          </div>
        )}

        <p className="text-xs text-gray-500">
          No tablet: abra o sistema no navegador ({window.location.origin}), entre com o login da mesa e deixe em tela cheia.
          Para sair do modo mesa, toque na engrenagem no canto inferior e digite a senha.
        </p>
      </div>
    </Modal>
  )
}
