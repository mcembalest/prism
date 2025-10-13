import { useEffect, useMemo, useRef, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useCheckpointProgress, flattenCheckpointTree } from '@/state/checkpoints'

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'default'
    case 'in-progress':
      return 'secondary'
    case 'pending':
    default:
      return 'outline'
  }
}

function formatStatus(status: string) {
  return status
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

type TrackSummary = {
  track: ReturnType<typeof useCheckpointProgress>['tracks'][number]
  product: string
  total: number
  completed: number
  inProgress: number
  pending: number
  percent: number
  isActive: boolean
}

type ProductGroup = {
  product: string
  summaries: TrackSummary[]
  total: number
  completed: number
  inProgress: number
  pending: number
  percent: number
  isActive: boolean
}

export default function HomePage() {
  const username = 'Max'
  const {
    tracks,
    activeTrack,
    activeTrackId,
    activeCheckpoint,
    flattenedActiveGraph,
    activeCheckpointId,
    sessionLog,
    setActiveTrack,
  } = useCheckpointProgress()
  const trackSummaries: TrackSummary[] = tracks.map((track) => {
    const nodes = flattenCheckpointTree(track)
    const completed = nodes.filter((node) => node.status === 'completed').length
    const inProgress = nodes.filter((node) => node.status === 'in-progress').length
    const pending = nodes.filter((node) => node.status === 'pending').length
    const percent = nodes.length ? Math.round((completed / nodes.length) * 100) : 0
    const product = track.product ?? 'General'

    return {
      track,
      product,
      total: nodes.length,
      completed,
      inProgress,
      pending,
      percent,
      isActive: track.id === activeTrackId,
    }
  })

  const productGroups = trackSummaries.reduce<Record<string, ProductGroup>>((acc, summary) => {
    const product = summary.product
    if (!acc[product]) {
      acc[product] = {
        product,
        summaries: [],
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        percent: 0,
        isActive: false,
      }
    }
    const group = acc[product]
    group.summaries.push(summary)
    group.total += summary.total
    group.completed += summary.completed
    group.inProgress += summary.inProgress
    group.pending += summary.pending
    if (summary.isActive) {
      group.isActive = true
    }
    group.percent = group.total ? Math.round((group.completed / group.total) * 100) : 0
    return acc
  }, {})

  const productGroupList = useMemo(() => Object.values(productGroups).sort((a, b) => a.product.localeCompare(b.product)), [productGroups])

  const activeTrackProduct = activeTrack?.product ?? null

  const [selectedProduct, setSelectedProduct] = useState<string | null>(activeTrackProduct)

  useEffect(() => {
    if (selectedProduct && !productGroups[selectedProduct]) {
      setSelectedProduct(null)
    }
  }, [selectedProduct, productGroups])

  const handleSelectProduct = (product: string) => {
    setSelectedProduct(product)
  }

  useEffect(() => {
    if (!selectedProduct) {
      return
    }
    if (!activeTrackProduct) {
      return
    }
    if (activeTrackProduct === selectedProduct) {
      return
    }
    const group = productGroups[selectedProduct]
    if (!group) {
      return
    }
    const activeSummary = group.summaries.find((summary) => summary.isActive)
    if (!activeSummary) {
      return
    }
    setActiveTrack(activeSummary.track.id)
  }, [selectedProduct, activeTrackProduct, productGroups, setActiveTrack])

  const activeGroup = selectedProduct ? productGroups[selectedProduct] ?? null : null

  const tutorWindowRef = useRef<Window | null>(null)
  const hasAutoLaunchedTutor = useRef(false)

  const openTutorWindow = () => {
    const width = 420
    const height = 640
    const left = window.screenX + window.innerWidth - width - 24
    const top = window.screenY + window.innerHeight - height - 24
    const existing = tutorWindowRef.current
    if (existing && !existing.closed) {
      existing.focus()
      return existing
    }
    const opened = window.open(
      '/tutor.html',
      'prism-tutor',
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes`,
    )
    if (opened) {
      tutorWindowRef.current = opened
    }
    return opened
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && !hasAutoLaunchedTutor.current) {
      hasAutoLaunchedTutor.current = true
      openTutorWindow()
    }

    return () => {
      const win = tutorWindowRef.current
      if (win && !win.closed) {
        win.close()
      }
    }
  }, [])

  if (!activeTrack || !activeCheckpoint) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No active checkpoint selected
          </CardContent>
        </Card>
      </div>
    )
  }

  const upcomingNodes = flattenedActiveGraph
    .filter((node) => node.id !== activeCheckpoint.id)
    .filter((node) => node.status !== 'completed')
    .slice(0, 3)

  const allNotes = [...sessionLog].reverse()

  const getEntryMetadata = (checkpointId: string | null) => {
    if (!checkpointId) return { trackTitle: 'General', checkpointTitle: 'System', product: 'General' }

    for (const track of tracks) {
      if (track.id === checkpointId) {
        return {
          trackTitle: track.title,
          checkpointTitle: track.title,
          product: track.product ?? 'General'
        }
      }
      const checkpoint = flattenCheckpointTree(track).find(node => node.id === checkpointId)
      if (checkpoint) {
        return {
          trackTitle: track.title,
          checkpointTitle: checkpoint.title,
          product: track.product ?? 'General'
        }
      }
    }
    return { trackTitle: 'Unknown', checkpointTitle: 'Unknown', product: 'General' }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{username}'s Home Page</h1>
      </header>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg font-semibold">Current Learning Path: {activeTrack.title}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {activeTrack.product ?? 'General'}
            </Badge>
            <Badge variant={getStatusBadgeVariant(activeTrack.status)} className="text-xs">
              {formatStatus(activeTrack.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {activeTrack.evaluationCriteria?.exampleTasks?.[0]}
          </p>
          <div className="flex flex-col gap-2 w-full max-w-[200px]">
            <Button onClick={openTutorWindow}>Launch tutor</Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 flex-1">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{activeCheckpoint.title}</span>
                  <Badge variant={getStatusBadgeVariant(activeCheckpoint.status)} className="text-xs">
                    {formatStatus(activeCheckpoint.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {activeCheckpoint.evaluationCriteria?.exampleTasks?.[0] ?? 'Follow the tutor to progress.'}
                </p>
              </div>

              {(upcomingNodes.length > 0 || (activeCheckpoint.children && activeCheckpoint.children.length > 0)) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Up next</p>
                  <div className="space-y-1">
                    {upcomingNodes.slice(0, 3).map((node) => (
                      <div key={node.id} className="flex items-center justify-between text-sm">
                        <span>{node.title}</span>
                        <Badge variant={getStatusBadgeVariant(node.status)} className="text-xs">
                          {formatStatus(node.status)}
                        </Badge>
                      </div>
                    ))}
                    {upcomingNodes.length === 0 &&
                      activeCheckpoint.children?.slice(0, 3).map((child) => (
                        <div key={child.id} className="flex items-center justify-between text-sm">
                          <span>{child.title}</span>
                          <Badge variant={getStatusBadgeVariant(child.status)} className="text-xs">
                            {formatStatus(child.status)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Browse Learning Paths</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose a product to explore available tracks and progress.
            </p>
          </div>
          {selectedProduct && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>
              ← All learning paths
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {selectedProduct && activeGroup ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{selectedProduct}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeGroup.completed} of {activeGroup.total} checkpoints complete · {activeGroup.inProgress} in progress
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activeGroup.percent}%
                </Badge>
              </div>
              <div className="space-y-3">
                {activeGroup.summaries.map((summary) => (
                  <div
                    key={summary.track.id}
                    className={`rounded-lg border border-border/60 p-4 transition-colors ${summary.isActive ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{summary.track.title}</span>
                          {summary.isActive && <Badge className="text-[10px]">Active</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {summary.track.evaluationCriteria?.exampleTasks?.[0] ?? 'Build mastery step by step.'}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(summary.track.status)} className="text-xs">
                        {formatStatus(summary.track.status)}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-2">
                      <Progress value={summary.percent} />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {summary.completed} of {summary.total} checkpoints
                        </span>
                        <span>{summary.inProgress} in progress</span>
                      </div>
                    </div>
                    {!summary.isActive && (
                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSelectProduct(summary.product)}
                        >
                          View path
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveTrack(summary.track.id)
                            setSelectedProduct(summary.product)
                          }}
                        >
                          Set active
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {productGroupList.map((group) => (
                <Card key={group.product} className="flex flex-col border border-border/60">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">{group.product}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {group.percent}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {group.completed} of {group.total} checkpoints complete
                    </p>
                  </CardHeader>
                  <CardContent className="mt-auto flex justify-end">
                    <Button onClick={() => handleSelectProduct(group.product)}>View path</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete history of your learning activity across all learning paths
          </p>
        </CardHeader>
        <CardContent>
          {allNotes.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {allNotes.map((entry) => {
                const metadata = getEntryMetadata(entry.checkpointId)
                return (
                  <div key={entry.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {metadata.product}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {entry.role === 'tutor' ? 'Tutor' : entry.role === 'user' ? 'You' : 'System'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">{metadata.trackTitle}</span>
                      {metadata.checkpointTitle !== metadata.trackTitle && (
                        <> → {metadata.checkpointTitle}</>
                      )}
                    </div>
                    <p className="text-sm leading-snug">{entry.content}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet—interact with the tutor to start logging your progress.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
