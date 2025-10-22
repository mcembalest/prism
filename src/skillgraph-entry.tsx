import React from 'react'
import ReactDOM from 'react-dom/client'
import { SkillGraphViewer } from './components/SkillGraphViewer'
import './components/SkillGraphViewer.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SkillGraphViewer />
  </React.StrictMode>,
)
