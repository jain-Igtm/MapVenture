import type { Geometry, Position } from 'geojson'

export type FeatureKind = 'place' | 'trail' | 'area'
export type ThemeMode = 'system' | 'light' | 'dark'
export type DistanceUnit = 'imperial' | 'metric'

export interface PhotoAsset {
  id: string
  name: string
  type: string
  dataUrl: string
  createdAt: number
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  visible: boolean
  order: number
  createdAt: number
}

export interface MapFeature {
  id: string
  kind: FeatureKind
  name: string
  description: string
  categoryId: string
  tags: string[]
  geometry: Geometry
  photos: PhotoAsset[]
  mapId?: string
  isFieldMap?: boolean
  source: 'manual' | 'gps' | 'import'
  accuracy?: number
  visitedAt?: number
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  id: 'settings'
  theme: ThemeMode
  units: DistanceUnit
  mapStyle: 'liberty' | 'bright' | 'positron'
  lastCenter?: Position
  lastZoom?: number
  installDismissed?: boolean
}

export interface GeoFix {
  longitude: number
  latitude: number
  accuracy: number
  altitude: number | null
  speed: number | null
  heading: number | null
  timestamp: number
}

export interface SearchPlace {
  id: string
  name: string
  address: string
  position: Position
  kind?: string
}

export type TravelMode = 'driving' | 'walking'

export interface RouteEndpoint {
  id: string
  label: string
  subtitle?: string
  position: Position
  source: 'current' | 'saved' | 'search'
}

export interface RouteStep {
  id: string
  instruction: string
  distanceMeters: number
  durationSeconds: number
}

export interface RoutePlan {
  mode: TravelMode
  origin: RouteEndpoint
  destination: RouteEndpoint
  coordinates: Position[]
  distanceMeters: number
  durationSeconds: number
  steps: RouteStep[]
  createdAt: number
}

export interface SurveyState {
  mode: 'record-trail' | 'record-area' | 'draw-trail' | 'draw-area'
  coordinates: Position[]
  startedAt: number
  paused: boolean
}

export type SheetName =
  | 'none'
  | 'saved'
  | 'survey'
  | 'moon'
  | 'settings'
  | 'editor'
  | 'detail'
  | 'categories'
  | 'search'
  | 'place'
  | 'route'

export interface MapVentureBackup {
  app: 'MapVenture'
  version: 1
  exportedAt: string
  categories: Category[]
  features: MapFeature[]
  settings: AppSettings
}
