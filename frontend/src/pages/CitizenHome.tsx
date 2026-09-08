import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { VoiceSOS } from '../components/VoiceSOS';
import { WakePhraseSOS } from '../components/WakePhraseSOS';
import { MapView } from '../components/MapView';
import { LiveClock } from '../components/LiveClock';
import { familyService } from '../services/family';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import type { AlertItem, FamilyGroup, Habitation, SOS } from '../types';

interface OutlookPrediction {
  hazard_type: string;
  current_score: number;
  future_score: number;
  delta: number;
  trend: 'rising' | 'stable' | 'falling';
  risk_class: string;
  confidence: number;
}

interface RiskOutlook {
  habitation: null | {
    id: string;
    name: string;
    district: string;
    state: string;
    latitude: number;
    longitude: number;
    distance_km?: number | null;
  };
  horizon_years: number;
  predictions: OutlookPrediction[];
  highest_risk?: OutlookPrediction | null;
  methodology?: string;
  statement: string;
}

interface WeatherPayload {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    rain?: number;
    wind_speed_10m?: number;
  };
  current_units?: Record<string, string>;
}

const hazardIcons: Record<string, string> = {
  flood: '≋',
  landslide: '▲',
  cyclone: '◉',
  heavy_rainfall: '☂',
  fire: '♨',
  multi_hazard: '◆',
};

function scoreTone(score: number) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'moderate';
  return 'safe';
}

