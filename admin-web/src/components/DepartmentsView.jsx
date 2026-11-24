import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, User, Phone, Plus, Check, X, MapPin } from 'lucide-react';
import { AP_DISTRICTS } from '../data/apDistricts';

const DepartmentsView = ({ reports = [], API_URL, selectedDistrict = 'All Districts' }) => {
  const [staff, setStaff] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentDistrict, setNewAgentDistrict] = useState(selectedDistrict !== 'All Districts' ? selectedDistrict : 'Visakhapatnam');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep modal district in sync with header district
  useEffect(() => {
    if (selectedDistrict && selectedDistrict !== 'All Districts') {
      setNewAgentDistrict(selectedDistrict);
    }
  }, [selectedDistrict]);

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

  const handleAssign = async (reportId, staffId) => {
    try {
      await axios.post(`${API_URL}/admin/reports/${reportId}/assign`, { staff_id: staffId });
      alert('Staff assigned successfully!');
      await fetchStaff();
    } catch (error) {
      alert('Failed to assign staff');
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    const cleanedPhone = newAgentPhone.replace(/\D/g, '');
    if (!newAgentName.trim()) {
      alert('Please enter agent name');
      return;
    }
    if (cleanedPhone.length !== 10) {
      alert('Phone number must be exactly 10 digits');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/admin/staff`, {
        name: newAgentName.trim(),
        phone: cleanedPhone,
        department: selectedDept,
        district: newAgentDistrict
      });
      alert(`Agent ${newAgentName} added successfully to ${newAgentDistrict} (${selectedDept})!`);
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

  // Filter reports for the active district
  const filteredReports = reports.filter(r => {
    if (!selectedDistrict || selectedDistrict === 'All Districts') return true;
    return (r.district || '').toLowerCase() === selectedDistrict.toLowerCase();
  });

  const departments = {};
  filteredReports.forEach(report => {
    const dept = report.department || 'Unassigned';
    departments[dept] = (departments[dept] || 0) + 1;
  });

  if (selectedDept) {
    const normalize = (str) => (str || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
    const normSelected = normalize(selectedDept);
    
    // Filter staff for department and district
    let deptStaff = staff.filter(s => {
      const matchesDept = normalize(s.department) === normSelected || normalize(s.department).includes(normSelected);
      if (!matchesDept) return false;

      if (!selectedDistrict || selectedDistrict === 'All Districts') return true;
      return (s.district || '').toLowerCase() === selectedDistrict.toLowerCase();
    });

    if (deptStaff.length === 0 && (!selectedDistrict || selectedDistrict === 'All Districts')) {
      deptStaff = staff;
    }

    const deptReports = filteredReports.filter(r => (r.department || 'Unassigned') === selectedDept);
    
    return (
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setSelectedDept(null)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="card-title" style={{ marginBottom: '0.2rem' }}>{selectedDept} - Workload & Agents</h2>
            <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>
              📍 Jurisdiction: {selectedDistrict} ({deptStaff.length} Agents Available)
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Staff List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem' }}>
                {selectedDistrict !== 'All Districts' ? `${selectedDistrict} Agents` : 'All District Agents'}
              </h3>
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {deptStaff.map(s => (
                <div key={s.id} style={{ 
                  padding: '0.85rem 1rem', 
                  borderRadius: '8px', 
                  backgroundColor: 'var(--bg-primary)', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <User size={16} color="var(--primary-color)" />
                      {s.name}
                    </div>
                    <span style={{ fontSize: '0.72rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                      {s.district || 'Visakhapatnam'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Phone size={14} />
                    {s.phone || 'No phone registered'}
                  </div>
                </div>
              ))}
              {deptStaff.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  No agents registered in {selectedDistrict} for this department yet. Click "+ Add Agent" to onboard one.
                </div>
              )}
            </div>
          </div>

          {/* Reports Assigned to this Department */}
          <div>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '1rem' }}>
              Active Complaints ({deptReports.length})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Assigned Agent</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deptReports.slice(0, 15).map(report => (
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
                                <option value="" disabled>Reassign ({selectedDistrict})...</option>
                                {deptStaff
                                  .filter(s => s.name !== report.staff_name && s.id !== report.assigned_staff_id)
                                  .map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.district || 'General'})
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
                              <option value="" disabled>Assign ({selectedDistrict})...</option>
                              {deptStaff.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.district || 'General'})</option>
                              ))}
                            </select>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                  {deptReports.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center' }}>No complaints in {selectedDept} for {selectedDistrict}</td></tr>
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
                Register a field agent for <strong>{selectedDept}</strong>. They will use their 10-digit mobile number to log in to the Agent App.
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      Phone Number (Login ID)
                    </label>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: newAgentPhone.length === 10 ? '#15803d' : 'var(--text-secondary)',
                      fontWeight: newAgentPhone.length === 10 ? 600 : 400
                    }}>
                      {newAgentPhone.length}/10 digits
                    </span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={newAgentPhone}
                    onChange={(e) => setNewAgentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    District (Jurisdiction)
                  </label>
                  <select
                    value={newAgentDistrict}
                    onChange={(e) => setNewAgentDistrict(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.9rem', boxSizing: 'border-box', backgroundColor: '#fff' }}
                  >
                    {AP_DISTRICTS.map(d => (
                      <option key={d.id} value={d.name}>{d.name} ({d.hq})</option>
                    ))}
                  </select>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h2 className="card-title" style={{ marginBottom: '0.25rem' }}>Municipal Departments</h2>
          <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>
            📍 Active Jurisdiction: {selectedDistrict}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {Object.entries(departments).map(([dept, count]) => (
          <div 
            key={dept}
            onClick={() => setSelectedDept(dept)}
            style={{
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{dept}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {count} {count === 1 ? 'complaint' : 'complaints'} in {selectedDistrict}
              </p>
            </div>
            <div style={{ marginTop: '1rem', color: 'var(--primary-color)', fontSize: '0.875rem', fontWeight: 600 }}>
              Manage Agents & Tasks &rarr;
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentsView;
