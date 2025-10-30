import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '7070'),
  database: process.env.DB_NAME || 'sbay',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text: string, params?: unknown[]): Promise<QueryResult> => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('Executed query', { text, duration, rows: res.rowCount });
  }
  
  return res;
};

export const getClient = () => {
  return pool.connect();
};

export default pool;
