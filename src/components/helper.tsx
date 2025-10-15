import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DraggableHeader } from './DraggableHeader'

export function Helper() {
  return (
    <Card className="h-screen w-full bg-widget-bg/95 backdrop-blur-xl border-widget-border shadow-widget rounded-widget overflow-hidden flex flex-col">
      <DraggableHeader />

      <Tabs defaultValue="home" className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none bg-widget-surface border-b border-widget-border">
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="home" className="p-6 m-0">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Welcome to Prism Helper</h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                This is a floating window built with Tauri. You can drag it around using the header,
                minimize it, or close it using the buttons in the top right.
              </p>
              <div className="p-4 bg-widget-surface rounded-lg border border-widget-border">
                <p className="text-sm text-gray-400">
                  The window is configured with:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-gray-500">
                  <li>• Transparent background</li>
                  <li>• No native decorations</li>
                  <li>• Always on top</li>
                  <li>• Custom drag region</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="p-6 m-0">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Settings</h2>
              <p className="text-gray-400 text-sm">
                Settings panel coming soon...
              </p>
            </div>
          </TabsContent>

          <TabsContent value="about" className="p-6 m-0">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">About</h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                Built with Tauri v2, React, TypeScript, and Tailwind CSS.
              </p>
              <div className="mt-4 text-xs text-gray-500">
                <p>Version: 0.1.0</p>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </Card>
  )
}
