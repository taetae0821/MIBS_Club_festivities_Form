import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getTakenTimes, submitWaiting } from './api.js';
import { SLOTS } from './slots.js';

function Time() {
  const navigate = useNavigate();
  const location = useLocation();
  const info = location.state; // { studentId, name }

  const [time, setTime] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done
  const [error, setError] = useState('');
  const [taken, setTaken] = useState([]); // 이미 선택된 시간들

  // 서버에서 선택된 시간 목록을 받아와 반영
  const loadTaken = useCallback(() => {
    return getTakenTimes()
      .then((list) => {
        setTaken(list);
        // 고른 시간이 그 사이 다른 사람에게 선택되면 선택 해제
        setTime((cur) => {
          if (cur && list.includes(cur)) {
            setError('선택한 시간이 방금 마감됐어요. 다른 시간을 골라 주세요.');
            return '';
          }
          return cur;
        });
      })
      .catch(() => setError('시간 목록을 불러오지 못했어요. 새로고침해 주세요.'));
  }, []);

  // 처음 들어올 때 + 10초마다 갱신 (다른 사람이 고른 시간 반영)
  useEffect(() => {
    const first = setTimeout(loadTaken, 0);
    const id = setInterval(loadTaken, 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [loadTaken]);

  // 학번/이름 없이 바로 들어오면 첫 페이지로
  if (!info?.studentId || !info?.name || !info?.frame) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!time) {
      setError('시간을 선택해 주세요.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const chosen = time;
      await submitWaiting({ studentId: info.studentId, name: info.name, frame: info.frame, time: chosen });
      // 전송 중에 목록 갱신이 내 신청을 '마감'으로 보고 선택을 지웠을 수 있어서 다시 지정
      setTime(chosen);
      setError('');
      setStatus('done');
    } catch (err) {
      setError(err.message || '신청에 실패했어요. 다시 시도해 주세요.');
      setStatus('idle');
      if (err.code === 'TIME_TAKEN') {
        setTime('');
        loadTaken();
      }
    }
  }

  if (status === 'done') {
    return (
      <div className="card">
        <p className="title">신청 완료!</p>
        <p className="subtitle">아래 내용으로 웨이팅이 등록되었어요.</p>
        <dl className="summary">
          <dt>학번</dt>
          <dd>{info.studentId}</dd>
          <dt>이름</dt>
          <dd>{info.name}</dd>
          <dt>프레임</dt>
          <dd>{info.frame}</dd>
          <dt>시간</dt>
          <dd>{time}</dd>
        </dl>
        <button type="button" className="btn primary" onClick={() => navigate('/', { replace: true })}>
          처음으로
        </button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <p className="title">시간 선택</p>
      <p className="subtitle">
        {info.studentId} {info.name}님 · 프레임 {info.frame}, 원하는 시간을 골라 주세요.
      </p>

      <div className="slotGrid" role="radiogroup" aria-label="시간 선택">
        {SLOTS.map((slot) => {
          const isTaken = taken.includes(slot);
          return (
          <button
            key={slot}
            type="button"
            role="radio"
            aria-checked={time === slot}
            aria-disabled={isTaken}
            title={isTaken ? '마감된 시간' : undefined}
            className={`slot${time === slot ? ' selected' : ''}${isTaken ? ' taken' : ''}`}
            onClick={() => {
              if (isTaken) {
                setError('이미 다른 사람이 선택했어요.');
                return;
              }
              setTime(slot);
              setError('');
            }}
          >
            {slot}
          </button>
          );
        })}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="btnRow">
        <button
          type="button"
          className="btn secondary"
          onClick={() => navigate('/', { state: info })}
          disabled={status === 'loading'}
        >
          이전
        </button>
        <button type="submit" className="btn primary" disabled={status === 'loading'}>
          {status === 'loading' ? '신청 중…' : '신청하기'}
        </button>
      </div>
    </form>
  );
}

export default Time;
