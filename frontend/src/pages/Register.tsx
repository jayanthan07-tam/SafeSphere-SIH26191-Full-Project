import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { familyService } from '../services/family';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    mobile_number: '',
    password: '',
    confirm_password: '',
    role: 'citizen' as 'citizen' | 'family_member',
  });

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Step 2 for Family Member: Enter Family Join Code
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [familyJoinCode, setFamilyJoinCode] = useState('');
  const [relationship, setRelationship] = useState('Family Member');
  const [joinError, setJoinError] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setBusy(true);

    try {
      const u = await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        mobile_number: form.mobile_number.trim() || undefined,
        phone: form.mobile_number.trim() || undefined,
        password: form.password,
        role: form.role,
      });

      // If user registered as Family Member, prompt for Family Join Code
      if (u.role === 'family_member') {
        setShowJoinModal(true);
      } else {
        nav('/citizen/home');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to create account. Please verify your details.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinFamily = async (e: FormEvent) => {
    e.preventDefault();
    setJoinBusy(true);
    setJoinError('');

    try {
      await familyService.joinFamily(familyJoinCode.trim(), relationship.trim());
      nav('/family/home');
    } catch (err: any) {
      setJoinError('Invalid or expired family join code.');
    } finally {
      setJoinBusy(false);
    }
  };

  const handleSkipJoin = () => {
    nav('/family/home');
  };

  return (
    <div className="login-page register-page">
      <section className="login-hero">
        <div className="brand large">
          <div className="brand-mark">DM</div>
          <div>
            <b>Disaster Management</b>
            <small>“Predict Today. Protect Tomorrow.”</small>
          </div>
        </div>
        <div className="hero-copy">
          <span className="eyebrow">Public Account Registration</span>
          <h1>Protect your household and stay connected in any crisis.</h1>
          <p>
            Create a <b>Citizen</b> account to manage your family group, register emergency contacts,
            and monitor hazards. Or create a <b>Family Member</b> account to link directly with your family's portal.
          </p>
          <div className="info-callout">
            <strong>Security Notice:</strong> Government, authority, district officer, and field officer
            accounts are provisioned strictly by system administrators.
          </div>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <span className="eyebrow">Citizen & Family Registration</span>
          <h2>Create Account</h2>

          {error && <div className="error-box" role="alert">{error}</div>}

          <label className="field">
            <span>Role</span>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as 'citizen' | 'family_member' })}
              id="register-role-select"
            >
              <option value="citizen">Citizen</option>
              <option value="family_member">Family Member</option>
            </select>
          </label>

          <label className="field">
            <span>Full Name</span>
            <input
              required
              minLength={2}
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              placeholder="e.g. Jane Doe"
              id="register-fullname-input"
            />
          </label>

          <label className="field">
            <span>Email / Gmail</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="user@gmail.com"
              id="register-email-input"
            />
          </label>

          <label className="field">
            <span>Mobile Number</span>
            <input
              type="tel"
              value={form.mobile_number}
              onChange={e => setForm({ ...form, mobile_number: e.target.value })}
              placeholder="+91 98765 43210"
              id="register-mobile-input"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              id="register-password-input"
            />
          </label>

          <label className="field">
            <span>Confirm Password</span>
            <input
              required
              type="password"
              minLength={8}
              value={form.confirm_password}
              onChange={e => setForm({ ...form, confirm_password: e.target.value })}
              placeholder="Re-enter password"
              autoComplete="new-password"
              id="register-confirm-password-input"
            />
          </label>

          <button className="btn primary full" disabled={busy} id="btn-create-account-submit">
            {busy ? 'Creating Account…' : 'Create Account'}
          </button>

          <div className="create-account-box">
            <span>Already have an account?</span>
            <Link className="text-link" to="/login" id="btn-back-to-login">
              Back to Sign In
            </Link>
          </div>
        </form>

        {/* Modal for Family Member Join Code */}
        {showJoinModal && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <span className="eyebrow">Family Linking</span>
              <h3>Enter Family Join Code</h3>
              <p>
                To link this account with your household, enter the unique <b>Family Join Code</b> provided by the citizen account owner (e.g. <code>DM-FAM-A72K9</code>).
              </p>

              {joinError && <div className="error-box">{joinError}</div>}

              <form onSubmit={handleJoinFamily}>
                <label className="field">
                  <span>Family Join Code</span>
                  <input
                    required
                    value={familyJoinCode}
                    onChange={e => setFamilyJoinCode(e.target.value.toUpperCase())}
                    placeholder="DM-FAM-XXXXX"
                    maxLength={16}
                    autoFocus
                  />
                </label>

                <label className="field">
                  <span>Your Relationship</span>
                  <input
                    required
                    value={relationship}
                    onChange={e => setRelationship(e.target.value)}
                    placeholder="e.g. Mother, Brother, Spouse, Child"
                  />
                </label>

                <div className="modal-actions">
                  <button className="btn primary" disabled={joinBusy}>
                    {joinBusy ? 'Verifying…' : 'Join Family Group'}
                  </button>
                  <button type="button" className="btn ghost" onClick={handleSkipJoin}>
                    Skip & Join Later
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
