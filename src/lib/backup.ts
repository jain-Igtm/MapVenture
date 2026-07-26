import type { FeatureCollection } from 'geojson'
import { db } from '../db'
import type { AppSettings, Category, MapFeature, MapVentureBackup } from '../types'
import { featureToGeoJSON } from './geo'
import { saveTextFile } from './platform'

export async function createBackup(): Promise<MapVentureBackup> {
  const [categories, features, settings] = await Promise.all([
    db.categories.toArray(),
    db.features.toArray(),
    db.settings.get('settings')
  ])

  if (!settings) throw new Error('Settings are unavailable')

  return {
    app: 'MapVenture',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    features,
    settings
  }
}

export async function downloadBackup() {
  const backup = await createBackup()
  const date = backup.exportedAt.slice(0, 10)
  await saveTextFile(
    `mapventure-backup-${date}.json`,
    JSON.stringify(backup, null, 2),
    'application/json',
    'MapVenture backup'
  )
}

export async function downloadGeoJSON() {
  const [features, categories] = await Promise.all([
    db.features.toArray(),
    db.categories.toArray()
  ])
  const colorByCategory = new Map(categories.map((category) => [category.id, category.color]))
  const collection: FeatureCollection = {
    type: 'FeatureCollection',
    features: features.map((feature) => {
      const geo = featureToGeoJSON(feature, colorByCategory.get(feature.categoryId))
      geo.properties = {
        ...geo.properties,
        photoCount: feature.photos.length
      }
      return geo
    })
  }
  await saveTextFile(
    `mapventure-${new Date().toISOString().slice(0, 10)}.geojson`,
    JSON.stringify(collection, null, 2),
    'application/geo+json',
    'MapVenture GeoJSON'
  )
}

function isBackup(value: unknown): value is MapVentureBackup {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<MapVentureBackup>
  return candidate.app === 'MapVenture'
    && candidate.version === 1
    && Array.isArray(candidate.categories)
    && Array.isArray(candidate.features)
    && Boolean(candidate.settings)
}

function importGeoJSON(value: unknown): MapFeature[] {
  if (!value || typeof value !== 'object') throw new Error('This file is not valid JSON')
  const candidate = value as FeatureCollection
  if (candidate.type !== 'FeatureCollection' || !Array.isArray(candidate.features)) {
    throw new Error('This is not a MapVenture backup or GeoJSON FeatureCollection')
  }

  const now = Date.now()
  return candidate.features
    .filter((feature) => feature.geometry)
    .map((feature, index) => {
      const properties = feature.properties ?? {}
      const kind = feature.geometry.type === 'Point'
        ? 'place'
        : feature.geometry.type === 'LineString'
          ? 'trail'
          : 'area'

      return {
        id: crypto.randomUUID(),
        kind,
        name: String(properties.name ?? `Imported ${kind} ${index + 1}`),
        description: String(properties.description ?? ''),
        categoryId: String(properties.categoryId ?? 'uncategorized'),
        tags: Array.isArray(properties.tags) ? properties.tags.map(String) : [],
        geometry: feature.geometry,
        photos: [],
        source: 'import',
        createdAt: now,
        updatedAt: now
      }
    })
}

export async function importDataFile(file: File): Promise<{ features: number; categories: number }> {
  const value = JSON.parse(await file.text()) as unknown

  if (isBackup(value)) {
    await db.transaction('rw', db.categories, db.features, db.settings, async () => {
      await db.categories.bulkPut(value.categories as Category[])
      await db.features.bulkPut(value.features as MapFeature[])
      await db.settings.put(value.settings as AppSettings)
    })
    return { features: value.features.length, categories: value.categories.length }
  }

  const imported = importGeoJSON(value)
  await db.features.bulkPut(imported)
  return { features: imported.length, categories: 0 }
}
