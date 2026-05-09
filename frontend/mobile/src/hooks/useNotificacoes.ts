import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function solicitarPermissaoNotificacao(): Promise<boolean> {
  const { status: atual } = await Notifications.getPermissionsAsync()
  if (atual === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pedidos', {
      name: 'Pedidos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    })
  }

  return status === 'granted'
}

export async function notificar(titulo: string, corpo: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: corpo,
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'pedidos' }),
    },
    trigger: null,
  })
}
