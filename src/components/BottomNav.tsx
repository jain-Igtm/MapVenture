import { Map, MapPinned, MoonStar, Settings2, Waypoints } from 'lucide-react'
import type { SheetName } from '../types'

interface BottomNavProps {
  active: SheetName
  onSelect: (sheet: SheetName) => void
}

const items = [
  { id: 'none' as const, label: 'Map', icon: Map },
  { id: 'saved' as const, label: 'Saved', icon: MapPinned },
  { id: 'survey' as const, label: 'Survey', icon: Waypoints },
  { id: 'moon' as const, label: 'Moon', icon: MoonStar },
  { id: 'settings' as const, label: 'Settings', icon: Settings2 }
]

export function BottomNav({ active, onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={active === id ? 'is-active' : ''}
          onClick={() => onSelect(id)}
          aria-current={active === id ? 'page' : undefined}
        >
          <Icon size={21} strokeWidth={active === id ? 2.6 : 2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
