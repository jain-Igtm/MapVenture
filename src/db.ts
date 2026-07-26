import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from './data'
import type { AppSettings, Category, MapFeature } from './types'

class MapVentureDatabase extends Dexie {
  categories!: EntityTable<Category, 'id'>
  features!: EntityTable<MapFeature, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('mapventure')
    this.version(1).stores({
      categories: 'id, name, order, visible',
      features: 'id, kind, categoryId, mapId, isFieldMap, name, createdAt, updatedAt, *tags',
      settings: 'id'
    })

    this.on('populate', async () => {
      await this.categories.bulkAdd(DEFAULT_CATEGORIES)
      await this.settings.add(DEFAULT_SETTINGS)
    })
  }
}

export const db = new MapVentureDatabase()

export async function ensureDatabaseDefaults() {
  const categoryCount = await db.categories.count()
  if (categoryCount === 0) {
    await db.categories.bulkPut(DEFAULT_CATEGORIES)
  }

  const settings = await db.settings.get('settings')
  if (!settings) {
    await db.settings.put(DEFAULT_SETTINGS)
  }
}
