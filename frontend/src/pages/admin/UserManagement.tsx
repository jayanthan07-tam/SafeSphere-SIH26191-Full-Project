import { FormEvent, useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { usersService } from '../../services/users';
import type { User, UserRole } from '../../types';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [createStaffOpen, setCreateStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: '',
    full_name: '',
    mobile_number: '',
    password: '',
    role: 'field_officer',
    district: '',
  });

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    district: '',
    role: 'citizen',
  });

  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersService.listUsers(roleFilter || undefined, search || undefined);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleCreateStaff = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await usersService.createStaff(staffForm);
      setSuccess(`Staff account '${staffForm.email}' provisioned successfully.`);
      setTimeout(() => setSuccess(''), 4000);
      setCreateStaffOpen(false);
      setStaffForm({
        email: '',
        full_name: '',
        mobile_number: '',
        password: '',
        role: 'field_officer',
        district: '',
      });
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create staff account.');
    }
  };

  const handleToggleActive = async (user: User) => {
    const nextStatus = !user.is_active;
    try {
      await usersService.updateUser(user.id, { is_active: nextStatus });
      setSuccess(`Account '${user.email}' ${nextStatus ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setSuccess(''), 3000);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to change account status.');
    }
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setError('');
    try {
      await usersService.updateUser(editUser.id, {
        full_name: editForm.full_name,
        phone: editForm.phone,
        district: editForm.district,
        role: editForm.role,
      });
      setSuccess(`User '${editUser.email}' updated successfully.`);
      setTimeout(() => setSuccess(''), 3000);
      setEditUser(null);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user.');
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    setError('');
    try {
      await usersService.resetPassword(resetUser.id, newPassword);
      setSuccess(`Password for '${resetUser.email}' reset successfully.`);
      setTimeout(() => setSuccess(''), 4000);
      setResetUser(null);
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="user-management-page">
      <PageHeader
        title="User & Staff Administration"
        subtitle="Manage accounts, provision official authority & field officer credentials, and enforce access control."
      />

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <Card title="User Accounts Directory">
        <div className="table-filter-bar">
          <form className="search-form" onSubmit={handleSearchSubmit}>
            <input
              type="search"
              placeholder="Search by name, email, or mobile…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="btn secondary tiny">Search</button>
          </form>

          <div className="filter-group">
            <label>Filter Role:</label>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="administrator">Administrator</option>
              <option value="authority">Authority</option>
              <option value="district_officer">District Officer</option>
              <option value="field_officer">Field Officer</option>
              <option value="citizen">Citizen</option>
              <option value="family_member">Family Member</option>
            </select>
          </div>

          <button
            type="button"
            className="btn primary tiny"
            onClick={() => setCreateStaffOpen(true)}
            id="btn-create-staff-user"
          >
            + Create Staff User
          </button>
        </div>

        {loading ? (
          <p className="muted">Loading user accounts…</p>
        ) : !users.length ? (
          <p className="muted">No user accounts found matching your query.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Role</th>
                  <th>District</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><b>{u.full_name}</b></td>
                    <td>{u.email}</td>
                    <td>{u.phone || u.mobile_number || '—'}</td>
                    <td>
                      <span className="role-tag">{u.role.replace('_', ' ').toUpperCase()}</span>
                    </td>
                    <td>{u.district || '—'}</td>
                    <td>
                      <span className={`pill ${u.is_active !== false ? 'pill-success' : 'pill-danger'}`}>
                        {u.is_active !== false ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      <div className="btn-row">
                        <button
                          type="button"
                          className="btn tiny"
                          onClick={() => {
                            setEditUser(u);
                            setEditForm({
                              full_name: u.full_name,
                              phone: u.phone || u.mobile_number || '',
                              district: u.district || '',
                              role: u.role,
                            });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`btn tiny ${u.is_active !== false ? 'warning' : 'success'}`}
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.is_active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="btn tiny ghost"
                          onClick={() => {
                            setResetUser(u);
                            setNewPassword('');
                          }}
                        >
                          Reset Pwd
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

      {/* Modal: Create Staff User */}
      {createStaffOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Create Official Staff Account</h3>
            <p>
              Only Administrators can provision operational staff accounts. Public self-registration
              is strictly barred for these roles.
            </p>
            <form onSubmit={handleCreateStaff}>
              <label className="field">
                <span>Operational Role</span>
                <select
                  required
                  value={staffForm.role}
                  onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                >
                  <option value="authority">Disaster Management Authority</option>
                  <option value="district_officer">District Officer</option>
                  <option value="field_officer">Field Officer</option>
                  <option value="administrator">System Administrator</option>
                </select>
              </label>

              <label className="field">
                <span>Full Name</span>
                <input
                  required
                  value={staffForm.full_name}
                  onChange={e => setStaffForm({ ...staffForm, full_name: e.target.value })}
                  placeholder="Officer Full Name"
                />
              </label>

              <label className="field">
                <span>Email Address</span>
                <input
                  required
                  type="email"
                  value={staffForm.email}
                  onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="officer@disaster.gov.in"
                />
              </label>

              <label className="field">
                <span>Mobile Number</span>
                <input
                  type="tel"
                  value={staffForm.mobile_number}
                  onChange={e => setStaffForm({ ...staffForm, mobile_number: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label className="field">
                <span>District Jurisdiction</span>
                <input
                  value={staffForm.district}
                  onChange={e => setStaffForm({ ...staffForm, district: e.target.value })}
                  placeholder="e.g. Chennai, Nilgiris"
                />
              </label>

              <label className="field">
                <span>Initial Temporary Password</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={staffForm.password}
                  onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                />
                <small className="muted">Will be hashed securely with direct bcrypt.</small>
              </label>

              <div className="modal-actions">
                <button type="submit" className="btn primary">
                  Provision Staff Account
                </button>
                <button type="button" className="btn ghost" onClick={() => setCreateStaffOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editUser && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edit Account: {editUser.email}</h3>
            <form onSubmit={handleSaveEdit}>
              <label className="field">
                <span>Full Name</span>
                <input
                  required
                  value={editForm.full_name}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Mobile Number</span>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </label>

              <label className="field">
                <span>District</span>
                <input
                  value={editForm.district}
                  onChange={e => setEditForm({ ...editForm, district: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Role</span>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="administrator">Administrator</option>
                  <option value="authority">Disaster Management Authority</option>
                  <option value="district_officer">District Officer</option>
                  <option value="field_officer">Field Officer</option>
                  <option value="citizen">Citizen</option>
                  <option value="family_member">Family Member</option>
                </select>
              </label>

              <div className="modal-actions">
                <button type="submit" className="btn primary">
                  Save Changes
                </button>
                <button type="button" className="btn ghost" onClick={() => setEditUser(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetUser && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Reset Password for {resetUser.email}</h3>
            <p>
              Enter a new password for this user. As an administrator, you will <b>NEVER</b> see the
              user's old password.
            </p>
            <form onSubmit={handleResetPassword}>
              <label className="field">
                <span>New Password</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
                />
              </label>

              <div className="modal-actions">
                <button type="submit" className="btn danger">
                  Reset Password
                </button>
                <button type="button" className="btn ghost" onClick={() => setResetUser(null)}>
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
