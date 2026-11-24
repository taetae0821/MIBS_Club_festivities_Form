import mysql from 'mysql2/promise';

const DB_NAME = process.env.DB_NAME ?? 'mibs_form';

const config = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  connectTimeout: 10_000,
  // 클라우드 MySQL(Aiven, TiDB Cloud 등)은 SSL 필수인 경우가 많아요 → DB_SSL=true
  // 인증서 검증 오류가 나면 DB_SSL_REJECT_UNAUTHORIZED=false
  ...(process.env.DB_SSL === 'true' && {
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    },
  }),
};

export let pool;

async function setup() {
  // DB가 없으면 만들기 (클라우드에선 권한이 없을 수 있어서 실패해도 계속 진행)
  try {
    const conn = await mysql.createConnection(config);
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
       DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci`,
    );
    await conn.end();
  } catch (err) {
    console.warn('CREATE DATABASE 건너뜀:', err.message);
  }

  const p = mysql.createPool({ ...config, database: DB_NAME, connectionLimit: 3 });

  await p.query(`
    CREATE TABLE IF NOT EXISTS students (
      id      INT PRIMARY KEY AUTO_INCREMENT,
      number  VARCHAR(10) NOT NULL UNIQUE,
      name    VARCHAR(10) NOT NULL,
      teacher VARCHAR(20) NOT NULL DEFAULT '',
      frame   VARCHAR(20) NOT NULL DEFAULT '',
      time    VARCHAR(10) NOT NULL UNIQUE
    )
  `);

  // 기존 테이블에 프레임 컬럼이 없으면 추가
  const [frameColumn] = await p.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND COLUMN_NAME = 'frame'`,
    [DB_NAME],
  );
  if (frameColumn.length === 0) {
    await p.query("ALTER TABLE students ADD COLUMN frame VARCHAR(20) NOT NULL DEFAULT ''");
  }

  // 기존 테이블에 선생님 컬럼이 없으면 추가
  const [teacherColumn] = await p.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND COLUMN_NAME = 'teacher'`,
    [DB_NAME],
  );
  if (teacherColumn.length === 0) {
    await p.query("ALTER TABLE students ADD COLUMN teacher VARCHAR(20) NOT NULL DEFAULT '' AFTER name");
  }

  // 이미 만들어진 테이블이면 time 에 UNIQUE 가 없을 수 있어서 추가
  const [idx] = await p.query(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students'
       AND COLUMN_NAME = 'time' AND NON_UNIQUE = 0`,
    [DB_NAME],
  );
  if (idx.length === 0) {
    await p.query('ALTER TABLE students ADD UNIQUE KEY uq_time (time)');
  }

  pool = p;
}

// 처음 요청이 올 때 한 번만 준비 (실패하면 다음 요청에서 다시 시도)
let ready;
export function initDb() {
  ready ??= setup().catch((err) => {
    ready = undefined;
    throw err;
  });
  return ready;
}
