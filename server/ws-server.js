const WebSocket = require('ws')
const IORedis = require('ioredis')

const port = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8081
const wss = new WebSocket.Server({ port })
console.log('WebSocket server started on port', port)

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const sub = new IORedis(redisUrl)

// Broadcast helper
function broadcast(data) {
  const s = JSON.stringify(data)
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(s)
  })
}

sub.subscribe('notifications', (err, count) => {
  if (err) console.error('Redis subscribe error', err)
  else console.log('Subscribed to notifications channel')
})

sub.on('message', (channel, message) => {
  try {
    const payload = JSON.parse(message)
    broadcast({ type: 'notification', payload })
  } catch (e) {
    console.error('Invalid message from redis', message)
  }
})

wss.on('connection', (socket) => {
  console.log('Client connected')
  socket.send(JSON.stringify({ type: 'welcome', now: Date.now() }))

  socket.on('message', (msg) => {
    try {
      const data = JSON.parse(msg)
      // Handle ping/pong or subscribe messages
      if (data.type === 'ping') socket.send(JSON.stringify({ type: 'pong' }))
    } catch (e) {
      console.error('Invalid client message', e)
    }
  })

  socket.on('close', () => console.log('Client disconnected'))
})
