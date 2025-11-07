import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useTheme } from '@/hooks/useTheme'

const STORAGE_KEY = 'SnowKite_gemini_api_key'

export function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const { theme, toggleTheme } = useTheme()

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
      <Card className="w-full max-w-lg bg-card/90 border-border rounded-2xl overflow-hidden">
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-3 py-2 bg-card/80 border-b border-border"
          onMouseDown={(e) => {
            if (e.button !== 0) return
            const target = e.target as HTMLElement
            if (target.closest('[data-no-drag]')) return
            // Best-effort: programmatically start dragging for environments
            // where the drag region attribute might not be picked up.
            getCurrentWindow().startDragging().catch(() => {})
          }}
        >
          <span className="text-xs font-semibold text-foreground">SnowKite Settings</span>
          <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} data-no-drag>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-destructive/20"
              onClick={handleClose}
            >
              <span className="text-foreground">✕</span>
            </Button>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Configure API keys and appearance settings for SnowKite.</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <label htmlFor="gemini" className="text-sm text-foreground">Gemini API Key</label>
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
                className="w-full bg-input text-foreground placeholder:text-muted-foreground border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              />
              <p className="text-xs text-muted-foreground">Stored locally and used at runtime. You only need to set this once.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground">Theme</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent text-foreground transition-colors"
                >
                  {theme === 'dark' ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      <span className="text-sm">Dark</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="text-sm">Light</span>
                    </>
                  )}
                </button>
                <span className="text-xs text-muted-foreground">Click to toggle</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {saved && <span className="text-xs text-green-500 dark:text-green-400 mr-auto">Saved</span>}
            <Button variant="ghost" onClick={handleClose}>Close</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
