import { View, Text, StyleSheet } from 'react-native'

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  aberto: { label: 'Aberto', bg: '#dbeafe', text: '#1d4ed8' },
  em_preparo: { label: 'Em preparo', bg: '#ffedd5', text: '#c2410c' },
  pronto: { label: 'Pronto', bg: '#dcfce7', text: '#15803d' },
  entregue: { label: 'Entregue', bg: '#f3f4f6', text: '#374151' },
  cancelado: { label: 'Cancelado', bg: '#fee2e2', text: '#dc2626' },
  pendente: { label: 'Pendente', bg: '#fef9c3', text: '#a16207' },
}

interface Props {
  status: string
}

export default function StatusBadge({ status }: Props) {
  const cfg = STATUS_MAP[status] ?? { label: status, bg: '#f3f4f6', text: '#374151' }
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
})
