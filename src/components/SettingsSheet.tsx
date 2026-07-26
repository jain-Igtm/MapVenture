import { useRef } from 'react'
import {
  ArchiveRestore,
  ChevronRight,
  Database,
  Download,
  FileJson,
  HardDriveDownload,
  Map,
  Palette,
  Smartphone,
  Tags,
  Trash2,
  Upload
} from 'lucide-react'
import type { AppSettings } from '../types'

interface SettingsSheetProps {
  settings: AppSettings
  featureCount: number
  photoCount: number
  installAvailable: boolean
  onChange: (settings: AppSettings) => void
  onOpenCategories: () => void
  onExportBackup: () => void
  onExportGeoJSON: () => void
  onImport: (file: File) => void
  onInstall: () => void
  onClearData: () => void
}

export function SettingsSheet({
  settings,
  featureCount,
  photoCount,
  installAvailable,
  onChange,
  onOpenCategories,
  onExportBackup,
  onExportGeoJSON,
  onImport,
  onInstall,
  onClearData
}: SettingsSheetProps) {
  const importInput = useRef<HTMLInputElement>(null)
  const patch = (value: Partial<AppSettings>) => onChange({ ...settings, ...value })

  return (
    <div className="settings-sheet">
      {installAvailable && (
        <button className="install-card" onClick={onInstall}>
          <span><Smartphone size={23} /></span>
          <div>
            <strong>Install MapVenture</strong>
            <small>Add it to your home screen as a full-screen app.</small>
          </div>
          <Download size={19} />
        </button>
      )}

      <section className="settings-group">
        <div className="settings-group-title">
          <Palette size={17} />
          Appearance
        </div>
        <div className="segmented-control">
          {(['system', 'light', 'dark'] as const).map((theme) => (
            <button
              key={theme}
              className={settings.theme === theme ? 'is-selected' : ''}
              onClick={() => patch({ theme })}
            >
              {theme[0].toUpperCase() + theme.slice(1)}
            </button>
          ))}
        </div>
        <label className="settings-select">
          <span><Map size={18} /> Map appearance</span>
          <select
            value={settings.mapStyle}
            onChange={(event) => patch({ mapStyle: event.target.value as AppSettings['mapStyle'] })}
          >
            <option value="liberty">Outdoors</option>
            <option value="bright">Bright</option>
            <option value="positron">Quiet</option>
          </select>
        </label>
        <label className="settings-select">
          <span><HardDriveDownload size={18} /> Distance units</span>
          <select
            value={settings.units}
            onChange={(event) => patch({ units: event.target.value as AppSettings['units'] })}
          >
            <option value="imperial">Miles and feet</option>
            <option value="metric">Kilometers and meters</option>
          </select>
        </label>
      </section>

      <section className="settings-group">
        <button className="settings-link" onClick={onOpenCategories}>
          <span><Tags size={19} /> Categories and layers</span>
          <ChevronRight size={19} />
        </button>
      </section>

      <section className="settings-group">
        <div className="settings-group-title">
          <Database size={17} />
          Your data
        </div>
        <div className="data-summary">
          <span><strong>{featureCount}</strong> mapped features</span>
          <span><strong>{photoCount}</strong> photographs</span>
        </div>
        <button className="settings-link" onClick={onExportBackup}>
          <span><ArchiveRestore size={19} /> Complete backup</span>
          <small>Includes photographs</small>
        </button>
        <button className="settings-link" onClick={onExportGeoJSON}>
          <span><FileJson size={19} /> Export GeoJSON</span>
          <small>Geometry and notes</small>
        </button>
        <button className="settings-link" onClick={() => importInput.current?.click()}>
          <span><Upload size={19} /> Import backup or GeoJSON</span>
          <ChevronRight size={19} />
        </button>
        <input
          ref={importInput}
          className="visually-hidden"
          type="file"
          accept=".json,.geojson,application/json,application/geo+json"
          aria-label="Import MapVenture backup or GeoJSON"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onImport(file)
            event.target.value = ''
          }}
        />
      </section>

      <section className="offline-card">
        <span><HardDriveDownload size={20} /></span>
        <div>
          <strong>Recently viewed maps work offline</strong>
          <p>The app and recently loaded map tiles are cached automatically. Saved places, trails, notes, and photos always remain available.</p>
        </div>
      </section>

      <section className="privacy-card">
        <span><Database size={20} /></span>
        <div>
          <strong>Private by default</strong>
          <p>Your map data stays in this device’s browser database. It is never committed to the public GitHub repository.</p>
        </div>
      </section>

      <button className="clear-data-button" onClick={onClearData}>
        <Trash2 size={18} />
        Erase all MapVenture data
      </button>
    </div>
  )
}
