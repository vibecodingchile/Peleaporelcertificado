import { clamp, dist, lerp } from "./utils.js";
import { TILE } from "./levels.js";

/**
 * Raycasting motor 2.5D (tipo Doom clásico simplificado).
 * Renderiza paredes + sprites en Canvas.
 * Nota: es un motor “demo”; prioriza claridad y estabilidad sobre exactitud “Doom real”.
 */

export function createEngine(canvas, settings){
  const ctx = canvas.getContext("2d", { alpha:false });

  const state = {
    canvas, ctx,
    w: canvas.width,
    h: canvas.height,
    fov: Math.PI/3, // 60°
    maxDepth: TILE * 16,
    // Ajustable por UI
    settings,
    showMinimap: true,
    reducedMotion: false,
  };

  function resizeToCSS(){
    // Mantiene resolución interna fija (mejor performance) y ajusta CSS.
    // Si quieres resolución dinámica: ajustar canvas.width/height aquí (no necesario).
    state.w = canvas.width;
    state.h = canvas.height;
  }

  function shadeColor(baseRGB, factor){
    // factor 0..1 (1 = sin sombrear)
    const r = Math.floor(baseRGB[0]*factor);
    const g = Math.floor(baseRGB[1]*factor);
    const b = Math.floor(baseRGB[2]*factor);
    return `rgb(${r},${g},${b})`;
  }

  function renderFrame(world){
    const { player, map, sprites } = world;
    const { w, h, fov } = state;

    // Fondo: cielo / piso
    state.ctx.fillStyle = "#0b0f17";
    state.ctx.fillRect(0, 0, w, h/2);
    state.ctx.fillStyle = "#070a10";
    state.ctx.fillRect(0, h/2, w, h/2);

    // Raycasting: paredes
    const rays = [];
    const numRays = w; // 1 rayo por columna
    const projPlane = (w/2) / Math.tan(fov/2);

    for(let col=0; col<numRays; col++){
      const rayAngle = player.a - fov/2 + (col/numRays)*fov;
      const hit = castRay(map, player.x, player.y, rayAngle, state.maxDepth);
      const correctedDist = hit.dist * Math.cos(rayAngle - player.a); // corrige fish-eye
      const wallHeight = (TILE / Math.max(0.0001, correctedDist)) * projPlane;

      const wallTop = Math.floor(h/2 - wallHeight/2);
      const wallBottom = Math.floor(h/2 + wallHeight/2);

      // sombreado por distancia
      const fog = clamp(1 - correctedDist / state.maxDepth, 0.05, 1);

      // tipo de muro (valor del mapa)
      const cell = hit.cell;
      const base = cell === 2 ? [167,139,250] : [110,231,255];
      state.ctx.strokeStyle = shadeColor(base, fog);
      state.ctx.beginPath();
      state.ctx.moveTo(col + 0.5, wallTop);
      state.ctx.lineTo(col + 0.5, wallBottom);
      state.ctx.stroke();

      rays[col] = { dist: correctedDist, wallTop, wallBottom };
    }

    // Sprites (amenazas / pickups)
    // Orden por distancia (pintar de lejos a cerca con z-buffer por columna)
    const ordered = [...sprites].sort((a,b)=> b._dist - a._dist);

    for(const s of ordered){
      drawSprite(state, world, rays, s);
    }

    // Minimap pequeño (opcional)
    if(world.ui?.minimap){
      drawMinimap(state, world);
    }
  }

  function drawSprite(state, world, rays, sprite){
    const { player } = world;
    const { ctx, w, h, fov } = state;

    const dx = sprite.x - player.x;
    const dy = sprite.y - player.y;

    const angleToSprite = Math.atan2(dy, dx);
    let relAngle = normalizeAngle(angleToSprite - player.a);

    // Mapea a (-pi..pi)
    if(relAngle > Math.PI) relAngle -= 2*Math.PI;
    if(relAngle < -Math.PI) relAngle += 2*Math.PI;

    if(Math.abs(relAngle) > fov/2 + 0.25) return;

    const distTo = Math.hypot(dx,dy);
    sprite._dist = distTo;

    const projPlane = (w/2) / Math.tan(fov/2);
    const spriteSize = (TILE / Math.max(0.001, distTo)) * projPlane;

    const screenX = (w/2) + Math.tan(relAngle) * projPlane;
    const screenY = (h/2) - spriteSize/2;

    const left = Math.floor(screenX - spriteSize/2);
    const right = Math.floor(screenX + spriteSize/2);

    // Icono simple según tipo
    // Render como “billboard” con rectángulos / círculos
    for(let x = left; x < right; x++){
      if(x < 0 || x >= w) continue;
      const colRay = rays[x];
      if(!colRay) continue;
      // Ocultación: si pared está más cerca, no dibujar esa columna
      if(colRay.dist < distTo) continue;

      const t = (x - left) / Math.max(1, (right-left));

      ctx.save();
      ctx.globalAlpha = clamp(1 - distTo/(TILE*14), 0.25, 1);

      if(sprite.kind === "enemy"){
        // cuerpo
        ctx.fillStyle = sprite.type === "ransom" ? "rgba(255,92,122,.9)" :
                        sprite.type === "insider" ? "rgba(167,139,250,.9)" :
                        "rgba(110,231,255,.9)";
        // “textura” con bandas
        const band = (Math.floor(t*6) % 2) ? 0.85 : 1.0;
        ctx.fillStyle = multiplyAlpha(ctx.fillStyle, band);

        const yTop = screenY;
        const yBottom = screenY + spriteSize;
        ctx.fillRect(x, yTop, 1, yBottom - yTop);

        // “ojo” (pequeño) en el centro
        if(Math.abs(t-0.5) < 0.02){
          ctx.fillStyle = "rgba(233,238,246,.95)";
          ctx.fillRect(x, screenY + spriteSize*0.38, 1, spriteSize*0.08);
        }
      }else if(sprite.kind === "pickup"){
        ctx.fillStyle = "rgba(92,255,178,.95)";
        const yTop = screenY + spriteSize*0.2;
        const yBottom = screenY + spriteSize*0.8;
        ctx.fillRect(x, yTop, 1, yBottom - yTop);

        // detalle
        if(Math.abs(t-0.5) < 0.02){
          ctx.fillStyle = "rgba(233,238,246,.9)";
          ctx.fillRect(x, screenY + spriteSize*0.45, 1, spriteSize*0.1);
        }
      }

      ctx.restore();
    }
  }

  function multiplyAlpha(rgba, factor){
    // rgba( r,g,b,a ) => ajusta alpha por factor (simple)
    const m = rgba.match(/rgba\((\d+),(\d+),(\d+),([0-9.]+)\)/);
    if(!m) return rgba;
    const a = parseFloat(m[4]);
    return `rgba(${m[1]},${m[2]},${m[3]},${clamp(a*factor,0,1)})`;
  }

  function drawMinimap(state, world){
    const { ctx, w, h } = state;
    const { map, player } = world;

    const scale = 4; // 1 tile => 4px
    const pad = 10;
    const mapH = map.length;
    const mapW = map[0].length;

    const miniW = mapW * scale;
    const miniH = mapH * scale;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(10,14,22,.6)";
    ctx.fillRect(pad, pad, miniW + 8, miniH + 8);
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.strokeRect(pad, pad, miniW + 8, miniH + 8);

    // celdas
    for(let y=0; y<mapH; y++){
      for(let x=0; x<mapW; x++){
        const v = map[y][x];
        if(v === 0) continue;
        ctx.fillStyle = v === 2 ? "rgba(167,139,250,.7)" : "rgba(110,231,255,.35)";
        ctx.fillRect(pad+4 + x*scale, pad+4 + y*scale, scale, scale);
      }
    }

    // player
    const px = pad+4 + (player.x/TILE)*scale;
    const py = pad+4 + (player.y/TILE)*scale;
    ctx.fillStyle = "rgba(233,238,246,.95)";
    ctx.fillRect(px-1, py-1, 3, 3);

    // dirección
    ctx.strokeStyle = "rgba(233,238,246,.8)";
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(player.a)*7, py + Math.sin(player.a)*7);
    ctx.stroke();

    ctx.restore();
  }

  function castRay(map, ox, oy, angle, maxDist){
    // Avanza en pasos pequeños (simple, estable).
    const step = 3.0;
    let distAcc = 0;
    let x = ox;
    let y = oy;

    while(distAcc < maxDist){
      x = ox + Math.cos(angle)*distAcc;
      y = oy + Math.sin(angle)*distAcc;

      const mx = Math.floor(x / TILE);
      const my = Math.floor(y / TILE);
      if(my < 0 || my >= map.length || mx < 0 || mx >= map[0].length){
        return { dist: maxDist, cell: 1, x, y };
      }
      const cell = map[my][mx];
      if(cell !== 0){
        return { dist: distAcc, cell, x, y };
      }
      distAcc += step;
    }
    return { dist: maxDist, cell: 0, x, y };
  }

  function normalizeAngle(a){
    a %= (Math.PI*2);
    if(a < 0) a += Math.PI*2;
    return a;
  }

  return { state, resizeToCSS, renderFrame };
}
