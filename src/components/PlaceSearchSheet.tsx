import {
  Bookmark,
  ChevronRight,
  LoaderCircle,
  MapPin,
  SearchX
} from 'lucide-react'
import type { MapFeature, SearchPlace } from '../types'

interface PlaceSearchSheetProps {
  query: string
  savedResults: MapFeature[]
  placeResults: SearchPlace[]
  loading: boolean
  error?: string
  onRetry: () => void
  onSelectSaved: (feature: MapFeature) => void
  onSelectPlace: (place: SearchPlace) => void
}

export function PlaceSearchSheet({
  query,
  savedResults,
  placeResults,
  loading,
  error,
  onRetry,
  onSelectSaved,
  onSelectPlace
}: PlaceSearchSheetProps) {
  const empty = !loading && !error && savedResults.length === 0 && placeResults.length === 0

  return (
    <div className="place-search-sheet">
      {savedResults.length > 0 && (
        <section className="sheet-section">
          <div className="section-label-row">
            <span>Saved in MapVenture</span>
            <small>{savedResults.length}</small>
          </div>
          <div className="place-result-list">
            {savedResults.map((feature) => (
              <button key={feature.id} onClick={() => onSelectSaved(feature)}>
                <span className="place-result-icon place-result-icon--saved"><Bookmark size={18} /></span>
                <span>
                  <strong>{feature.name}</strong>
                  <small>{feature.description || `Saved ${feature.kind}`}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="sheet-section">
        <div className="section-label-row">
          <span>Places and addresses</span>
          <small>{loading ? 'Searching…' : placeResults.length}</small>
        </div>

        {loading && (
          <div className="search-state">
            <LoaderCircle className="spin" size={28} />
            <strong>Searching the real world</strong>
            <span>Looking for “{query}”</span>
          </div>
        )}

        {!loading && error && (
          <div className="search-state search-state--error">
            <SearchX size={28} />
            <strong>Search could not connect</strong>
            <span>{error}</span>
            <button className="secondary-button" onClick={onRetry}>Try again</button>
          </div>
        )}

        {!loading && !error && placeResults.length > 0 && (
          <div className="place-result-list">
            {placeResults.map((place) => (
              <button key={place.id} onClick={() => onSelectPlace(place)}>
                <span className="place-result-icon"><MapPin size={18} /></span>
                <span>
                  <strong>{place.name}</strong>
                  <small>{place.address || place.kind || 'OpenStreetMap place'}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        )}

        {empty && (
          <div className="search-state">
            <SearchX size={28} />
            <strong>No matches found</strong>
            <span>Try a street address, business, landmark, town, or postcode.</span>
          </div>
        )}
      </section>

      <p className="provider-note">Place data © OpenStreetMap contributors · Search by Photon</p>
    </div>
  )
}
