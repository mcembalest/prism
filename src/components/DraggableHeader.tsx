import { getCurrentWindow } from '@tauri-apps/api/window'
import { X, Minus, Settings as SettingsIcon } from 'lucide-react'
import { Button } from './ui/button'
import { invoke } from '@tauri-apps/api/core'

export function DraggableHeader() {
  const handleClose = () => {
    try {
      getCurrentWindow().close()
    } catch {
      console.log('Close (browser mode)')
    }
  }

  const handleMinimize = () => {
    try {
      getCurrentWindow().minimize()
    } catch {
      console.log('Minimize (browser mode)')
    }
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/80 border-b border-zinc-800/50 rounded-t-2xl">
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 flex-1 select-none"
      >
        <span className="text-xs font-semibold text-white/90">Prism</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          title="Settings"
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-white/10"
          onClick={() => invoke('open_settings_window').catch(() => {})}
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-white/10"
          onClick={handleMinimize}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-red-500/20"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
