import {
  CalendarIcon,
  ChartIcon,
  GridIcon,
  InvoiceIcon,
  LogoutIcon,
  PhoneIcon,
  PlugIcon,
  SettingsIcon,
  SyncIcon,
  TagIcon,
  TicketIcon,
  UsersIcon,
} from '../icons/Icons'
import gttcLogo from '../../assets/GTTCLogo.png'

type SidebarProps = {
  collapsed: boolean
  activeItem: string
  onNavigate: (item: string) => void
}

import type { ReactNode } from 'react'

type NavItem = { id: string; label: string; icon: ReactNode }

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Lead Management',
    items: [
      { id: 'leads', label: 'Leads', icon: <UsersIcon /> },
      { id: 'call-logs', label: 'Call Logs', icon: <PhoneIcon /> },
      { id: 'seven-follow-ups', label: '7 Follow-ups', icon: <PhoneIcon /> },
      { id: 'tags', label: 'Tags', icon: <TagIcon /> },
      { id: 'auto-assign', label: 'Auto-assign', icon: <SyncIcon /> },
      { id: 'calendar', label: 'Calendar', icon: <CalendarIcon /> },
    ],
  },
  {
    title: 'Marketing Analysis',
    items: [{ id: 'analytics', label: 'Analytics', icon: <ChartIcon /> }],
  },
  {
    title: 'Customer Support',
    items: [{ id: 'tickets', label: 'Tickets', icon: <TicketIcon /> }],
  },
  {
    title: 'Accounts Management',
    items: [{ id: 'invoices', label: 'Invoices', icon: <InvoiceIcon /> }],
  },
  {
    title: 'CRM Settings',
    items: [
      { id: 'custom-fields', label: 'Custom Fields', icon: <SettingsIcon /> },
      { id: 'integrations', label: 'Integrations', icon: <PlugIcon /> },
      { id: 'call-retention', label: 'Call Retention', icon: <PhoneIcon /> },
    ],
  },
]

export function Sidebar({ collapsed, activeItem, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <img src={gttcLogo} alt="GTTC Hubli" className="sidebar__logo-image" />
        {!collapsed && (
          <div className="sidebar__brand-text">
            <span className="sidebar__logo">GTTC</span>
            <span className="sidebar__logo-sub">Hubli</span>
          </div>
        )}
      </div>

      <nav className="sidebar__nav">
        <button
          type="button"
          className={`sidebar__item ${activeItem === 'dashboard' ? 'sidebar__item--active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <GridIcon />
          {!collapsed && <span>Dashboard</span>}
        </button>

        {navSections.map((section) => (
          <div key={section.title} className="sidebar__section">
            {!collapsed && <p className="sidebar__section-title">{section.title}</p>}
            {section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sidebar__item ${activeItem === item.id ? 'sidebar__item--active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">GH</div>
          {!collapsed && (
            <div className="sidebar__user-info">
              <strong>GTTC Hubli</strong>
              <span>Panel Admin</span>
            </div>
          )}
        </div>
        <button type="button" className="sidebar__logout" aria-label="Logout">
          <LogoutIcon />
        </button>
      </div>
    </aside>
  )
}
