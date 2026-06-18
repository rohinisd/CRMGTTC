import { BellIcon, CrownIcon, MenuIcon, MoonIcon } from '../icons/Icons'

type TopBarProps = {
  onToggleSidebar: () => void
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  return (
    <header className="topbar">
      <button type="button" className="topbar__menu-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <MenuIcon />
      </button>

      <div className="topbar__actions">
        <button type="button" className="topbar__badge">
          <CrownIcon />
          <span>Startup</span>
        </button>
        <button type="button" className="topbar__icon-btn" aria-label="Toggle dark mode">
          <MoonIcon />
        </button>
        <button type="button" className="topbar__icon-btn" aria-label="Notifications">
          <BellIcon />
        </button>
        <div className="topbar__avatar">GH</div>
      </div>
    </header>
  )
}
