import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SOSButton } from './SOSButton';
import { VoiceSOS } from './VoiceSOS';
import { LiveClock } from './LiveClock';
import { LanguageSelector } from './LanguageSelector';

const adminNav = [
  ['Admin Command', '/admin/dashboard'],
  ['User Management', '/admin/users'],
  ['Authority Operations', '/authority/dashboard'],
  ['Risk Map', '/risk-map'],
  ['Habitation Analysis', '/habitation-analysis'],
  ['Relocation Priority', '/relocation-priority'],
  ['Evacuation Routes', '/evacuation'],
  ['Citizen Reports', '/citizen-reports'],
  ['Satellite Analysis', '/satellite-analysis'],
  ['Reports', '/reports'],
  ['Alerts & SMS', '/alerts'],
  ['Settings', '/settings'],
] as const;

const authorityNav = [
  ['Authority Command', '/authority/dashboard'],
  ['Risk Map', '/risk-map'],
  ['Future Risk', '/future-risk'],
  ['Future Red Zones', '/future-red-zones'],
  ['Habitation Analysis', '/habitation-analysis'],
  ['Relocation Priority', '/relocation-priority'],
  ['Carrying Capacity', '/carrying-capacity'],
  ['Relocation Optimizer', '/relocation-optimizer'],
  ['Scenario Simulator', '/scenario-simulator'],
  ['Digital Twin', '/digital-twin'],
  ['Infrastructure', '/infrastructure'],
  ['Evacuation Routes', '/evacuation'],
  ['Relocation Cost', '/relocation-cost'],
  ['Cost of Inaction', '/cost-of-inaction'],
  ['Explainable AI', '/explainable-ai'],
  ['Citizen Reports', '/citizen-reports'],
  ['Satellite Analysis', '/satellite-analysis'],
  ['AI Assistant', '/ai-assistant'],
  ['Reports', '/reports'],
  ['SOS Center', '/sos'],
  ['Alerts & SMS', '/alerts'],
  ['Settings', '/settings'],
] as const;

const districtNav = [
  ['District Command', '/district/dashboard'],
  ['Risk Map', '/risk-map'],
  ['Habitations', '/habitation-analysis'],
  ['Evacuation Routes', '/evacuation'],
  ['Relocation Sites', '/relocation-priority'],
  ['Citizen Reports', '/citizen-reports'],
  ['SOS Emergencies', '/sos'],
  ['Alerts', '/alerts'],
  ['Settings', '/settings'],
] as const;

const fieldNav = [
  ['Field Operations', '/field/dashboard'],
  ['SOS Assignments', '/sos'],
  ['Citizen Reports', '/citizen-reports'],
  ['Risk Map', '/risk-map'],
  ['Evacuation Routes', '/evacuation'],
  ['Alerts', '/alerts'],
  ['Settings', '/settings'],
] as const;

const citizenNav = [
  ['Home', '/citizen/home'],
  ['Family Portal', '/citizen/family'],
  ['Risk Map', '/risk-map'],
  ['Report Hazard', '/citizen-reports'],
  ['Alerts', '/alerts'],
  ['Emergency SOS', '/sos'],
  ['Settings', '/settings'],
] as const;

const familyNav = [
  ['Home', '/family/home'],
  ['Alerts', '/alerts'],
  ['Shelters & Evacuation', '/evacuation'],
  ['Risk Map', '/risk-map'],
  ['Emergency SOS', '/sos'],
  ['Settings', '/settings'],
] as const;

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getNav = () => {
    switch (user?.role) {
      case 'administrator':
        return adminNav;
      case 'authority':
        return authorityNav;
      case 'district_officer':
        return districtNav;
      case 'field_officer':
        return fieldNav;
      case 'citizen':
        return citizenNav;
      case 'family_member':
        return familyNav;
      default:
        return authorityNav;
    }
  };

  const nav = getNav();
  const isCitizen = user?.role === 'citizen';
  const isFamily = user?.role === 'family_member';
  const showEmergencyVoice = isCitizen || isFamily;

  return (
    <div className={`app-shell ${isCitizen ? 'citizen-liquid-shell' : ''} ${isFamily ? 'family-liquid-shell' : ''}`}>
      {/* Desktop & Tablet Sidebar */}
      {!isCitizen && <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">DM</div>
          <div>
            <b>Disaster Management</b>
            <small>“Predict Today. Protect Tomorrow.”</small>
          </div>
        </div>

        <div className="user-card">
          <strong>{user?.full_name}</strong>
          <span className="user-role-badge">{(user?.role || '').replace('_', ' ')}</span>
          {user?.district && <small className="user-district-tag">📍 {user.district}</small>}
        </div>

        <nav className="sidebar-nav">
          {nav.map(([label, path]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <button className="btn ghost logout" onClick={logout} id="btn-sidebar-sign-out">
          Sign out
        </button>
      </aside>}

      {/* Main Content Area */}
      <main className="main-area">
        {!isCitizen && <header className="topbar">
          <div className="topbar-left">
            <strong>
              {location.pathname.split('/').filter(Boolean).join(' / ').replaceAll('-', ' ') || 'Dashboard'}
            </strong>
            <span className="trust-badge">OFFICIAL DISASTER NETWORK</span>
          </div>

          <div className="top-actions">
            <LiveClock />
            <LanguageSelector compact />
            {showEmergencyVoice && (
              <VoiceSOS
                className="top-voice"
                label="🎙 Voice SOS"
                onEmergencyConfirmed={t => navigate('/sos', { state: { transcript: t } })}
              />
            )}
            <span className="user-email-chip">{user?.email}</span>
          </div>
        </header>}

        <div className={`page ${isCitizen ? 'citizen-liquid-page' : ''}`}>
          <Outlet />
        </div>
      </main>

      {/* Floating Red SOS Button (Hold 3s) for Citizen & Family accounts */}
      {isFamily && <SOSButton />}

      {/* Mobile Bottom Navigation for Citizen */}
      {isCitizen && (
        <nav className="mobile-bottom-nav citizen-bottom-nav" aria-label="Mobile Navigation">
          <NavLink to="/citizen/home" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </NavLink>
          <NavLink to="/risk-map" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">🗺</span>
            <span className="nav-label">Risk Map</span>
          </NavLink>
          <NavLink to="/citizen-reports" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">⚠️</span>
            <span className="nav-label">Report</span>
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">📢</span>
            <span className="nav-label">Alerts</span>
          </NavLink>
          <NavLink to="/citizen/family" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">👨‍👩‍👧</span>
            <span className="nav-label">Family</span>
          </NavLink>
        </nav>
      )}

      {/* Mobile Bottom Navigation for Family Member */}
      {isFamily && (
        <nav className="mobile-bottom-nav family-bottom-nav" aria-label="Mobile Navigation">
          <NavLink to="/family/home" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </NavLink>
          <NavLink to="/family/home" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">👨‍👩‍👧</span>
            <span className="nav-label">Family</span>
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">📢</span>
            <span className="nav-label">Alerts</span>
          </NavLink>
          <NavLink to="/evacuation" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Shelter</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">More</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}
