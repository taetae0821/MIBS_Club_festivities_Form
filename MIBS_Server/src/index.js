import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { initDb, pool } from './db.js';

const app = express();
const PORT = Number(process.env.PORT ?? 8080);

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

const STUDENT_ID_RE = /^\d{4,5}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FRAMES = new Set(['검정/초록', '빨강/하늘', '핑크']);

// ───── 관리자 인증 ─────
// .env 의 ADMIN_PASSWORD 로 로그인하면 서명된 토큰을 발급합니다.
// 서버 메모리에 저장하지 않아서 Vercel 처럼 서버가 자주 바뀌어도 로그인이 유지돼요.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || `mibs:${ADMIN_PASSWORD}`;
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8시간

const sign = (data) => crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function makeToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig || !ADMIN_PASSWORD || !safeEqual(sig, sign(payload))) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
  const token = (req.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!verifyToken(token)) {
    return res.status(401).json({ message: '관리자 로그인이 필요해요.' });
  }
  next();
}

app.post('/api/admin/login', async (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ message: '서버에 ADMIN_PASSWORD 가 설정되지 않았어요.' });
  }
  const password = String(req.body?.password ?? '');
  if (!safeEqual(password, ADMIN_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 500)); // 무작위 대입 늦추기
    return res.status(401).json({ message: '비밀번호가 틀렸어요.' });
  }
  res.json({ token: makeToken() });
});

// 토큰은 브라우저에서 지우면 끝 (서버에 저장하지 않음)
app.post('/api/admin/logout', (req, res) => {
  res.status(204).end();
});

// DB가 필요한 요청 전에 DB 준비 (실패해도 서버가 죽지 않고 에러 응답)
app.use('/api', async (req, res, next) => {
  if (req.path.startsWith('/admin/')) return next();
  try {
    await initDb();
    next();
  } catch (err) {
    console.error('DB 연결 실패:', err.message);
    res.status(503).json({ message: 'DB에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.' });
  }
});

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
  const frame = String(req.body?.frame ?? '').trim();
  const time = String(req.body?.time ?? '').trim();

  if (!STUDENT_ID_RE.test(studentId)) {
    return res.status(400).json({ message: '학번 형식이 올바르지 않아요.' });
  }
  if (!name || name.length > 10) {
    return res.status(400).json({ message: '이름은 1~10자로 입력해 주세요.' });
  }
  if (!FRAMES.has(frame)) {
    return res.status(400).json({ message: '프레임을 선택해 주세요.' });
  }
  if (!TIME_RE.test(time)) {
    return res.status(400).json({ message: '시간 형식이 올바르지 않아요.' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO students (number, name, frame, time) VALUES (?, ?, ?, ?)',
      [studentId, name, frame, time],
    );
    res.status(201).json({ id: result.insertId, studentId, name, frame, time });
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

// 신청 목록 조회 (시간순) - 관리자 전용
app.get('/api/waiting', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, number AS studentId, name, frame, time
       FROM students ORDER BY time, id`,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했어요.' });
  }
});

// 로컬에서 실행할 때만 직접 포트를 엽니다. (Vercel 은 export 된 app 을 사용)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
    initDb().catch((err) => {
      console.error('DB 연결 실패:', err.message);
      console.error('.env 의 DB_HOST / DB_USER / DB_PASSWORD 를 확인하세요.');
    });
  });
}

export default app;
