import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Tornando Pusher disponível globalmente (requerido pelo laravel-echo)
;(window as any).Pusher = Pusher

export const echo = new Echo({
  broadcaster: 'pusher',
  key: import.meta.env.VITE_PUSHER_KEY ?? 'restaurante_key',
  cluster: import.meta.env.VITE_PUSHER_CLUSTER ?? 'mt1',
  wsHost: import.meta.env.VITE_PUSHER_HOST ?? '127.0.0.1',
  wsPort: Number(import.meta.env.VITE_PUSHER_PORT ?? 6001),
  wssPort: Number(import.meta.env.VITE_PUSHER_PORT ?? 6001),
  forceTLS: import.meta.env.VITE_PUSHER_SCHEME === 'https',
  enabledTransports: ['ws', 'wss'],
  disableStats: true,
})
