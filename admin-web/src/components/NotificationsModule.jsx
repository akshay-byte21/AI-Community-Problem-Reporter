import React from 'react';
import { Bell, Clock } from 'lucide-react';

const NotificationsModule = ({ notifications, onClear }) => {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Bell size={24} color="var(--primary-color)" />
          <h2 className="card-title" style={{ marginBottom: 0 }}>Live Notifications</h2>
        </div>
        {notifications.length > 0 && (
          <button 
            onClick={onClear}
            style={{ background: 'none', border: '1px solid var(--border-color)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            Clear All
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <Bell size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
          <p>No new notifications at this time.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Listening for live updates...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map(n => (
            <div key={n.id} style={{ padding: '1rem', borderLeft: '4px solid var(--primary-color)', backgroundColor: '#f8fafc', borderRadius: '0 8px 8px 0' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{n.title}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{n.message}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                <Clock size={12} /> {n.time}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsModule;
