import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminLogin, adminLogout, getAdminToken, getWaitingList } from './api.js';
import { INTERVAL_MIN, SLOTS } from './slots.js';

// '10:20' + 10분 → '10:30'
function addMin(t, m) {
  const [h, mm] = t.split(':').map(Number);
  const total = h * 60 + mm + m;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ───── 로그인 화면 ─────
function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await adminLogin(password);
      onLogin();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <p className="title">관리자</p>
      <p className="subtitle">관리자 비밀번호를 입력해 주세요.</p>
      <div className="inputGroup">
        <label className="field">
          <span>비밀번호</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
          />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn primary" disabled={loading}>
        {loading ? '확인 중…' : '로그인'}
      </button>
    </form>
  );
}

// ───── 시간대별 신청 수 막대 차트 ─────
function HourlyChart({ list }) {
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null); // 클릭한 시간대 ('09' 등)

  // SLOTS 를 1시간 단위로 묶어서 [{ hour: '09', capacity: 6, booked: 2 }, ...]
  const data = useMemo(() => {
    const takenSet = new Set(list.map((r) => r.time));
    const byHour = new Map();
    for (const slot of SLOTS) {
      const hour = slot.slice(0, 2);
      const row = byHour.get(hour) ?? { hour, capacity: 0, booked: 0 };
      row.capacity += 1;
      if (takenSet.has(slot)) row.booked += 1;
      byHour.set(hour, row);
    }
    return [...byHour.values()];
  }, [list]);

  const max = Math.max(1, ...data.map((d) => d.capacity));
  const step = Math.max(1, Math.ceil(max / 3));
  const ticks = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);

  return (
    <figure className="chart">
      <figcaption className="chartTitle">시간대별 신청 수</figcaption>
      <div className="chartBody">
        {/* y축 눈금 + 가로 그리드 */}
        <div className="chartGrid" aria-hidden="true">
          {ticks.map((v) => (
            <div key={v} className="gridLine" style={{ bottom: `${(v / max) * 100}%` }}>
              <span>{v}</span>
            </div>
          ))}
        </div>

        {/* 막대 */}
        <div className="chartBars">
          {data.map((d, i) => (
            <div
              key={d.hour}
              className={`barCol${selected === d.hour ? ' active' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={selected === d.hour}
              aria-label={`${d.hour}시: ${d.booked}명 신청, ${d.capacity}자리 중. 눌러서 자세히 보기`}
              onClick={() => setSelected((cur) => (cur === d.hour ? null : d.hour))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected((cur) => (cur === d.hour ? null : d.hour));
                }
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <div className="barTrack">
                {d.booked > 0 && (
                  <div className="bar" style={{ height: `${(d.booked / max) * 100}%` }} />
                )}
                {hover === i && (
                  <div className="tooltip" style={{ bottom: `${(d.booked / max) * 100}%` }}>
                    <strong>{d.hour}시</strong>
                    <span>
                      {d.booked}명 / {d.capacity}자리
                    </span>
                  </div>
                )}
              </div>
              <span className="barLabel">{d.hour}시</span>
            </div>
          ))}
        </div>
      </div>
      {selected ? (
        <HourDetail hour={selected} list={list} onClose={() => setSelected(null)} />
      ) : (
        <p className="chartHint">막대를 클릭하면 그 시간대의 상세 신청 현황이 보여요.</p>
      )}
    </figure>
  );
}

// ───── 선택한 시간대의 상세 (몇 분 ~ 몇 분: 학번 이름) ─────
function HourDetail({ hour, list, onClose }) {
  const byTime = new Map(list.map((r) => [r.time, r]));
  const slots = SLOTS.filter((slot) => slot.startsWith(`${hour}:`));
  const booked = slots.filter((slot) => byTime.has(slot)).length;

  return (
    <div className="hourDetail">
      <div className="hourDetailHeader">
        <strong>{hour}시 상세</strong>
        <span>
          {booked}명 / {slots.length}자리
        </span>
        <button type="button" className="closeBtn" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>
      <ul className="slotList">
        {slots.map((slot) => {
          const r = byTime.get(slot);
          return (
            <li key={slot} className={r ? 'filled' : 'open'}>
              <span className="slotRange">
                {slot} ~ {addMin(slot, INTERVAL_MIN)}
              </span>
              {r ? (
                <span className="slotWho">
                  <span className="slotId">{r.studentId}</span>
                  {r.name}
                  {r.frame && <span>{r.frame}</span>}
                </span>
              ) : (
                <span className="slotEmpty">비어 있음</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ───── 관리자 대시보드 ─────
function Dashboard({ onLogout }) {
  const [list, setList] = useState([]);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(() => {
    return getWaitingList()
      .then((rows) => {
        setList(rows);
        setError('');
        setUpdatedAt(new Date());
      })
      .catch((err) => {
        if (err.status === 401) onLogout();
        else setError(err.message || '목록을 불러오지 못했어요.');
      });
  }, [onLogout]);

  // 처음 + 10초마다 갱신
  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(load, 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  const total = SLOTS.length;
  const booked = list.length;

  return (
    <div className="card wide">
      <div className="adminHeader">
        <div>
          <p className="title">신청 현황</p>
          <p className="subtitle">
            {updatedAt ? `${updatedAt.toLocaleTimeString('ko-KR')} 기준 · 10초마다 자동 갱신` : '불러오는 중…'}
          </p>
        </div>
        <button
          type="button"
          className="btn secondary small"
          onClick={async () => {
            await adminLogout();
            onLogout();
          }}
        >
          로그아웃
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="stats">
        <div className="stat">
          <span>신청</span>
          <strong>{booked}명</strong>
        </div>
        <div className="stat">
          <span>남은 자리</span>
          <strong>{total - booked}자리</strong>
        </div>
        <div className="stat">
          <span>전체</span>
          <strong>{total}자리</strong>
        </div>
      </div>

      <HourlyChart list={list} />

      <p className="sectionTitle">신청 목록</p>
      {list.length === 0 ? (
        <p className="empty">아직 신청이 없어요.</p>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>시간</th>
                <th>학번</th>
                <th>이름</th>
                <th>프레임</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>{r.time}</td>
                  <td>{r.studentId}</td>
                  <td>{r.name}</td>
                  <td>{r.frame || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Admin() {
  const [authed, setAuthed] = useState(() => !!getAdminToken());
  const handleLogout = useCallback(() => setAuthed(false), []);

  return authed ? (
    <Dashboard onLogout={handleLogout} />
  ) : (
    <AdminLogin onLogin={() => setAuthed(true)} />
  );
}

export default Admin;
