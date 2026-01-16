import { addLocalScore, clearLocalScores, loadLocalScores, loadProfile, loadSettings, saveProfile, saveSettings } from "./storage.js";
import { formatTime } from "./utils.js";
import { DIFFICULTIES, ROLES } from "./roles.js";
import { getLeaderboardOnline, submitScoreOnline } from "./api.js";

export function createUI(){
  // Elements
  const el = (id)=> document.getElementById(id);

  const ui = {
    canvas: el("game"),
    menu: el("menu"),
    briefing: el("briefing"),
    briefingTitle: el("briefingTitle"),
    briefingText: el("briefingText"),
    pause: el("pause"),
    gameover: el("gameover"),
    gameoverTitle: el("gameoverTitle"),
    gameoverText: el("gameoverText"),
    hud: el("hud"),
    toast: el("toast"),

    hudRole: el("hudRole"),
    hudLevel: el("hudLevel"),
    hudObjective: el("hudObjective"),
    hudScore: el("hudScore"),
    barHealth: el("barHealth"),
    barEnergy: el("barEnergy"),

    roleChoices: el("roleChoices"),
    diffChoices: el("diffChoices"),

    mapOverlay: el("mapOverlay"),
    minimapFull: el("minimapFull"),

    leaderboard: el("leaderboard"),
    leaderboardList: el("leaderboardList"),

    modalHelp: el("modalHelp"),
    modalSettings: el("modalSettings"),

    optSensitivity: el("optSensitivity"),
    optVolume: el("optVolume"),
    optMinimap: el("optMinimap"),
    optReducedMotion: el("optReducedMotion"),
  };

  const settings = loadSettings();
  ui.optSensitivity.value = settings.sensitivity;
  ui.optVolume.value = settings.volume;
  ui.optMinimap.checked = !!settings.minimap;
  ui.optReducedMotion.checked = !!settings.reducedMotion;

  const profile = loadProfile() ?? { roleId: "soc", diffId: "normal", token: null, displayName: "Invitado" };
  let selectedRoleId = profile.roleId ?? "soc";
  let selectedDiffId = profile.diffId ?? "normal";

  // Build role/difficulty selector
  function buildChoices(container, items, selectedId){
    container.innerHTML = "";
    for(const it of items){
      const div = document.createElement("div");
      div.className = "choice" + (it.id === selectedId ? " selected" : "");
      div.tabIndex = 0;
      div.innerHTML = `
        <div class="name">${it.name}</div>
        <div class="desc">${it.desc}</div>
      `;
      div.addEventListener("click", ()=>{
        [...container.children].forEach(c => c.classList.remove("selected"));
        div.classList.add("selected");
        if(items === ROLES) selectedRoleId = it.id;
        if(items === DIFFICULTIES) selectedDiffId = it.id;
        saveProfile({ ...profile, roleId: selectedRoleId, diffId: selectedDiffId });
      });
      container.appendChild(div);
    }
  }

  buildChoices(ui.roleChoices, ROLES, selectedRoleId);
  buildChoices(ui.diffChoices, DIFFICULTIES, selectedDiffId);

  // Buttons
  el("btnHelp").addEventListener("click", ()=> openModal(ui.modalHelp));
  el("btnCloseHelp").addEventListener("click", ()=> closeModal(ui.modalHelp));
  el("btnSettings").addEventListener("click", ()=> openModal(ui.modalSettings));
  el("btnCloseSettings").addEventListener("click", ()=> closeModal(ui.modalSettings));

  el("btnLeaderboard").addEventListener("click", ()=> showLeaderboard());
  el("btnCloseLeaderboard").addEventListener("click", ()=> hideLeaderboard());
  el("btnClearScores").addEventListener("click", ()=>{
    clearLocalScores();
    renderLocalLeaderboard();
  });

  ui.optSensitivity.addEventListener("input", ()=>{
    settings.sensitivity = parseFloat(ui.optSensitivity.value);
    saveSettings(settings);
  });
  ui.optVolume.addEventListener("input", ()=>{
    settings.volume = parseFloat(ui.optVolume.value);
    saveSettings(settings);
  });
  ui.optMinimap.addEventListener("change", ()=>{
    settings.minimap = !!ui.optMinimap.checked;
    saveSettings(settings);
  });
  ui.optReducedMotion.addEventListener("change", ()=>{
    settings.reducedMotion = !!ui.optReducedMotion.checked;
    saveSettings(settings);
  });

  function openModal(m){ m.classList.remove("hidden"); }
  function closeModal(m){ m.classList.add("hidden"); }

  function showMenu(){
    ui.menu.classList.remove("hidden");
    ui.hud.classList.add("hidden");
  }
  function hideMenu(){
    ui.menu.classList.add("hidden");
    ui.hud.classList.remove("hidden");
  }

  function showBriefing(title, text){
    ui.briefingTitle.textContent = title;
    ui.briefingText.textContent = text;
    ui.briefing.classList.remove("hidden");
  }
  function hideBriefing(){
    ui.briefing.classList.add("hidden");
  }

  function showPause(){ ui.pause.classList.remove("hidden"); }
  function hidePause(){ ui.pause.classList.add("hidden"); }

  function showGameOver(title, text){
    ui.gameoverTitle.textContent = title;
    ui.gameoverText.textContent = text;
    ui.gameover.classList.remove("hidden");
  }
  function hideGameOver(){ ui.gameover.classList.add("hidden"); }

  function showMapOverlay(){ ui.mapOverlay.classList.remove("hidden"); }
  function hideMapOverlay(){ ui.mapOverlay.classList.add("hidden"); }

  function showLeaderboard(){
    ui.leaderboard.classList.remove("hidden");
    renderLocalLeaderboard();
    // Intento online (si existe backend)
    renderOnlineLeaderboard().catch(()=>{});
  }
  function hideLeaderboard(){
    ui.leaderboard.classList.add("hidden");
  }

  function renderLocalLeaderboard(){
    const scores = loadLocalScores();
    ui.leaderboardList.innerHTML = "";
    const head = document.createElement("div");
    head.className = "lb-row lb-head";
    head.innerHTML = `<div>#</div><div>Jugador</div><div>Puntaje</div><div>Nivel</div>`;
    ui.leaderboardList.appendChild(head);

    if(!scores.length){
      const empty = document.createElement("div");
      empty.className = "lb-row";
      empty.innerHTML = `<div>—</div><div class="muted">Sin puntajes aún</div><div>—</div><div>—</div>`;
      ui.leaderboardList.appendChild(empty);
      return;
    }

    scores.slice(0,20).forEach((s, i)=>{
      const row = document.createElement("div");
      row.className = "lb-row";
      row.innerHTML = `
        <div>${i+1}</div>
        <div>${escapeHtml(s.displayName || "Invitado")} <span class="muted small">(${s.roleName}/${s.diffName})</span></div>
        <div>${s.score}</div>
        <div>${s.levelName}</div>
      `;
      ui.leaderboardList.appendChild(row);
    });
  }

  async function renderOnlineLeaderboard(){
    const res = await getLeaderboardOnline(20);
    if(!res.ok) return; // no backend
    // añade separador
    const sep = document.createElement("div");
    sep.className = "lb-row lb-head";
    sep.innerHTML = `<div>🌐</div><div>Ranking global</div><div>Score</div><div>Nivel</div>`;
    ui.leaderboardList.appendChild(sep);

    for(let i=0; i<res.data.items.length; i++){
      const s = res.data.items[i];
      const row = document.createElement("div");
      row.className = "lb-row";
      row.innerHTML = `
        <div>${i+1}</div>
        <div>${escapeHtml(s.displayName || "Jugador")} <span class="muted small">(${s.roleId}/${s.diffId})</span></div>
        <div>${s.score}</div>
        <div>${s.levelId}</div>
      `;
      ui.leaderboardList.appendChild(row);
    }
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  }

  function setHUD({ roleName, levelName, objective, score, hp, hpMax, energy, energyMax }){
    ui.hudRole.textContent = roleName;
    ui.hudLevel.textContent = levelName;
    ui.hudObjective.textContent = objective;
    ui.hudScore.textContent = String(score);

    ui.barHealth.style.width = `${Math.round((hp/hpMax)*100)}%`;
    ui.barEnergy.style.width = `${Math.round((energy/energyMax)*100)}%`;
  }

  function setToast(msg){
    ui.toast.textContent = msg;
    ui.toast.classList.remove("hidden");
  }
  function clearToast(){
    ui.toast.classList.add("hidden");
  }

  function writeFullMap({ map, player, enemies, pickups }){
    const c = ui.minimapFull;
    const ctx = c.getContext("2d");
    const scale = Math.floor(Math.min(c.width / map[0].length, c.height / map.length));
    ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle = "rgba(10,14,22,.9)";
    ctx.fillRect(0,0,c.width,c.height);

    // draw walls
    for(let y=0;y<map.length;y++){
      for(let x=0;x<map[0].length;x++){
        const v=map[y][x];
        if(v===0) continue;
        ctx.fillStyle = v===2 ? "rgba(167,139,250,.8)" : "rgba(110,231,255,.55)";
        ctx.fillRect(x*scale, y*scale, scale, scale);
      }
    }

    // pickups
    for(const p of pickups){
      if(!p.alive) continue;
      ctx.fillStyle = "rgba(92,255,178,.9)";
      ctx.fillRect((p.x/64)*scale-2, (p.y/64)*scale-2, 5, 5);
    }

    // enemies
    for(const e of enemies){
      if(!e.alive) continue;
      ctx.fillStyle = e.type==="ransom" ? "rgba(255,92,122,.9)" : "rgba(167,139,250,.9)";
      ctx.fillRect((e.x/64)*scale-2, (e.y/64)*scale-2, 5, 5);
    }

    // player
    ctx.fillStyle="rgba(233,238,246,.98)";
    ctx.fillRect((player.x/64)*scale-2, (player.y/64)*scale-2, 6, 6);
    ctx.strokeStyle="rgba(233,238,246,.85)";
    ctx.beginPath();
    ctx.moveTo((player.x/64)*scale, (player.y/64)*scale);
    ctx.lineTo((player.x/64)*scale + Math.cos(player.a)*10, (player.y/64)*scale + Math.sin(player.a)*10);
    ctx.stroke();
  }

  // Score saving
  async function saveScore({ score, timeMs, kills, level, role, diff }){
    const entry = {
      at: Date.now(),
      displayName: profile.displayName ?? "Invitado",
      score,
      timeMs,
      kills,
      levelId: level.id,
      levelName: level.name,
      roleId: role.id,
      roleName: role.name,
      diffId: diff.id,
      diffName: diff.name,
    };
    addLocalScore(entry);

    if(profile.token){
      // best effort online
      await submitScoreOnline({
        token: profile.token,
        score,
        roleId: role.id,
        diffId: diff.id,
        levelId: level.id,
        timeMs,
        kills,
      }).catch(()=>{});
    }
  }

  // Public API
  return {
    ui,
    settings,
    profile,
    selectedRoleId: ()=> selectedRoleId,
    selectedDiffId: ()=> selectedDiffId,

    showMenu, hideMenu,
    showBriefing, hideBriefing,
    showPause, hidePause,
    showGameOver, hideGameOver,

    showMapOverlay, hideMapOverlay,
    writeFullMap,

    setHUD,
    setToast, clearToast,
    showLeaderboard, hideLeaderboard,

    saveScore,
  };
}

const nameInput = document.getElementById("playerName");
if(nameInput){
  nameInput.value = profile.displayName || "";
  nameInput.addEventListener("input", ()=>{
    profile.displayName = nameInput.value || "Invitado";
    saveProfile(profile);
  });
}

const tutorial = document.getElementById("tutorial");
const btnTutorialOk = document.getElementById("btnTutorialOk");
if(tutorial && btnTutorialOk){
  tutorial.classList.remove("hidden");
  btnTutorialOk.addEventListener("click", ()=> tutorial.classList.add("hidden"));
}
