import jwt from 'jsonwebtoken';
import 'dotenv/config';

// Create a fake admin token using the JWT secret
const token = jwt.sign(
  { id: '64abc123', role: 'admin' }, 
  process.env.JWT_ACCESS_SECRET, 
  { expiresIn: '1d' }
);

console.log(token);
