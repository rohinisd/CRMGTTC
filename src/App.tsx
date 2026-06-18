import { useState } from 'react'
import { Dashboard } from './components/dashboard/Dashboard'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { SheetDataPage } from './components/pages/SheetDataPage'

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeItem, setActiveItem] = useState('dashboard')

  return (
    <div className={`app ${sidebarCollapsed ? 'app--sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        activeItem={activeItem}
        onNavigate={setActiveItem}
      />
      <div className="app__main">
        <TopBar onToggleSidebar={() => setSidebarCollapsed((c) => !c)} />
        <main className="app__content">
          {activeItem === 'dashboard' ? (
            <Dashboard />
          ) : (
            <SheetDataPage pageId={activeItem} />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
