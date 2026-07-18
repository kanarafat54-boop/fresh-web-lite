import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { FreshIdProvider } from './features/fresh-id/context/FreshIdContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FreshIdProvider>
      <App />
    </FreshIdProvider>
  </StrictMode>,
)
