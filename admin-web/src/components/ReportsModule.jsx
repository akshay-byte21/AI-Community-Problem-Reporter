import React, { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import RecentComplaints from './RecentComplaints';

const ReportsModule = ({ reports, API_URL }) => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filteredReports = reports.filter(report => {
    if (statusFilter !== 'All' && report.status !== statusFilter) return false;
    if (categoryFilter !== 'All' && report.category !== categoryFilter) return false;
    return true;
  });

  const exportToCSV = () => {
    const headers = ['ID', 'Category', 'Description', 'Department', 'Location', 'Status', 'Reported By', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredReports.map(r => 
        [
          r.id, 
          `"${r.category}"`, 
          `"${(r.description || '').replace(/"/g, '""')}"`, 
          `"${r.department}"`, 
          `"${r.address || ''}"`, 
          r.status, 
          `"${r.user_name || r.user_identifier || 'Anonymous'}"`,
          `"${new Date(r.created_at).toLocaleString()}"`
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `community_reports_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueCategories = [...new Set(reports.map(r => r.category))];
  const uniqueStatuses = [...new Set(reports.map(r => r.status))];

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>Generate Reports</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Filter and export complaint data for your records.</p>
        </div>
        <button 
          onClick={exportToCSV}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            backgroundColor: 'var(--primary-color)', color: 'white', 
            border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', 
            cursor: 'pointer', fontWeight: 500 
          }}
        >
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Filter size={18} /> Filters:
        </div>
        
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
        >
          <option value="All">All Statuses</option>
          {uniqueStatuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
        >
          <option value="All">All Categories</option>
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <RecentComplaints reports={filteredReports} API_URL={API_URL} />
    </div>
  );
};

export default ReportsModule;
