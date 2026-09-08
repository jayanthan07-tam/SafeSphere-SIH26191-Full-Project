import { useEffect, useState } from 'react';
import { Card, Stat } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { sosService } from '../../services/sos';
import { usersService } from '../../services/users';
import type { SOS, User } from '../../types';

export default function AuthorityDashboard() {
  const [sosList, setSosList] = useState<SOS[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState<{ [sosId: string]: string }>({});

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [allSos, ops] = await Promise.all([
        sosService.getAllSOS(),
        usersService.listOfficers().catch(() => []),
      ]);
      setSosList(allSos);
      setOfficers(ops);
    } catch (err: any) {
      setError(err.message || 'Failed to load SOS dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await sosService.updateStatus(id, newStatus);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const handleAssignOfficer = async (sosId: string) => {
    const officerId = selectedOfficer[sosId];
    if (!officerId) return;
    try {
      await sosService.assignOfficer(sosId, officerId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign officer.');
    }
  };

  const activeSOS = sosList.filter(s => s.status !== 'resolved');
  const criticalSOS = activeSOS.filter(s => s.priority_score >= 70);
  const unassignedSOS = activeSOS.filter(s => !s.assigned_to);
  const assignedSOS = activeSOS.filter(s => Boolean(s.assigned_to));
  const resolvedToday = sosList.filter(s => s.status === 'resolved');

  const filtered = statusFilter === 'all'
    ? sosList
    : sosList.filter(s => s.status.toLowerCase() === statusFilter.toLowerCase());

  const officerNameMap = new Map(officers.map(o => [o.id, o.full_name]));

  return (
    <div className="authority-dashboard">
      <PageHeader
        title="Disaster Management Authority Command"
        subtitle="Real-time emergency incident triaging, operational dispatch, and active SOS tracking."
      />

      {error && <div className="error-box">{error}</div>}

      {/* Metrics Row */}
      <div className="stat-grid">
        <Stat label="Active SOS" value={activeSOS.length} />
        <Stat label="Critical SOS (Score ≥ 70)" value={criticalSOS.length} />
        <Stat label="Unassigned Incidents" value={unassignedSOS.length} />
        <Stat label="Assigned Responders" value={assignedSOS.length} />
        <Stat label="Resolved Today" value={resolvedToday.length} />
      </div>

      {/* Interactive SOS Management Table */}
      <Card title="Emergency SOS Incidents">
        <div className="table-filter-bar">
          <div className="filter-group">
            <label htmlFor="status-filter">Status Filter:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Incidents</option>
              <option value="new">NEW</option>
              <option value="acknowledged">ACKNOWLEDGED</option>
              <option value="assigned">ASSIGNED</option>
              <option value="en_route">EN_ROUTE</option>
              <option value="contacted">CONTACTED</option>
              <option value="evacuating">EVACUATING</option>
              <option value="at_shelter">AT_SHELTER</option>
              <option value="resolved">RESOLVED</option>
            </select>
          </div>
          <button type="button" className="btn secondary tiny" onClick={loadData}>
            🔄 Refresh Live Feed
          </button>
        </div>

        {loading ? (
          <p className="muted">Loading incidents from command dispatch…</p>
        ) : !filtered.length ? (
          <p className="muted">No incidents matching the selected filter.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SOS ID</th>
                  <th>Citizen / Caller</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Hazard</th>
                  <th>Priority</th>
                  <th>Special Needs</th>
                  <th>Assigned Officer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td><code>{s.id.slice(0, 8)}</code></td>
                    <td><b>{s.caller_name || 'Anonymous Caller'}</b></td>
                    <td>{s.phone || 'N/A'}</td>
                    <td>
                      <a
                        href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link"
                      >
                        📍 {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                      </a>
                    </td>
                    <td><span className="hazard-pill">{s.hazard_type || 'unspecified'}</span></td>
                    <td>
                      <span className={`priority-tag ${s.priority_score >= 70 ? 'tag-critical' : 'tag-normal'}`}>
                        {s.priority_score.toFixed(0)}
                      </span>
                    </td>
                    <td>
                      {s.special_needs?.length ? s.special_needs.join(', ') : 'None'} ({s.people_count} pers.)
                    </td>
                    <td>
                      {s.assigned_to ? (
                        <span className="officer-assigned-badge">
                          👮 {officerNameMap.get(s.assigned_to) || 'Field Responder'}
                        </span>
                      ) : (
                        <div className="assign-cell">
                          <select
                            value={selectedOfficer[s.id] || ''}
                            onChange={e => setSelectedOfficer({ ...selectedOfficer, [s.id]: e.target.value })}
                          >
                            <option value="">Select Officer…</option>
                            {officers.map(off => (
                              <option key={off.id} value={off.id}>
                                {off.full_name} ({off.role.replace('_', ' ')})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn tiny primary"
                            onClick={() => handleAssignOfficer(s.id)}
                            disabled={!selectedOfficer[s.id]}
                          >
                            Assign
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <select
                        className="status-dropdown"
                        value={s.status.toLowerCase()}
                        onChange={e => handleStatusChange(s.id, e.target.value)}
                      >
                        <option value="new">NEW</option>
                        <option value="acknowledged">ACKNOWLEDGED</option>
                        <option value="assigned">ASSIGNED</option>
                        <option value="en_route">EN_ROUTE</option>
                        <option value="contacted">CONTACTED</option>
                        <option value="evacuating">EVACUATING</option>
                        <option value="at_shelter">AT_SHELTER</option>
                        <option value="resolved">RESOLVED</option>
                      </select>
                    </td>
                    <td>
                      {s.status !== 'resolved' ? (
                        <button
                          type="button"
                          className="btn tiny success"
                          onClick={() => handleStatusChange(s.id, 'resolved')}
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="muted">✓ Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
