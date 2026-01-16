import { clamp } from "./utils.js";

/**
 * Entrada unificada: teclado + mouse (desktop) + controles táctiles (móvil/tablet).
 *
 * En móvil:
 * - Joystick izquierdo: mover
 * - Panel derecho: mirar (deslizar)
 * - Botones: 🛠️ (herramienta), E (interactuar), ⇧ (correr), 🗺️ (mapa), ⏸ (pausa)
 */
export function createInput(canvas, settings){
  const input = {
    forward: 0,
    strafe: 0,
    turn: 0,     // tasa (rad/s). Se multiplica por dt en game.update()
    run: false,
    shoot: false,
    interact: false,
    map: false,
    pause: false,
  };

  function enableTouch(){
    input.isTouch = true;
    document.body.classList.add(\"touch\");
  }


  const keys = new Set();

  // Mouse
  let pointerLocked = false;
  let mouseDeltaX = 0;
  let mouseShoot = false;

  // Touch UI elements (si existen)
  const touchRoot = document.getElementById("touchControls");
  const joyEl = document.getElementById("joy");
  const joyKnob = document.getElementById("joyKnob");
  const lookPad = document.getElementById("lookPad");

  const btnShoot = document.getElementById("btnTouchShoot");
  const btnInteract = document.getElementById("btnTouchInteract");
  const btnRun = document.getElementById("btnTouchRun");
  const btnMap = document.getElementById("btnTouchMap");
  const btnPause = document.getElementById("btnTouchPause");

  const isTouchDevice = (navigator.maxTouchPoints > 0) || (navigator.maxTouchPoints > 0);

  // Estado táctil
  let joyPointerId = null;
  let joyOrigin = { x: 0, y: 0 };
  let joyVec = { x: 0, y: 0 }; // [-1..1] en ambos ejes

  let lookPointerId = null;
  let lookLastX = 0;
  let lookDeltaX = 0;

  let touchShoot = false;
  let touchRun = false;
  let touchMap = false;
  let touchInteractQueued = false;
  let touchPauseQueued = false;

  const JOY_MAX_PX = 46; // radio útil del joystick

  // --- Teclado ---
  function onKeyDown(e){
    keys.add(e.code);
    if(e.code === "Space") e.preventDefault();
    if(e.code === "Tab") e.preventDefault();
  }
  function onKeyUp(e){
    keys.delete(e.code);
  }
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // --- Pointer lock (desktop) ---
  canvas.addEventListener("click", ()=>{
    // en móvil se ignora o falla sin problema
    canvas.requestPointerLock?.();
  });
  document.addEventListener("pointerlockchange", ()=>{
    pointerLocked = (document.pointerLockElement === canvas);
  });

  document.addEventListener("mousemove", (e)=>{
    if(!pointerLocked) return;
    mouseDeltaX += e.movementX;
  });

  // Mouse click => shoot
  canvas.addEventListener("mousedown", (e)=>{
    if(e.button === 0) mouseShoot = true;
  });
  canvas.addEventListener("mouseup", (e)=>{
    if(e.button === 0) mouseShoot = false;
  });

  // --- Controles táctiles (Pointer Events) ---
  function setKnob(dx, dy){
    if(!joyKnob) return;
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function setJoy(dx, dy){
    // limita al círculo
    const len = Math.hypot(dx, dy);
    let x = dx, y = dy;
    if(len > JOY_MAX_PX){
      const k = JOY_MAX_PX / Math.max(0.001, len);
      x *= k; y *= k;
    }
    joyVec.x = clamp(x / JOY_MAX_PX, -1, 1);
    joyVec.y = clamp(y / JOY_MAX_PX, -1, 1);
    setKnob(x, y);
  }

  function resetJoy(){
    joyPointerId = null;
    joyVec.x = 0; joyVec.y = 0;
    setKnob(0, 0);
  }

  function onJoyPointerDown(e){
    if(e.pointerType !== "touch") return;
    if(joyPointerId !== null) return;
    joyPointerId = e.pointerId;
    joyOrigin = { x: e.clientX, y: e.clientY };
    setJoy(0,0);
    joyEl?.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }
  function onJoyPointerMove(e){
    if(e.pointerId !== joyPointerId) return;
    setJoy(e.clientX - joyOrigin.x, e.clientY - joyOrigin.y);
    e.preventDefault();
  }
  function onJoyPointerUp(e){
    if(e.pointerId !== joyPointerId) return;
    resetJoy();
    e.preventDefault();
  }

  function onLookPointerDown(e){
    if(e.pointerType !== "touch") return;
    if(lookPointerId !== null) return;
    lookPointerId = e.pointerId;
    lookLastX = e.clientX;
    lookPad?.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }
  function onLookPointerMove(e){
    if(e.pointerId !== lookPointerId) return;
    lookDeltaX += (e.clientX - lookLastX);
    lookLastX = e.clientX;
    e.preventDefault();
  }
  function onLookPointerUp(e){
    if(e.pointerId !== lookPointerId) return;
    lookPointerId = null;
    e.preventDefault();
  }

  function wireButton(el, onDown, onUp){
    if(!el) return;
    el.addEventListener("pointerdown", (e)=>{
      if(e.pointerType === "touch") el.setPointerCapture?.(e.pointerId);
      onDown?.(e);
      e.preventDefault();
    }, { passive:false });
    el.addEventListener("pointerup", (e)=>{
      onUp?.(e);
      e.preventDefault();
    }, { passive:false });
    el.addEventListener("pointercancel", (e)=>{
      onUp?.(e);
      e.preventDefault();
    }, { passive:false });
    el.addEventListener("contextmenu", (e)=> e.preventDefault());
  }

  // wire touch pads
  if(joyEl){
    joyEl.addEventListener("pointerdown", onJoyPointerDown, { passive:false });
    joyEl.addEventListener("pointermove", onJoyPointerMove, { passive:false });
    joyEl.addEventListener("pointerup", onJoyPointerUp, { passive:false });
    joyEl.addEventListener("pointercancel", onJoyPointerUp, { passive:false });
    joyEl.addEventListener("contextmenu", (e)=> e.preventDefault());
  }
  if(lookPad){
    lookPad.addEventListener("pointerdown", onLookPointerDown, { passive:false });
    lookPad.addEventListener("pointermove", onLookPointerMove, { passive:false });
    lookPad.addEventListener("pointerup", onLookPointerUp, { passive:false });
    lookPad.addEventListener("pointercancel", onLookPointerUp, { passive:false });
    lookPad.addEventListener("contextmenu", (e)=> e.preventDefault());
  }

  // buttons
  wireButton(btnShoot,
    ()=>{ touchShoot = true; },
    ()=>{ touchShoot = false; }
  );
  wireButton(btnRun,
    ()=>{ touchRun = true; },
    ()=>{ touchRun = false; }
  );
  wireButton(btnMap,
    ()=>{ touchMap = true; },
    ()=>{ touchMap = false; }
  );
  wireButton(btnInteract,
    ()=>{ touchInteractQueued = true; },
    ()=>{}
  );
  wireButton(btnPause,
    ()=>{ touchPauseQueued = true; },
    ()=>{}
  );

  function update(dt){
    // Teclas
    const w = keys.has("KeyW") ? 1 : 0;
    const s = keys.has("KeyS") ? 1 : 0;
    const a = keys.has("KeyA") ? 1 : 0;
    const d = keys.has("KeyD") ? 1 : 0;

    // Joystick => suma (si el usuario conecta teclado a un móvil, también sirve)
    const joyForward = -joyVec.y;
    const joyStrafe = joyVec.x;

    input.forward = clamp((w - s) + joyForward, -1, 1);
    input.strafe = clamp((d - a) + joyStrafe, -1, 1);

    // Run
    input.run = keys.has("ShiftLeft") || keys.has("ShiftRight") || touchRun;

    // Turn: flechas (tasa) + mouse/touch (convertidos a tasa)
    let turnKey = 0;
    if(keys.has("ArrowLeft")) turnKey -= 1;
    if(keys.has("ArrowRight")) turnKey += 1;

    const sens = settings.sensitivity ?? 1.6;
    const dtSafe = Math.max(0.001, dt);

    // mouseDeltaX: píxeles desde el último frame (pointer lock)
    const mouseTurnRate = clamp((mouseDeltaX * 0.0022 * sens) / dtSafe, -12, 12);
    mouseDeltaX = 0;

    // touch look: píxeles desde el último frame (swipe en lookPad)
    const touchTurnRate = clamp((lookDeltaX * 0.0026 * sens) / dtSafe, -12, 12);
    lookDeltaX = 0;

    input.turn = (turnKey * 2.4) + mouseTurnRate + touchTurnRate;

    // Acciones
    input.shoot = mouseShoot || keys.has("Space") || touchShoot;

    // Interact: en touch es “tap”
    input.interact = keys.has("KeyE") || touchInteractQueued;
    touchInteractQueued = false;

    // Mapa: mantener presionado (como Tab)
    input.map = keys.has("Tab") || touchMap;

    // Pausa: evento puntual
    input.pause = keys.has("Escape") || touchPauseQueued;
    touchPauseQueued = false;
  }

  function dispose(){
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  }

  return { input, update, dispose, isTouchDevice };
}


// PATCH: prevent page scrolling while touching controls
window.addEventListener('touchmove', (e)=>{ if(document.body.classList.contains('touch')) e.preventDefault(); }, { passive:false });
