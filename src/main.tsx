import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import './design-system/design-system.css'

import App from './App'

import { FreshIdProvider } from './features/fresh-id/context/FreshIdContext'
import { FreshCoreProvider } from './app/providers/FreshCoreProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FreshCoreProvider>
      <FreshIdProvider>
        <App />
      </FreshIdProvider>
    </FreshCoreProvider>
  </StrictMode>
)
