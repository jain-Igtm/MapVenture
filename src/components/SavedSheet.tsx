import { Eye, EyeOff, Map, MapPin, Route, Shapes } from 'lucide-react'
import type { Category, MapFeature } from '../types'

interface SavedSheetProps {
  features: MapFeature[]
  categories: Category[]
  activeMapId?: string
  onSelect: (feature: MapFeature) => void
  onOpenFieldMap: (feature: MapFeature) => void
  onToggleCategory: (category: Category) => void
}

function featureIcon(feature: MapFeature) {
  if (feature.isFieldMap) return Map
  if (feature.kind === 'trail') return Route
  if (feature.kind === 'area') return Shapes
  return MapPin
}

export function SavedSheet({
  features,
  categories,
  activeMapId,
  onSelect,
  onOpenFieldMap,
  onToggleCategory
}: SavedSheetProps) {
  const fieldMaps = features.filter((feature) => feature.isFieldMap)
  const visibleFeatures = activeMapId
    ? features.filter((feature) => feature.mapId === activeMapId || feature.id === activeMapId)
    : features
  const ordinaryFeatures = visibleFeatures
    .filter((feature) => !feature.isFieldMap)
    .sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <div className="saved-sheet">
      {fieldMaps.length > 0 && !activeMapId && (
        <section className="sheet-section">
          <div className="section-label-row">
            <span>Field maps</span>
            <small>{fieldMaps.length}</small>
          </div>
          <div className="field-map-scroll">
            {fieldMaps.map((fieldMap) => {
              const childCount = features.filter((feature) => feature.mapId === fieldMap.id).length
              const cover = fieldMap.photos[0]
              return (
                <button
                  key={fieldMap.id}
                  className="field-map-card"
                  onClick={() => onOpenFieldMap(fieldMap)}
                  style={cover ? { backgroundImage: `url(${cover.dataUrl})` } : undefined}
                >
                  <span className="field-map-card__shade" />
                  <Map size={22} />
                  <span>
                    <strong>{fieldMap.name}</strong>
                    <small>{childCount} {childCount === 1 ? 'feature' : 'features'}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className="sheet-section">
        <div className="section-label-row">
          <span>Layers</span>
          <small>Tap to show or hide</small>
        </div>
        <div className="category-layer-scroll">
          {categories.map((category) => {
            const count = visibleFeatures.filter((feature) => feature.categoryId === category.id).length
            return (
              <button
                key={category.id}
                className={category.visible ? 'is-visible' : ''}
                onClick={() => onToggleCategory(category)}
                style={{ '--category-color': category.color } as React.CSSProperties}
              >
                {category.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                <span>{category.icon}</span>
                <strong>{category.name}</strong>
                <small>{count}</small>
              </button>
            )
          })}
        </div>
      </section>

      <section className="sheet-section">
        <div className="section-label-row">
          <span>{activeMapId ? 'Inside this map' : 'Recently saved'}</span>
          <small>{ordinaryFeatures.length}</small>
        </div>
        {ordinaryFeatures.length > 0 ? (
          <div className="saved-list">
            {ordinaryFeatures.map((feature) => {
              const category = categories.find((candidate) => candidate.id === feature.categoryId)
              const Icon = featureIcon(feature)
              return (
                <button key={feature.id} onClick={() => onSelect(feature)}>
                  <span className="saved-list__icon" style={{ backgroundColor: category?.color }}>
                    <Icon size={18} />
                  </span>
                  <span className="saved-list__copy">
                    <strong>{feature.name}</strong>
                    <small>
                      {category?.name ?? 'Uncategorized'}
                      {feature.tags.length > 0 ? ` · ${feature.tags.slice(0, 2).join(', ')}` : ''}
                    </small>
                  </span>
                  {feature.photos[0] && <img src={feature.photos[0].dataUrl} alt="" />}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="gentle-empty">
            <MapPin size={27} />
            <strong>Nothing saved here yet</strong>
            <span>Hold anywhere on the map or use Survey to begin.</span>
          </div>
        )}
      </section>
    </div>
  )
}
