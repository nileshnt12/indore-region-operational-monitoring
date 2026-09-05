import { ChevronRight } from 'lucide-react'

interface Props {
  division: string
  subDivision: string
  onRegion: () => void
  onDivision: () => void
}

export function Breadcrumb({ division, subDivision, onRegion, onDivision }: Props) {
  return (
    <nav className="breadcrumb" aria-label="Dashboard hierarchy">
      <button type="button" onClick={onRegion}>Indore Region</button>
      {division !== 'all' && (
        <>
          <ChevronRight size={16} />
          <button type="button" onClick={onDivision}>{division}</button>
        </>
      )}
      {subDivision !== 'all' && (
        <>
          <ChevronRight size={16} />
          <span>{subDivision}</span>
        </>
      )}
    </nav>
  )
}
