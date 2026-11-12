import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb, pool } from './db.js';

const app = express();
const PORT = Number(process.env.PORT ?? 8080);

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

const STUDENT_ID_RE = /^\d{4,5}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// 서버/DB 상태 확인
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, message: 'DB에 연결할 수 없어요.' });
  }
});

// 웨이팅 신청
app.post('/api/waiting', async (req, res) => {
  const studentId = String(req.body?.studentId ?? '').trim();
  const name = String(req.body?.name ?? '').trim();
  const time = String(req.body?.time ?? '').trim();

  if (!STUDENT_ID_RE.test(studentId)) {
    return res.status(400).json({ message: '학번 형식이 올바르지 않아요.' });
  }
  if (!name || name.length > 10) {
    return res.status(400).json({ message: '이름은 1~10자로 입력해 주세요.' });
  }
  if (!TIME_RE.test(time)) {
    return res.status(400).json({ message: '시간 형식이 올바르지 않아요.' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO students (number, name, time) VALUES (?, ?, ?)',
      [studentId, name, time],
    );
    res.status(201).json({ id: result.insertId, studentId, name, time });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      // 어떤 UNIQUE 에 걸렸는지 구분 (메시지 예: ... for key 'students.uq_time')
      if (/time/.test(err.sqlMessage)) {
        return res
          .status(409)
          .json({ code: 'TIME_TAKEN', message: '이미 다른 사람이 선택한 시간이에요. 다른 시간을 골라 주세요.' });
      }
      return res.status(409).json({ code: 'DUPLICATE_STUDENT', message: '이미 신청한 학번이에요.' });
    }
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했어요.' });
  }
});

// 이미 선택된 시간 목록 (예: ["09:10", "10:30"])
app.get('/api/waiting/times', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT time FROM students');
    res.json(rows.map((r) => r.time));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했어요.' });
  }
});

// 신청 목록 조회 (시간순)
app.get('/api/waiting', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, number AS studentId, name, time
       FROM students ORDER BY time, id`,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했어요.' });
  }
});

try {
  await initDb();
  app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
  });
} catch (err) {
  console.error('DB 연결 실패:', err.message);
  console.error('.env 의 DB_USER / DB_PASSWORD 를 확인하세요.');
  process.exit(1);
}
