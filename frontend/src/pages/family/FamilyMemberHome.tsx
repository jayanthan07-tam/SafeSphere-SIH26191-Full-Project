import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Stat } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { VoiceSOS } from '../../components/VoiceSOS';
import { SOSButton } from '../../components/SOSButton';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { familyService } from '../../services/family';
import { speakText, useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import type { AlertItem, FamilyGroup, RelocationSite } from '../../types';

export default function FamilyMemberHome() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [shelters, setShelters] = useState<RelocationSite[]>([]);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [relationshipInput, setRelationshipInput] = useState('Family Member');

  const [myStatus, setMyStatus] = useState<string>('UNKNOWN');
  const [locationSharing, setLocationSharing] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Voice Safety Update transcript state
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceDetectedStatus, setVoiceDetectedStatus] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [grp, alts, sits] = await Promise.all([
        familyService.getFamilyGroup().catch(e => {
          if (e.status === 404) {
            setNeedsJoin(true);
            return null;
          }
          throw e;
        }),
        api.get<AlertItem[]>('/alerts').catch(() => []),
        api.get<RelocationSite[]>('/relocation/sites').catch(() => []),
      ]);

      if (grp) {
        setGroup(grp);
        setNeedsJoin(false);
        const meInGroup = grp.members.find(m => m.user_id === user?.id);
        if (meInGroup) {
          setMyStatus(meInGroup.safety_status || 'UNKNOWN');
          setLocationSharing(meInGroup.location_sharing);
        }
      }
      setAlerts(alts);
      setShelters(sits);
    } catch (err: any) {
      setError(err.message || 'Unable to load family dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusUpdate = async (status: string) => {
    setError('');
    try {
      let lat: number | undefined;
      let lng: number | undefined;

      if (locationSharing && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => {
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Location fetch failed or denied; continue with status update
        }
      }

      const updated = await familyService.checkIn(status, locationSharing, lat, lng);
      setGroup(updated);
      setMyStatus(status);
      speakText('Your safety status has been updated.');
      setSuccess(`Safety check-in sent: ${status.replace('_', ' ')}.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update safety check-in.');
    }
  };

  const handleToggleLocationSharing = async () => {
    const nextVal = !locationSharing;
    setLocationSharing(nextVal);
    setError('');
    try {
      let lat: number | undefined;
      let lng: number | undefined;

      if (nextVal && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }

      const updated = await familyService.checkIn(myStatus, nextVal, lat, lng);
      setGroup(updated);
      setSuccess(`Location sharing ${nextVal ? 'enabled' : 'disabled'}.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Could not update location sharing preference.');
    }
  };

  const handleJoinFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const grp = await familyService.joinFamily(joinCodeInput.trim(), relationshipInput.trim());
      setGroup(grp);
      setNeedsJoin(false);
      setSuccess('Successfully joined family group.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError('Invalid or expired family join code.');
    }
  };

  // Voice Safety Update Hook
  const {
    listening: voiceListening,
    transcript: liveTranscript,
    language: voiceLang,
    setLanguage: setVoiceLang,
    startListening: startVoiceUpdate,
    stopListening: stopVoiceUpdate,
  } = useVoiceRecognition({
    onSafetyStatusDetected: (status, transcript) => {
      setVoiceTranscript(transcript);
      setVoiceDetectedStatus(status);
    },
    onTranscript: text => {
      setVoiceTranscript(text);
    },
  });

  const confirmVoiceUpdate = () => {
    if (voiceDetectedStatus) {
      handleStatusUpdate(voiceDetectedStatus);
      setVoiceDetectedStatus(null);
      setVoiceTranscript('');
    }
  };

  return (
    <div className="family-member-home">
      <PageHeader
        title="Family Member Portal"
        subtitle="Private safety check-ins, household group status, nearby shelters, and emergency alerts."
      />

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      {needsJoin ? (
        <Card title="Join Your Household Family Group">
          <p>
            Your account is ready! To link with your household, please enter the unique 8–12 character
            Family Join Code provided by the citizen owner of your family (e.g. <code>DM-FAM-A72K9</code>).
          </p>
          <form className="join-form-row" onSubmit={handleJoinFamilySubmit}>
            <label className="field">
              <span>Family Join Code</span>
              <input
                required
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="DM-FAM-XXXXX"
              />
            </label>
            <label className="field">
              <span>Relationship</span>
              <input
                required
                value={relationshipInput}
                onChange={e => setRelationshipInput(e.target.value)}
                placeholder="e.g. Daughter, Brother, Spouse"
              />
            </label>
            <button className="btn primary" type="submit">
              Join Family
            </button>
          </form>
        </Card>
      ) : (
        <>
          {/* Quick Metrics */}
          <div className="stat-grid">
            <Stat label="My Safety Status" value={myStatus.replace('_', ' ')} />
            <Stat label="Family Group" value={group?.name || 'My Family'} />
            <Stat label="Linked Members" value={group?.members.length || 1} />
            <Stat label="Active Regional Alerts" value={alerts.length} />
          </div>

          {/* Safety Check-In Action Section */}
          <div className="grid-2">
            <Card title="My Safety Check-In">
              <p className="muted">
                Keep your family notified of your well-being with a single tap or voice command.
              </p>

              <div className="family-status-buttons-grid">
                <button
                  type="button"
                  className={`btn status-btn ${myStatus === 'SAFE' ? 'btn-selected' : 'primary'}`}
                  onClick={() => handleStatusUpdate('SAFE')}
                >
                  ✓ I’m Safe
                </button>
                <button
                  type="button"
                  className={`btn status-btn ${myStatus === 'AT_SHELTER' ? 'btn-selected' : ''}`}
                  onClick={() => handleStatusUpdate('AT_SHELTER')}
                >
                  🏠 I’m At Shelter
                </button>
                <button
                  type="button"
                  className={`btn status-btn warning ${myStatus === 'NEED_HELP' ? 'btn-selected' : ''}`}
                  onClick={() => handleStatusUpdate('NEED_HELP')}
                >
                  ⚠️ Need Help
                </button>
                <button
                  type="button"
                  className={`btn status-btn danger ${myStatus === 'UNABLE_TO_MOVE' ? 'btn-selected' : ''}`}
                  onClick={() => handleStatusUpdate('UNABLE_TO_MOVE')}
                >
                  🛑 Unable to Move
                </button>
              </div>

              {/* Location Privacy Toggle */}
              <div className="privacy-card">
                <div className="privacy-header">
                  <div>
                    <strong>Location Sharing: {locationSharing ? 'ON' : 'OFF'}</strong>
                    <p className="privacy-desc">
                      Default is <b>OFF</b>. If OFF, precise GPS coordinates are never exposed to other family
                      members. During an SOS activation, emergency coordinates are shared only with authorized
                      first responders.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`btn tiny ${locationSharing ? 'danger' : 'secondary'}`}
                    onClick={handleToggleLocationSharing}
                  >
                    {locationSharing ? 'Turn Off Location' : 'Enable Location Sharing'}
                  </button>
                </div>
              </div>

              {/* Voice Safety Update */}
              <div className="voice-safety-update-box">
                <div className="voice-update-header">
                  <div>
                    <strong>🎙 Voice Safety Update (Tap-to-Speak)</strong>
                    <small className="muted block">
                      Say: "I am safe" (SAFE), "I need help" (NEED_HELP), "I am at shelter" (AT_SHELTER), or "I cannot move" (UNABLE_TO_MOVE).
                    </small>
                  </div>
                  <select
                    className="voice-lang-select"
                    value={voiceLang}
                    onChange={e => setVoiceLang(e.target.value as any)}
                  >
                    <option value="en-IN">English</option>
                    <option value="ta-IN">தமிழ் (Tamil)</option>
                  </select>
                </div>

                <div className="voice-btn-row">
                  <button
                    type="button"
                    className={`btn ${voiceListening ? 'danger' : 'secondary'}`}
                    onClick={voiceListening ? stopVoiceUpdate : startVoiceUpdate}
                  >
                    {voiceListening ? '🛑 Stop Recording' : '🎙 Speak Safety Status'}
                  </button>
                </div>

                {(liveTranscript || voiceTranscript) && (
                  <div className="voice-result-box">
                    <p>
                      Recognized Transcript: <b>"{liveTranscript || voiceTranscript}"</b>
                    </p>
                    {voiceDetectedStatus && (
                      <div className="detected-intent-row">
                        <span>Detected Status: <StatusBadge value={voiceDetectedStatus} /></span>
                        <button type="button" className="btn primary tiny" onClick={confirmVoiceUpdate}>
                          Confirm & Save Check-In
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Linked Family Members Status */}
            <Card title="Household Family Members">
              <div className="member-status-list">
                {group?.members.map(member => (
                  <div key={member.user_id} className="member-status-item">
                    <div className="member-meta">
                      <b>{member.full_name}</b>
                      <small>{member.relationship} {member.is_owner ? '• Household Head' : ''}</small>
                      {member.last_checkin_at && (
                        <small className="muted">
                          Check-in: {new Date(member.last_checkin_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      )}
                    </div>
                    <div className="member-status-right">
                      <StatusBadge value={member.safety_status} />
                      {member.location_sharing && member.last_latitude != null && (
                        <small className="coords-text">
                          📍 {member.last_latitude.toFixed(4)}, {member.last_longitude?.toFixed(4)}
                        </small>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Nearest Shelter and Area Risk */}
          <div className="grid-2">
            <Card title="Nearest Safe Shelters">
              {!shelters.length ? (
                <p className="muted">No relief shelters found in this sector.</p>
              ) : (
                <div className="shelter-list">
                  {shelters.slice(0, 3).map(site => (
                    <div key={site.id} className="shelter-item">
                      <div>
                        <b>{site.name}</b>
                        <small className="muted block">{site.district}, {site.state}</small>
                        <small>Capacity: {site.available_capacity} / {site.total_capacity} beds available</small>
                      </div>
                      <button
                        type="button"
                        className="btn tiny ghost"
                        onClick={() => nav('/evacuation')}
                      >
                        View Route
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Active Regional Alerts">
              {!alerts.length ? (
                <p className="muted">No active high-severity hazard alerts published.</p>
              ) : (
                <div className="alerts-stack">
                  {alerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className={`alert-bubble alert-${alert.severity}`}>
                      <b>{alert.title}</b>
                      <p>{alert.message}</p>
                      <small className="muted">{alert.severity.toUpperCase()} • {new Date(alert.created_at).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Persistent SOS Button */}
      <SOSButton />
    </div>
  );
}
