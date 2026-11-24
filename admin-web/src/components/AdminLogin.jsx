import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Lock, User, MapPin, Building2, ChevronRight, CheckCircle2 } from 'lucide-react';
import { AP_DISTRICTS } from '../data/apDistricts';

const AdminLogin = ({ onLogin, API_URL }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedQuickDistrict, setSelectedQuickDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_URL}/admin/login`, {
        username: username.trim(),
        password: password.trim()
      });

      const { token, admin } = res.data;
      onLogin(token, admin);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Invalid credentials. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDistrictSelect = (districtCode) => {
    setSelectedQuickDistrict(districtCode);
    if (!districtCode) return;

    if (districtCode === 'super_admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername(`admin_${districtCode}`);
      setPassword(`${districtCode}@123`);
    }
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: '1px solid #e5e7eb'
      }}>
        {/* Header Banner */}
        <div style={{
          backgroundColor: '#15803d',
          padding: '2rem 1.75rem',
          color: '#ffffff',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            marginBottom: '0.75rem'
          }}>
            <Building2 size={30} color="#ffffff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Government of Andhra Pradesh
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: '#dcfce7', opacity: 0.9 }}>
            Municipal Administration & Urban Grievance Portal
          </p>
          <div style={{
            display: 'inline-block',
            marginTop: '0.75rem',
            padding: '0.2rem 0.65rem',
            backgroundColor: '#166534',
            borderRadius: '9999px',
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            26 Districts Portal
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '2rem 1.75rem' }}>
          {/* Quick Access Demo Selector */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.9rem',
            marginBottom: '1.5rem'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '0.45rem'
            }}>
              <MapPin size={14} color="#15803d" /> Quick Select District (Demo Access):
            </label>
            <select
              value={selectedQuickDistrict}
              onChange={(e) => handleQuickDistrictSelect(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Choose a District Account --</option>
              <option value="super_admin">🏛️ State Super-Admin (All 26 Districts)</option>
              <optgroup label="26 Andhra Pradesh Districts">
                {AP_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.name} District ({d.hq})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              borderRadius: '8px',
              fontSize: '0.82rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 500
            }}>
              <span>⚠️ {error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                Officer Username
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '11px', color: '#9ca3af' }}>
                  <User size={18} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. admin_visakhapatnam or admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                Security Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '11px', color: '#9ca3af' }}>
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="Enter district credentials"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.92rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s'
              }}
            >
              <ShieldCheck size={18} />
              {loading ? 'Authenticating...' : 'Open District Dashboard'}
            </button>
          </form>

          {/* Credentials Guide Info */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b' }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Default Access Credentials:</p>
            <p style={{ margin: 0 }}>• <strong>Super Admin:</strong> <code>admin</code> / <code>admin123</code></p>
            <p style={{ margin: 0 }}>• <strong>Any District:</strong> <code>admin_&lt;code&gt;</code> / <code>&lt;code&gt;@123</code> (e.g. <code>admin_visakhapatnam</code> / <code>visakhapatnam@123</code>)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
