import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const Header = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <header className="header">
      <div className="header-title">
        <h1>Welcome back, Admin! 👋</h1>
        <p>Here's what's happening in your community today.</p>
      </div>
      
      <div className="header-actions">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          backgroundColor: 'white',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          <span>{dateStr}, {timeStr}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
