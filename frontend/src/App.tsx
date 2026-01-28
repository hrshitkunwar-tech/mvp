import { useState } from 'react';
import { Activity, LayoutDashboard, Compass, Image, Book } from 'lucide-react';
import GuidanceDemo from './components/GuidanceDemo';
import AdminDashboard from './components/AdminDashboard';
import ScreenshotGallery from './components/ScreenshotGallery';
import KnowledgeBase from './components/KnowledgeBase';
import './App.css';

type View = 'guidance' | 'admin' | 'screenshots' | 'knowledge';

function App() {
  const [currentView, setCurrentView] = useState<View>('guidance');

  return (
    <div className="app">
      {/* Navigation Header */}
      <header className="app-header glass">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <Compass size={28} strokeWidth={2.5} />
            </div>
            <div className="logo-text">
              <h1 className="logo-title">Navigator</h1>
              <p className="logo-subtitle">Procedural Intelligence Platform</p>
            </div>
          </div>

          <nav className="nav-tabs">
            <button
              className={`nav-tab ${currentView === 'guidance' ? 'active' : ''}`}
              onClick={() => setCurrentView('guidance')}
            >
              <Compass size={18} />
              <span>Guidance</span>
            </button>
            <button
              className={`nav-tab ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin')}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>
            <button
              className={`nav-tab ${currentView === 'screenshots' ? 'active' : ''}`}
              onClick={() => setCurrentView('screenshots')}
            >
              <Image size={18} />
              <span>Screenshots</span>
            </button>
            <button
              className={`nav-tab ${currentView === 'knowledge' ? 'active' : ''}`}
              onClick={() => setCurrentView('knowledge')}
            >
              <Book size={18} />
              <span>Knowledge</span>
            </button>
          </nav>

          <div className="status-indicator">
            <Activity size={16} className="status-icon animate-pulse" />
            <span className="status-text">Live</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {currentView === 'guidance' && <GuidanceDemo />}
        {currentView === 'admin' && <AdminDashboard />}
        {currentView === 'screenshots' && <ScreenshotGallery />}
        {currentView === 'knowledge' && <KnowledgeBase />}
      </main>
    </div>
  );
}

export default App;
