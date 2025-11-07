import { SnowKiteContainer } from './components/SnowKiteContainer'
import { useTheme } from './hooks/useTheme'

function App() {
  // Initialize theme (applies to document root)
  useTheme()

  return (
    <div className="h-screen w-full max-w-full bg-transparent overflow-x-hidden">
      <SnowKiteContainer />
    </div>
  )
}

export default App

