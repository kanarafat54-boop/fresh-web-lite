import { useEffect, useState, useRef } from 'react'

export default function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const wsRef = useRef(null)

  useEffect(() => {
    const url = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081')
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.addEventListener('message', (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'notification') {
          setNotifications(n => [data.payload, ...n])
        }
      } catch (e) {
        console.error('Invalid ws message', e)
      }
    })

    ws.addEventListener('open', () => console.log('WS connected'))
    ws.addEventListener('close', () => console.log('WS closed'))

    return () => {
      ws.close()
    }
  }, [])

  return { notifications }
}
