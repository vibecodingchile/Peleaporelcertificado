import { createEngine } from "./engine.js";
import { createGame } from "./game.js";
import { createInput } from "./input.js";
import { createUI } from "./ui.js";
import { LEVELS } from "./levels.js";
import { DIFFICULTIES, ROLES } from "./roles.js";
import { clamp, formatTime, nowMs } from "./utils.js";
import { initPWA } from "./pwa.js";

const uiWrap = createUI();
const { ui, settings } = uiWrap;

initPWA();

const touchControls = document.getElementById("touchControls");
function setTouchControlsVisible(v){
  if(!touchControls) return;
  if(v) touchControls.classList.remove("hidden");
  else touchControls.classList.add("hidden");
}

// --- Pantalla completa (desktop y móvil) ---
const btnFullscreen = document.getElementById("btnFullscreen");
const btnTouchFullscreen = document.getElementById("btnTouchFullscreen");

function toggleFullscreen(){
  const stage = ui.canvas?.closest?.('.stage') || document.documentElement;
  try{
    if(!document.fullscreenElement){
      stage.requestFullscreen?.({ navigationUI: 'hide' });
    }else{
      document.exitFullscreen?.();
    }
  }catch(err){
    console.warn('Fullscreen no disponible:', err);
  }
}

function syncFullscreenIcon(){
  const active = !!document.fullscreenElement;
  if(btnFullscreen) btnFullscreen.textContent = active ? '⛶✓' : '⛶';
  if(btnTouchFullscreen) btnTouchFullscreen.textContent = active ? '⛶✓' : '⛶';
}

btnFullscreen?.addEventListener('click', (e)=>{ e.preventDefault(); toggleFullscreen(); });
btnTouchFullscreen?.addEventListener('click', (e)=>{ e.preventDefault(); toggleFullscreen(); });
document.addEventListener('fullscreenchange', syncFullscreenIcon);
syncFullscreenIcon();


let engine = null;
let game = null;
let inputCtl = null;

let running = false;
let paused = false;
let lastT = 0;

// Buttons
document.getElementById("btnPlay").addEventListener("click", startFromMenu);
document.getElementById("btnBriefingBack").addEventListener("click", ()=>{
  uiWrap.hideBriefing();
  uiWrap.showMenu();
});
document.getElementById("btnBriefingStart").addEventListener("click", ()=>{
  uiWrap.hideBriefing();
  uiWrap.hideMenu();
  startLoop();
});
document.getElementById("btnResume").addEventListener("click", resume);
document.getElementById("btnQuit").addEventListener("click", quitToMenu);

document.getElementById("btnRetry").addEventListener("click", ()=>{
  uiWrap.hideGameOver();
  if(game) game.loadLevel(game.world.levelIndex);
  uiWrap.hideMenu();
  startLoop();
});
document.getElementById("btnNext").addEventListener("click", ()=>{
  uiWrap.hideGameOver();
  if(!game) return;
  const next = game.world.levelIndex + 1;
  if(next >= LEVELS.length){
    // reinicia
    game.loadLevel(0);
  }else{
    game.loadLevel(next);
  }
  uiWrap.hideMenu();
  startLoop();
});
document.getElementById("btnBackToMenu").addEventListener("click", quitToMenu);

function getRoleAndDiff(){
  const roleId = uiWrap.selectedRoleId();
  const diffId = uiWrap.selectedDiffId();
  const role = ROLES.find(r=>r.id===roleId) ?? ROLES[1];
  const difficulty = DIFFICULTIES.find(d=>d.id===diffId) ?? DIFFICULTIES[1];
  return { role, difficulty };
}

function startFromMenu(){
  const { role, difficulty } = getRoleAndDiff();

  engine = createEngine(ui.canvas, settings);

  game = createGame({
    levels: LEVELS,
    role,
    difficulty,
    settings,
  });

  inputCtl = createInput(ui.canvas, settings);
  // controles táctiles solo durante gameplay
  setTouchControlsVisible(false);

  // briefing
  uiWrap.showBriefing(game.world.level.name, game.world.level.briefing);
  uiWrap.hideMenu();
}

function startLoop(){
  running = true;
  paused = false;
  lastT = nowMs();
  uiWrap.ui.hud.classList.remove("hidden");
  // si es dispositivo táctil, muestra controles
  setTouchControlsVisible(!!inputCtl?.isTouchDevice);
  document.body.classList.add("playing");
  requestAnimationFrame(loop);
}

function pause(){
  if(!running || paused) return;
  paused = true;
  uiWrap.showPause();
  setTouchControlsVisible(false);
  document.exitPointerLock?.();
  if(document.fullscreenElement) document.exitFullscreen?.();
}

