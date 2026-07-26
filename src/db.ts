import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_SETTINGS, LEGACY_CATEGORY_IDS } from './data'
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

    this.version(2).stores({
      categories: 'id, name, order, visible',
      features: 'id, kind, categoryId, mapId, isFieldMap, name, createdAt, updatedAt, *tags',
      settings: 'id'
    }).upgrade(async (transaction) => {
      await transaction.table('categories').bulkDelete(LEGACY_CATEGORY_IDS)
      await transaction
        .table('features')
        .where('categoryId')
        .anyOf(LEGACY_CATEGORY_IDS)
        .modify({ categoryId: '' })
    })

    this.on('populate', async () => {
      await this.settings.add(DEFAULT_SETTINGS)
    })
  }
}

export const db = new MapVentureDatabase()

export async function ensureDatabaseDefaults() {
  const settings = await db.settings.get('settings')
  if (!settings) {
    await db.settings.put(DEFAULT_SETTINGS)
  }
}
