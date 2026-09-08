import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import type { CitizenReport } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { StatusBadge } from '../components/StatusBadge';
import { ErrorBox, Empty } from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';

const hazards = ['flood', 'landslide', 'coastal_erosion', 'cyclone', 'heavy_rainfall', 'fire', 'waterlogging', 'bridge_damage', 'other'];

export default function CitizenReports() {
  const { user } = useAuth();
  const state = useLocation().state as any;
  const geo = useGeolocation();
  const [rows, setRows] = useState<CitizenReport[]>([]);
  const [error, setError] = useState('');
  const [f, setF] = useState<any>({
    hazard_type: state?.hazard_type || 'flood',
    description: '', latitude: '', longitude: '', citizen_severity: 'moderate', people_affected: '', road_blocked: false,
  });

  const load = () => api.get<CitizenReport[]>('/citizen-reports').then(setRows);
  useEffect(() => {
    load().catch(e => setError(e.message));
    if (user?.role === 'citizen') {
      geo.getPosition().then(c => setF((old: any) => ({ ...old, latitude: c.latitude, longitude: c.longitude }))).catch(() => undefined);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const locate = async () => {
    try {
      const c = await geo.getPosition();
      setF({ ...f, latitude: c.latitude, longitude: c.longitude });
    } catch (e: any) { setError(e.message); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      let latitude = f.latitude;
      let longitude = f.longitude;
      if ((latitude === '' || longitude === '') && user?.role === 'citizen') {
        const c = await geo.getPosition();
        latitude = c.latitude; longitude = c.longitude;
      }
      await api.post('/citizen-reports', { ...f, latitude: +latitude, longitude: +longitude, people_affected: f.people_affected === '' ? null : +f.people_affected });
      setF({ ...f, description: '', people_affected: '' });
      await load();
    } catch (e: any) { setError(e.message); }
  };
  const verify = async (id: string, status: string) => { await api.patch(`/citizen-reports/${id}/verify`, { status, verification_notes: '' }); await load(); };

  return <>
    <PageHeader title="Citizen Hazard Reporting" subtitle="GPS-tagged community observations remain unverified until reviewed by authorized staff." />
    {(error || geo.error) && <ErrorBox message={error || geo.error || ''} />}
    <div className="grid-2">
      <Card title="Submit hazard report">
        <form onSubmit={submit} className="form-grid compact">
          <FormField label="Hazard"><select value={f.hazard_type} onChange={e => setF({ ...f, hazard_type: e.target.value })}>{hazards.map(h => <option key={h} value={h}>{h.replaceAll('_', ' ')}</option>)}</select></FormField>
          <FormField label="Description"><textarea required minLength={5} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></FormField>
          <button type="button" className="btn secondary" onClick={locate}>{f.latitude ? 'Refresh current GPS' : 'Enable current GPS'}</button>
          <FormField label="GPS status"><input readOnly value={f.latitude ? `${Number(f.latitude).toFixed(5)}, ${Number(f.longitude).toFixed(5)}` : 'Location permission required'} /></FormField>
          <FormField label="Citizen severity"><select value={f.citizen_severity} onChange={e => setF({ ...f, citizen_severity: e.target.value })}><option>low</option><option>moderate</option><option>high</option><option>critical</option></select></FormField>
          <FormField label="People affected"><input type="number" min="0" value={f.people_affected} onChange={e => setF({ ...f, people_affected: e.target.value })} /></FormField>
          <button className="btn primary">Submit GPS-tagged report</button>
        </form>
      </Card>
      <Card title={user?.role === 'citizen' ? 'My reports' : 'Verification queue'}>
        {rows.length ? <DataTable headers={['Hazard', 'Description', 'Severity', 'Status', 'Action']}>{rows.map(r => <tr key={r.id}><td>{r.hazard_type}</td><td>{r.description}</td><td>{r.citizen_severity}</td><td><StatusBadge value={r.status} /></td><td>{user?.role !== 'citizen' && <div className="button-row"><button className="btn tiny" onClick={() => verify(r.id, 'verified')}>Verify</button><button className="btn tiny ghost" onClick={() => verify(r.id, 'rejected')}>Reject</button></div>}</td></tr>)}</DataTable> : <Empty title="No reports" />}
      </Card>
    </div>
  </>;
}
