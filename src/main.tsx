import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import './design-system/design-system.css'

const root = createRoot(document.getElementById('root')!)

function StartupError({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#fafafa',
        background: '#0a0a0a',
      }}
    >
      <h1 style={{ fontSize: 20, margin: 0 }}>The app failed to start</h1>
      <p style={{ margin: 0, opacity: 0.75, maxWidth: 480, lineHeight: 1.6 }}>{message}</p>
    </div>
  )
}

async function bootstrap() {
  try {
    const [{ default: App }, { FreshIdProvider }, { FreshCoreProvider }] = await Promise.all([
      import('./App'),
      import('./features/fresh-id/context/FreshIdContext'),
      import('./app/providers/FreshCoreProvider'),
    ])

    root.render(
      <StrictMode>
        <FreshCoreProvider>
          <FreshIdProvider>
            <App />
          </FreshIdProvider>
        </FreshCoreProvider>
      </StrictMode>
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[v0] Startup failure:', error)
    root.render(<StartupError message={message} />)
  }
}

bootstrap()
