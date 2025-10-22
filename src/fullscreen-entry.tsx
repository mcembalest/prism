import React from 'react'
import ReactDOM from 'react-dom/client'
import { FullscreenViewer } from './components/FullscreenViewer'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FullscreenViewer />
  </React.StrictMode>,
)
