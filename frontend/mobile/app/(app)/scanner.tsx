import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { useCarrinhoStore } from '@/stores/carrinhoStore'
import { mesaService } from '@/services/mesaService'

export default function ScannerScreen() {
  const router = useRouter()
  const definirMesa = useCarrinhoStore((s) => s.definirMesa)
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    if (!permission?.granted) requestPermission()
  }, [])

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (scanned || buscando) return
    setScanned(true)
    setBuscando(true)

    try {
      const mesa = await mesaService.buscarPorQr(data)
      definirMesa(mesa.id, mesa.numero)
      router.push('/(app)/novo-pedido')
    } catch {
      Alert.alert(
        'Mesa não encontrada',
        'O QR Code escaneado não corresponde a nenhuma mesa.',
        [{ text: 'Tentar novamente', onPress: () => setScanned(false) }],
      )
    } finally {
      setBuscando(false)
    }
  }

  if (!permission) return <View style={styles.container} />

  if (!permission.granted) {
    return (
      <View style={styles.permissao}>
        <Text style={styles.permissaoText}>
          Permissão para câmera necessária para escanear o QR Code da mesa.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Conceder permissão</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.topFill} />
        <View style={styles.middleRow}>
          <View style={styles.sideFill} />
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.sideFill} />
        </View>
        <View style={styles.bottomFill}>
          <Text style={styles.instrucao}>
            {buscando ? 'Buscando mesa...' : 'Aponte a câmera para o QR Code da mesa'}
          </Text>
          <TouchableOpacity
            style={styles.semQr}
            onPress={() => router.push('/(app)/novo-pedido')}
          >
            <Text style={styles.semQrText}>Continuar sem mesa</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const SCAN_SIZE = 240
const CORNER = 20

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissao: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#f9fafb' },
  permissaoText: { fontSize: 15, color: '#374151', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  btn: { backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  overlay: { ...StyleSheet.absoluteFillObject },
  topFill: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middleRow: { flexDirection: 'row', height: SCAN_SIZE },
  sideFill: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scanArea: { width: SCAN_SIZE, height: SCAN_SIZE },
  bottomFill: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: 24, gap: 16 },
  instrucao: { color: '#fff', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  semQr: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99 },
  semQrText: { color: '#fff', fontSize: 13 },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER,
    borderColor: '#f97316', borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
})
