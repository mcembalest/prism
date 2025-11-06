import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getCurrentWindow } from '@tauri-apps/api/window'

const STORAGE_KEY = 'SnowKite_gemini_api_key'

export function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY) || ''
      setApiKey(existing)
    } catch {
      // ignore
    }
  }, [])

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, apiKey.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Failed to save settings', e)
    }
  }

  const handleClose = async () => {
    try {
      await getCurrentWindow().close()
    } catch {
      // ignore (browser mode)
    }
  }

  return (
    <div className="h-screen w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-zinc-900/90 border-zinc-800/60 rounded-2xl overflow-hidden">
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-3 py-2 bg-zinc-900/80 border-b border-zinc-800/50"
          onMouseDown={(e) => {
            if (e.button !== 0) return
            const target = e.target as HTMLElement
            if (target.closest('[data-no-drag]')) return
            // Best-effort: programmatically start dragging for environments
            // where the drag region attribute might not be picked up.
            getCurrentWindow().startDragging().catch(() => {})
          }}
        >
          <span className="text-xs font-semibold text-white/90">SnowKite Settings</span>
          <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} data-no-drag>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-red-500/20"
              onClick={handleClose}
            >
              <span className="text-white">✕</span>
            </Button>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-zinc-400">Configure API keys used by SnowKite.</p>
          </div>

          <div className="space-y-2 mb-6">
            <label htmlFor="gemini" className="text-sm text-zinc-300">Gemini API Key</label>
            <input
              id="gemini"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  handleClose()
                }
              }}
              placeholder="Enter your Gemini API key"
              className="w-full bg-zinc-800/80 text-white placeholder:text-zinc-500 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
            <p className="text-xs text-zinc-500">Stored locally and used at runtime. You only need to set this once.</p>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {saved && <span className="text-xs text-green-400 mr-auto">Saved</span>}
            <Button variant="ghost" onClick={handleClose} className="hover:bg-white/10">Close</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Save</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
