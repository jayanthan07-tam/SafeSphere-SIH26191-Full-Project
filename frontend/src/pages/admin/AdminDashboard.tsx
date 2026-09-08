import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Stat } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { usersService } from '../../services/users';
import { sosService } from '../../services/sos';
import type { SOS, User } from '../../types';

export default function AdminDashboard() {
  const nav = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [sosList, setSosList] = useState<SOS[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      usersService.listUsers(),
      sosService.getAllSOS(),
    ]).then(([u, s]) => {
      setUsers(u);
      setSosList(s);
      setLoading(false);
    });
  }, []);

  const admins = users.filter(u => u.role === 'administrator');
  const authorities = users.filter(u => u.role === 'authority');
  const districtOfficers = users.filter(u => u.role === 'district_officer');
  const fieldOfficers = users.filter(u => u.role === 'field_officer');
  const citizens = users.filter(u => u.role === 'citizen');
  const familyMembers = users.filter(u => u.role === 'family_member');
  const activeSOS = sosList.filter(s => s.status !== 'resolved');

  return (
    <div className="admin-dashboard">
      <PageHeader
        title="System Administration & Command"
        subtitle="Platform user governance, role management, staff provisioning, and system health monitoring."
      />

      <div className="stat-grid">
        <Stat label="Total Registered Accounts" value={users.length} />
        <Stat label="Authorities & Officers" value={authorities.length + districtOfficers.length + fieldOfficers.length} />
        <Stat label="Citizens & Families" value={citizens.length + familyMembers.length} />
        <Stat label="Active Incident Load" value={activeSOS.length} />
      </div>

      <div className="grid-2">
        <Card title="User Breakdown by Operational Role">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role Designation</th>
                  <th>Account Count</th>
                  <th>Management Scope</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Administrators</b></td>
                  <td>{admins.length}</td>
                  <td>Full platform configuration, user provisioning</td>
                </tr>
                <tr>
                  <td><b>Disaster Management Authority</b></td>
                  <td>{authorities.length}</td>
                  <td>Statewide crisis monitoring, dispatch control</td>
                </tr>
                <tr>
                  <td><b>District Officers</b></td>
                  <td>{districtOfficers.length}</td>
                  <td>Habitations, shelters, district logistics</td>
                </tr>
                <tr>
                  <td><b>Field Officers</b></td>
                  <td>{fieldOfficers.length}</td>
                  <td>On-ground rescue, photo verification</td>
                </tr>
                <tr>
                  <td><b>Citizens</b></td>
                  <td>{citizens.length}</td>
                  <td>Household heads, emergency contacts</td>
                </tr>
                <tr>
                  <td><b>Family Members</b></td>
                  <td>{familyMembers.length}</td>
                  <td>Linked family safety check-ins</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button className="btn primary" onClick={() => nav('/admin/users')}>
              Manage Users & Staff Accounts →
            </button>
          </div>
        </Card>

        <Card title="System Health & Security Audit">
          <div className="audit-list">
            <div className="audit-item">
              <span className="dot dot-success"></span>
              <div>
                <b>Direct Bcrypt Encryption Active</b>
                <small className="muted block">72-byte safe password hashing enforced across all accounts.</small>
              </div>
            </div>
            <div className="audit-item">
              <span className="dot dot-success"></span>
              <div>
                <b>Public Self-Registration Enforced</b>
                <small className="muted block">Strictly restricted to Citizens and Family Members. Staff accounts secured.</small>
              </div>
            </div>
            <div className="audit-item">
              <span className="dot dot-success"></span>
              <div>
                <b>Role Authorization Guards</b>
                <small className="muted block">Strict role-based login matching prevents silent privilege escalation.</small>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
