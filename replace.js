const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  const replacements = [
    [/staff members/g, 'Agents'],
    [/Staff members/g, 'Agents'],
    [/staff member/g, 'Agent'],
    [/Staff member/g, 'Agent'],
    [/Assign Staff/g, 'Assign Agent'],
    [/Assign staff/g, 'Assign Agent'],
    [/Available Staff/g, 'Available Agents'],
    [/View Staff/g, 'View Agents'],
    [/Staff Assigned/g, 'Agent Assigned'],
    [/Staff \& Workload/g, 'Agents & Workload'],
    [/Select Staff/g, 'Select Agent'],
    [/staff_name \?/g, 'staff_name ?'], // just a dummy to show we preserve vars
  ];

  for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fullPath.includes('node_modules') || fullPath.includes('.git') || fullPath.includes('dist')) continue;
    
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
      replaceInFile(fullPath);
    }
  }
}

walk(path.join(__dirname, 'admin-web'));
walk(path.join(__dirname, 'frontend'));
