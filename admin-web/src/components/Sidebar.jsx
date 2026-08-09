import React from 'react';
import { LayoutDashboard, FileText, ListTree, Building2, Users, FileBarChart, PieChart, Bell, Settings, MapPin } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <MapPin size={28} />
        <div>
          Community<br />Problem Reporter
        </div>
      </div>
      
      <nav className="nav-links">
        <button className={`nav-link ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('Dashboard')}>
          <LayoutDashboard size={20} /> Dashboard
        </button>
        <button className={`nav-link ${activeTab === 'Complaints' ? 'active' : ''}`} onClick={() => setActiveTab('Complaints')}>
          <FileText size={20} /> Complaints
        </button>
        <button className={`nav-link ${activeTab === 'Categories' ? 'active' : ''}`} onClick={() => setActiveTab('Categories')}>
          <ListTree size={20} /> Categories
        </button>
        <button className={`nav-link ${activeTab === 'Departments' ? 'active' : ''}`} onClick={() => setActiveTab('Departments')}>
          <Building2 size={20} /> Departments
        </button>
        <button className={`nav-link ${activeTab === 'Users' ? 'active' : ''}`} onClick={() => setActiveTab('Users')}>
          <Users size={20} /> Users
        </button>
        <button className={`nav-link ${activeTab === 'Reports' ? 'active' : ''}`} onClick={() => setActiveTab('Reports')}>
          <FileBarChart size={20} /> Reports
        </button>
        <button className={`nav-link ${activeTab === 'Analytics' ? 'active' : ''}`} onClick={() => setActiveTab('Analytics')}>
          <PieChart size={20} /> Analytics
        </button>
      </nav>
      
      <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <button className="nav-link">
          <Bell size={20} /> Notifications
        </button>
        <button className="nav-link">
          <Settings size={20} /> Settings
        </button>
        
        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
          <img 
            src="https://ui-avatars.com/api/?name=Admin+User&background=1B8C4A&color=fff" 
            alt="Admin" 
            style={{ width: '40px', height: '40px', borderRadius: '50%' }}
          />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Admin User</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>admin@example.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
