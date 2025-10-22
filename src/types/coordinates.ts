/**
 * Core coordinate types used throughout the application.
 * These types use TypeScript camelCase convention and are automatically
 * converted to Rust snake_case via serde(rename_all = "camelCase").
 */

export interface Point {
  x: number
  y: number
}

export interface BoundingBox {
  xMin: number
  yMin: number
  xMax: number
  yMax: number
}
