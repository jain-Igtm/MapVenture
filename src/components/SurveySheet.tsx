import {
  CirclePause,
  CirclePlay,
  LocateFixed,
  MapPinned,
  PencilLine,
  Route,
  Shapes,
  Square,
  Trash2,
  Undo2
} from 'lucide-react'
import type { DistanceUnit, GeoFix, SurveyState } from '../types'
import { formatDistance, positionDistanceMeters } from '../lib/geo'

interface SurveySheetProps {
  survey: SurveyState | null
  fix: GeoFix | null
  units: DistanceUnit
  onStart: (mode: SurveyState['mode'], fieldMapIntent?: boolean) => void
  onPause: () => void
  onResume: () => void
  onDropPin: () => void
  onUndo: () => void
  onFinish: () => void
  onCancel: () => void
  canFinish: boolean
}

function pathLength(survey: SurveyState): number {
  return survey.coordinates.slice(1).reduce((total, position, index) => {
    return total + positionDistanceMeters(survey.coordinates[index], position)
  }, 0)
}

export function SurveySheet({
  survey,
  fix,
  units,
  onStart,
  onPause,
  onResume,
  onDropPin,
  onUndo,
  onFinish,
  onCancel,
  canFinish
}: SurveySheetProps) {
  if (survey) {
    const isDraw = survey.mode.startsWith('draw')
    const isArea = survey.mode.endsWith('area')
    const elapsed = Math.max(0, Date.now() - survey.startedAt)
    const minutes = Math.floor(elapsed / 60_000)
    const seconds = Math.floor((elapsed % 60_000) / 1000)

    return (
      <div className="survey-active">
        <div className={`recording-orb ${survey.paused ? 'is-paused' : ''}`}>
          <span />
          {isArea ? <Shapes size={27} /> : <Route size={27} />}
        </div>
        <div className="survey-heading">
          <span>{isDraw ? 'Tap the map to add points' : survey.paused ? 'Recording paused' : 'Recording your walk'}</span>
          <strong>{isArea ? 'Boundary survey' : 'Trail survey'}</strong>
        </div>

        <div className="survey-stats">
          <div>
            <span>{survey.coordinates.length}</span>
            <small>Points</small>
          </div>
          <div>
            <span>{formatDistance(pathLength(survey), units)}</span>
            <small>{isArea ? 'Perimeter' : 'Distance'}</small>
          </div>
          <div>
            <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
            <small>Elapsed</small>
          </div>
          {!isDraw && (
            <div>
              <span>{fix ? `±${Math.round(fix.accuracy)}m` : '—'}</span>
              <small>Accuracy</small>
            </div>
          )}
        </div>

        {!isDraw && (
          <button className="drop-pin-button" onClick={onDropPin} disabled={!fix}>
            <MapPinned size={20} />
            Mark something here without ending the survey
          </button>
        )}

        <div className="survey-controls">
          <button className="survey-cancel" onClick={onCancel}>
            <Trash2 size={19} />
            Cancel
          </button>
          {isDraw ? (
            <button className="survey-pause" onClick={onUndo} disabled={survey.coordinates.length === 0}>
              <Undo2 size={22} />
              Undo
            </button>
          ) : survey.paused ? (
            <button className="survey-pause" onClick={onResume}>
              <CirclePlay size={25} />
              Resume
            </button>
          ) : (
            <button className="survey-pause" onClick={onPause}>
              <CirclePause size={25} />
              Pause
            </button>
          )}
          <button className="survey-finish" onClick={onFinish} disabled={!canFinish}>
            <Square size={18} fill="currentColor" />
            Finish
          </button>
        </div>

        <p className="survey-footnote">
          {isDraw
            ? `Add at least ${isArea ? 'three' : 'two'} points. You can adjust every point before saving.`
            : 'Keep MapVenture visible while recording for the most reliable GPS trail.'}
        </p>
      </div>
    )
  }

  return (
    <div className="survey-start">
      <div className="survey-intro">
        <span className="intro-icon"><LocateFixed size={24} /></span>
        <div>
          <strong>Build the map from where you stand.</strong>
          <p>Walk a path, trace a boundary, or draw directly over the map.</p>
        </div>
      </div>

      <div className="survey-grid">
        <button onClick={() => onStart('record-trail')}>
          <span className="survey-option-icon survey-option-icon--trail"><Route size={22} /></span>
          <strong>Walk a trail</strong>
          <small>Record a live GPS path</small>
        </button>
        <button onClick={() => onStart('record-area')}>
          <span className="survey-option-icon survey-option-icon--area"><Shapes size={22} /></span>
          <strong>Walk a boundary</strong>
          <small>Trace a park or place</small>
        </button>
        <button onClick={() => onStart('draw-trail')}>
          <span className="survey-option-icon survey-option-icon--draw"><PencilLine size={22} /></span>
          <strong>Draw a trail</strong>
          <small>Tap points on the map</small>
        </button>
        <button onClick={() => onStart('draw-area')}>
          <span className="survey-option-icon survey-option-icon--draw"><MapPinned size={22} /></span>
          <strong>Draw an area</strong>
          <small>Outline it manually</small>
        </button>
      </div>

      <button
        type="button"
        className="field-map-cta"
        onClick={() => onStart('draw-area', true)}
      >
        <MapPinned size={22} />
        <span>
          <strong>Create a new field map</strong>
          <small>Start a detailed map for a park, property, or neighborhood.</small>
        </span>
      </button>
    </div>
  )
}
