import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRoleLandingPath, useAuth } from '../context/AuthContext';
import { useAppLanguage } from '../hooks/useAppLanguage';
import type { SupportedLanguageCode } from '../i18n';
import type { UserRole } from '../types';

interface RoleOption {
  role: UserRole;
  label: string;
  demoEmail: string;
  demoPass: string;
}

const ROLES: RoleOption[] = [
  {
    role: 'citizen',
    label: 'Citizen',
    demoEmail: 'user.safesphere@gmail.com',
    demoPass: 'User123!',
  },
  {
    role: 'admin',
    label: 'Administrator',
    demoEmail: 'admin.safesphere@gmail.com',
    demoPass: 'Admin123!',
  },
  {
    role: 'authority',
    label: 'Authority',
    demoEmail: 'authority.safesphere@gmail.com',
    demoPass: 'Authority123!',
  },
  {
    role: 'field_officer',
    label: 'Field Officer',
    demoEmail: 'officer.safesphere@gmail.com',
    demoPass: 'Officer123!',
  },
  {
    role: 'family_member',
    label: 'Family Member',
    demoEmail: 'family.safesphere@gmail.com',
    demoPass: 'Family123!',
  },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const { language, setLanguage, supportedLanguages } = useAppLanguage();

  const [selectedRole, setSelectedRole] = useState<UserRole>('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const activeRoleOption = ROLES.find((r) => r.role === selectedRole) || ROLES[0];

  const handleRoleSelect = (r: UserRole) => {
    setSelectedRole(r);
    setError('');
  };

  const handleAutofillDemo = () => {
    setEmail(activeRoleOption.demoEmail);
    setPassword(activeRoleOption.demoPass);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    try {
      const authedUser = await login(cleanEmail, password, selectedRole, rememberMe);
      const targetPath = getRoleLandingPath(authedUser.role);
      nav(targetPath);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page-liquid">
      {/* Top Right Language Selector */}
      <div className="login-top-bar">
        <select
          className="lang-selector-liquid"
          value={language}
          onChange={(e) => setLanguage(e.target.value as SupportedLanguageCode)}
          aria-label="Select Language"
          id="login-lang-select"
        >
          {supportedLanguages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Centered Liquid Glass Login Card */}
      <div className="login-card-liquid">
        <div className="login-header-liquid">
          <div className="login-brand-icon" aria-hidden="true">
            🌐
          </div>
          <h1>SafeSphere</h1>
          <p>National Crisis Intelligence & Family Safety Command</p>
        </div>

        {error && (
          <div className="error-box" role="alert" id="login-error-alert">
            {error}
          </div>
        )}

        {/* 5-Role Selector Chips */}
        <div className="role-chips-label">
          <span>Select Access Role</span>
          <small style={{ color: '#0f6ea9', fontWeight: 600 }}>Role matching enforced</small>
        </div>
        <div className="role-chips-grid" role="radiogroup" aria-label="Role selection">
          {ROLES.map((r) => {
            const isActive = selectedRole === r.role;
            return (
              <button
                key={r.role}
                type="button"
                className={`role-chip-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleRoleSelect(r.role)}
                id={`role-btn-${r.role}`}
                aria-pressed={isActive}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email Field */}
          <label className="field-liquid">
            <span>Email / Username</span>
            <div className="field-input-wrap">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@safesphere.org or gmail"
                autoComplete="email"
                id="login-email-input"
              />
            </div>
          </label>

          {/* Password Field with Eye Toggle */}
          <label className="field-liquid">
            <span>Password</span>
            <div className="field-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                id="login-password-input"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          {/* Remember Me Checkbox & Forgot Password */}
          <div className="remember-row">
            <label className="remember-check">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                id="login-remember-checkbox"
              />
              <span>Remember Me</span>
            </label>

            <button
              type="button"
              className="text-btn"
              onClick={() => setForgotOpen(true)}
              id="btn-forgot-password"
              style={{ color: '#0f6ea9', fontSize: 12, background: 'none', border: 'none' }}
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-sign-in-liquid"
            disabled={busy || !email || !password}
            id="btn-sign-in"
          >
            {busy ? 'Verifying Credentials…' : `Sign In as ${activeRoleOption.label}`}
          </button>
        </form>

        {/* Development Demo Credentials Helper */}
        <div className="demo-credentials-box">
          <div className="demo-credentials-header">
            <span>Development Demo Account</span>
            <button
              type="button"
              className="btn-autofill-demo"
              onClick={handleAutofillDemo}
              id="btn-autofill-demo"
              title="Autofill this account"
            >
              Autofill {activeRoleOption.label}
            </button>
          </div>
          <div className="demo-credentials-text">
            <div>
              <strong>Email:</strong> <code>{activeRoleOption.demoEmail}</code>
            </div>
            <div>
              <strong>Password:</strong> <code>{activeRoleOption.demoPass}</code>
            </div>
          </div>
        </div>

        {/* Registration Link strictly for Citizens */}
        <div className="login-footer-links">
          <span>New citizen resident? </span>
          <Link to="/register" id="btn-create-new-account">
            Register Citizen Account
          </Link>
        </div>

        {/* Emergency SOS Button (Always Red & Liquid-Glass) */}
        <div className="emergency-strip-login">
          <button
            type="button"
            className="btn-sos-login-red"
            onClick={() => nav('/emergency-loginless')}
            id="btn-sos-emergency"
            aria-label="Direct Emergency SOS without login"
          >
            <span style={{ fontSize: 18 }}>🆘</span>
            <span>Emergency SOS (No Login Needed)</span>
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="modal-backdrop" onClick={() => setForgotOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Password Recovery Protocol</h3>
            <p style={{ color: '#55798f', lineHeight: 1.5, fontSize: 13 }}>
              SafeSphere protects mission-critical disaster infrastructure with strict security
              protocols:
            </p>
            <ul style={{ color: '#33445d', fontSize: 13, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>
                <strong>Citizens & Families:</strong> Contact your local district disaster response unit or verify with emergency dispatch.
              </li>
              <li>
                <strong>Authorities & Field Officers:</strong> Password resets must be performed by the system administrator via <code>admin/users</code>.
              </li>
            </ul>
            <div className="modal-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => setForgotOpen(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
