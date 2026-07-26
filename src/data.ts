import type { AppSettings, Category } from './types'

const now = Date.now()

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'favorites', name: 'Favorites', color: '#ef8267', icon: '★', visible: true, order: 0, createdAt: now },
  { id: 'nature', name: 'Nature', color: '#4aa883', icon: '♧', visible: true, order: 1, createdAt: now },
  { id: 'trails', name: 'Trails', color: '#e9b35f', icon: '↝', visible: true, order: 2, createdAt: now },
  { id: 'parking', name: 'Parking', color: '#668bd6', icon: 'P', visible: true, order: 3, createdAt: now },
  { id: 'facilities', name: 'Facilities', color: '#9c7ad1', icon: '◆', visible: true, order: 4, createdAt: now },
  { id: 'uncategorized', name: 'Uncategorized', color: '#87958f', icon: '•', visible: true, order: 99, createdAt: now }
]

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings',
  theme: 'system',
  units: 'imperial',
  mapStyle: 'liberty'
}

export const CATEGORY_ICONS = ['★', '●', '◆', '♧', '↝', 'P', '⌂', '☕', '⚑', '!', '♨', '≈']

export const CATEGORY_COLORS = [
  '#ef8267',
  '#e9b35f',
  '#4aa883',
  '#42a5b3',
  '#668bd6',
  '#9c7ad1',
  '#d56c9e',
  '#87958f'
]
