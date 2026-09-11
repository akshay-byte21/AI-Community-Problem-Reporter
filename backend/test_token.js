const jwt = require('jsonwebtoken');
require('dotenv').config();
const token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET || 'secret123', { expiresIn: '7d' });
console.log(token);
