import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, User, Phone, Plus, Check, X } from 'lucide-react';

// DepartmentsView: to handle client requests for DepartmentsView and it processes the request to interact with database/AI and returns a response
const DepartmentsView = ({ reports, API_URL }) => {
  const [staff, setStaff] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // fetchStaff: to handle client requests for fetchStaff and it processes the request to interact with database/AI and returns a response
  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/staff`);
      setStaff(response.data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [API_URL]);

  // handleAssign: to handle client requests for handleAssign and it processes the request to interact with database/AI and returns a response
  const handleAssign = async (reportId, staffId) => {
    try {
      await axios.post(`${API_URL}/admin/reports/${reportId}/assign`, { staff_id: staffId });
      alert('Staff assigned successfully! Please refresh to see changes.');
      await fetchStaff();
    } catch (error) {
      alert('Failed to assign staff');
    }
  };

  // handleCreateAgent: Admin-only function to register a new agent in this department
  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentPhone.trim()) {
      alert('Please enter agent name and phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/admin/staff`, {
        name: newAgentName.trim(),
        phone: newAgentPhone.trim(),
        department: selectedDept
      });
      alert(`Agent ${newAgentName} added successfully to ${selectedDept}!`);
      setNewAgentName('');
      setNewAgentPhone('');
      setShowAddModal(false);
      await fetchStaff();
    } catch (err) {
      console.error('Error creating agent:', err);
      alert(err.response?.data?.error || 'Failed to create agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const departments = {};
  reports.forEach(report => {
    const dept = report.department || 'Unassigned';
    departments[dept] = (departments[dept] || 0) + 1;
  });

  if (selectedDept) {
    const normalize = (str) => (str || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
    const normSelected = normalize(selectedDept);
    
    let deptStaff = staff.filter(s => normalize(s.department) === normSelected);
    if (deptStaff.length === 0) {
      deptStaff = staff.filter(s => {
        const sDept = normalize(s.department);
        return sDept.includes(normSelected) || normSelected.includes(sDept);
      });
    }
    if (deptStaff.length === 0) {
      deptStaff = staff; // Ultimate fallback
    }
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
          <h2 className="card-title" style={{ marginBottom: 0 }}>{selectedDept} - Agents & Workload</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Staff List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Available Agents</h3>
              <button 
                onClick={() => setShowAddModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'var(--primary-color)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Create a new field agent in this department"
              >
                <Plus size={15} /> Add Agent
              </button>
            </div>

            {deptStaff.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No Agents registered for this department.</p>
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
                        {report.staff_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.55rem',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              borderRadius: '9999px',
                              fontWeight: 600
                            }}>
                              <Check size={12} /> Assigned
                            </span>
                            {deptStaff.filter(s => s.name !== report.staff_name && s.id !== report.assigned_staff_id).length > 0 && (
                              <select 
                                style={{ 
                                  padding: '0.25rem 0.45rem', 
                                  borderRadius: '6px', 
                                  border: '1px solid var(--border-color)', 
                                  fontSize: '0.78rem',
                                  backgroundColor: '#fff',
                                  cursor: 'pointer'
                                }}
                                value=""
                                onChange={(e) => {
                                  if(e.target.value) handleAssign(report.id, e.target.value);
                                }}
                              >
                                <option value="" disabled>Reassign...</option>
                                {deptStaff
                                  .filter(s => s.name !== report.staff_name && s.id !== report.assigned_staff_id)
                                  .map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                        ) : (
                          deptStaff.length > 0 && (
                            <select 
                              style={{ 
                                padding: '0.3rem 0.5rem', 
                                borderRadius: '6px', 
                                border: '1px solid var(--primary-color)', 
                                color: 'var(--primary-color)',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                backgroundColor: '#fff',
                                cursor: 'pointer'
                              }}
                              value=""
                              onChange={(e) => {
                                if(e.target.value) handleAssign(report.id, e.target.value);
                              }}
                            >
                              <option value="" disabled>Assign...</option>
                              {deptStaff.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          )
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

        {/* Add Agent Modal */}
        {showAddModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '10px', width: '420px', maxWidth: '90%', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>Add New Agent</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <X size={20} />
                </button>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Register a field agent for <strong>{selectedDept}</strong>. They will use their phone number to log into the Agent App.
              </p>
              
              <form onSubmit={handleCreateAgent}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Agent Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Phone Number (Login ID)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={newAgentPhone}
                    onChange={(e) => setNewAgentPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Department
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedDept}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#f9fafb', color: '#6b7280', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{ background: 'none', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, fontSize: '0.875rem' }}
                  >
                    {isSubmitting ? 'Adding...' : 'Create Agent'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
                  <button onClick={() => setSelectedDept(dept)} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>
                    View Agents & Assign
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
