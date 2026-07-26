import { ArrowLeft, Layers3, Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  activeMapName?: string
  onChange: (value: string) => void
  onOpenSaved: () => void
  onLeaveMap: () => void
}

export function SearchBar({
  value,
  activeMapName,
  onChange,
  onOpenSaved,
  onLeaveMap
}: SearchBarProps) {
  return (
    <div className="floating-search">
      {activeMapName ? (
        <button className="search-leading" onClick={onLeaveMap} aria-label="Leave field map">
          <ArrowLeft size={20} />
        </button>
      ) : (
        <Search className="search-icon" size={20} />
      )}
      <div className="search-copy">
        {activeMapName && <span className="search-context">{activeMapName}</span>}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={activeMapName ? 'Search this field map' : 'Search your map'}
          aria-label="Search saved places and maps"
        />
      </div>
      {value ? (
        <button className="search-trailing" onClick={() => onChange('')} aria-label="Clear search">
          <X size={19} />
        </button>
      ) : (
        <button className="search-trailing" onClick={onOpenSaved} aria-label="Browse map layers">
          <Layers3 size={19} />
        </button>
      )}
    </div>
  )
}
