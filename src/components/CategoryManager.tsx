import { useState } from 'react'
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../data'
import type { Category } from '../types'

interface CategoryManagerProps {
  categories: Category[]
  onCreate: (category: Category) => void
  onUpdate: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoryManager({
  categories,
  onCreate,
  onUpdate,
  onDelete
}: CategoryManagerProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(CATEGORY_COLORS[2])
  const [icon, setIcon] = useState(CATEGORY_ICONS[0])

  const submit = () => {
    if (!name.trim()) return
    onCreate({
      id: crypto.randomUUID(),
      name: name.trim(),
      color,
      icon,
      visible: true,
      order: categories.length,
      createdAt: Date.now()
    })
    setName('')
  }

  return (
    <div className="category-manager">
      <div className="category-list">
        {categories.map((category) => (
          <div key={category.id} className="category-editor-row">
            <button
              className="category-visibility"
              onClick={() => onUpdate({ ...category, visible: !category.visible })}
              aria-label={category.visible ? `Hide ${category.name}` : `Show ${category.name}`}
            >
              {category.visible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <span className="category-symbol" style={{ backgroundColor: category.color }}>{category.icon}</span>
            <input
              value={category.name}
              onChange={(event) => onUpdate({ ...category, name: event.target.value })}
              aria-label="Category name"
            />
            {category.id !== 'uncategorized' && (
              <button className="category-delete" onClick={() => onDelete(category)} aria-label={`Delete ${category.name}`}>
                <Trash2 size={17} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="category-create">
        <span className="eyebrow">New category</span>
        <input
          className="category-name-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Category name"
          maxLength={40}
        />
        <div className="picker-row">
          <div className="symbol-picker" aria-label="Choose category symbol">
            {CATEGORY_ICONS.map((candidate) => (
              <button
                key={candidate}
                className={candidate === icon ? 'is-selected' : ''}
                onClick={() => setIcon(candidate)}
              >
                {candidate}
              </button>
            ))}
          </div>
          <div className="color-picker" aria-label="Choose category color">
            {CATEGORY_COLORS.map((candidate) => (
              <button
                key={candidate}
                className={candidate === color ? 'is-selected' : ''}
                style={{ backgroundColor: candidate }}
                onClick={() => setColor(candidate)}
                aria-label={`Use ${candidate}`}
              />
            ))}
          </div>
        </div>
        <button className="primary-button primary-button--wide" onClick={submit} disabled={!name.trim()}>
          <Plus size={19} />
          Add category
        </button>
      </div>
    </div>
  )
}
