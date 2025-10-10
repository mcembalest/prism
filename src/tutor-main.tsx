import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FloatingTutor from './components/tutor/FloatingTutor'
import { AppStateProvider } from './state/app-state'
import './index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Tutor root element missing')
}

createRoot(container).render(
  <StrictMode>
    <AppStateProvider>
      <div className="min-h-screen bg-background p-4">
        <FloatingTutor variant="standalone" />
      </div>
    </AppStateProvider>
  </StrictMode>,
)
