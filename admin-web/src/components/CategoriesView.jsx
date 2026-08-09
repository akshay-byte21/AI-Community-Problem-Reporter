import React from 'react';
import CategoryChart from './CategoryChart';

const CategoriesView = ({ reports }) => {
  const categories = {};
  reports.forEach(report => {
    categories[report.category] = (categories[report.category] || 0) + 1;
  });

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-title">Category Breakdown</h2>
        <div style={{ height: '400px' }}>
          <CategoryChart reports={reports} />
        </div>
      </div>
      
      <div className="card">
        <h2 className="card-title">Category Details</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Total Complaints</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(categories).map(cat => (
                <tr key={cat}>
                  <td style={{ fontWeight: 500 }}>{cat}</td>
                  <td>{categories[cat]}</td>
                  <td>{((categories[cat] / reports.length) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CategoriesView;
