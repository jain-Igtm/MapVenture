import type { Category, MapFeature } from '../types'

export function filterMapFeatures(
  features: MapFeature[],
  categories: Category[],
  query: string,
  activeMapId?: string
): MapFeature[] {
  const hiddenCategoryIds = new Set(
    categories.filter((category) => !category.visible).map((category) => category.id)
  )
  const normalizedQuery = query.trim().toLocaleLowerCase()

  return features.filter((feature) => {
    if (feature.categoryId && hiddenCategoryIds.has(feature.categoryId)) return false
    if (activeMapId && feature.id !== activeMapId && feature.mapId !== activeMapId) return false
    if (!normalizedQuery) return true
    const category = categories.find((candidate) => candidate.id === feature.categoryId)
    return [
      feature.name,
      feature.description,
      feature.tags.join(' '),
      category?.name ?? ''
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
  })
}
