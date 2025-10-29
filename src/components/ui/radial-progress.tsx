interface RadialProgressProps {
  progress: number // 0 to 1
  hasSkipped: boolean
  size?: number
}

export function RadialProgress({ progress, hasSkipped, size = 24 }: RadialProgressProps) {
  // Clamp progress between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress))

  // Color logic: orange if skipped, otherwise interpolate from orange to green
  const getColor = () => {
    if (hasSkipped) {
      return '#f97316' // orange-500
    }

    // Interpolate from orange (#f97316) to green (#22c55e)
    const orange = { r: 249, g: 115, b: 22 }
    const green = { r: 34, g: 197, b: 94 }

    const r = Math.round(orange.r + (green.r - orange.r) * clampedProgress)
    const g = Math.round(orange.g + (green.g - orange.g) * clampedProgress)
    const b = Math.round(orange.b + (green.b - orange.b) * clampedProgress)

    return `rgb(${r}, ${g}, ${b})`
  }

  const color = getColor()
  const center = size / 2
  const radius = size / 2

  // Calculate the end point of the arc for the pie slice
  // Angle in radians (starts at top, goes clockwise)
  const angle = clampedProgress * 2 * Math.PI
  const endX = center + radius * Math.sin(angle)
  const endY = center - radius * Math.cos(angle)

  // Large arc flag: 1 if progress > 0.5, 0 otherwise
  const largeArcFlag = clampedProgress > 0.5 ? 1 : 0

  // Create the pie slice path
  const piePath = clampedProgress === 0
    ? ''
    : `M ${center} ${center} L ${center} 0 A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`

  return (
    <div style={{ width: size, height: size }} className="flex-shrink-0">
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="#3f3f46"
        />
        {/* Progress pie slice */}
        {clampedProgress > 0 && (
          <path
            d={piePath}
            fill={color}
            className="transition-all duration-300"
          />
        )}
      </svg>
    </div>
  )
}
