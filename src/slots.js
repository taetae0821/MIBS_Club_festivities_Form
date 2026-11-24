// 선택 가능한 시간대 설정 (필요하면 여기만 바꾸면 됩니다)
// 시간 선택 화면과 관리자 차트가 함께 사용합니다.
export const START = '08:30';
export const END = '12:20';
export const INTERVAL_MIN = 10;

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

function makeSlots(start, end, interval) {
  const slots = [];
  for (let t = toMin(start); t < toMin(end); t += interval) {
    const h = String(Math.floor(t / 60)).padStart(2, '0');
    const m = String(t % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
}

export const SLOTS = makeSlots(START, END, INTERVAL_MIN);
