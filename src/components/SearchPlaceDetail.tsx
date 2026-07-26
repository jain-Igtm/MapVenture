import { BookmarkPlus, Car, Footprints, MapPin } from 'lucide-react'
import type { SearchPlace, TravelMode } from '../types'

interface SearchPlaceDetailProps {
  place: SearchPlace
  onSave: () => void
  onNavigate: (mode: TravelMode) => void
}

export function SearchPlaceDetail({
  place,
  onSave,
  onNavigate
}: SearchPlaceDetailProps) {
  return (
    <article className="search-place-detail">
      <div className="search-place-address">
        <span><MapPin size={21} /></span>
        <div>
          <strong>{place.address || place.name}</strong>
          <small>{place.kind ? place.kind.replaceAll('_', ' ') : 'Place or address'}</small>
        </div>
      </div>

      <div className="search-place-actions">
        <button className="action-tile action-tile--primary" onClick={onSave}>
          <BookmarkPlus size={22} />
          <span>Save place</span>
        </button>
        <button className="action-tile" onClick={() => onNavigate('driving')}>
          <Car size={22} />
          <span>Drive</span>
        </button>
        <button className="action-tile" onClick={() => onNavigate('walking')}>
          <Footprints size={22} />
          <span>Walk</span>
        </button>
      </div>

      <p className="provider-note">Place data © OpenStreetMap contributors · Search by Photon</p>
    </article>
  )
}
