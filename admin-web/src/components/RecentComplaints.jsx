import React from 'react';
import { Eye } from 'lucide-react';

const RecentComplaints = ({ reports, API_URL }) => {
  const getBadgeClass = (category) => {
    const cls = category.toLowerCase().replace(' ', '');
    return `badge badge-${cls}`;
  };

  const getStatusClass = (status) => {
    const cls = status.toLowerCase().replace(' ', '');
    return `status-badge status-${cls}`;
  };

  const getPriority = (category) => {
    if (category === 'Road Damage' || category === 'Water Leakage') return 'High';
    if (category === 'Garbage') return 'Medium';
    return 'Low';
  };

  const getPriorityClass = (priority) => {
    return `priority-${priority.toLowerCase()}`;
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}\n${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  };

  return (
    <div className="table-container">
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
                      <img src={`${API_URL}${report.image_url}`} alt="issue" className="complaint-img" />
                    ) : (
                      <div className="complaint-img" style={{ backgroundColor: '#e5e7eb' }}></div>
                    )}
                    <span style={{ fontWeight: 500, maxWidth: '200px' }}>{report.description.substring(0, 40)}{report.description.length > 40 ? '...' : ''}</span>
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
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {report.user_name || report.user_identifier || 'Anonymous'}
                </td>
                <td style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{formatDate(report.created_at)}</td>
                <td>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RecentComplaints;
