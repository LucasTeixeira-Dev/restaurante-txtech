import { useEffect, useRef } from 'react'
import { echo } from '@/lib/echo'

type EchoEventHandler = (data: unknown) => void

export function useEchoChannel(
  channel: string,
  event: string,
  handler: EchoEventHandler,
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const ch = echo.channel(channel)
    ch.listen(`.${event}`, (data: unknown) => handlerRef.current(data))

    return () => {
      ch.stopListening(`.${event}`)
      echo.leaveChannel(channel)
    }
  }, [channel, event])
}
