import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import type { SOS as SOSType } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { VoiceSOS } from '../components/VoiceSOS';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { ErrorBox, Empty } from '../components/Loading';
import { useGeolocation } from '../hooks/useGeolocation';

const publicHazards = [
  ['flood', '≋', 'Flood'],
  ['landslide', '▲', 'Landslide'],
  ['cyclone', '◉', 'Cyclone'],
  ['fire', '♨', 'Fire'],
  ['earthquake', '◈', 'Earthquake'],
  ['heavy_rainfall', '☂', 'Heavy Rain'],
  ['medical_emergency', '✚', 'Medical Emergency'],
  ['other', '•••', 'Other'],
] as const;

const specialNeedsOptions = [
  'Elderly',
  'Infant / Child',
  'Disabled / Mobility Impaired',
  'Medical Patient / Injured',
] as const;


export default function SOS() {
  const { user } = useAuth();
  const routeState = useLocation().state as any;
  const isPublicUser = user?.role === 'citizen' || user?.role === 'family_member';
  const canResolve = !isPublicUser;
  const geo = useGeolocation();
  const [rows, setRows] = useState<SOSType[]>([]);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [f, setF] = useState<any>({
    latitude: '',
    longitude: '',
    hazard_type: routeState?.hazard_type || '',
    message: routeState?.transcript || '',
    transcript: routeState?.transcript || '',
    people_count: 1,
    special_needs: [],
  });

  const load = () => api.get<SOSType[]>('/sos').then(setRows);
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!isPublicUser) return;
    geo.getPosition()
      .then(c => setF((old: any) => ({ ...old, latitude: c.latitude, longitude: c.longitude })))
      .catch(() => undefined);
  }, [isPublicUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const locate = async () => {
    setError('');
    try {
      const c = await geo.getPosition();
      setF((old: any) => ({ ...old, latitude: c.latitude, longitude: c.longitude }));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      let lat = f.latitude;
      let lon = f.longitude;
      if ((lat === '' || lon === '') && isPublicUser) {
        const c = await geo.getPosition();
        lat = c.latitude;
        lon = c.longitude;
      }
      await api.post('/sos', {
        ...f,
        latitude: +lat,
        longitude: +lon,
        people_count: Math.max(1, +f.people_count || 1),
        hazard_type: f.hazard_type || null,
      });
      setF((old: any) => ({ ...old, message: '', transcript: '' }));
      setSent(true);
      window.setTimeout(() => setSent(false), 4000);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const status = async (id: string, s: string) => {
    await api.patch(`/sos/${id}/status`, { status: s });
    await load();
  };

  if (isPublicUser) {
    return (
      <div className="liquid-subpage emergency-sos-page">
        <div className="liquid-subpage-header">
          <div><p>EMERGENCY NETWORK</p><h1>Send SOS</h1><span>Your GPS, hazard and message are transmitted to the response dashboard.</span></div>
          <div className={`gps-state ${f.latitude ? 'ready' : ''}`}><i />{f.latitude ? 'GPS ready' : 'Requesting GPS'}</div>
        </div>

        {error && <ErrorBox message={error} />}
        {sent && <div className="sos-success-banner"><b>SOS transmitted.</b> Keep your phone available for authority updates.</div>}

        <form onSubmit={submit} className="liquid-panel public-sos-card">
          <div className="public-sos-hero">
            <div className="sos-emblem"><span>◉</span><b>SOS</b></div>
            <div><p>One-tap emergency request</p><h2>What is happening?</h2><span>Select the closest hazard. The system will calculate response priority.</span></div>
          </div>

          <div className="sos-hazard-grid">
            {publicHazards.map(([value, icon, label]) => (
              <button
                type="button"
                key={value}
                className={f.hazard_type === value ? 'selected' : ''}
                onClick={() => setF({ ...f, hazard_type: value })}
              ><b>{icon}</b><span>{label}</span></button>
            ))}
          </div>

          <div className="sos-public-fields">
            <FormField label="People needing help">
              <input type="number" min={1} max={1000} value={f.people_count} onChange={e => setF({ ...f, people_count: e.target.value })} />
            </FormField>
            <FormField label="Special assistance needed (increases priority)">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                {specialNeedsOptions.map(opt => {
                  const selected = (f.special_needs || []).includes(opt);
                  return (
                    <button
                      type="button"
                      key={opt}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: selected ? 700 : 500,
                        border: selected ? '1px solid #e2262e' : '1px solid rgba(190, 218, 245, 0.75)',
                        background: selected ? 'rgba(255, 230, 232, 0.85)' : 'rgba(255, 255, 255, 0.7)',
                        color: selected ? '#b91824' : '#1e4060',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        const current = f.special_needs || [];
                        const next = selected ? current.filter((x: string) => x !== opt) : [...current, opt];
                        setF({ ...f, special_needs: next });
                      }}
                    >
                      {selected ? '✓ ' : '+ '}{opt}
                    </button>
                  );
                })}
              </div>
            </FormField>
            <FormField label="Short message (optional)">
              <textarea placeholder="Example: Water entering house, elderly person unable to move" value={f.message} onChange={e => setF({ ...f, message: e.target.value })} />
            </FormField>
          </div>

          <VoiceSOS label="🎙 Speak emergency details" defaultLanguage="en-IN" onTranscript={t => setF({ ...f, transcript: t, message: f.message || t })} />

          <div className="gps-confirm-row">
            <div><b>{f.latitude ? 'Location attached' : 'Location is required'}</b><small>{f.latitude ? `${Number(f.latitude).toFixed(5)}, ${Number(f.longitude).toFixed(5)}` : 'Browser permission is required; the website cannot turn GPS on by itself.'}</small></div>
            <button type="button" className="glass-action" onClick={locate}>{f.latitude ? 'Refresh GPS' : 'Enable GPS'}</button>
          </div>

          <button className="send-sos-only" disabled={!f.hazard_type}>SEND SOS</button>
          <small className="sos-boundary">Use this only for a real emergency. For non-urgent hazards, use Report Hazard.</small>
        </form>

        <section className="liquid-panel my-sos-status">
          <div className="panel-title-row compact-title"><div><p>Your requests</p><h2>Emergency Status</h2></div></div>
          {rows.length ? rows.slice(0, 5).map(r => (
            <div className="my-sos-row" key={r.id}>
              <span className="priority-number">{Math.round(r.priority_score)}</span>
              <div><b>{r.hazard_type?.replaceAll('_', ' ') || 'Emergency'}</b><small>{new Date(r.created_at).toLocaleString()}</small></div>
              <StatusBadge value={r.status} />
            </div>
          )) : <Empty title="No SOS requests" />}
        </section>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="SOS Emergency Center" subtitle="GPS-backed emergency requests with priority scoring and operational status transitions." />
      {error && <ErrorBox message={error} />}
      <div className="grid-2">
        <Card title="Create SOS (operator test)">
          <form onSubmit={submit} className="form-grid compact">
            <button type="button" className="btn secondary" onClick={locate}>Capture GPS</button>
            <FormField label="Latitude"><input required type="number" step="any" value={f.latitude} onChange={e => setF({ ...f, latitude: e.target.value })} /></FormField>
            <FormField label="Longitude"><input required type="number" step="any" value={f.longitude} onChange={e => setF({ ...f, longitude: e.target.value })} /></FormField>
            <FormField label="Hazard"><select value={f.hazard_type} onChange={e => setF({ ...f, hazard_type: e.target.value })}><option value="">Unknown</option>{publicHazards.map(([v,,l]) => <option key={v} value={v}>{l}</option>)}</select></FormField>
            <FormField label="Message"><textarea value={f.message} onChange={e => setF({ ...f, message: e.target.value })} /></FormField>
            <button className="btn danger">Send SOS</button>
          </form>
        </Card>
        <Card title="Requests">
          {rows.length ? <DataTable headers={['Caller', 'Hazard', 'Priority', 'Status', 'Created', 'Action']}>
            {rows.map(r => <tr key={r.id}><td>{r.caller_name || 'User'}</td><td>{r.hazard_type || 'unknown'}</td><td>{r.priority_score}</td><td><StatusBadge value={r.status} /></td><td>{new Date(r.created_at).toLocaleString()}</td><td>{canResolve && r.status !== 'resolved' ? <button className="btn tiny" onClick={() => status(r.id, 'resolved')}>Resolve</button> : <span className="muted">Track status</span>}</td></tr>)}
          </DataTable> : <Empty title="No SOS requests" />}
        </Card>
      </div>
    </>
  );
}