export default function CitizenHome() {
  const { user } = useAuth();
  const nav = useNavigate();
  const geo = useGeolocation();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [sos, setSos] = useState<SOS[]>([]);
  const [habitations, setHabitations] = useState<Habitation[]>([]);
  const [outlook, setOutlook] = useState<RiskOutlook | null>(null);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [locationRequested, setLocationRequested] = useState(false);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<AlertItem[]>('/alerts').catch(() => []),
      familyService.getFamilyGroup().catch(() => null),
      api.get<SOS[]>('/sos').catch(() => []),
      api.get<Habitation[]>('/habitations').catch(() => []),
      api.get<RiskOutlook>('/risk/outlook?horizon_years=5').catch(() => null),
    ]).then(([a, g, s, h, o]) => {
      setAlerts(a);
      setGroup(g);
      setSos(s);
      setHabitations(h);
      setOutlook(o);
    });
  }, []);

  const requestLocation = useCallback(async (force = false) => {
    if (locationRequested && !force) return;
    setLocationRequested(true);
    try {
      const c = await geo.getPosition();
      const query = `latitude=${encodeURIComponent(c.latitude)}&longitude=${encodeURIComponent(c.longitude)}`;
      const [w, o] = await Promise.all([
        api.get<WeatherPayload>(`/weather/current?${query}`).catch(() => null),
        api.get<RiskOutlook>(`/risk/outlook?${query}&horizon_years=5`).catch(() => null),
      ]);
      if (w) setWeather(w);
      if (o) setOutlook(o);
    } catch {
      // Permission explanation is shown from the geolocation hook; dashboard remains usable.
    }
  }, [geo, locationRequested]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void requestLocation(false); }, 350);
    return () => window.clearTimeout(timer);
  }, [requestLocation]);

  const activeSos = sos.filter(x => x.status !== 'resolved');
  const familyMembers = group?.members || [];
  const safeFamily = familyMembers.filter(x => x.safety_status === 'SAFE' || x.safety_status === 'AT_SHELTER').length;
  const predictions = outlook?.predictions?.slice(0, 3) || [];
  const highest = outlook?.highest_risk || predictions[0] || null;

  const nearestHabitations = useMemo(() => {
    if (!outlook?.habitation) return habitations.slice(0, 2);
    const exact = habitations.find(h => h.id === outlook.habitation?.id);
    return exact ? [exact] : habitations.slice(0, 2);
  }, [habitations, outlook]);

  const weatherLabel = (weather?.current?.rain || weather?.current?.precipitation || 0) > 0
    ? 'Rain detected in your area'
    : 'Local conditions monitored';

  return (
    <div className="liquid-citizen-dashboard">
      <section className="liquid-top-grid">
        <article className="liquid-panel brand-panel">
          <div className="liquid-logo"><span>⌁</span></div>
          <div>
            <p className="liquid-kicker">SIH26191 • Disaster Management</p>
            <h1>SafeSphere</h1>
            <p className="brand-slogan">Safer People. Stronger Tomorrow.</p>
            <div className="brand-meta">
              <span>Risk intelligence</span><i />
              <span>Rapid response</span><i />
              <span>Family safety</span>
            </div>
          </div>
          <div className="brand-panel-status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div className={`connection-pill ${online ? 'online' : 'offline'}`}>
              <span /> {online ? 'Online' : 'Offline cache'}
            </div>
            <LiveClock />
          </div>
        </article>

        <article className="liquid-panel weather-panel">
          <div className="weather-icon">☁</div>
          <div className="weather-copy">
            <p>Weather & Alerts</p>
            <h2>{weatherLabel}</h2>
            <small>{geo.coords ? `GPS accuracy ±${Math.round(geo.coords.accuracy || 0)} m` : 'Location permission improves local accuracy'}</small>
          </div>
          <div className="weather-temp">
            <b>{weather?.current?.temperature_2m != null ? `${Math.round(weather.current.temperature_2m)}°` : '—'}</b>
            <span>{user?.district || outlook?.habitation?.district || 'Your area'}</span>
          </div>
          <div className="weather-alert-strip">
            <span>⚠</span>
            <b>{alerts[0]?.title || 'No critical regional alert published'}</b>
            <Link to="/alerts">›</Link>
          </div>
        </article>
      </section>

      <section className="liquid-main-grid">
        <article className="liquid-panel sos-panel">
          <button className="giant-sos" onClick={() => nav('/sos')} aria-label="Send emergency SOS">
            <span className="sos-rings">◉</span>
            <b>SOS</b>
          </button>
          <div className="sos-copy">
            <p className="liquid-kicker">Emergency</p>
            <h2>Send SOS</h2>
            <p>GPS-backed emergency dispatch with hazard and priority scoring.</p>
            <button className="glass-action danger-action" onClick={() => nav('/sos')}>Send emergency alert <span>›</span></button>
          </div>
        </article>

        <article className="liquid-panel voice-panel">
          <div className="panel-title-row">
            <div className="round-icon">🎙</div>
            <div><p>Emergency Assistant</p><h2>Voice Command</h2></div>
          </div>
          <VoiceSOS
            label="Start Voice Command"
            defaultLanguage="en-IN"
            onEmergencyConfirmed={t => nav('/sos', { state: { transcript: t } })}
          />
          <div className="voice-phrases">
            <span>“Send SOS”</span><span>“Report a flood”</span><span>“I need help”</span>
          </div>
          <WakePhraseSOS onWake={t => nav('/sos', { state: { transcript: t, wake: true } })} />
        </article>

        <article className="liquid-panel risk-map-panel">
          <div className="panel-title-row compact-title">
            <div><p>Live location</p><h2>Risk Map</h2></div>
            <Link to="/risk-map">View full map ›</Link>
          </div>
          <MapView
            habitations={nearestHabitations}
            userLocation={geo.coords}
            center={geo.coords ? [geo.coords.latitude, geo.coords.longitude] : undefined}
            height={205}
            compact
          />
          <div className="map-location-pill">
            <span>➤</span>
            <div><b>{geo.coords ? 'Current GPS location' : 'Location permission needed'}</b>
              <small>{geo.coords ? `${geo.coords.latitude.toFixed(4)}, ${geo.coords.longitude.toFixed(4)}` : 'Tap to request GPS access'}</small></div>
            {!geo.coords && <button onClick={() => void requestLocation(true)}>Enable</button>}
          </div>
        </article>
      </section>

      <section className="liquid-secondary-grid">
        <article className="liquid-panel report-panel">
          <div className="panel-title-row"><div className="round-icon">⌾</div><div><p>Community intelligence</p><h2>Report Hazard</h2></div></div>
          <p className="panel-subtitle">Share a GPS-tagged local hazard with the authority team.</p>
          <div className="hazard-buttons">
            <Link to="/citizen-reports" state={{ hazard_type: 'flood' }}><b>≋</b><span>Flood</span></Link>
            <Link to="/citizen-reports" state={{ hazard_type: 'landslide' }}><b>▲</b><span>Landslide</span></Link>
            <Link to="/citizen-reports" state={{ hazard_type: 'fire' }}><b>♨</b><span>Fire</span></Link>
            <Link to="/citizen-reports"><b>•••</b><span>Other</span></Link>
          </div>
        </article>

        <article className="liquid-panel family-panel">
          <div className="panel-title-row compact-title">
            <div className="round-icon">♟</div>
            <div><p>Household</p><h2>Family Safety</h2></div>
            <Link to="/citizen/family">Open ›</Link>
          </div>
          <div className="family-summary-line">
            <b>{familyMembers.length || 0}</b><span>linked members</span><i />
            <b>{safeFamily}</b><span>safe</span>
          </div>
          <div className="liquid-family-list">
            {familyMembers.slice(0, 3).map((m, i) => (
              <div key={m.user_id}>
                <span className={`avatar a${i + 1}`}>{m.full_name.charAt(0)}</span>
                <div><b>{m.full_name}</b><small>{m.relationship || 'Family'} • {m.safety_status.replaceAll('_', ' ')}</small></div>
                <span className={`family-dot ${m.safety_status === 'SAFE' ? 'safe' : 'attention'}`} />
              </div>
            ))}
            {!familyMembers.length && <p className="empty-glass">Create your private family group to share safety status.</p>}
          </div>
        </article>

        <article className="liquid-panel prediction-panel">
          <div className="panel-title-row compact-title">
            <div className="round-icon">⌁</div>
            <div><p>Explainable planning model</p><h2>Future Prediction</h2></div>
            <Link to="/future-risk">Details ›</Link>
          </div>
          {highest ? (
            <>
              <div className="prediction-hero">
                <div>
                  <span>{hazardIcons[highest.hazard_type] || '◆'}</span>
                  <div><b>{highest.hazard_type.replaceAll('_', ' ')}</b><small>{outlook?.horizon_years}-year planning horizon</small></div>
                </div>
                <strong className={scoreTone(highest.future_score)}>{Math.round(highest.future_score)}</strong>
              </div>
              <div className="prediction-track"><i style={{ width: `${Math.min(100, highest.future_score)}%` }} /></div>
              <div className="prediction-stats">
                <span>Now <b>{highest.current_score.toFixed(1)}</b></span>
                <span>Future <b>{highest.future_score.toFixed(1)}</b></span>
                <span>Confidence <b>{Math.round(highest.confidence)}%</b></span>
              </div>
              <small className="model-boundary">Risk estimate for planning — not an exact disaster-date prediction.</small>
            </>
          ) : <p className="empty-glass">Add verified habitation evidence to generate a future-risk outlook.</p>}
        </article>
      </section>

      <section className="liquid-bottom-grid">
        <article className="liquid-panel current-risk-panel">
          <div className="panel-title-row compact-title"><div><p>Model outlook</p><h2>Current Risks</h2></div><span className="live-data-pill">● Live data</span></div>
          <div className="risk-orbs">
            {predictions.length ? predictions.map(p => (
              <div key={p.hazard_type}>
                <div className={`risk-orb ${scoreTone(p.current_score)}`} style={{ '--risk': `${Math.min(100, p.current_score)}%` } as CSSProperties}>
                  <b>{Math.round(p.current_score)}%</b>
                </div>
                <strong>{p.hazard_type.replaceAll('_', ' ')}</strong>
                <span className={scoreTone(p.current_score)}>{scoreTone(p.current_score)}</span>
              </div>
            )) : <p className="empty-glass">No risk model output yet.</p>}
          </div>
        </article>

        <article className="liquid-panel alerts-panel">
          <div className="panel-title-row compact-title"><div><p>Official network</p><h2>Recent Alerts</h2></div><Link to="/alerts">See all ›</Link></div>
          <div className="liquid-alert-list">
            {alerts.slice(0, 3).map(a => (
              <Link to="/alerts" key={a.id} className={`liquid-alert ${a.severity}`}>
                <span>{a.severity === 'critical' ? '!' : a.severity === 'high' ? '▲' : 'i'}</span>
                <div><b>{a.title}</b><small>{a.hazard_type?.replaceAll('_', ' ') || a.severity} • {new Date(a.created_at).toLocaleString()}</small></div>
                <em>›</em>
              </Link>
            ))}
            {!alerts.length && <p className="empty-glass">No published regional alerts.</p>}
          </div>
        </article>

        <article className="liquid-panel preparedness-panel">
          <div className="preparedness-copy">
            <span>PREPAREDNESS</span>
            <h2>Be Prepared.<br />Be Safer.<br />Act Earlier.</h2>
            <p>Use verified risk information, GPS and family status before an emergency becomes critical.</p>
          </div>
          <div className="preparedness-orb" />
        </article>
      </section>

      {(geo.error || !online) && (
        <div className="liquid-system-note">
          <b>{!online ? 'Offline mode active.' : 'Location not available.'}</b>
          <span>{!online ? 'Previously visited risk and alert data may be served from the local cache.' : geo.error}</span>
        </div>
      )}
    </div>
  );
}
