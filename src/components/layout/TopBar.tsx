import { MenuIcon } from '../icons/Icons'

type TopBarProps = {
  onToggleSidebar: () => void
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  return (
    <header className="topbar">
      <button type="button" className="topbar__menu-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <MenuIcon />
      </button>

      <div className="topbar__avatar">GH</div>
    </header>
  )
}
