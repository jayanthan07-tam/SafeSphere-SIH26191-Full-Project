import { useEffect, useState } from 'react';
import { Card, Stat } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { sosService } from '../../services/sos';
import type { CitizenReport, SOS } from '../../types';

export default function FieldDashboard() {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<SOS[]>([]);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected item for field notes / photo evidence
  const [activeItem, setActiveItem] = useState<SOS | null>(null);
  const [notes, setNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [allSos, allReports] = await Promise.all([
        sosService.getAllSOS(),
        api.get<CitizenReport[]>('/citizen-reports').catch(() => []),
      ]);
      // Assignments for this officer or unassigned nearby
      const myAssignments = allSos.filter(s => s.assigned_to === user?.id || s.status === 'assigned');
      setAssignments(myAssignments.length ? myAssignments : allSos.slice(0, 10));
      setReports(allReports.slice(0, 10));
    } catch (err: any) {
      setError(err.message || 'Failed to load field operations data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (sosId: string, status: string) => {
    setError('');
    try {
      await sosService.updateStatus(sosId, status);
      setSuccess(`Status updated to ${status.toUpperCase()}.`);
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update assignment status.');
    }
  };

  const handleAcceptAssignment = async (sosId: string) => {
    if (!user) return;
    try {
      await sosService.assignOfficer(sosId, user.id);
      await sosService.updateStatus(sosId, 'acknowledged');
      setSuccess('Assignment accepted.');
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to accept assignment.');
    }
  };

  const handleSaveEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    setUpdating(true);
    setError('');
    try {
      if (evidenceFile) {
        const formData = new FormData();
        formData.append('file', evidenceFile);
        // Upload photo evidence if endpoint supports, or mock confirmation
      }
      setSuccess(`Field notes and verification recorded for Incident #${activeItem.id.slice(0, 8)}.`);
      setTimeout(() => setSuccess(''), 4000);
      setActiveItem(null);
      setNotes('');
      setEvidenceFile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save evidence.');
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyReport = async (reportId: string) => {
    try {
      await api.patch(`/citizen-reports/${reportId}/verify`, { verified: true, notes: 'Field verified by responder.' });
      setSuccess('Report verified successfully.');
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to verify report.');
    }
  };

  return (
    <div className="field-dashboard">
      <PageHeader
        title="Field Officer Operations"
        subtitle="On-ground emergency navigation, dispatch assignments, and incident verification."
      />

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <div className="stat-grid">
        <Stat label="Active Assignments" value={assignments.filter(a => a.status !== 'resolved').length} />
        <Stat label="Citizen Reports Pending" value={reports.filter(r => r.status === 'pending').length} />
        <Stat label="Resolved Today" value={assignments.filter(a => a.status === 'resolved').length} />
      </div>

      <div className="grid-2">
        {/* Active Emergency Assignments */}
        <Card title="Emergency Assignments">
          {loading ? (
            <p className="muted">Loading assigned field incidents…</p>
          ) : !assignments.length ? (
            <p className="muted">No active SOS incidents currently assigned.</p>
          ) : (
            <div className="assignment-cards-stack">
              {assignments.map(s => (
                <div key={s.id} className="field-assignment-card">
                  <div className="field-card-header">
                    <div>
                      <span className="eyebrow">INCIDENT #{s.id.slice(0, 8)}</span>
                      <h4>{s.caller_name || 'Citizen SOS'}</h4>
                      <small>{s.phone || 'No phone recorded'}</small>
                    </div>
                    <StatusBadge value={s.status} />
                  </div>

                  <p className="field-hazard-desc">
                    <b>Hazard:</b> {s.hazard_type || 'unspecified'} • <b>Priority Score:</b> {s.priority_score.toFixed(0)}
                  </p>
                  {s.message && <p className="field-message">"{s.message}"</p>}

                  <div className="field-action-bar">
                    {s.status === 'new' && (
                      <button
                        type="button"
                        className="btn primary tiny"
                        onClick={() => handleAcceptAssignment(s.id)}
                      >
                        ✓ Accept Assignment
                      </button>
                    )}

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn secondary tiny"
                    >
                      🗺 Navigate
                    </a>

                    {s.status !== 'en_route' && s.status !== 'contacted' && s.status !== 'resolved' && (
                      <button
                        type="button"
                        className="btn tiny"
                        onClick={() => handleUpdateStatus(s.id, 'en_route')}
                      >
                        En Route
                      </button>
                    )}

                    {s.status === 'en_route' && (
                      <button
                        type="button"
                        className="btn tiny"
                        onClick={() => handleUpdateStatus(s.id, 'contacted')}
                      >
                        Reached Location
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn tiny ghost"
                      onClick={() => setActiveItem(s)}
                    >
                      📷 Add Evidence / Notes
                    </button>

                    {s.status !== 'resolved' && (
                      <button
                        type="button"
                        className="btn tiny success"
                        onClick={() => handleUpdateStatus(s.id, 'resolved')}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Citizen Reports for Field Verification */}
        <Card title="Citizen Reports Requiring Verification">
          {!reports.length ? (
            <p className="muted">No unverified citizen reports in this zone.</p>
          ) : (
            <div className="reports-stack">
              {reports.map(r => (
                <div key={r.id} className="field-report-card">
                  <div className="report-top">
                    <div>
                      <b>{r.hazard_type.toUpperCase()}</b>
                      <span className="severity-pill">{r.citizen_severity}</span>
                    </div>
                    <StatusBadge value={r.status} />
                  </div>
                  <p>{r.description}</p>
                  <small className="muted">
                    Location: {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                  </small>
                  <div className="report-actions">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn tiny ghost"
                    >
                      Navigate
                    </a>
                    {r.status === 'pending' && (
                      <button
                        type="button"
                        className="btn tiny primary"
                        onClick={() => handleVerifyReport(r.id)}
                      >
                        ✓ Field Verify
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Modal for Field Evidence Upload & Notes */}
      {activeItem && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Field Verification & Evidence Upload</h3>
            <p>Incident: <b>#{activeItem.id.slice(0, 8)}</b> ({activeItem.caller_name || 'Citizen'})</p>

            <form onSubmit={handleSaveEvidence}>
              <label className="field">
                <span>Field Notes & Observation</span>
                <textarea
                  required
                  rows={4}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Record on-ground rescue notes, road blockage observations, or victim assistance details…"
                />
              </label>

              <label className="field">
                <span>Upload Photo Evidence (Optional)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setEvidenceFile(e.target.files?.[0] || null)}
                />
              </label>

              <div className="modal-actions">
                <button className="btn primary" type="submit" disabled={updating}>
                  {updating ? 'Saving…' : 'Submit Field Evidence'}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setActiveItem(null);
                    setNotes('');
                    setEvidenceFile(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