function resume(){
  if(!running) return;
  paused = false;
  uiWrap.hidePause();
  setTouchControlsVisible(!!inputCtl?.isTouchDevice);
  lastT = nowMs();
  requestAnimationFrame(loop);
}

function quitToMenu(){
  running = false;
  paused = false;
  uiWrap.hidePause();
  uiWrap.hideGameOver();
  uiWrap.showMenu();
  uiWrap.ui.hud.classList.add("hidden");
  document.body.classList.remove("playing");
  setTouchControlsVisible(false);
  document.exitPointerLock?.();
  if(document.fullscreenElement) document.exitFullscreen?.();
}

function loop(t){
  if(!running) return;
  if(paused) return;

  const dt = clamp((t - lastT)/1000, 0, 0.05);
  lastT = t;

  inputCtl.update(dt);

  // Esc pausa
  if(inputCtl.input.pause){
    pause();
    // evita repetir por mantener presionado
    inputCtl.input.pause = false;
    return;
  }

  // Mapa (Tab)
  if(inputCtl.input.map){
    uiWrap.showMapOverlay();
    uiWrap.writeFullMap({
      map: game.world.map,
      player: game.world.player,
      enemies: game.world.enemies,
      pickups: game.world.pickups,
    });
  }else{
    uiWrap.hideMapOverlay();
  }

  game.update(dt, inputCtl.input);

  engine.renderFrame(game.world);

  // HUD
  uiWrap.setHUD({
    roleName: game.world.role.name,
    levelName: game.world.level.name,
    objective: game.world.objectiveText,
    score: game.world.score,
    hp: game.world.player.hp,
    hpMax: game.world.player.hpMax,
    energy: game.world.player.energy,
    energyMax: game.world.player.energyMax,
  });

  // Toast
  const toast = game.world.toast;
  if(toast && toast.until > nowMs()){
    uiWrap.setToast(toast.msg);
  }else{
    uiWrap.clearToast();
  }

  // End?
  if(game.world.done){
    endRun();
    return;
  }

  requestAnimationFrame(loop);
}

async function endRun(){
  running = false;
  paused = false;
  document.exitPointerLock?.();
  setTouchControlsVisible(false);

  const stats = game.getRunStats();
  const title = stats.win ? "✅ Misión completada" : "❌ Misión fallida";
  const text = stats.win
    ? (game.world.level.debriefing ?? "Buen trabajo.")
    : "La simulación te superó. Reintenta optimizando energía y distancia.";

  // Save score
  if(stats.win){
    const { role, difficulty } = getRoleAndDiff();
    await uiWrap.saveScore({
      score: stats.score,
      timeMs: stats.timeMs,
      kills: stats.kills,
      level: game.world.level,
      role,
      diff: difficulty,
    });
  }

  // Render overlay values
  document.getElementById("finalScore").textContent = stats.score;
  document.getElementById("finalTime").textContent = formatTime(stats.timeMs);
  document.getElementById("finalKills").textContent = stats.kills;

  
  // --- Certificado (modo estático): disponible si gana
  const btnCert = document.getElementById("btnCertificate");
  if(btnCert){
    if(stats.win){
      btnCert.classList.remove("hidden");
      const name = (uiWrap.profile?.displayName || "Invitado");
      const date = new Date().toLocaleDateString("es-CL");
      const idSeed = `${name}|${stats.score}|${stats.timeMs}|${game.world.levelIndex}|${date}`;
      const id = (await crypto.subtle.digest("SHA-256", new TextEncoder().encode(idSeed)))
        .then(buf => Array.from(new Uint8Array(buf)).slice(0,10).map(b=>b.toString(16).padStart(2,"0")).join(""))
        .catch(()=> Math.random().toString(16).slice(2,12));
      const payload = {
        id,
        name,
        score: String(stats.score),
        time: formatTime(stats.timeMs),
        level: String(game.world.levelIndex + 1),
        date,
      };
      try{ localStorage.setItem("cyberdoom_last_certificate", JSON.stringify(payload)); }catch{}
      btnCert.onclick = ()=>{
        const qs = new URLSearchParams(payload).toString();
        window.open(`./certificate.html?${qs}`, "_blank");
      };
    }else{
      btnCert.classList.add("hidden");
      btnCert.onclick = null;
    }
  }

uiWrap.showGameOver(title, text);

  // If last level, Next says "Volver a empezar"
  const btnNext = document.getElementById("btnNext");
  if(game.world.levelIndex + 1 >= LEVELS.length){
    btnNext.textContent = "Volver a empezar";
  }else{
    btnNext.textContent = "Siguiente nivel";
  }
}

// inicia en menú
uiWrap.showMenu();
setTouchControlsVisible(false);
// PATCH: avoid browser gesture stealing
const _c = document.getElementById('game');
if(_c){ _c.addEventListener('touchstart',(e)=>e.preventDefault(),{passive:false}); }
