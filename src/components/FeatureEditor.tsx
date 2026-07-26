import { useRef, useState } from 'react'
import {
  Camera,
  Check,
  Map as MapIcon,
  MapPin,
  PencilRuler,
  Route,
  Shapes,
  Trash2,
  X
} from 'lucide-react'
import type { Category, DistanceUnit, MapFeature, PhotoAsset } from '../types'
import {
  formatArea,
  formatDistance,
  geometryAreaSquareMeters,
  geometryLengthMeters
} from '../lib/geo'
import { preparePhoto } from '../lib/media'

interface FeatureEditorProps {
  feature: MapFeature
  categories: Category[]
  fieldMaps: MapFeature[]
  units: DistanceUnit
  editingGeometry: boolean
  onChange: (feature: MapFeature) => void
  onToggleGeometryEditing: () => void
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
}

const kindLabels = {
  place: { label: 'Saved place', icon: MapPin },
  trail: { label: 'Trail', icon: Route },
  area: { label: 'Mapped area', icon: Shapes }
}

export function FeatureEditor({
  feature,
  categories,
  fieldMaps,
  units,
  editingGeometry,
  onChange,
  onToggleGeometryEditing,
  onSave,
  onCancel,
  onDelete
}: FeatureEditorProps) {
  const [processingPhotos, setProcessingPhotos] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const KindIcon = kindLabels[feature.kind].icon
  const distance = geometryLengthMeters(feature.geometry)
  const area = geometryAreaSquareMeters(feature.geometry)

  const patch = (value: Partial<MapFeature>) => {
    onChange({ ...feature, ...value, updatedAt: Date.now() })
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setProcessingPhotos(true)
    try {
      const photos = await Promise.all(Array.from(files).map(preparePhoto))
      patch({ photos: [...feature.photos, ...photos] })
    } finally {
      setProcessingPhotos(false)
      if (photoInput.current) photoInput.current.value = ''
    }
  }

  const removePhoto = (photo: PhotoAsset) => {
    patch({ photos: feature.photos.filter((candidate) => candidate.id !== photo.id) })
  }

  return (
    <form
      className="feature-editor"
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <div className="editor-kind-row">
        <span className="kind-badge">
          <KindIcon size={16} />
          {kindLabels[feature.kind].label}
        </span>
        {(distance > 0 || area > 0) && (
          <span className="geometry-measure">
            {distance > 0 ? formatDistance(distance, units) : formatArea(area, units)}
          </span>
        )}
      </div>

      <label className="field field--hero">
        <span>Name</span>
        <input
          value={feature.name}
          onChange={(event) => patch({ name: event.target.value })}
          placeholder={
            feature.kind === 'place'
              ? 'What is this place?'
              : feature.kind === 'trail'
                ? 'Name this trail'
                : 'Name this area'
          }
          autoFocus
          required
          maxLength={100}
        />
      </label>

      <fieldset className="category-picker">
        <legend>Category</legend>
        <div className="category-scroll">
          <button
            type="button"
            className={feature.categoryId ? '' : 'is-selected'}
            style={{ '--category-color': '#87958f' } as React.CSSProperties}
            onClick={() => patch({ categoryId: '' })}
          >
            <span>•</span>
            No category
            {!feature.categoryId && <Check size={15} />}
          </button>
          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={feature.categoryId === category.id ? 'is-selected' : ''}
              style={{ '--category-color': category.color } as React.CSSProperties}
              onClick={() => patch({ categoryId: category.id })}
            >
              <span>{category.icon}</span>
              {category.name}
              {feature.categoryId === category.id && <Check size={15} />}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Notes</span>
        <textarea
          value={feature.description}
          onChange={(event) => patch({ description: event.target.value })}
          placeholder="Add notes"
          rows={3}
        />
      </label>

      <label className="field">
        <span>Tags</span>
        <input
          value={feature.tags.join(', ')}
          onChange={(event) =>
            patch({
              tags: event.target.value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
            })}
          placeholder="quiet, dog friendly, sunset"
        />
      </label>

      {fieldMaps.length > 0 && !feature.isFieldMap && (
        <label className="field">
          <span>Field map</span>
          <select
            value={feature.mapId ?? ''}
            onChange={(event) => patch({ mapId: event.target.value || undefined })}
          >
            <option value="">No field map</option>
            {fieldMaps
              .filter((map) => map.id !== feature.id)
              .map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
          </select>
        </label>
      )}

      {feature.kind === 'area' && (
        <label className="switch-row">
          <div>
            <strong>Make this a field map</strong>
            <span>Use this boundary to organize everything inside a park or property.</span>
          </div>
          <input
            type="checkbox"
            checked={Boolean(feature.isFieldMap)}
            onChange={(event) => patch({ isFieldMap: event.target.checked })}
          />
        </label>
      )}

      <div className="photo-section">
        <div className="section-label-row">
          <span>Photos</span>
          <button type="button" className="text-button" onClick={() => photoInput.current?.click()}>
            <Camera size={17} />
            {processingPhotos ? 'Preparing…' : 'Add'}
          </button>
        </div>
        <input
          ref={photoInput}
          className="visually-hidden"
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          aria-label="Add photographs"
          onChange={(event) => void addPhotos(event.target.files)}
        />
        {feature.photos.length > 0 ? (
          <div className="photo-strip">
            {feature.photos.map((photo) => (
              <figure key={photo.id}>
                <img src={photo.dataUrl} alt="" />
                <button type="button" onClick={() => removePhoto(photo)} aria-label="Remove photo">
                  <X size={15} />
                </button>
              </figure>
            ))}
          </div>
        ) : (
          <button type="button" className="photo-empty" onClick={() => photoInput.current?.click()}>
            <Camera size={21} />
            <span>Add photo</span>
          </button>
        )}
      </div>

      <button
        type="button"
        className={`geometry-edit-button ${editingGeometry ? 'is-active' : ''}`}
        onClick={onToggleGeometryEditing}
      >
        <PencilRuler size={19} />
        <span>
          <strong>{editingGeometry ? 'Finish adjusting' : 'Adjust on map'}</strong>
          <small>
            {feature.kind === 'place'
              ? 'Drag the pin to correct its position'
              : 'Drag individual points to correct the shape'}
          </small>
        </span>
      </button>

      <div className="form-actions">
        {onDelete && (
          <button type="button" className="danger-button" onClick={onDelete} aria-label="Delete">
            <Trash2 size={19} />
          </button>
        )}
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={!feature.name.trim()}>
          <Check size={19} />
          Save
        </button>
      </div>

      {feature.isFieldMap && (
        <div className="editor-note">
          <MapIcon size={17} />
          When you open this field map, MapVenture will show only the places, trails, and areas assigned to it.
        </div>
      )}
    </form>
  )
}
