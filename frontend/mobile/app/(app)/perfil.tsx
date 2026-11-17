import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'

const PAPEL_LABEL: Record<string, string> = {
  gerente: 'Gerente',
  garcom: 'Garçom',
  chapeiro: 'Chapeiro',
  caixa: 'Caixa',
}

const PAPEL_COLOR: Record<string, { bg: string; text: string }> = {
  gerente: { bg: '#f3e8ff', text: '#7c3aed' },
  garcom: { bg: '#dbeafe', text: '#1d4ed8' },
  chapeiro: { bg: '#ffedd5', text: '#c2410c' },
  caixa: { bg: '#dcfce7', text: '#15803d' },
}

export default function PerfilScreen() {
  const router = useRouter()
  const { usuario, logout } = useAuthStore()

  const { mutate: fazerLogout, isPending } = useMutation({
    mutationFn: authService.logout,
    onSettled: async () => {
      await logout()
      router.replace('/(auth)/login')
    },
  })

  const confirmarLogout = () => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => fazerLogout() },
    ])
  }

  if (!usuario) return null

  const cor = PAPEL_COLOR[usuario.papel] ?? { bg: '#f3f4f6', text: '#374151' }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + nome */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetra}>{usuario.nome.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.nome}>{usuario.nome}</Text>
        <View style={[styles.papelBadge, { backgroundColor: cor.bg }]}>
          <Text style={[styles.papelText, { color: cor.text }]}>
            {PAPEL_LABEL[usuario.papel] ?? usuario.papel}
          </Text>
        </View>
      </View>

      {/* Informações */}
      <View style={styles.card}>
        <InfoRow icon="mail-outline" label="E-mail" value={usuario.email} />
        <InfoRow icon="shield-checkmark-outline" label="Papel" value={PAPEL_LABEL[usuario.papel] ?? usuario.papel} />
        <InfoRow
          icon="ellipse-outline"
          label="Situação"
          value={usuario.ativo ? 'Ativo' : 'Inativo'}
          valueColor={usuario.ativo ? '#16a34a' : '#dc2626'}
        />
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, isPending && { opacity: 0.6 }]}
        onPress={confirmarLogout}
        disabled={isPending}
      >
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>{isPending ? 'Saindo...' : 'Encerrar sessão'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function InfoRow({
  icon, label, value, valueColor = '#111827',
}: {
  icon: any; label: string; value: string; valueColor?: string
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color="#9ca3af" />
      </View>
      <View style={styles.infoTexts}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 24, gap: 20, paddingBottom: 48 },
  avatarSection: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#ffedd5', justifyContent: 'center', alignItems: 'center',
  },
  avatarLetra: { fontSize: 36, fontWeight: '700', color: '#f97316' },
  nome: { fontSize: 22, fontWeight: '700', color: '#111827' },
  papelBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 99 },
  papelText: { fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderBottomWidth: 1, borderColor: '#f9fafb',
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center',
  },
  infoTexts: { gap: 2 },
  infoLabel: { fontSize: 11, color: '#9ca3af' },
  infoValue: { fontSize: 15, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16,
    borderWidth: 1, borderColor: '#fecaca',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#ef4444' },
})
