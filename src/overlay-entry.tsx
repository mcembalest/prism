import React from 'react'
import ReactDOM from 'react-dom/client'
import { ScreenOverlay } from './components/ScreenOverlay'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ScreenOverlay />
  </React.StrictMode>,
)
