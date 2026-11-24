import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FRAMES } from './frames.js';
import { TEACHERS } from './teachers.js';

function Form() {
  const navigate = useNavigate();
  const location = useLocation();

  // 시간 페이지에서 "이전"으로 돌아오면 입력값 유지
  const [studentId, setStudentId] = useState(location.state?.studentId ?? '');
  const [name, setName] = useState(location.state?.name ?? '');
  const [teacher, setTeacher] = useState(location.state?.teacher ?? '');
  const [frame, setFrame] = useState(location.state?.frame ?? '');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const id = studentId.trim();
    const n = name.trim();

    if (!/^\d{4,5}$/.test(id)) {
      setError('학번을 숫자 4자리로 입력해 주세요. (예: 1101)');
      return;
    }
    if (!n) {
      setError('이름을 입력해 주세요.');
      return;
    }
    if (!teacher) {
      setError('같이 찍을 선생님을 선택해 주세요.');
      return;
    }
    if (!frame) {
      setError('프레임을 선택해 주세요.');
      return;
    }

    navigate('/time', { state: { studentId: id, name: n, teacher, frame } });
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <p className="title">MIBS 인생네컷 웨이팅</p>
      <p className="location">📍 3층 방송실에서 촬영</p>
      <p className="subtitle">학번과 이름을 입력해 주세요.</p>

      <div className="inputGroup">
        <label className="field">
          <span>학번</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="1101"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
          />
        </label>
        <label className="field">
          <span>이름</span>
          <input
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
        </label>
      </div>

      <div className="frameSection">
        <span className="frameTitle">선생님 선택</span>
        <div className="frameGrid" role="radiogroup" aria-label="선생님 선택">
          {TEACHERS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={teacher === option}
              className={`frameOption${teacher === option ? ' selected' : ''}`}
              onClick={() => {
                setTeacher(option);
                setError('');
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="frameSection">
        <span className="frameTitle">프레임 선택</span>
        <div className="frameGrid" role="radiogroup" aria-label="프레임 선택">
          {FRAMES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={frame === option}
              className={`frameOption${frame === option ? ' selected' : ''}`}
              onClick={() => {
                setFrame(option);
                setError('');
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="btn primary">
        시간 정하러 가기
      </button>
    </form>
  );
}

export default Form;
