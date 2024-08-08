import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'movies_films',
    password: '10122001',
    port: 5432,
});

export default pool;