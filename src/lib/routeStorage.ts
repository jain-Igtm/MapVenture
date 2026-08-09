import type { RoutePlan } from '../types'

const KEY = 'mapventure.active-route.v1'

export function loadStoredRoute(): RoutePlan | undefined {
  try {
    const value = localStorage.getItem(KEY)
    if (!value) return undefined
    const route = JSON.parse(value) as RoutePlan
    if (!Array.isArray(route.coordinates) || route.coordinates.length < 2 || !route.destination) {
      return undefined
    }
    return route
  } catch {
    return undefined
  }
}

export function saveStoredRoute(route: RoutePlan): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(route))
  } catch {
    // The live route remains usable even if private storage is temporarily unavailable.
  }
}

export function clearStoredRoute(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Clearing React state still ends navigation for this session.
  }
}
