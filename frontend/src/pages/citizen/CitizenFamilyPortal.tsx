import { FormEvent, useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { VoiceSOS } from '../../components/VoiceSOS';
import { speakText } from '../../hooks/useVoiceRecognition';
import { emergencyContactsService } from '../../services/emergencyContacts';
import { familyService } from '../../services/family';
import type { EmergencyContact, FamilyGroup } from '../../types';

export default function CitizenFamilyPortal() {
  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Emergency contact modal/form state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    relationship: '',
    phone_number: '',
    priority: 'primary',
    sms_enabled: true,
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [grp, cont] = await Promise.all([
        familyService.getFamilyGroup(),
        emergencyContactsService.list(),
      ]);
      setGroup(grp);
      setContacts(cont);
    } catch (err: any) {
      setError(err.message || 'Failed to load family portal information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCode = () => {
    if (group?.join_code) {
      navigator.clipboard.writeText(group.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleRegenerateCode = async () => {
    if (!window.confirm('Regenerating your family code will invalidate the previous code. Are you sure?')) {
      return;
    }
    setError('');
    try {
      const res = await familyService.regenerateCode();
      if (group) {
        setGroup({ ...group, join_code: res.join_code });
      }
      setSuccess('Family join code regenerated successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate join code.');
    }
  };

  const handleSaveContact = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingContact) {
        await emergencyContactsService.update(editingContact.id, contactForm);
      } else {
        await emergencyContactsService.create(contactForm);
      }
      setContactModalOpen(false);
      setEditingContact(null);
      setContactForm({
        name: '',
        relationship: '',
        phone_number: '',
        priority: 'primary',
        sms_enabled: true,
      });
      const updated = await emergencyContactsService.list();
      setContacts(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to save emergency contact.');
    }
  };

  const handleEditContact = (c: EmergencyContact) => {
    setEditingContact(c);
    setContactForm({
      name: c.name,
      relationship: c.relationship,
      phone_number: c.phone_number,
      priority: c.priority,
      sms_enabled: c.sms_enabled,
    });
    setContactModalOpen(true);
  };

  const handleDeleteContact = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this emergency contact?')) return;
    try {
      await emergencyContactsService.delete(id);
      setContacts(contacts.filter(c => c.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete emergency contact.');
    }
  };

  const handleCitizenCheckIn = async (status: string) => {
    setError('');
    try {
      const updated = await familyService.checkIn(status, true);
      setGroup(updated);
      speakText('Your safety status has been updated.');
      setSuccess(`Safety status updated to ${status}.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update safety status.');
    }
  };

  return (
    <div className="citizen-family-portal">
      <PageHeader
        title="Citizen Family Portal"
        subtitle="Manage your private household family group, emergency join code, and emergency contacts."
      />

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      {/* Join Code Banner */}
      <div className="join-code-banner">
        <div className="join-code-content">
          <span className="eyebrow">Household Verification</span>
          <h3>Family Join Code</h3>
          <p>
            Share this private code with your family members so they can link their accounts to this portal.
          </p>
          <div className="join-code-display">
            <span className="code-text" id="family-join-code-value">
              {group?.join_code || 'LOADING…'}
            </span>
            <div className="code-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={handleCopyCode}
                id="btn-copy-code"
              >
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={handleRegenerateCode}
                id="btn-regenerate-code"
              >
                🔄 Regenerate Code
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status Bar for Citizen Owner */}
      <Card title="My Safety Status Check-In">
        <div className="citizen-status-actions">
          <button className="btn primary" onClick={() => handleCitizenCheckIn('SAFE')}>
            ✓ I’m Safe
          </button>
          <button className="btn" onClick={() => handleCitizenCheckIn('AT_SHELTER')}>
            🏠 I’m At Shelter
          </button>
          <button className="btn warning" onClick={() => handleCitizenCheckIn('NEED_HELP')}>
            ⚠️ Need Help
          </button>
          <button className="btn danger" onClick={() => handleCitizenCheckIn('UNABLE_TO_MOVE')}>
            🛑 Unable to Move
          </button>
        </div>
      </Card>

      {/* Linked Family Members Cards */}
      <Card title={`Linked Family Members (${group?.members.length || 0})`}>
        {loading ? (
          <p className="muted">Loading household members…</p>
        ) : !group?.members.length ? (
          <p className="muted">No family members have joined yet. Share your join code above.</p>
        ) : (
          <div className="family-cards-grid">
            {group.members.map(member => (
              <div
                key={member.user_id}
                className={`family-member-card ${member.safety_status === 'SOS_ACTIVE' || member.safety_status === 'NEED_HELP' ? 'card-alert' : ''}`}
              >
                <div className="card-header">
                  <div>
                    <h4 className="member-name">{member.full_name}</h4>
                    <span className="member-relationship">{member.relationship}</span>
                  </div>
                  <StatusBadge value={member.safety_status} />
                </div>

                <div className="card-details">
                  <div className="detail-row">
                    <span>Email:</span>
                    <strong>{member.email}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Last Check-In:</span>
                    <strong>
                      {member.last_checkin_at
                        ? new Date(member.last_checkin_at).toLocaleString()
                        : 'No check-in yet'}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>Location Sharing:</span>
                    <span className={`pill ${member.location_sharing ? 'pill-success' : 'pill-muted'}`}>
                      {member.location_sharing ? 'Enabled (ON)' : 'Disabled (OFF)'}
                    </span>
                  </div>
                  {member.location_sharing && member.last_latitude != null && (
                    <div className="detail-row location-coords">
                      <span>Coordinates:</span>
                      <strong>
                        {member.last_latitude.toFixed(5)}, {member.last_longitude?.toFixed(5)}
                      </strong>
                    </div>
                  )}
                  <div className="detail-row">
                    <span>SMS Alerts:</span>
                    <span>{member.sms_alerts_enabled ? 'Active' : 'Disabled'}</span>
                  </div>
                  <div className="detail-row">
                    <span>Special Assistance:</span>
                    <span>
                      {member.special_assistance && member.special_assistance.length > 0
                        ? member.special_assistance.join(', ')
                        : 'None noted'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Emergency Contacts Management */}
      <Card title="Emergency Contacts">
        <div className="contacts-header-actions">
          <p>
            Contacts specified here receive immediate SMS notifications and alerts when you or a linked
            family member triggers an SOS.
          </p>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setEditingContact(null);
              setContactForm({
                name: '',
                relationship: '',
                phone_number: '',
                priority: 'primary',
                sms_enabled: true,
              });
              setContactModalOpen(true);
            }}
          >
            + Add Emergency Contact
          </button>
        </div>

        {!contacts.length ? (
          <div className="empty-box">No emergency contacts registered yet. Add primary and secondary contacts.</div>
        ) : (
          <div className="contacts-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Name</th>
                  <th>Relationship</th>
                  <th>Phone Number</th>
                  <th>SMS Alerts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span className={`priority-badge ${c.priority === 'primary' ? 'primary-badge' : 'secondary-badge'}`}>
                        {c.priority.toUpperCase()}
                      </span>
                    </td>
                    <td><b>{c.name}</b></td>
                    <td>{c.relationship}</td>
                    <td>{c.phone_number}</td>
                    <td>{c.sms_enabled ? '✓ Enabled' : 'Off'}</td>
                    <td>
                      <div className="btn-row">
                        <button type="button" className="btn tiny" onClick={() => handleEditContact(c)}>
                          Edit
                        </button>
                        <button type="button" className="btn tiny danger" onClick={() => handleDeleteContact(c.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal for Add / Edit Contact */}
      {contactModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}</h3>
            <form onSubmit={handleSaveContact}>
              <label className="field">
                <span>Name</span>
                <input
                  required
                  value={contactForm.name}
                  onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </label>

              <label className="field">
                <span>Relationship</span>
                <input
                  required
                  value={contactForm.relationship}
                  onChange={e => setContactForm({ ...contactForm, relationship: e.target.value })}
                  placeholder="e.g. Father, Sister, Neighbor"
                />
              </label>

              <label className="field">
                <span>Phone Number</span>
                <input
                  required
                  type="tel"
                  value={contactForm.phone_number}
                  onChange={e => setContactForm({ ...contactForm, phone_number: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label className="field">
                <span>Priority</span>
                <select
                  value={contactForm.priority}
                  onChange={e => setContactForm({ ...contactForm, priority: e.target.value })}
                >
                  <option value="primary">Primary Contact</option>
                  <option value="secondary">Secondary Contact</option>
                </select>
              </label>

              <label className="check-field">
                <input
                  type="checkbox"
                  checked={contactForm.sms_enabled}
                  onChange={e => setContactForm({ ...contactForm, sms_enabled: e.target.checked })}
                />
                <span>Receive automatic SMS emergency alerts during SOS</span>
              </label>

              <div className="modal-actions">
                <button className="btn primary" type="submit">
                  {editingContact ? 'Update Contact' : 'Save Contact'}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setContactModalOpen(false);
                    setEditingContact(null);
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
