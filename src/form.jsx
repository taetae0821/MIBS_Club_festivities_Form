import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function Form() {
  const navigate = useNavigate();
  const location = useLocation();

  // 시간 페이지에서 "이전"으로 돌아오면 입력값 유지
  const [studentId, setStudentId] = useState(location.state?.studentId ?? '');
  const [name, setName] = useState(location.state?.name ?? '');
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

    navigate('/time', { state: { studentId: id, name: n } });
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <p className="title">웨이팅 폼</p>
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

      {error && <p className="error">{error}</p>}

      <button type="submit" className="btn primary">
        시간 정하러 가기
      </button>
    </form>
  );
}

export default Form;
