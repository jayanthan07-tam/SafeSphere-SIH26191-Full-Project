import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Stat } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { sosService } from '../../services/sos';
import type { AlertItem, Habitation, RelocationSite, SOS } from '../../types';

export default function DistrictDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [habitations, setHabitations] = useState<Habitation[]>([]);
  const [shelters, setShelters] = useState<RelocationSite[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [districtSos, setDistrictSos] = useState<SOS[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Habitation[]>('/habitations').catch(() => []),
      api.get<RelocationSite[]>('/relocation/sites').catch(() => []),
      api.get<AlertItem[]>('/alerts').catch(() => []),
      sosService.getActiveSOS().catch(() => []),
    ]).then(([habs, sites, alts, sos]) => {
      setHabitations(habs);
      setShelters(sites);
      setAlerts(alts);
      setDistrictSos(sos);
      setLoading(false);
    });
  }, []);

  const totalPopulation = habitations.reduce((acc, h) => acc + (h.population || 0), 0);
  const totalShelterCapacity = shelters.reduce((acc, s) => acc + (s.total_capacity || 0), 0);
  const availableCapacity = shelters.reduce((acc, s) => acc + (s.available_capacity || 0), 0);

  return (
    <div className="district-dashboard">
      <PageHeader
        title={`District Administration Command ${user?.district ? `— ${user.district}` : ''}`}
        subtitle="Jurisdictional habitations, vulnerability monitoring, evacuation infrastructure, and local emergency incidents."
      />

      <div className="stat-grid">
        <Stat label="Monitored Habitations" value={habitations.length} />
        <Stat label="Total Population at Risk" value={totalPopulation.toLocaleString()} />
        <Stat label="Relocation Sites / Shelters" value={shelters.length} />
        <Stat label="Available Shelter Capacity" value={`${availableCapacity.toLocaleString()} / ${totalShelterCapacity.toLocaleString()}`} />
        <Stat label="Active District SOS" value={districtSos.length} />
      </div>

      <div className="grid-2">
        <Card title="Vulnerable Habitations">
          {!habitations.length ? (
            <p className="muted">No habitations mapped in this district.</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Habitation Name</th>
                    <th>Population</th>
                    <th>Risk Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {habitations.slice(0, 5).map(h => (
                    <tr key={h.id}>
                      <td><code>{h.code}</code></td>
                      <td><b>{h.name}</b></td>
                      <td>{h.population?.toLocaleString()}</td>
                      <td>
                        <span className={`pill ${h.vulnerability_score && h.vulnerability_score > 60 ? 'pill-danger' : 'pill-warning'}`}>
                          {h.vulnerability_score != null ? h.vulnerability_score.toFixed(1) : 'N/A'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="btn tiny ghost" onClick={() => nav('/habitation-analysis')}>
                          View Analysis
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="District Emergency Incidents">
          {!districtSos.length ? (
            <p className="muted">No active emergency incidents reported in this sector.</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Caller</th>
                    <th>Hazard</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {districtSos.slice(0, 5).map(s => (
                    <tr key={s.id}>
                      <td><b>{s.caller_name || 'Citizen'}</b></td>
                      <td>{s.hazard_type || 'unspecified'}</td>
                      <td>{s.priority_score.toFixed(0)}</td>
                      <td><StatusBadge value={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="quick-grid">
        <button className="quick" onClick={() => nav('/risk-map')}>🗺 Explore GIS Risk Map</button>
        <button className="quick" onClick={() => nav('/evacuation')}>🚑 Evacuation Routes</button>
        <button className="quick" onClick={() => nav('/relocation-optimizer')}>📈 Relocation Optimizer</button>
        <button className="quick" onClick={() => nav('/alerts')}>📢 Publish Regional Alert</button>
      </div>
    </div>
  );
}
