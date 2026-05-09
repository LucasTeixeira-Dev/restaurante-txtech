import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Image, Alert, ActivityIndicator, StyleSheet, FlatList,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { cardapioService } from '@/services/cardapioService'
import { pedidoService, carrinhoParaPayload } from '@/services/pedidoService'
import { useCarrinhoStore } from '@/stores/carrinhoStore'
import LoadingView from '@/components/LoadingView'
import type { Produto } from '@/types'

export default function NovoPedidoScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { itens, mesaId, mesaNumero, adicionar, remover, alterarQuantidade, limpar, total } = useCarrinhoStore()
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(null)
  const [aba, setAba] = useState<'cardapio' | 'carrinho'>('cardapio')

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['cardapio-mobile'],
    queryFn: cardapioService.listar,
    onSuccess: (data) => {
      if (data.length > 0 && categoriaAtiva === null) {
        setCategoriaAtiva(data[0].id)
      }
    },
  })

  const { mutate: confirmar, isPending } = useMutation({
    mutationFn: () => {
      const payload = carrinhoParaPayload(itens, mesaId)
      return pedidoService.criar(payload)
    },
    onSuccess: (pedido) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-mobile'] })
      limpar()
      Alert.alert('Pedido criado!', `Pedido #${pedido.id} registrado com sucesso.`, [
        { text: 'Ver pedido', onPress: () => router.replace(`/(app)/pedidos/${pedido.id}`) },
        { text: 'Novo pedido', onPress: () => router.back() },
      ])
    },
    onError: (e: any) => Alert.alert('Erro', e?.response?.data?.message ?? 'Erro ao criar pedido.'),
  })

  if (isLoading) return <LoadingView />

  const produtosDaCategoria = categorias.find((c) => c.id === categoriaAtiva)?.produtos ?? []
  const totalItens = itens.reduce((s, i) => s + i.quantidade, 0)

  return (
    <View style={styles.container}>
      {/* Info da mesa */}
      {mesaNumero && (
        <View style={styles.mesaBanner}>
          <Ionicons name="grid-outline" size={16} color="#c2410c" />
          <Text style={styles.mesaText}>Mesa {mesaNumero}</Text>
        </View>
      )}

      {/* Abas */}
      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.aba, aba === 'cardapio' && styles.abaAtiva]}
          onPress={() => setAba('cardapio')}
        >
          <Text style={[styles.abaText, aba === 'cardapio' && styles.abaTextAtivo]}>Cardápio</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.aba, aba === 'carrinho' && styles.abaAtiva]}
          onPress={() => setAba('carrinho')}
        >
          <Text style={[styles.abaText, aba === 'carrinho' && styles.abaTextAtivo]}>
            Carrinho {totalItens > 0 && `(${totalItens})`}
          </Text>
        </TouchableOpacity>
      </View>

      {aba === 'cardapio' ? (
        <View style={{ flex: 1 }}>
          {/* Categorias */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cats} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {categorias.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.catChip, categoriaAtiva === c.id && styles.catChipAtivo]}
                onPress={() => setCategoriaAtiva(c.id)}
              >
                <Text style={[styles.catText, categoriaAtiva === c.id && styles.catTextAtivo]}>{c.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Produtos */}
          <FlatList
            data={produtosDaCategoria}
            keyExtractor={(p) => String(p.id)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item: p }) => <ProdutoCard produto={p} onAdicionar={adicionar} />}
            ListEmptyComponent={
              <Text style={styles.vazio}>Nenhum produto disponível nesta categoria.</Text>
            }
          />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {itens.length === 0 ? (
            <Text style={styles.vazio}>Carrinho vazio. Adicione produtos no cardápio.</Text>
          ) : (
            <>
              {itens.map((item) => (
                <View key={item.produto.id} style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemNome}>{item.produto.nome}</Text>
                    <Text style={styles.itemPreco}>R$ {item.produto.preco.toFixed(2)}</Text>
                  </View>
                  <View style={styles.qty}>
                    <TouchableOpacity onPress={() => alterarQuantidade(item.produto.id, item.quantidade - 1)}>
                      <Ionicons name="remove-circle-outline" size={26} color="#f97316" />
                    </TouchableOpacity>
                    <Text style={styles.qtyNum}>{item.quantidade}</Text>
                    <TouchableOpacity onPress={() => alterarQuantidade(item.produto.id, item.quantidade + 1)}>
                      <Ionicons name="add-circle-outline" size={26} color="#f97316" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>R$ {total().toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.confirmarBtn, isPending && { opacity: 0.6 }]}
                onPress={() => confirmar()}
                disabled={isPending}
              >
                {isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.confirmarText}>Confirmar Pedido</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </View>
  )
}

function ProdutoCard({ produto, onAdicionar }: { produto: Produto; onAdicionar: (p: Produto) => void }) {
  return (
    <TouchableOpacity style={styles.prodCard} onPress={() => onAdicionar(produto)} activeOpacity={0.7}>
      {produto.imagem_url ? (
        <Image source={{ uri: produto.imagem_url }} style={styles.prodImg} />
      ) : (
        <View style={[styles.prodImg, styles.prodImgPlaceholder]}>
          <Ionicons name="fast-food-outline" size={24} color="#d1d5db" />
        </View>
      )}
      <View style={{ flex: 1, paddingLeft: 12 }}>
        <Text style={styles.prodNome}>{produto.nome}</Text>
        {produto.descricao ? <Text style={styles.prodDesc} numberOfLines={1}>{produto.descricao}</Text> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <Text style={styles.prodPreco}>R$ {produto.preco.toFixed(2)}</Text>
          <View style={styles.addBtn}>
            <Ionicons name="add" size={18} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  mesaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ffedd5', paddingVertical: 8, paddingHorizontal: 16,
  },
  mesaText: { fontSize: 13, color: '#c2410c', fontWeight: '600' },
  abas: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  aba: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  abaAtiva: { borderBottomWidth: 2, borderBottomColor: '#f97316' },
  abaText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  abaTextAtivo: { color: '#f97316' },
  cats: { maxHeight: 52, paddingVertical: 10, backgroundColor: '#fff' },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 99,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: 'transparent',
  },
  catChipAtivo: { backgroundColor: '#ffedd5', borderColor: '#f97316' },
  catText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  catTextAtivo: { color: '#f97316' },
  prodCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: '#f3f4f6',
  },
  prodImg: { width: 70, height: 70, borderRadius: 10 },
  prodImgPlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  prodNome: { fontSize: 14, fontWeight: '600', color: '#111827' },
  prodDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  prodPreco: { fontSize: 15, fontWeight: '700', color: '#f97316' },
  addBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f97316', justifyContent: 'center', alignItems: 'center' },
  vazio: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 40 },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f3f4f6',
  },
  itemNome: { fontSize: 14, fontWeight: '600', color: '#111827' },
  itemPreco: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyNum: { fontSize: 16, fontWeight: '700', color: '#111827', minWidth: 24, textAlign: 'center' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  confirmarBtn: {
    backgroundColor: '#f97316', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  confirmarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
