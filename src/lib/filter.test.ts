import { describe, expect, it } from 'vitest'
import type { Category, MapFeature } from '../types'
import { filterMapFeatures } from './filter'

const categories: Category[] = [
  { id: 'nature', name: 'Nature', color: '#4aa883', icon: '♧', visible: true, order: 0, createdAt: 1 },
  { id: 'hidden', name: 'Hidden', color: '#000000', icon: '•', visible: false, order: 1, createdAt: 1 }
]

function feature(value: Partial<MapFeature> & Pick<MapFeature, 'id' | 'name'>): MapFeature {
  return {
    kind: 'place',
    description: '',
    categoryId: 'nature',
    tags: [],
    geometry: { type: 'Point', coordinates: [-78, 42] },
    photos: [],
    source: 'manual',
    createdAt: 1,
    updatedAt: 1,
    ...value
  }
}

const features = [
  feature({ id: 'park', name: 'Delaware Park', kind: 'area', isFieldMap: true }),
  feature({ id: 'bench', name: 'Quiet bench', mapId: 'park', tags: ['sunset'] }),
  feature({ id: 'cafe', name: 'Coffee stop', description: 'Warm drinks' }),
  feature({ id: 'secret', name: 'Hidden feature', categoryId: 'hidden' })
]

describe('feature filtering', () => {
  it('removes hidden category layers', () => {
    expect(filterMapFeatures(features, categories, '')).toHaveLength(3)
  })

  it('focuses a field map on its boundary and assigned features', () => {
    expect(filterMapFeatures(features, categories, '', 'park').map((item) => item.id)).toEqual([
      'park',
      'bench'
    ])
  })

  it('searches names, notes, tags, and category names', () => {
    expect(filterMapFeatures(features, categories, 'sunset').map((item) => item.id)).toEqual(['bench'])
    expect(filterMapFeatures(features, categories, 'warm').map((item) => item.id)).toEqual(['cafe'])
    expect(filterMapFeatures(features, categories, 'nature').map((item) => item.id)).toEqual([
      'park',
      'bench',
      'cafe'
    ])
  })
})
