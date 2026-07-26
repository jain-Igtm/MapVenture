import {
  CalendarCheck,
  Car,
  Footprints,
  Map,
  Navigation,
  Pencil,
  Route,
  Shapes
} from 'lucide-react'
import type { Category, DistanceUnit, MapFeature } from '../types'
import {
  destinationForGeometry,
  formatArea,
  formatDistance,
  geometryAreaSquareMeters,
  geometryLengthMeters
} from '../lib/geo'
import { openExternalUrl } from '../lib/platform'

interface FeatureDetailProps {
  feature: MapFeature
  category?: Category
  units: DistanceUnit
  childCount: number
  onEdit: () => void
  onVisit: () => void
  onOpenFieldMap: () => void
}

async function openNavigation(feature: MapFeature, mode: 'driving' | 'walking') {
  const [longitude, latitude] = destinationForGeometry(feature.geometry)
  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  url.searchParams.set('destination', `${latitude},${longitude}`)
  url.searchParams.set('travelmode', mode)
  await openExternalUrl(url.toString())
}

export function FeatureDetail({
  feature,
  category,
  units,
  childCount,
  onEdit,
  onVisit,
  onOpenFieldMap
}: FeatureDetailProps) {
  const distance = geometryLengthMeters(feature.geometry)
  const area = geometryAreaSquareMeters(feature.geometry)
  const created = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(feature.createdAt)

  return (
    <article className="feature-detail">
      <div className="detail-pills">
        {category && (
          <span className="category-pill" style={{ '--category-color': category.color } as React.CSSProperties}>
            <span>{category.icon}</span>
            {category.name}
          </span>
        )}
        {feature.isFieldMap && (
          <span className="field-map-pill">
            <Map size={14} />
            Field map
          </span>
        )}
      </div>

      {feature.photos.length > 0 && (
        <div className="detail-gallery">
          {feature.photos.map((photo) => (
            <img key={photo.id} src={photo.dataUrl} alt={feature.name} />
          ))}
        </div>
      )}

      {feature.description && <p className="detail-description">{feature.description}</p>}

      {(distance > 0 || area > 0 || feature.isFieldMap) && (
        <div className="stat-row">
          {distance > 0 && (
            <div>
              <Route size={19} />
              <span>{formatDistance(distance, units)}</span>
              <small>Recorded length</small>
            </div>
          )}
          {area > 0 && (
            <div>
              <Shapes size={19} />
              <span>{formatArea(area, units)}</span>
              <small>Mapped area</small>
            </div>
          )}
          {feature.isFieldMap && (
            <div>
              <Map size={19} />
              <span>{childCount}</span>
              <small>{childCount === 1 ? 'Saved feature' : 'Saved features'}</small>
            </div>
          )}
        </div>
      )}

      {feature.tags.length > 0 && (
        <div className="tag-row">
          {feature.tags.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
      )}

      <div className="detail-actions">
        <button className="action-tile action-tile--primary" onClick={() => void openNavigation(feature, 'driving')}>
          <Car size={21} />
          <span>Drive</span>
        </button>
        <button className="action-tile" onClick={() => void openNavigation(feature, 'walking')}>
          <Footprints size={21} />
          <span>Walk</span>
        </button>
        {feature.isFieldMap && (
          <button className="action-tile" onClick={onOpenFieldMap}>
            <Map size={21} />
            <span>Open map</span>
          </button>
        )}
        <button className="action-tile" onClick={onEdit}>
          <Pencil size={21} />
          <span>Edit</span>
        </button>
      </div>

      <button className="visit-row" onClick={onVisit}>
        <CalendarCheck size={19} />
        <span>
          <strong>{feature.visitedAt ? 'Visited again today' : 'Mark as visited'}</strong>
          <small>
            {feature.visitedAt
              ? `Last visit ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(feature.visitedAt)}`
              : `Saved ${created}`}
          </small>
        </span>
        <Navigation size={17} />
      </button>
    </article>
  )
}
