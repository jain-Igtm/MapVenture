import { ArrowLeft, Layers3, LoaderCircle, Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  activeMapName?: string
  searching: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  onOpenSaved: () => void
  onLeaveMap: () => void
}

export function SearchBar({
  value,
  activeMapName,
  searching,
  onChange,
  onSubmit,
  onOpenSaved,
  onLeaveMap
}: SearchBarProps) {
  return (
    <form
      className="floating-search"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      {activeMapName ? (
        <button type="button" className="search-leading" onClick={onLeaveMap} aria-label="Leave field map">
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
          placeholder={activeMapName ? 'Search this map or an address' : 'Search places or your map'}
          aria-label="Search saved places, real-world places, and addresses"
          enterKeyHint="search"
        />
      </div>
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          <X size={19} />
        </button>
      )}
      {value ? (
        <button type="submit" className="search-trailing search-trailing--submit" aria-label="Search places and addresses">
          {searching ? <LoaderCircle className="spin" size={19} /> : <Search size={19} />}
        </button>
      ) : (
        <button type="button" className="search-trailing" onClick={onOpenSaved} aria-label="Browse map layers">
          <Layers3 size={19} />
        </button>
      )}
    </form>
  )
}
