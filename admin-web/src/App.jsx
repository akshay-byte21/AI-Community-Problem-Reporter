import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutDashboard, FileText, ListTree, Building2, Users, FileBarChart, PieChart, Bell, Settings, MapPin, Plus } from 'lucide-react';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatCard from './components/StatCard';
import DashboardMap from './components/DashboardMap';
import DepartmentChart from './components/DepartmentChart';
import RecentComplaints from './components/RecentComplaints';
import UsersView from './components/UsersView';
import ComplaintsView from './components/ComplaintsView';
import CategoriesView from './components/CategoriesView';
import DepartmentsView from './components/DepartmentsView';

// Bypass localtunnel warning screen
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';
axios.defaults.headers.common['User-Agent'] = 'axios/0.21.1';

function App() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Hardcoded for now. In a real app, this comes from env vars.
  const API_URL = 'http://192.168.31.33:3000';

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/reports`);
        setReports(response.data.reports || []);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReports();
  }, []);

  // Calculate stats
  const totalComplaints = reports.length;
  const pendingCount = reports.filter(r => r.status === 'Pending' || r.status === 'Under Review').length;
  const resolvedCount = reports.filter(r => r.status === 'Completed' || r.status === 'Solved').length;
  const criticalCount = reports.filter(r => r.category === 'Road Damage' && (r.status === 'Pending' || r.status === 'In Progress')).length;

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <>
            <div className="stats-grid">
              <StatCard 
                title="Total Complaints" 
                value={totalComplaints} 
                icon={<FileText size={24} color="#1B8C4A" />} 
                iconBg="#d1fae5" 
                trend="+12.5%" 
              />
              <StatCard 
                title="Pending" 
                value={pendingCount} 
                icon={<PieChart size={24} color="#ea580c" />} 
                iconBg="#ffedd5" 
                trend="+8.3%" 
              />
              <StatCard 
                title="Completed" 
                value={resolvedCount} 
                icon={<Settings size={24} color="#16a34a" />} 
                iconBg="#dcfce7" 
                trend="+15.7%" 
              />
              <StatCard 
                title="Critical" 
                value={criticalCount} 
                icon={<Bell size={24} color="#ef4444" />} 
                iconBg="#fee2e2" 
                trend="+5.2%" 
                trendDanger={true}
              />
            </div>

            <div className="middle-grid">
              <div className="card">
                <h2 className="card-title">Complaint Map</h2>
                <DashboardMap reports={reports} />
              </div>
              <div className="card">
                <h2 className="card-title">Department Chart</h2>
                <DepartmentChart reports={reports} />
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className="card-title" style={{ marginBottom: 0 }}>Recent Complaints</h2>
                <button onClick={() => setActiveTab('Complaints')} style={{ background: 'none', border: 'none', color: '#1B8C4A', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>View All</button>
              </div>
              <RecentComplaints reports={reports} API_URL={API_URL} />
            </div>
          </>
        );
      case 'Complaints':
        return <ComplaintsView reports={reports} API_URL={API_URL} />;
      case 'Categories':
        return <CategoriesView reports={reports} />;
      case 'Departments':
        return <DepartmentsView reports={reports} API_URL={API_URL} />;
      case 'Users':
        return <UsersView API_URL={API_URL} reports={reports} />;
      case 'Reports':
      case 'Analytics':
        return (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <PieChart size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h2>{activeTab} Module</h2>
            <p>Detailed {activeTab.toLowerCase()} are generated weekly. Please check back soon.</p>
          </div>
        );
      default:
        return <div>Select a module</div>;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        <Header />
        
        {loading ? (
          <div>Loading data...</div>
        ) : (
          renderContent()
        )}
      </main>
    </div>
  );
}

export default App;
