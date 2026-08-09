import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, User, Phone } from 'lucide-react';

const DepartmentsView = ({ reports, API_URL }) => {
  const [staff, setStaff] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/staff`);
        setStaff(response.data.staff || []);
      } catch (error) {
        console.error('Error fetching staff:', error);
      }
    };
    fetchStaff();
  }, [API_URL]);

  const handleAssign = async (reportId, staffId) => {
    try {
      await axios.post(`${API_URL}/admin/reports/${reportId}/assign`, { staff_id: staffId });
      alert('Staff assigned successfully! Please refresh to see changes.');
    } catch (error) {
      alert('Failed to assign staff');
    }
  };

  const departments = {};
  reports.forEach(report => {
    const dept = report.department || 'Unassigned';
    departments[dept] = (departments[dept] || 0) + 1;
  });

  if (selectedDept) {
    const deptStaff = staff.filter(s => s.department === selectedDept);
    const deptReports = reports.filter(r => (r.department || 'Unassigned') === selectedDept);
    
    return (
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
          <button 
            onClick={() => setSelectedDept(null)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="card-title" style={{ marginBottom: 0 }}>{selectedDept} - Staff & Workload</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Staff List */}
          <div>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Available Staff</h3>
            {deptStaff.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No staff registered for this department.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {deptStaff.map(s => {
                  const assignedReports = deptReports.filter(r => r.assigned_staff_id === s.id);
                  return (
                    <div key={s.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        <User size={16} /> {s.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <Phone size={14} /> {s.phone}
                      </div>
                      <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{assignedReports.length}</span> active cases
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Department Complaints */}
          <div>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Recent Complaints in Department</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Issue</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deptReports.slice(0, 10).map(report => (
                    <tr key={report.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>#{report.id}</td>
                      <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {report.description}
                      </td>
                      <td>
                        <span className={`status-badge status-${report.status.toLowerCase().replace(' ', '')}`}>{report.status}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {report.staff_name ? report.staff_name : <span style={{ color: 'var(--danger-color)' }}>Unassigned</span>}
                      </td>
                      <td>
                        {!report.staff_name && deptStaff.length > 0 && (
                          <select 
                            style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}
                            onChange={(e) => {
                              if(e.target.value) handleAssign(report.id, e.target.value);
                            }}
                          >
                            <option value="">Assign...</option>
                            {deptStaff.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                  {deptReports.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center' }}>No complaints</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">Departments</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Department Name</th>
              <th>Total Complaints</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(departments).map(dept => (
              <tr key={dept}>
                <td style={{ fontWeight: 500 }}>{dept}</td>
                <td>{departments[dept]}</td>
                <td>
                  <button 
                    onClick={() => setSelectedDept(dept)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    View Staff & Assign
                  </button>
                </td>
              </tr>
            ))}
            {Object.keys(departments).length === 0 && (
              <tr><td colSpan="3" style={{ textAlign: 'center' }}>No departments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentsView;
