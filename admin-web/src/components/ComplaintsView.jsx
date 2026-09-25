import React from 'react';
import RecentComplaints from './RecentComplaints';

// ComplaintsView: to handle client requests for ComplaintsView and it processes the request to interact with database/AI and returns a response
const ComplaintsView = ({ reports, API_URL }) => {
  return (
    <div className="card">
      <h2 className="card-title">All Complaints</h2>
      <RecentComplaints reports={reports} API_URL={API_URL} />
    </div>
  );
};

export default ComplaintsView;
