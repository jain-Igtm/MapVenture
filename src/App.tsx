import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  LocateFixed,
  MapPinPlus,
  Navigation,
  PencilRuler,
  Plus,
  Radio,
  Undo2
} from 'lucide-react'
import type { Geometry, Position } from 'geojson'
import { db, ensureDatabaseDefaults } from './db'
import { DEFAULT_SETTINGS } from './data'
import { useGeolocation } from './hooks/useGeolocation'
import { importDataFile, downloadBackup, downloadGeoJSON } from './lib/backup'
import {
  canFinishSurvey,
  fixToPosition,
  pointGeometry,
  positionDistanceMeters,
  surveyGeometry
} from './lib/geo'
import { filterMapFeatures } from './lib/filter'
import type {
  AppSettings,
  Category,
  FeatureKind,
  MapFeature,
  SheetName,
  SurveyState
} from './types'
import { BottomNav } from './components/BottomNav'
import { BottomSheet } from './components/BottomSheet'
import { CategoryManager } from './components/CategoryManager'
import { FeatureDetail } from './components/FeatureDetail'
import { FeatureEditor } from './components/FeatureEditor'
import { MapCanvas } from './components/MapCanvas'
import { SavedSheet } from './components/SavedSheet'
import { SearchBar } from './components/SearchBar'
import { SettingsSheet } from './components/SettingsSheet'
import { SurveySheet } from './components/SurveySheet'
import { Toast, type ToastMessage } from './components/Toast'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function newFeature(
  kind: FeatureKind,
  geometry: Geometry,
  activeMapId?: string,
  source: MapFeature['source'] = 'manual',
  isFieldMap = false
): MapFeature {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    kind,
    name: '',
    description: '',
    categoryId: '',
    tags: [],
    geometry,
    photos: [],
    mapId: isFieldMap ? undefined : activeMapId,
    isFieldMap,
    source,
    createdAt: now,
    updatedAt: now
  }
}

function useTheme(settings: AppSettings) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = settings.theme === 'system'
        ? media.matches ? 'dark' : 'light'
        : settings.theme
      document.documentElement.dataset.theme = resolved
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', resolved === 'dark' ? '#0b1514' : '#edf1e9')
      if (Capacitor.isNativePlatform()) {
        void StatusBar.setStyle({
          style: resolved === 'dark' ? StatusBarStyle.Dark : StatusBarStyle.Light
        }).catch(() => undefined)
      }
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings.theme])
}

