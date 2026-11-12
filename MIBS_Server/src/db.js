import mysql from 'mysql2/promise';

const config = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
};
const DB_NAME = process.env.DB_NAME ?? 'mibs_form';

export let pool;

// DB와 테이블이 없으면 만들고, 커넥션 풀을 준비합니다.
export async function initDb() {
  const conn = await mysql.createConnection(config);
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
     DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci`,
  );
  await conn.end();

  pool = mysql.createPool({ ...config, database: DB_NAME, connectionLimit: 10 });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id      INT PRIMARY KEY AUTO_INCREMENT,
      number  VARCHAR(10) NOT NULL UNIQUE,
      name    VARCHAR(10) NOT NULL,
      time    VARCHAR(10) NOT NULL UNIQUE
    )
  `);

  // 이미 만들어진 테이블이면 time 에 UNIQUE 가 없을 수 있어서 추가
  const [idx] = await pool.query(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students'
       AND COLUMN_NAME = 'time' AND NON_UNIQUE = 0`,
    [DB_NAME],
  );
  if (idx.length === 0) {
    await pool.query('ALTER TABLE students ADD UNIQUE KEY uq_time (time)');
  }
}
