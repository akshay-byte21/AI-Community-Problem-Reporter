import React from 'react';

// StatCard: to handle client requests for StatCard and it processes the request to interact with database/AI and returns a response
const StatCard = ({ title, value, icon, iconBg, trend, trendDanger }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: iconBg }}>
        {icon}
      </div>
      <div className="stat-info">
        <h3>{title}</h3>
        <div className="stat-value">{value}</div>
        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
          <span style={{ color: trendDanger ? 'var(--danger-color)' : 'var(--success-color)', fontWeight: 600 }}>
            {trend}
          </span> from last month
        </div>
      </div>
    </div>
  );
};

export default StatCard;
