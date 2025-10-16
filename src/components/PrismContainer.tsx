import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DraggableHeader } from './DraggableHeader'
import { Helper } from './helper'
import { Learning } from './Learning'

export function PrismContainer() {
    const [activeTab, setActiveTab] = useState<'help' | 'learn'>('help')

    return (
        <Card className="h-screen w-full bg-gradient-to-br from-zinc-900 to-zinc-950 backdrop-blur-xl border-0 shadow-2xl overflow-hidden flex flex-col rounded-2xl p-0">
            <DraggableHeader />

            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'help' | 'learn')}
                className="flex-1 flex flex-col overflow-hidden"
            >
                <div className="px-4 pt-3 pb-2 bg-zinc-900/80 border-b border-zinc-800/50">
                    <TabsList className="grid w-full grid-cols-2 max-w-xs mx-auto bg-zinc-800/80 border border-zinc-700/50 rounded-xl">
                        <TabsTrigger
                            value="help"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"
                        >
                            Help
                        </TabsTrigger>
                        <TabsTrigger
                            value="learn"
                            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg"
                        >
                            Learn
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="help" className="flex-1 flex flex-col overflow-hidden m-0">
                    <Helper />
                </TabsContent>

                <TabsContent value="learn" className="flex-1 flex flex-col overflow-hidden m-0">
                    <Learning />
                </TabsContent>
            </Tabs>
        </Card>
    )
}
