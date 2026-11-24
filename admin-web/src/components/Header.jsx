import React, { useState, useEffect } from 'react';
import { MapPin, LogOut, ShieldCheck, ChevronDown, Building2 } from 'lucide-react';
import { AP_DISTRICTS } from '../data/apDistricts';

const Header = ({ adminUser, selectedDistrict, setSelectedDistrict, onLogout }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const isSuperAdmin = adminUser?.role === 'super_admin';

  return (
    <header className="header" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid var(--border-color)',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      <div className="header-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, color: '#111827' }}>
            {isSuperAdmin 
              ? (selectedDistrict === 'All Districts' ? 'State Administration' : `${selectedDistrict} District`)
              : `${adminUser?.district || 'District'} Administration`}
          </h1>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            backgroundColor: isSuperAdmin ? '#eff6ff' : '#dcfce7',
            color: isSuperAdmin ? '#1d4ed8' : '#15803d',
            border: `1px solid ${isSuperAdmin ? '#bfdbfe' : '#bbf7d0'}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <ShieldCheck size={12} />
            {isSuperAdmin ? 'Super Admin' : 'District Admin'}
          </span>
        </div>
        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Andhra Pradesh Municipal Grievance & Agent Operations
        </p>
      </div>
      
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
        {/* District Switcher (Available to Super-Admin) */}
        {isSuperAdmin ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem'
          }}>
            <MapPin size={16} color="#15803d" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>District:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="All Districts">🌐 All 26 Districts (State Overview)</option>
              {AP_DISTRICTS.map(d => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.hq})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '0.4rem 0.85rem'
          }}>
            <MapPin size={16} color="#15803d" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>
              {adminUser?.district} District
            </span>
          </div>
        )}

        {/* Date & Time */}
        <div style={{ 
          padding: '0.45rem 0.85rem',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          fontSize: '0.82rem',
          fontWeight: 500,
          color: '#4b5563'
        }}>
          {dateStr}, {timeStr}
        </div>

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign out of Admin Portal"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