export default function App() {
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), [], [])
  const allFeatures = useLiveQuery(() => db.features.toArray(), [], [])
  const liveSettings = useLiveQuery(() => db.settings.get('settings'))
  const settings = liveSettings ?? DEFAULT_SETTINGS
  const geo = useGeolocation()

  const [sheet, setSheet] = useState<SheetName>('none')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [activeMapId, setActiveMapId] = useState<string>()
  const [editorDraft, setEditorDraft] = useState<MapFeature>()
  const [editorExisting, setEditorExisting] = useState(false)
  const [editorReturnSheet, setEditorReturnSheet] = useState<SheetName>('none')
  const [categoryReturnSheet, setCategoryReturnSheet] = useState<'settings' | 'editor'>('settings')
  const [editingGeometry, setEditingGeometry] = useState(false)
  const [survey, setSurvey] = useState<SurveyState | null>(null)
  const [fieldMapIntent, setFieldMapIntent] = useState(false)
  const [focusToken, setFocusToken] = useState(0)
  const [locationFocusToken, setLocationFocusToken] = useState(0)
  const [toast, setToast] = useState<ToastMessage>()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent>()
  const toastTimerRef = useRef<number | undefined>(undefined)
  const settingsTimerRef = useRef<number | undefined>(undefined)
  const lastSurveyFixRef = useRef(0)
  const lastSurveyAppendRef = useRef(0)

  useTheme(settings)

  useEffect(() => {
    void ensureDatabaseDefaults()
  }, [])

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', capture)
    return () => window.removeEventListener('beforeinstallprompt', capture)
  }, [])

  const showToast = useCallback((message: string, tone: ToastMessage['tone'] = 'info') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ id: crypto.randomUUID(), message, tone })
    toastTimerRef.current = window.setTimeout(() => setToast(undefined), 4200)
  }, [])

  const selectedFeature = allFeatures.find((feature) => feature.id === selectedId)
  const activeFieldMap = allFeatures.find((feature) => feature.id === activeMapId && feature.isFieldMap)
  const fieldMaps = allFeatures.filter((feature) => feature.isFieldMap)

  const visibleFeatures = useMemo(() => {
    return filterMapFeatures(allFeatures, categories, query, activeMapId)
  }, [allFeatures, categories, query, activeMapId])

  const createDraft = useCallback((
    kind: FeatureKind,
    geometry: Geometry,
    options?: { source?: MapFeature['source']; isFieldMap?: boolean; returnTo?: SheetName }
  ) => {
    const feature = newFeature(
      kind,
      geometry,
      activeMapId,
      options?.source,
      options?.isFieldMap
    )
    setEditorDraft(feature)
    setEditorExisting(false)
    setEditorReturnSheet(options?.returnTo ?? (survey ? 'survey' : 'none'))
    setEditingGeometry(false)
    setSelectedId(undefined)
    setSheet('editor')
    setFocusToken((token) => token + 1)
  }, [activeMapId, survey])

  const openEditor = useCallback((feature: MapFeature) => {
    setEditorDraft(structuredClone(feature))
    setEditorExisting(true)
    setEditorReturnSheet('detail')
    setEditingGeometry(false)
    setSheet('editor')
  }, [])

  const saveEditor = useCallback(async () => {
    if (!editorDraft?.name.trim()) return
    const saved = {
      ...editorDraft,
      name: editorDraft.name.trim(),
      updatedAt: Date.now()
    }
    await db.features.put(saved)
    setEditorDraft(undefined)
    setEditingGeometry(false)
    setSelectedId(saved.id)
    setFocusToken((token) => token + 1)
    if (editorReturnSheet === 'survey' && survey) {
      setSheet('survey')
      showToast('Pin saved. Your survey is still running.', 'success')
    } else {
      setSheet('detail')
      showToast(editorExisting ? 'Changes saved.' : 'Added to your map.', 'success')
    }
  }, [editorDraft, editorExisting, editorReturnSheet, survey, showToast])

  const cancelEditor = useCallback(() => {
    setEditorDraft(undefined)
    setEditingGeometry(false)
    setSheet(editorReturnSheet === 'detail' && selectedFeature ? 'detail' : editorReturnSheet)
  }, [editorReturnSheet, selectedFeature])

  const deleteFeature = useCallback(async () => {
    if (!editorDraft) return
    if (!window.confirm(`Delete “${editorDraft.name || 'this feature'}”? This cannot be undone.`)) return
    await db.transaction('rw', db.features, async () => {
      if (editorDraft.isFieldMap) {
        const children = await db.features.where('mapId').equals(editorDraft.id).toArray()
        await db.features.bulkPut(children.map((child) => ({ ...child, mapId: undefined, updatedAt: Date.now() })))
      }
      await db.features.delete(editorDraft.id)
    })
    if (activeMapId === editorDraft.id) setActiveMapId(undefined)
    setEditorDraft(undefined)
    setSelectedId(undefined)
    setEditingGeometry(false)
    setSheet('none')
    showToast('Removed from your map.', 'success')
  }, [editorDraft, activeMapId, showToast])

  const selectFeature = useCallback((id: string) => {
    const feature = allFeatures.find((candidate) => candidate.id === id)
    if (!feature) return
    setSelectedId(id)
    setEditorDraft(undefined)
    setEditingGeometry(false)
    setSheet('detail')
    setFocusToken((token) => token + 1)
    navigator.vibrate?.(8)
  }, [allFeatures])

  const openFieldMap = useCallback((feature: MapFeature) => {
    setActiveMapId(feature.id)
    setSelectedId(feature.id)
    setQuery('')
    setSheet('none')
    setFocusToken((token) => token + 1)
  }, [])

  const leaveFieldMap = useCallback(() => {
    setActiveMapId(undefined)
    setSelectedId(undefined)
    setQuery('')
    setSheet('none')
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let disposed = false
    let removeListener: (() => Promise<void>) | undefined

    void NativeApp.addListener('backButton', () => {
      if (editingGeometry) {
        setEditingGeometry(false)
        setSheet('editor')
      } else if (sheet === 'categories') {
        setSheet(categoryReturnSheet)
      } else if (sheet === 'editor') {
        cancelEditor()
      } else if (sheet !== 'none') {
        setSheet('none')
      } else if (activeMapId) {
        leaveFieldMap()
      } else {
        void NativeApp.minimizeApp()
      }
    }).then((handle) => {
      if (disposed) {
        void handle.remove()
      } else {
        removeListener = () => handle.remove()
      }
    })

    return () => {
      disposed = true
      void removeListener?.()
    }
  }, [activeMapId, cancelEditor, categoryReturnSheet, editingGeometry, leaveFieldMap, sheet])

  const locate = useCallback(async (addPlace = false) => {
    try {
      const fix = await geo.locate()
      setLocationFocusToken((token) => token + 1)
      if (addPlace) {
        createDraft('place', pointGeometry(fixToPosition(fix)), {
          source: 'gps',
          returnTo: survey ? 'survey' : 'none'
        })
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Location is unavailable.', 'warning')
    }
  }, [geo, createDraft, survey, showToast])

  const startSurvey = useCallback(async (
    mode: SurveyState['mode'],
    wantsFieldMap = false
  ) => {
    setFieldMapIntent(wantsFieldMap)
    if (mode.startsWith('draw')) {
      setSurvey({ mode, coordinates: [], startedAt: Date.now(), paused: false })
      setSheet('survey')
      return
    }

    try {
      const fix = await geo.locate()
      lastSurveyFixRef.current = fix.timestamp
      lastSurveyAppendRef.current = Date.now()
      setSurvey({
        mode,
        coordinates: [fixToPosition(fix)],
        startedAt: Date.now(),
        paused: false
      })
      geo.start()
      setLocationFocusToken((token) => token + 1)
      setSheet('survey')
      showToast('GPS recording started.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'GPS recording could not start.', 'warning')
    }
  }, [geo, showToast])

  useEffect(() => {
    if (
      !survey
      || survey.paused
      || survey.mode.startsWith('draw')
      || !geo.fix
      || geo.fix.timestamp <= lastSurveyFixRef.current
    ) return

    lastSurveyFixRef.current = geo.fix.timestamp
    if (geo.fix.accuracy > 100) return

    setSurvey((current) => {
      if (!current || current.paused || current.mode.startsWith('draw')) return current
      const position = fixToPosition(geo.fix!)
      const previous = current.coordinates.at(-1)
      const moved = previous ? positionDistanceMeters(previous, position) : Infinity
      const elapsed = Date.now() - lastSurveyAppendRef.current
      if (moved < 2.5 && elapsed < 4_000) return current
      lastSurveyAppendRef.current = Date.now()
      return { ...current, coordinates: [...current.coordinates, position] }
    })
  }, [geo.fix, survey?.mode, survey?.paused])

  useEffect(() => {
    if (!survey || survey.mode.startsWith('draw') || survey.paused) return
    let lock: { release: () => Promise<void> } | undefined
    const wakeLock = (navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> }
    }).wakeLock
    void wakeLock?.request('screen').then((value) => { lock = value }).catch(() => undefined)
    return () => { void lock?.release() }
  }, [survey?.mode, survey?.paused])

  const pauseSurvey = useCallback(() => {
    setSurvey((current) => current ? { ...current, paused: true } : current)
    geo.stop()
  }, [geo])

  const resumeSurvey = useCallback(() => {
    setSurvey((current) => current ? { ...current, paused: false } : current)
    geo.start()
  }, [geo])

  const cancelSurvey = useCallback(() => {
    if (!window.confirm('Discard this unfinished survey?')) return
    geo.stop()
    setSurvey(null)
    setFieldMapIntent(false)
    setSheet('none')
    showToast('Survey discarded.')
  }, [geo, showToast])

  const finishSurvey = useCallback(() => {
    if (!survey || !canFinishSurvey(survey.mode, survey.coordinates)) return
    const geometry = surveyGeometry(survey.mode, survey.coordinates)
    const kind: FeatureKind = survey.mode.endsWith('area') ? 'area' : 'trail'
    const source = survey.mode.startsWith('record') ? 'gps' : 'manual'
    geo.stop()
    setSurvey(null)
    const isFieldMap = fieldMapIntent && kind === 'area'
    setFieldMapIntent(false)
    createDraft(kind, geometry, { source, isFieldMap, returnTo: 'none' })
  }, [survey, fieldMapIntent, geo, createDraft])

  const onDrawVertex = useCallback((position: Position) => {
    setSurvey((current) => {
      if (!current || !current.mode.startsWith('draw')) return current
      navigator.vibrate?.(7)
      return { ...current, coordinates: [...current.coordinates, position] }
    })
  }, [])

  const updateSettings = useCallback((next: AppSettings) => {
    void db.settings.put(next)
  }, [])

  const saveMapPosition = useCallback((center: Position, zoom: number) => {
    if (settingsTimerRef.current) window.clearTimeout(settingsTimerRef.current)
    settingsTimerRef.current = window.setTimeout(() => {
      void db.settings.put({ ...settings, lastCenter: center, lastZoom: zoom })
    }, 500)
  }, [settings])

  const updateCategory = useCallback((category: Category) => {
    void db.categories.put(category)
  }, [])

  const deleteCategory = useCallback(async (category: Category) => {
    if (!window.confirm(`Delete “${category.name}”? Its saved features will keep their data and show as having no category.`)) return
    await db.transaction('rw', db.categories, db.features, async () => {
      const affected = await db.features.where('categoryId').equals(category.id).toArray()
      await db.features.bulkPut(
        affected.map((feature) => ({ ...feature, categoryId: '', updatedAt: Date.now() }))
      )
      await db.categories.delete(category.id)
    })
    showToast('Category removed.', 'success')
  }, [showToast])

  const clearData = useCallback(async () => {
    if (!window.confirm('Erase every saved place, trail, map, category, note, and photograph from this device? Export a backup first if you may want them later.')) return
    await db.transaction('rw', db.features, db.categories, db.settings, async () => {
      await Promise.all([db.features.clear(), db.categories.clear(), db.settings.clear()])
    })
    await ensureDatabaseDefaults()
    setSelectedId(undefined)
    setActiveMapId(undefined)
    setSheet('none')
    showToast('MapVenture has been reset.')
  }, [showToast])

  const install = useCallback(async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      showToast('MapVenture installed.', 'success')
      setInstallPrompt(undefined)
    }
  }, [installPrompt, showToast])

  if (!liveSettings) {
    return (
      <main className="app-loading">
        <span className="loading-mark"><Navigation size={27} /></span>
        <strong>MapVenture</strong>
      </main>
    )
  }

  const selectedCategory = selectedFeature
    ? categories.find((category) => category.id === selectedFeature.categoryId)
    : undefined
  const childCount = selectedFeature?.isFieldMap
    ? allFeatures.filter((feature) => feature.mapId === selectedFeature.id).length
    : 0

  return (
    <main className={`app-shell ${sheet !== 'none' ? 'has-sheet' : ''} ${survey ? 'has-survey' : ''}`}>
      <MapCanvas
        features={visibleFeatures}
        categories={categories}
        selectedFeature={selectedFeature}
        survey={survey}
        geoFix={geo.fix}
        settings={settings}
        editableGeometry={editorDraft?.geometry}
        editingGeometry={editingGeometry}
        focusToken={focusToken}
        locationFocusToken={locationFocusToken}
        onSelect={selectFeature}
        onLongPress={(position) => createDraft('place', pointGeometry(position))}
        onDrawVertex={onDrawVertex}
        onEditableGeometryChange={(geometry) => {
          setEditorDraft((draft) => draft ? { ...draft, geometry, updatedAt: Date.now() } : draft)
        }}
        onMapMoved={saveMapPosition}
      />

      <SearchBar
        value={query}
        activeMapName={activeFieldMap?.name}
        onChange={setQuery}
        onOpenSaved={() => setSheet('saved')}
        onLeaveMap={leaveFieldMap}
      />

      {query && (
        <button className="search-result-count" onClick={() => setSheet('saved')}>
          {visibleFeatures.length} {visibleFeatures.length === 1 ? 'result' : 'results'}
        </button>
      )}

      <div className="map-actions">
        <button onClick={() => void locate(false)} aria-label="Center on my location">
          <LocateFixed size={21} />
        </button>
        <button className="map-actions__add" onClick={() => void locate(true)} aria-label="Save my current location">
          <MapPinPlus size={22} />
        </button>
      </div>

      {allFeatures.length === 0 && sheet === 'none' && !survey && (
        <button className="first-pin-hint" onClick={() => void locate(true)}>
          <span><Plus size={18} /></span>
          <div>
            <strong>Start your map</strong>
            <small>Save where you are, or hold anywhere on the map.</small>
          </div>
        </button>
      )}

      {survey && sheet !== 'survey' && sheet !== 'editor' && (
        <button className="recording-chip" onClick={() => setSheet('survey')}>
          <span />
          <Radio size={17} />
          Survey recording
        </button>
      )}

      {editingGeometry && editorDraft && (
        <div className="geometry-dock">
          <span><PencilRuler size={19} /></span>
          <div>
            <strong>Adjust the geometry</strong>
            <small>Drag {editorDraft.kind === 'place' ? 'the pin' : 'any white handle'}.</small>
          </div>
          {editorDraft.geometry.type !== 'Point' && (
            <button
              onClick={() => {
                if (editorDraft.geometry.type === 'LineString') {
                  const coordinates = editorDraft.geometry.coordinates.slice(0, -1)
                  if (coordinates.length >= 2) {
                    setEditorDraft({ ...editorDraft, geometry: { ...editorDraft.geometry, coordinates } })
                  }
                } else if (editorDraft.geometry.type === 'Polygon') {
                  const ring = editorDraft.geometry.coordinates[0]?.slice(0, -2) ?? []
                  if (ring.length >= 3) {
                    setEditorDraft({
                      ...editorDraft,
                      geometry: { ...editorDraft.geometry, coordinates: [[...ring, ring[0]]] }
                    })
                  }
                }
              }}
              aria-label="Remove last point"
            >
              <Undo2 size={19} />
            </button>
          )}
          <button
            className="geometry-dock__done"
            onClick={() => {
              setEditingGeometry(false)
              setSheet('editor')
            }}
          >
            <Check size={18} />
            Done
          </button>
        </div>
      )}

      {sheet === 'saved' && (
        <BottomSheet
          title={activeFieldMap?.name ?? 'Your map'}
          eyebrow={activeFieldMap ? 'Field map' : 'Saved'}
          onClose={() => setSheet('none')}
          roomy
        >
          <SavedSheet
            features={allFeatures}
            categories={categories}
            activeMapId={activeMapId}
            onSelect={(feature) => selectFeature(feature.id)}
            onOpenFieldMap={openFieldMap}
            onToggleCategory={(category) => updateCategory({ ...category, visible: !category.visible })}
          />
        </BottomSheet>
      )}

      {sheet === 'survey' && (
        <BottomSheet
          title={survey ? 'Survey in progress' : 'Survey'}
          eyebrow={activeFieldMap?.name ?? 'Field tools'}
          onClose={() => setSheet('none')}
          roomy
        >
          <SurveySheet
            survey={survey}
            fix={geo.fix}
            units={settings.units}
            onStart={(mode, intent) => void startSurvey(mode, intent)}
            onPause={pauseSurvey}
            onResume={resumeSurvey}
            onDropPin={() => {
              if (geo.fix) {
                createDraft('place', pointGeometry(fixToPosition(geo.fix)), {
                  source: 'gps',
                  returnTo: 'survey'
                })
              }
            }}
            onUndo={() => setSurvey((current) =>
              current ? { ...current, coordinates: current.coordinates.slice(0, -1) } : current
            )}
            onFinish={finishSurvey}
            onCancel={cancelSurvey}
            canFinish={survey ? canFinishSurvey(survey.mode, survey.coordinates) : false}
          />
        </BottomSheet>
      )}

      {sheet === 'settings' && (
        <BottomSheet title="Settings" eyebrow="MapVenture" onClose={() => setSheet('none')} roomy>
          <SettingsSheet
            settings={settings}
            featureCount={allFeatures.length}
            photoCount={allFeatures.reduce((total, feature) => total + feature.photos.length, 0)}
            installAvailable={Boolean(installPrompt)}
            onChange={updateSettings}
            onOpenCategories={() => {
              setCategoryReturnSheet('settings')
              setSheet('categories')
            }}
            onExportBackup={() => void downloadBackup().then(() => showToast('Backup downloaded.', 'success'))}
            onExportGeoJSON={() => void downloadGeoJSON().then(() => showToast('GeoJSON downloaded.', 'success'))}
            onImport={(file) => {
              void importDataFile(file)
                .then((result) => showToast(`Imported ${result.features} mapped features.`, 'success'))
                .catch((error) => showToast(error instanceof Error ? error.message : 'Import failed.', 'warning'))
            }}
            onInstall={() => void install()}
            onClearData={() => void clearData()}
          />
        </BottomSheet>
      )}

      {sheet === 'categories' && (
        <BottomSheet
          title="Categories"
          eyebrow="Map layers"
          onClose={() => setSheet(categoryReturnSheet)}
          roomy
        >
          <CategoryManager
            categories={categories}
            onCreate={(category) => {
              void db.categories.put(category).then(() => {
                if (categoryReturnSheet === 'editor') {
                  setEditorDraft((draft) => draft
                    ? { ...draft, categoryId: category.id, updatedAt: Date.now() }
                    : draft)
                  setSheet('editor')
                }
                showToast('Category added.', 'success')
              })
            }}
            onUpdate={updateCategory}
            onDelete={(category) => void deleteCategory(category)}
          />
        </BottomSheet>
      )}

      {sheet === 'detail' && selectedFeature && (
        <BottomSheet
          title={selectedFeature.name}
          eyebrow={
            selectedFeature.isFieldMap
              ? 'Field map'
              : selectedFeature.kind === 'place'
                ? 'Saved place'
                : selectedFeature.kind
          }
          onClose={() => setSheet('none')}
          roomy
        >
          <FeatureDetail
            feature={selectedFeature}
            category={selectedCategory}
            units={settings.units}
            childCount={childCount}
            onEdit={() => openEditor(selectedFeature)}
            onVisit={() => {
              void db.features.update(selectedFeature.id, { visitedAt: Date.now(), updatedAt: Date.now() })
              showToast('Visit recorded.', 'success')
            }}
            onOpenFieldMap={() => openFieldMap(selectedFeature)}
          />
        </BottomSheet>
      )}

      {sheet === 'editor' && editorDraft && !editingGeometry && (
        <BottomSheet
          title={editorExisting ? `Edit ${editorDraft.name}` : 'Add to your map'}
          eyebrow={editorExisting ? 'Editing' : 'New feature'}
          onClose={cancelEditor}
          roomy
        >
          <FeatureEditor
            feature={editorDraft}
            categories={categories}
            fieldMaps={fieldMaps}
            units={settings.units}
            editingGeometry={editingGeometry}
            onChange={setEditorDraft}
            onCreateCategory={() => {
              setCategoryReturnSheet('editor')
              setSheet('categories')
            }}
            onToggleGeometryEditing={() => {
              setEditingGeometry(true)
              setSheet('none')
              setFocusToken((token) => token + 1)
            }}
            onSave={() => void saveEditor()}
            onCancel={cancelEditor}
            onDelete={editorExisting ? () => void deleteFeature() : undefined}
          />
        </BottomSheet>
      )}

      {sheet !== 'editor' && !editingGeometry && (
        <BottomNav
          active={sheet}
          onSelect={(next) => setSheet(sheet === next ? 'none' : next)}
        />
      )}

      {toast && <Toast toast={toast} onDismiss={() => setToast(undefined)} />}
      {geo.error && !toast && (
        <Toast
          toast={{ id: 'geo-error', tone: 'warning', message: geo.error }}
          onDismiss={() => undefined}
        />
      )}
    </main>
  )
}
