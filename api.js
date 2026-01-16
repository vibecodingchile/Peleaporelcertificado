import { API_BASE } from "./config.js";

function hasBackend(){
  return typeof API_BASE === "string" && API_BASE.trim().length > 0;
}

export async function submitScoreOnline({ token, score, roleId, diffId, levelId, timeMs, kills }){
  if(!hasBackend()) return { ok:false, reason:"no-backend" };

  const res = await fetch(`${API_BASE}/api/score`, {
    method: "POST",
    headers: {
      "Content-Type":"application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ score, roleId, diffId, levelId, timeMs, kills }),
  });
  if(!res.ok) return { ok:false, reason:`http-${res.status}` };
  return { ok:true, data: await res.json() };
}

export async function getLeaderboardOnline(limit=20){
  if(!hasBackend()) return { ok:false, reason:"no-backend" };
  const res = await fetch(`${API_BASE}/api/leaderboard?limit=${encodeURIComponent(limit)}`);
  if(!res.ok) return { ok:false, reason:`http-${res.status}` };
  return { ok:true, data: await res.json() };
}

export async function registerOnline({ email, password, displayName }){
  if(!hasBackend()) return { ok:false, reason:"no-backend" };
  const res = await fetch(`${API_BASE}/api/register`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });
  if(!res.ok) return { ok:false, reason:`http-${res.status}` };
  return { ok:true, data: await res.json() };
}

export async function loginOnline({ email, password }){
  if(!hasBackend()) return { ok:false, reason:"no-backend" };
  const res = await fetch(`${API_BASE}/api/login`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ email, password }),
  });
  if(!res.ok) return { ok:false, reason:`http-${res.status}` };
  return { ok:true, data: await res.json() };
}
