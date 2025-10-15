import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('Main.tsx loaded')
console.log('Root element:', document.getElementById('root'))

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  console.log('React app rendered')
} catch (error) {
  console.error('Failed to render React app:', error)
  document.body.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error}</div>`
}

