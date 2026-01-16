import { clamp, dist, nowMs, pick, rand } from "./utils.js";
import { TILE } from "./levels.js";

/**
 * Lógica del juego (mundo, player, amenazas, pickups, objetivos).
 * Todo está pensado para ser “defensivo” y ficcional.
 */

const ENEMY_TYPES = {
  malware: {
    name: "Bot de malware",
    hp: 35,
    speed: 52,
    damage: 8,
    score: 80,
  },
  insider: {
    name: "Insider hostil",
    hp: 55,
    speed: 40,
    damage: 12,
    ranged: true,
    score: 140,
  },
  ransom: {
    name: "Nodo ransomware",
    hp: 75,
    speed: 24,
    damage: 10,
    spawner: true,
    score: 220,
  },
};

const PICKUP_TYPES = {
  token_respaldo: { name: "Token de respaldo", kind: "token" },
  llave_segmentacion: { name: "Llave de segmentación", kind: "token" },
  kit_salud: { name: "Kit de salud", kind: "heal", value: 40 },
  bateria: { name: "Batería", kind: "energy", value: 45 },
};

export function createGame({ levels, role, difficulty, settings }){
  const startAt = nowMs();

  const world = {
    ui: {
      minimap: settings.minimap ?? true,
    },
    role,
    difficulty,
    settings,
    levelIndex: 0,
    level: null,
    map: null,
    player: null,
    sprites: [], // enemies + pickups as sprites for engine
    enemies: [],
    pickups: [],
    inventory: new Set(),
    objectiveText: "",
    score: 0,
    kills: 0,
    done: false,
    win: false,
    startAt,
    endAt: null,
    toast: null,
  };

  function loadLevel(index){
    world.levelIndex = index;
    world.level = levels[index];
    world.map = world.level.map;
    world.inventory = new Set(); // inventario por nivel

    // Player base stats
    const baseHp = 100, baseEnergy = 100;
    const hp = Math.round(baseHp * (role.mods.hp/100));
    const energy = Math.round(baseEnergy * (role.mods.energy/100));

    world.player = {
      x: world.level.start.x,
      y: world.level.start.y,
      a: world.level.start.a,
      hp,
      hpMax: hp,
      energy,
      energyMax: energy,
      speed: 120,
      runMult: 1.55,
      toolCooldownMs: 220,
      lastShot: 0,
      alive: true,
    };

    // Enemies: escala por dificultad
    const enemyCountMult = difficulty.mods.enemyCount ?? 1.0;
    const baseEnemies = world.level.enemies.map((e, i)=> ({ ...e, id:`e${index}-${i}` }));
    const extras = [];

    // añade algunos malware extras en dificultades altas
    const addCount = Math.max(0, Math.round((enemyCountMult - 1.0) * baseEnemies.length));
    for(let i=0; i<addCount; i++){
      const e0 = pick(baseEnemies);
      extras.push({ type:"malware", x: e0.x + rand(-TILE*1.5, TILE*1.5), y: e0.y + rand(-TILE*1.5, TILE*1.5), id:`ex${index}-${i}` });
    }

    world.enemies = [...baseEnemies, ...extras].map(e => makeEnemy(e, role, difficulty));
    world.pickups = world.level.pickups.map((p,i)=> makePickup({ ...p, id:`p${index}-${i}` }));

    updateSprites();

    world.done = false;
    world.win = false;
    world.startAt = nowMs();
    world.endAt = null;

    world.objectiveText = computeObjectiveText();
    toast(`📡 ${world.level.name}`);
  }

  function makeEnemy(e, role, difficulty){
    const t = ENEMY_TYPES[e.type] ?? ENEMY_TYPES.malware;
    return {
      id: e.id,
      kind: "enemy",
      type: e.type,
      name: t.name,
      x: e.x, y: e.y,
      hp: t.hp,
      hpMax: t.hp,
      speed: t.speed * (role.mods.enemySpeed ?? 1) * (difficulty.mods.enemySpeed ?? 1),
      damage: t.damage * (role.mods.enemyDamage ?? 1) * (difficulty.mods.enemyDamage ?? 1),
      ranged: !!t.ranged,
      spawner: !!t.spawner,
      score: t.score,
      cooldown: 0,
      alive: true,
      // pequeños offsets para variar
      wobble: rand(0, Math.PI*2),
    };
  }

  function makePickup(p){
    const t = PICKUP_TYPES[p.type];
    return {
      id: p.id,
      kind: "pickup",
      type: p.type,
      name: t?.name ?? "Recurso",
      x: p.x, y: p.y,
      label: p.label ?? (t?.name ?? "Recurso"),
      alive: true,
    };
  }

  function computeObjectiveText(){
    const req = world.level.serverDoor?.requires?.[0];
    if(req && !world.inventory.has(req)){
      const needed = (PICKUP_TYPES[req]?.name ?? "Token");
      return `Encontrar: ${needed} → luego: llegar al Servidor de Datos`;
    }
    return `Llegar al Servidor de Datos`;
  }

  function updateSprites(){
    world.sprites = [
      ...world.enemies.filter(e=>e.alive).map(e=>({ kind:"enemy", type:e.type, x:e.x, y:e.y, ref:e, _dist: 9999 })),
      ...world.pickups.filter(p=>p.alive).map(p=>({ kind:"pickup", type:p.type, x:p.x, y:p.y, ref:p, _dist: 9999 })),
    ];
  }

  function isWall(x, y){
    const mx = Math.floor(x / TILE);
    const my = Math.floor(y / TILE);
    if(my < 0 || my >= world.map.length || mx < 0 || mx >= world.map[0].length) return true;
    return world.map[my][mx] !== 0;
  }

  function tryMove(dx, dy, dt){
    const p = world.player;
    const nx = p.x + dx * dt;
    const ny = p.y + dy * dt;

    // colisión simple con margen
    const r = 14;
    if(!isWall(nx + r, p.y) && !isWall(nx - r, p.y)) p.x = nx;
    if(!isWall(p.x, ny + r) && !isWall(p.x, ny - r)) p.y = ny;
  }

  function toast(msg){
    world.toast = { msg, until: nowMs() + 1800 };
  }

  function interact(){
    // recoger pickup cercano o intentar abrir puerta
    const p = world.player;
    // pickups
    const near = world.pickups.find(s => s.alive && dist(p.x,p.y,s.x,s.y) < 44);
    if(near){
      collectPickup(near);
      return;
    }
    // puerta del servidor
    if(world.level.serverDoor){
      const d = dist(p.x,p.y, world.level.serverDoor.x, world.level.serverDoor.y);
      if(d < world.level.serverDoor.radius + 20){
        const reqs = world.level.serverDoor.requires ?? [];
        const missing = reqs.filter(r=> !world.inventory.has(r));
        if(missing.length){
          toast(`🔒 Acceso bloqueado. Falta: ${PICKUP_TYPES[missing[0]]?.name ?? "token"}`);
        }else{
          toast("✅ Acceso al servidor autorizado. Objetivo cumplido.");
          winLevel();
        }
      }
    }
  }

  function collectPickup(pu){
    const t = PICKUP_TYPES[pu.type];
    pu.alive = false;

    if(t?.kind === "token"){
      world.inventory.add(pu.type);
      toast(`🗝️ Obtenido: ${t.name}`);
      world.objectiveText = computeObjectiveText();
      world.score += 120;
    }else if(t?.kind === "heal"){
      const p = world.player;
      const before = p.hp;
      p.hp = clamp(p.hp + (t.value ?? 25), 0, p.hpMax);
      toast(`➕ Salud: ${p.hp - before}`);
      world.score += 30;
    }else if(t?.kind === "energy"){
      const p = world.player;
      const before = p.energy;
      p.energy = clamp(p.energy + (t.value ?? 25), 0, p.energyMax);
      toast(`⚡ Energía: ${p.energy - before}`);
      world.score += 30;
    }else{
      toast("📦 Recurso recogido.");
      world.score += 10;
    }
    updateSprites();
  }

  function shoot(){
    const p = world.player;
    const tNow = nowMs();
    if(tNow - p.lastShot < p.toolCooldownMs) return;

    // consume energía para “escanear/parchear”
    const cost = 6;
    if(p.energy < cost){
      toast("⚠️ Energía insuficiente.");
      return;
    }
    p.energy = clamp(p.energy - cost, 0, p.energyMax);
    p.lastShot = tNow;

    // Selección: enemigo más cercano dentro de un cono frente a la cámara
    const maxRange = TILE * 6.2;
    const cone = 0.09; // ~5°
    let best = null;

    for(const e of world.enemies){
      if(!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx,dy);
      if(d > maxRange) continue;
      const ang = Math.atan2(dy,dx);
      let da = normalizeAngle(ang - p.a);
      if(da > Math.PI) da -= 2*Math.PI;
      if(Math.abs(da) > cone) continue;

      // línea de vista: muestrea puntos (simple)
      if(!hasLineOfSight(p.x, p.y, e.x, e.y)) continue;

      if(!best || d < best.d) best = { e, d };
    }

    if(best){
      // Daño “herramienta defensiva”: neutralizar
      const dmg = 26;
      best.e.hp -= dmg;
      toast(`🛠️ Neutralización: ${best.e.name} (-${dmg})`);

      if(best.e.hp <= 0){
        best.e.alive = false;
        world.kills += 1;

        // puntaje: rol + dificultad
        const mult = (role.mods.scoreMult ?? 1) * (difficulty.mods.scoreMult ?? 1);
        const add = Math.round(best.e.score * mult);
        world.score += add;
        toast(`✅ Amenaza neutralizada (+${add})`);

        // bonus: “ransom” suelta batería
        if(best.e.type === "ransom" && Math.random() < 0.8){
          spawnPickup("bateria", best.e.x, best.e.y);
        }
      }
      updateSprites();
    }else{
      toast("🔎 Escaneo sin hallazgos.");
    }
  }

  function hasLineOfSight(ax, ay, bx, by){
    const steps = 16;
    for(let i=1; i<=steps; i++){
      const t = i/steps;
      const x = ax + (bx-ax)*t;
      const y = ay + (by-ay)*t;
      if(isWall(x,y)) return false;
    }
    return true;
  }

  function spawnPickup(type, x, y){
    const id = `spawn-${Math.random().toString(16).slice(2)}`;
    const p = makePickup({ id, type, x, y, label: PICKUP_TYPES[type]?.name ?? "Recurso" });
    world.pickups.push(p);
    updateSprites();
  }

  function winLevel(){
    if(world.done) return;
    world.done = true;
    world.win = true;
    world.endAt = nowMs();
  }

  function loseLevel(){
    if(world.done) return;
    world.done = true;
    world.win = false;
    world.endAt = nowMs();
  }

  function update(dt, input){
    if(world.done) return;

    const p = world.player;

    // regeneración ligera de energía
    p.energy = clamp(p.energy + dt*6, 0, p.energyMax);

    // Rotación
    p.a += input.turn * dt;

    // Movimiento
    const forward = input.forward;
    const strafe = input.strafe;
    const running = input.run && p.energy > 10;

    let spd = p.speed;
    if(running){
      spd *= p.runMult;
      p.energy = clamp(p.energy - dt*18, 0, p.energyMax);
    }

    const cos = Math.cos(p.a);
    const sin = Math.sin(p.a);

    // vector relativo (forward/strafe)
    const vx = (cos*forward + Math.cos(p.a + Math.PI/2)*strafe) * spd;
    const vy = (sin*forward + Math.sin(p.a + Math.PI/2)*strafe) * spd;

    tryMove(vx, vy, dt);

    // Disparo / interacción
    if(input.shoot) shoot();
    if(input.interact) interact();

    // Enemigos: IA simple
    for(const e of world.enemies){
      if(!e.alive) continue;
      enemyThink(e, dt);
    }

    // muerte player
    if(p.hp <= 0){
      p.alive = false;
      toast("💥 Caíste en la simulación de crisis.");
      loseLevel();
    }

    // condición alternativa: si ya tienes token y llegas a puerta (auto)
    if(world.level.exitZone){
      const reqs = world.level.serverDoor?.requires ?? [];
      const missing = reqs.filter(r=> !world.inventory.has(r));
      const d = dist(p.x,p.y, world.level.exitZone.x, world.level.exitZone.y);
      if(d < world.level.exitZone.radius && missing.length === 0){
        winLevel();
      }
    }

    // actualiza objetivo
    world.objectiveText = computeObjectiveText();
    updateSprites();
  }

  function enemyThink(e, dt){
    const p = world.player;
    e.wobble += dt*2.2;

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx,dy);

    // spawner: a veces crea malware cerca
    if(e.spawner){
      e.cooldown -= dt;
      if(e.cooldown <= 0){
        e.cooldown = 4.5 + Math.random()*2.5;
        // genera un malware “bot” cercano (si hay espacio)
        const sx = e.x + rand(-TILE*1.0, TILE*1.0);
        const sy = e.y + rand(-TILE*1.0, TILE*1.0);
        if(!isWall(sx,sy)){
          const spawned = makeEnemy({ id:`m-${Math.random().toString(16).slice(2)}`, type:"malware", x:sx, y:sy }, world.role, world.difficulty);
          spawned.hp = Math.round(spawned.hp * 0.65);
          spawned.score = Math.round(spawned.score * 0.6);
          world.enemies.push(spawned);
          // avisito suave
          if(Math.random() < 0.45) toast("⚠️ Actividad anómala: se propagó un bot.");
        }
      }
    }

    // combate
    const canSee = d < TILE*7 && hasLineOfSight(e.x, e.y, p.x, p.y);
    if(canSee && e.ranged){
      // ataque a distancia
      e.cooldown -= dt;
      if(e.cooldown <= 0){
        e.cooldown = 1.2 + Math.random()*0.8;
        damagePlayer(e.damage);
      }
    }

    // acercarse si está cerca o si ve al player
    if(d < TILE*9){
      const ax = dx / Math.max(0.001, d);
      const ay = dy / Math.max(0.001, d);

      // evita pegarse demasiado: orbita
      const orbit = (d < TILE*1.2) ? 1 : 0;
      const ox = -ay * orbit;
      const oy = ax * orbit;

      const vx = (ax + ox*0.45*Math.sin(e.wobble)) * e.speed;
      const vy = (ay + oy*0.45*Math.cos(e.wobble)) * e.speed;

      // colisión simple
      const nx = e.x + vx*dt;
      const ny = e.y + vy*dt;
      if(!isWall(nx, e.y)) e.x = nx;
      if(!isWall(e.x, ny)) e.y = ny;

      // daño de contacto
      if(d < 26 && canSee){
        e.cooldown -= dt;
        if(e.cooldown <= 0){
          e.cooldown = 0.8 + Math.random()*0.3;
          damagePlayer(e.damage * 0.75);
        }
      }
    }
  }

  function damagePlayer(amount){
    const p = world.player;
    p.hp = clamp(p.hp - amount, 0, p.hpMax);
    // feedback
    if(Math.random() < 0.5) toast(`⚠️ Impacto: -${Math.round(amount)} salud`);
  }

  function normalizeAngle(a){
    a %= (Math.PI*2);
    if(a < 0) a += Math.PI*2;
    return a;
  }

  function getRunStats(){
    const end = world.endAt ?? nowMs();
    return {
      score: Math.max(0, Math.round(world.score)),
      timeMs: Math.max(0, end - world.startAt),
      kills: world.kills,
      win: world.win,
    };
  }

  // Inicial
  loadLevel(0);

  return { world, loadLevel, update, interact, shoot, getRunStats };
}
