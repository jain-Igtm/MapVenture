import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeoFix } from '../types'

function toFix(position: GeolocationPosition): GeoFix {
  return {
    longitude: position.coords.longitude,
    latitude: position.coords.latitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude,
    speed: position.coords.speed,
    heading: position.coords.heading,
    timestamp: position.timestamp
  }
}

export function useGeolocation() {
  const [fix, setFix] = useState<GeoFix | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [watching, setWatching] = useState(false)
  const watchId = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (watchId.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId.current)
    }
    watchId.current = null
    setWatching(false)
  }, [])

  const locate = useCallback(() => new Promise<GeoFix>((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      const message = 'Location is not supported on this device.'
      setError(message)
      reject(new Error(message))
      return
    }

    setError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = toFix(position)
        setFix(next)
        resolve(next)
      },
      (geoError) => {
        const message = geoError.code === geoError.PERMISSION_DENIED
          ? 'Location permission is off. Enable it for MapVenture in your browser settings.'
          : 'MapVenture could not get a reliable location. Try moving into a clearer area.'
        setError(message)
        reject(new Error(message))
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 }
    )
  }), [])

  const start = useCallback(() => {
    if (!('geolocation' in navigator) || watchId.current !== null) return
    setError(null)
    setWatching(true)
    watchId.current = navigator.geolocation.watchPosition(
      (position) => setFix(toFix(position)),
      (geoError) => {
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location permission is off. Enable it to record a survey.'
            : 'The GPS signal was interrupted. Recording will continue when it returns.'
        )
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 1_000 }
    )
  }, [])

  useEffect(() => stop, [stop])

  return { fix, error, watching, locate, start, stop }
}
