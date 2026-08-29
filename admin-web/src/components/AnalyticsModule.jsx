import React from 'react';
import { PieChart, TrendingUp, AlertTriangle } from 'lucide-react';
import DepartmentChart from './DepartmentChart';

const AnalyticsModule = ({ reports }) => {
  if (!reports || reports.length === 0) {
    return <div className="card">No data available for analytics.</div>;
  }

  // Calculate most common category
  const categoryCounts = reports.reduce((acc, report) => {
    acc[report.category] = (acc[report.category] || 0) + 1;
    return acc;
  }, {});
  
  const topCategory = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b);
  
  // Calculate most common department
  const deptCounts = reports.reduce((acc, report) => {
    acc[report.department] = (acc[report.department] || 0) + 1;
    return acc;
  }, {});
  
  const topDepartment = Object.keys(deptCounts).reduce((a, b) => deptCounts[a] > deptCounts[b] ? a : b);

  // Calculate resolution rate
  const resolved = reports.filter(r => r.status === 'Completed' || r.status === 'Solved').length;
  const resolutionRate = ((resolved / reports.length) * 100).toFixed(1);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <PieChart size={24} color="var(--primary-color)" />
        <h2 className="card-title" style={{ marginBottom: 0 }}>AI Analytics Summary</h2>
      </div>

      <div style={{ backgroundColor: '#f0fdf4', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', marginBottom: '1rem', fontSize: '1.1rem' }}>
          <TrendingUp size={20} /> Executive Summary
        </h3>
        <p style={{ color: '#14532d', lineHeight: '1.6', fontSize: '1.05rem', marginBottom: '1rem' }}>
          Based on the data, the most complaints registered belong to the <strong>{topCategory}</strong> category, heavily impacting the <strong>{topDepartment}</strong> department.
        </p>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', marginBottom: '0.5rem' }}>
            <AlertTriangle size={16} /> Root Cause Analysis
          </h4>
          <p style={{ color: '#451a03', lineHeight: '1.5', fontSize: '0.95rem' }}>
            The high volume of <strong>{topCategory}</strong> complaints indicates a systemic problem. It is highly recommended that the <strong>{topDepartment}</strong> allocates additional resources or conducts a targeted inspection in affected locations. Currently, the overall resolution rate across all departments is {resolutionRate}%.
          </p>
        </div>
      </div>

      <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Department Breakdown</h3>
      <DepartmentChart reports={reports} />
    </div>
  );
};

export default AnalyticsModule;
