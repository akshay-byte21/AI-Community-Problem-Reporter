import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Search } from 'lucide-react';

const UsersView = ({ API_URL, reports }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/users`);
        setUsers(response.data.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [API_URL]);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  };

  if (loading) return <div>Loading users...</div>;

  if (selectedUser) {
    const userReports = reports.filter(r => r.user_id === selectedUser.id);
    return (
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
          <button 
            onClick={() => setSelectedUser(null)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="card-title" style={{ marginBottom: 0 }}>{selectedUser.name || 'Anonymous'}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedUser.identifier}</p>
          </div>
        </div>

        <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Complaint History</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Issue</th>
                <th>Department</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {userReports.map(report => (
                <tr key={report.id}>
                  <td style={{ color: 'var(--text-secondary)' }}>#{report.id}</td>
                  <td style={{ fontWeight: 500 }}>{report.category}</td>
                  <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {report.description}
                  </td>
                  <td>{report.department || <span style={{ color: 'var(--text-secondary)' }}>Unassigned</span>}</td>
                  <td>
                    <span className={`status-badge status-${report.status.toLowerCase().replace(' ', '')}`}>{report.status}</span>
                  </td>
                  <td>
                    {report.staff_name ? report.staff_name : <span style={{ color: 'var(--text-secondary)' }}>-</span>}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(report.created_at)}</td>
                </tr>
              ))}
              {userReports.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No complaints found for this user</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    const nameMatch = (user.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const idMatch = (user.identifier || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || idMatch;
  });

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>Registered Users</h2>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.6rem 1rem 0.6rem 2.2rem', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Phone Number</th>
              <th>Total Complaints</th>
              <th>Joined Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td style={{ color: 'var(--text-secondary)' }}>#{user.id}</td>
                <td style={{ fontWeight: 500 }}>{user.name || 'Anonymous'}</td>
                <td>{user.identifier}</td>
                <td><span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{user.complaints_count || 0}</span></td>
                <td style={{ color: 'var(--text-secondary)' }}>{formatDate(user.created_at)}</td>
                <td>
                  <button 
                    onClick={() => setSelectedUser(user)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    View History
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersView;
