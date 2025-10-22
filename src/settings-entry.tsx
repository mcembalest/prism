import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { Settings } from './components/Settings'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="h-screen w-full bg-transparent dark">
      <Settings />
    </div>
  </React.StrictMode>
)

