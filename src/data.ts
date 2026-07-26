import type { AppSettings } from './types'

export const LEGACY_CATEGORY_IDS = [
  'favorites',
  'nature',
  'trails',
  'parking',
  'facilities',
  'uncategorized'
]

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings',
  theme: 'system',
  units: 'imperial',
  mapStyle: 'liberty'
}

export const CATEGORY_ICONS = ['★', '●', '◆', '♧', '↝', 'P', '⌂', '☕', '⚑', '!', '♨', '≈']
export const DEFAULT_CUSTOM_CATEGORY_COLOR = '#4aa883'
