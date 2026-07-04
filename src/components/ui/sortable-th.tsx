import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

interface Props {
  label: string
  colKey: string
  currentKey: string | null
  dir: 'asc' | 'desc'
  onSort: (key: string) => void
  className?: string
}

export function SortableTh({ label, colKey, currentKey, dir, onSort, className = '' }: Props) {
  const active = currentKey === colKey
  return (
    <th
      className={`text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none group ${className}`}
      onClick={() => onSort(colKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={`transition-opacity ${active ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-40'}`}>
          {!active ? (
            <ChevronsUpDown className="h-3 w-3" />
          ) : dir === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </span>
      </div>
    </th>
  )
}
