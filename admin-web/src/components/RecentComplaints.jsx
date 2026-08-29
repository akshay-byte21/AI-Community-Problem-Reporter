import React, { useState, useEffect } from 'react';
import { Eye, X, UserPlus } from 'lucide-react';
import axios from 'axios';

const RecentComplaints = ({ reports, API_URL }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [assignModal, setAssignModal] = useState({ isOpen: false, report: null });
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');

  const getBadgeClass = (category) => {
    const cls = category.toLowerCase().replace(' ', '');
    return `badge badge-${cls}`;
  };

  const getStatusClass = (status) => {
    const cls = status.toLowerCase().replace(' ', '');
    return `status-badge status-${cls}`;
  };

  const getPriorityClass = (priority) => {
    return `priority-badge priority-${priority.toLowerCase()}`;
  };

  const getPriority = (category) => {
    if (category === 'Road Damage' || category === 'Water Supply') return 'High';
    if (category === 'Street Light') return 'Medium';
    return 'Low';
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}\n${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  };

  const handleAssignClick = async (report) => {
    setAssignModal({ isOpen: true, report });
    try {
      const response = await axios.get(`${API_URL}/admin/staff`);
      const allStaff = response.data.staff || [];
      setStaffList(allStaff.filter(s => s.department === report.department));
    } catch (err) {
      console.error(err);
    }
  };

  const submitAssignment = async () => {
    if (!selectedStaff) return;
    try {
      await axios.put(`${API_URL}/admin/reports/${assignModal.report.id}/assign`, { staff_id: selectedStaff });
      setAssignModal({ isOpen: false, report: null });
      // Force reload by refreshing page or ideally via state upstream. For simplicity:
      window.location.reload();
    } catch (err) {
      console.error('Error assigning staff:', err);
      alert('Failed to assign staff.');
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Recent Complaints</h2>
        <button style={{ color: 'var(--primary-color)', background: 'none', border: 'none', fontWeight: 500, cursor: 'pointer' }}>
          View All
        </button>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Complaint</th>
            <th>Category</th>
            <th>Location</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Reported By</th>
            <th>Reported On</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {reports.slice(0, 10).map((report) => {
            const priority = getPriority(report.category);
            return (
              <tr key={report.id}>
                <td style={{ color: 'var(--text-secondary)' }}>#{report.id}</td>
                <td>
                  <div className="complaint-cell">
                    {report.image_url ? (
                      <img 
                        src={`${API_URL}${report.image_url}`} 
                        alt="issue" 
                        className="complaint-img" 
                        onClick={() => setSelectedImage(report)}
                        style={{ cursor: 'pointer', border: '1px solid #ef4444' }}
                      />
                    ) : (
                      <div className="complaint-img" style={{ backgroundColor: '#e5e7eb' }}></div>
                    )}
                    {report.resolution_image_url && (
                      <img 
                        src={`${API_URL}${report.resolution_image_url}`} 
                        alt="resolved" 
                        className="complaint-img" 
                        onClick={() => setSelectedImage(report)}
                        style={{ cursor: 'pointer', marginLeft: '4px', border: '1px solid #10b981' }}
                      />
                    )}
                    <span style={{ fontWeight: 500, maxWidth: '150px' }}>{report.description.substring(0, 40)}{report.description.length > 40 ? '...' : ''}</span>
                  </div>
                </td>
                <td>
                  <span className={getBadgeClass(report.category)}>{report.category}</span>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{report.address || 'Unknown'}</td>
                <td>
                  <span className={getPriorityClass(priority)}>{priority}</span>
                </td>
                <td>
                  <span className={getStatusClass(report.status)}>{report.status}</span>
                  {!report.staff_name && (
                    <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '0.2rem' }}>Unassigned</div>
                  )}
                  {report.staff_name && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--primary-color)', marginTop: '0.2rem' }}>Assigned: {report.staff_name}</div>
                  )}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {report.user_name || report.user_identifier || 'Anonymous'}
                </td>
                <td style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{formatDate(report.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button 
                      onClick={() => (report.image_url || report.resolution_image_url) && setSelectedImage(report)}
                      style={{ background: 'none', border: 'none', cursor: (report.image_url || report.resolution_image_url) ? 'pointer' : 'default', color: (report.image_url || report.resolution_image_url) ? 'var(--primary-color)' : 'var(--text-secondary)' }}
                      title="View Images"
                    >
                      <Eye size={18} />
                    </button>
                    {!report.staff_name && (
                      <button 
                        onClick={() => handleAssignClick(report)}
                        style={{ background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        title="Assign Agent"
                      >
                        <UserPlus size={14} /> Assign
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div style={{ position: 'relative', width: '90%', height: '80%', display: 'flex', justifyContent: 'center', gap: '20px' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
              style={{
                position: 'absolute', top: '-40px', right: '0',
                background: 'none', border: 'none', color: 'white', cursor: 'pointer'
              }}
            >
              <X size={32} />
            </button>

            {/* Before Image */}
            {selectedImage.image_url && (
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <h3 style={{color: 'white', marginBottom: '10px'}}>Reported Issue</h3>
                <img 
                  src={`${API_URL}${selectedImage.image_url}`} 
                  alt="Reported Issue" 
                  style={{ maxWidth: '100%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', border: '2px solid #ef4444' }} 
                  onClick={(e) => e.stopPropagation()} 
                />
              </div>
            )}

            {/* After Image */}
            {selectedImage.resolution_image_url && (
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <h3 style={{color: 'white', marginBottom: '10px'}}>Agent Resolution</h3>
                <img 
                  src={`${API_URL}${selectedImage.resolution_image_url}`} 
                  alt="Resolved Issue" 
                  style={{ maxWidth: '100%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', border: '2px solid #10b981' }} 
                  onClick={(e) => e.stopPropagation()} 
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal.isOpen && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}
        >
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Assign Agent</h3>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Select an Agent from the <strong>{assignModal.report.department}</strong> department to handle this issue.</p>
            
            <select 
              value={selectedStaff} 
              onChange={(e) => setSelectedStaff(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}
            >
              <option value="">-- Select Agent --</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
              ))}
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={() => setAssignModal({ isOpen: false, report: null })}
                style={{ background: 'none', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={submitAssignment}
                disabled={!selectedStaff}
                style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: selectedStaff ? 'pointer' : 'not-allowed', opacity: selectedStaff ? 1 : 0.6 }}
              >
                Assign Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentComplaints;
