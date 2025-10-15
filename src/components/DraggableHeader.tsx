import { getCurrentWindow } from '@tauri-apps/api/window'
import { X, Minus } from 'lucide-react'
import { Button } from './ui/button'
import { useIsTauri } from '@/lib/tauri-hooks'

export function DraggableHeader() {
  const isTauri = useIsTauri()

  const handleClose = () => {
    if (isTauri) {
      try {
        getCurrentWindow().close()
      } catch (error) {
        console.error('Failed to close window:', error)
      }
    } else {
      console.log('Close button clicked (browser mode)')
    }
  }

  const handleMinimize = () => {
    if (isTauri) {
      try {
        getCurrentWindow().minimize()
      } catch (error) {
        console.error('Failed to minimize window:', error)
      }
    } else {
      console.log('Minimize button clicked (browser mode)')
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-widget-surface border-b border-widget-border">
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 flex-1 cursor-move select-none"
      >
        <span className="text-sm font-semibold text-white">Prism Helper</span>
      </div>

      <div className="flex items-center gap-1">
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

