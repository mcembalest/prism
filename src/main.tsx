import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { invoke } from '@tauri-apps/api/core'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// If no API key is set, prompt user by opening Settings
try {
  const hasKey = localStorage.getItem('Lighthouse_gemini_api_key')
  if (!hasKey) {
    invoke('open_settings_window').catch(() => {})
  }
} catch {
  // ignore
}
