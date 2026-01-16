export function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
export function lerp(a, b, t){ return a + (b-a)*t; }
export function rand(a, b){ return a + Math.random()*(b-a); }
export function dist(ax, ay, bx, by){ const dx=ax-bx, dy=ay-by; return Math.hypot(dx,dy); }
export function nowMs(){ return performance.now(); }

export function formatTime(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const m = Math.floor(s/60);
  const r = s%60;
  return `${m}:${String(r).padStart(2,"0")}`;
}

export function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch{ return fallback; }
}
export function saveJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export function pick(list){
  return list[Math.floor(Math.random()*list.length)];
}
