import { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  Geolocation,
  type Position as NativePosition
} from '@capacitor/geolocation'
import type { GeoFix } from '../types'

type PositionLike = GeolocationPosition | NativePosition

const native = Capacitor.isNativePlatform()

function toFix(position: PositionLike): GeoFix {
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
  const watchId = useRef<number | string | null>(null)
  const watchGeneration = useRef(0)
  const starting = useRef(false)

  const stop = useCallback(() => {
    watchGeneration.current += 1
    starting.current = false
    const id = watchId.current
    watchId.current = null

    if (typeof id === 'string') {
      void Geolocation.clearWatch({ id }).catch(() => undefined)
    } else if (typeof id === 'number' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(id)
    }
    setWatching(false)
  }, [])

  const locate = useCallback(async () => {
    setError(null)

    try {
      if (native) {
        let permissions = await Geolocation.checkPermissions()
        if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
          permissions = await Geolocation.requestPermissions({ permissions: ['location'] })
        }
        if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
          throw new Error('Location permission is off. Enable it for MapVenture in Android settings.')
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 5_000,
          enableLocationFallback: true
        })
        const next = toFix(position)
        setFix(next)
        return next
      }

      if (!('geolocation' in navigator)) {
        throw new Error('Location is not supported on this device.')
      }

      return await new Promise<GeoFix>((resolve, reject) => {
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
            reject(new Error(message))
          },
          { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 }
        )
      })
    } catch (caught) {
      const message = caught instanceof Error && caught.message
        ? caught.message
        : native
          ? 'MapVenture could not get a reliable location. Check Android location services and try again.'
          : 'MapVenture could not get a reliable location. Try moving into a clearer area.'
      setError(message)
      throw new Error(message)
    }
  }, [])

  const start = useCallback(() => {
    if (watchId.current !== null || starting.current) return

    setError(null)
    setWatching(true)
    starting.current = true
    const generation = watchGeneration.current + 1
    watchGeneration.current = generation

    if (native) {
      void Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 20_000,
          maximumAge: 1_000,
          minimumUpdateInterval: 1_000,
          interval: 2_000,
          enableLocationFallback: true
        },
        (position, geoError) => {
          if (generation !== watchGeneration.current) return
          if (position) {
            setFix(toFix(position))
            return
          }
          if (geoError) {
            setError(
              geoError.code === 'OS-PLUG-GLOC-0003'
                ? 'Location permission is off. Enable it to record a survey.'
                : 'The GPS signal was interrupted. Recording will continue when it returns.'
            )
          }
        }
      ).then((id) => {
        starting.current = false
        if (generation !== watchGeneration.current) {
          void Geolocation.clearWatch({ id }).catch(() => undefined)
          return
        }
        watchId.current = id
      }).catch((caught: unknown) => {
        starting.current = false
        if (generation !== watchGeneration.current) return
        const code = typeof caught === 'object' && caught && 'code' in caught
          ? String(caught.code)
          : ''
        const message = code === 'OS-PLUG-GLOC-0003'
          ? 'Location permission is off. Enable it to record a survey.'
          : 'The GPS signal was interrupted. Check Android location services and try again.'
        setError(message)
        setWatching(false)
      })
      return
    }

    if (!('geolocation' in navigator)) {
      starting.current = false
      setWatching(false)
      setError('Location is not supported on this device.')
      return
    }

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
    starting.current = false
  }, [])

  useEffect(() => stop, [stop])

  return { fix, error, watching, locate, start, stop }
}
