import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLOR_PALETTE = [
  '#1B8C4A', // Green
  '#ea580c', // Orange
  '#3b82f6', // Blue
  '#9333ea', // Purple
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#84cc16'  // Lime
];

const CategoryChart = ({ reports }) => {
  // Process data for the chart by mapping to categories
  const categories = {};
  reports.forEach(report => {
    const cat = report.category || 'Others';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  const total = reports.length;
  
  const data = Object.keys(categories).map((key, index) => ({
    name: key,
    value: categories[key],
    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
    percentage: total > 0 ? ((categories[key] / total) * 100).toFixed(0) : 0
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'white', padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p>{`${payload[0].name} : ${payload[0].value} (${payload[0].payload.percentage}%)`}</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
  
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius={110}
            dataKey="value"
            labelLine={false}
            label={renderCustomizedLabel}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryChart;
