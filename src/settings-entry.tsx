import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { Settings } from './components/Settings'
import { useTheme } from './hooks/useTheme'

// Wrapper component to initialize theme
function SettingsApp() {
  // Initialize theme (applies to document root)
  useTheme()
  
  return (
    <div className="h-screen w-full bg-transparent">
      <Settings />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsApp />
  </React.StrictMode>
)

