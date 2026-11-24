import React, { useState, useEffect, useRef } from 'react';
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
import ReportsModule from './components/ReportsModule';
import AnalyticsModule from './components/AnalyticsModule';
import NotificationsModule from './components/NotificationsModule';
import AdminLogin from './components/AdminLogin';

// Bypass localtunnel warning screen
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';
axios.defaults.headers.common['User-Agent'] = 'axios/0.21.1';

function App() {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    try {
      const savedUser = localStorage.getItem('admin_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.role === 'district_admin' && parsed.district) {
          return parsed.district;
        }
      }
      return 'All Districts';
    } catch (e) {
      return 'All Districts';
    }
  });

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [notifications, setNotifications] = useState([]);
  
  const prevReportsRef = useRef([]);
  const prevUsersRef = useRef([]);

  // Use relative path when served by the backend directly
  const API_URL = '';

  const handleLogin = (token, admin) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(admin));
    setAdminUser(admin);
    if (admin.role === 'district_admin' && admin.district) {
      setSelectedDistrict(admin.district);
    } else {
      setSelectedDistrict('All Districts');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdminUser(null);
    setSelectedDistrict('All Districts');
  };

  useEffect(() => {
    if (!adminUser) return;

    const fetchReports = async () => {
      try {
        const distParam = (adminUser.role === 'district_admin') 
          ? `?district=${encodeURIComponent(adminUser.district)}`
          : (selectedDistrict && selectedDistrict !== 'All Districts' ? `?district=${encodeURIComponent(selectedDistrict)}` : '');

        const response = await axios.get(`${API_URL}/admin/reports${distParam}`);
        const newReports = response.data.reports || [];
        
        // Detect new or updated reports for live notifications
        if (prevReportsRef.current.length > 0) {
          const prevMap = new Map(prevReportsRef.current.map(r => [r.id, r]));
          const newNotifs = [];
          
          newReports.forEach(r => {
            const prev = prevMap.get(r.id);
            if (!prev) {
              newNotifs.push({
                id: `new_${r.id}_${Date.now()}`,
                title: 'New Complaint Registered',
                message: `[${r.district || 'District'}] A new complaint (${r.category}) was submitted in ${r.department}.`,
                time: new Date().toLocaleTimeString()
              });
            } else if (prev.status !== r.status) {
              newNotifs.push({
                id: `upd_${r.id}_${Date.now()}`,
                title: 'Complaint Status Updated',
                message: `Complaint #${r.id} status changed from ${prev.status} to ${r.status}.`,
                time: new Date().toLocaleTimeString()
              });
            }
          });
          
          if (newNotifs.length > 0) {
            setNotifications(prev => [...newNotifs, ...prev]);
          }
        }
        
        prevReportsRef.current = newReports;
        setReports(newReports);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUsersForNotifications = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/users`);
        const newUsers = response.data.users || [];
        
        if (prevUsersRef.current.length > 0 && newUsers.length > prevUsersRef.current.length) {
          const prevIds = new Set(prevUsersRef.current.map(u => u.id));
          const newNotifs = [];
          
          newUsers.forEach(u => {
            if (!prevIds.has(u.id)) {
              newNotifs.push({
                id: `user_${u.id}_${Date.now()}`,
                title: 'New User Registered',
                message: `A new citizen (${u.name || 'Citizen'}) has joined the platform.`,
                time: new Date().toLocaleTimeString()
              });
            }
          });
          
          if (newNotifs.length > 0) {
            setNotifications(prev => [...newNotifs, ...prev]);
          }
        }
        
        prevUsersRef.current = newUsers;
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchReports();
    fetchUsersForNotifications();

    const intervalId = setInterval(() => {
      fetchReports();
      fetchUsersForNotifications();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [adminUser, selectedDistrict]);

  // If not logged in, render the District Login Portal
  if (!adminUser) {
    return <AdminLogin onLogin={handleLogin} API_URL={API_URL} />;
  }

  // Filter reports strictly for the active district
  const filteredReports = reports.filter(r => {
    if (!selectedDistrict || selectedDistrict === 'All Districts') return true;
    return (r.district || '').trim().toLowerCase() === selectedDistrict.trim().toLowerCase();
  });

  // Calculate MoM trend
  const calculateTrend = (filterFn) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const filtered = filterFn ? filteredReports.filter(filterFn) : filteredReports;
    
    let currCount = 0;
    let prevCount = 0;

    filtered.forEach(r => {
      const d = new Date(r.created_at);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) currCount++;
      else if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) prevCount++;
    });

    if (prevCount === 0) return currCount > 0 ? '+100%' : '0%';
    const pct = ((currCount - prevCount) / prevCount) * 100;
    return (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
  };

  // Calculate stats for active district
  const totalComplaints = filteredReports.length;
  const pendingFilter = r => r.status === 'Pending' || r.status === 'Under Review' || r.status === 'In Progress';
  const resolvedFilter = r => r.status === 'Completed' || r.status === 'Solved';
  const criticalFilter = r => r.category === 'Road Damage' && (r.status === 'Pending' || r.status === 'In Progress');

  const pendingCount = filteredReports.filter(pendingFilter).length;
  const resolvedCount = filteredReports.filter(resolvedFilter).length;
  const criticalCount = filteredReports.filter(criticalFilter).length;

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <>
            <div className="stats-grid">
              <StatCard 
                title={selectedDistrict === 'All Districts' ? 'Total Complaints (State)' : `Complaints (${selectedDistrict})`} 
                value={totalComplaints} 
                icon={<FileText size={24} color="#1B8C4A" />} 
                iconBg="#d1fae5" 
                trend={calculateTrend()} 
              />
              <StatCard 
                title="Pending / Active" 
                value={pendingCount} 
                icon={<PieChart size={24} color="#ea580c" />} 
                iconBg="#ffedd5" 
                trend={calculateTrend(pendingFilter)} 
              />
              <StatCard 
                title="Resolved" 
                value={resolvedCount} 
                icon={<Settings size={24} color="#16a34a" />} 
                iconBg="#dcfce7" 
                trend={calculateTrend(resolvedFilter)} 
              />
              <StatCard 
                title="Critical" 
                value={criticalCount} 
                icon={<Bell size={24} color="#ef4444" />} 
                iconBg="#fee2e2" 
                trend={calculateTrend(criticalFilter)} 
                trendDanger={true}
              />
            </div>

            <div className="middle-grid">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 className="card-title" style={{ marginBottom: 0 }}>
                    {selectedDistrict === 'All Districts' ? 'Statewide Complaint Map' : `${selectedDistrict} District Map`}
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>
                    Active Problems
                  </span>
                </div>
                <DashboardMap reports={filteredReports} selectedDistrict={selectedDistrict} />
              </div>
              <div className="card">
                <h2 className="card-title">Department Distribution</h2>
                <DepartmentChart reports={filteredReports} />
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className="card-title" style={{ marginBottom: 0 }}>Recent Complaints ({selectedDistrict})</h2>
                <button onClick={() => setActiveTab('Complaints')} style={{ background: 'none', border: 'none', color: '#1B8C4A', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>View All</button>
              </div>
              <RecentComplaints reports={filteredReports} API_URL={API_URL} />
            </div>
          </>
        );
      case 'Complaints':
        return <ComplaintsView reports={filteredReports} API_URL={API_URL} />;
      case 'Categories':
        return <CategoriesView reports={filteredReports} />;
      case 'Departments':
        return <DepartmentsView reports={filteredReports} API_URL={API_URL} selectedDistrict={selectedDistrict} />;
      case 'Users':
        return <UsersView API_URL={API_URL} reports={filteredReports} />;
      case 'Reports':
        return <ReportsModule reports={filteredReports} API_URL={API_URL} />;
      case 'Analytics':
        return <AnalyticsModule reports={filteredReports} />;
      case 'Notifications':
        return <NotificationsModule notifications={notifications} onClear={() => setNotifications([])} />;
      default:
        return <div>Select a module</div>;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={notifications.length} />
      
      <main className="main-content">
        <Header 
          adminUser={adminUser}
          selectedDistrict={selectedDistrict}
          setSelectedDistrict={setSelectedDistrict}
          onLogout={handleLogout}
        />
        
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            Loading district data...
          </div>
        ) : (
          renderContent()
        )}
      </main>
    </div>
  );
}

export default App;
