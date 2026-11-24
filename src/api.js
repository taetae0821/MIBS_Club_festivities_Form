// 백엔드 주소: 프로젝트 루트의 .env 파일에 VITE_API_URL=http://localhost:8080 처럼 적으면 됩니다.
// 비워두면 같은 서버(/api/...)로 요청합니다.
const API_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * 웨이팅 신청을 백엔드로 보냅니다.
 * 요청 본문(JSON): { studentId: "1101", name: "홍길동", teacher: "김선생님", frame: "핑크", time: "10:30" }
 */
export async function submitWaiting(data) {
  const res = await fetch(`${API_URL}/api/waiting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw await toError(res);

  // 응답 본문이 없어도 성공으로 처리
  return res.json().catch(() => null);
}

/** 이미 다른 사람이 선택한 시간 목록을 가져옵니다. (예: ["09:10", "10:30"]) */
export async function getTakenTimes() {
  const res = await fetch(`${API_URL}/api/waiting/times`);
  if (!res.ok) throw await toError(res);
  return res.json();
}

// ───── 관리자 ─────
const TOKEN_KEY = 'mibs_admin_token';
export const getAdminToken = () => sessionStorage.getItem(TOKEN_KEY);

export async function adminLogin(password) {
  const res = await fetch(`${API_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw await toError(res);
  const { token } = await res.json();
  sessionStorage.setItem(TOKEN_KEY, token);
}

export async function adminLogout() {
  const token = getAdminToken();
  sessionStorage.removeItem(TOKEN_KEY);
  if (token) {
    await fetch(`${API_URL}/api/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
}

/** 전체 신청 목록 (관리자 전용). 토큰이 만료되면 err.status === 401 */
export async function getWaitingList() {
  const res = await fetch(`${API_URL}/api/waiting`, {
    headers: { Authorization: `Bearer ${getAdminToken() ?? ''}` },
  });
  if (res.status === 401) sessionStorage.removeItem(TOKEN_KEY);
  if (!res.ok) throw await toError(res);
  return res.json();
}

// 서버 에러 응답 { code, message } 를 Error 로 변환
async function toError(res) {
  let body = {};
  try {
    body = await res.json();
  } catch {
    // 응답이 JSON이 아니면 무시
  }
  const err = new Error(body.message || `서버 오류가 발생했어요. (${res.status})`);
  err.code = body.code;
  err.status = res.status;
  return err;
}
