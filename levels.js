// Niveles (ficción) de AndesData S.A. (Chile)
export const TILE = 64;

export const LEVELS = [
  {
    id: 1,
    name: "Nivel 1: Oficina Central (Santiago)",
    briefing: "Un sabotaje interno dejó rastros de malware en la red de la oficina central. Encuentra el TOKEN DE RESPALDO y llega al SERVIDOR DE DATOS para reactivar el backup inmutable.",
    debriefing: "Recuperaste el token y reactivaste respaldos. Pero el sabotaje se movió al datacenter…",
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,2,1],
      [1,0,1,1,1,0,1,1,1,0,1,1,0,0,1],
      [1,0,1,0,0,0,0,0,1,0,0,1,0,0,1],
      [1,0,1,0,1,1,1,0,1,1,0,1,1,0,1],
      [1,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
      [1,0,1,0,1,0,1,1,0,1,1,1,0,1,1],
      [1,0,1,0,0,0,0,1,0,0,0,1,0,0,1],
      [1,0,1,1,1,1,0,1,1,1,0,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    // 2 = puerta del servidor (requiere token)
    start: { x: 2.5*TILE, y: 2.5*TILE, a: 0 },
    serverDoor: { x: 13.5*TILE, y: 1.5*TILE, radius: 40, requires: ["token_respaldo"] },
    exitZone:  { x: 13.5*TILE, y: 1.5*TILE, radius: 40 }, // mismo punto
    pickups: [
      { type: "token_respaldo", x: 12.5*TILE, y: 9.5*TILE, label: "Token de respaldo" },
      { type: "kit_salud", x: 2.5*TILE, y: 9.2*TILE, label: "Kit de primeros auxilios" },
      { type: "bateria", x: 7.5*TILE, y: 5.5*TILE, label: "Batería" },
    ],
    enemies: [
      { type: "malware", x: 10.5*TILE, y: 2.5*TILE },
      { type: "malware", x: 11.5*TILE, y: 6.5*TILE },
      { type: "insider", x: 4.5*TILE, y: 7.5*TILE },
      { type: "malware", x: 8.5*TILE, y: 8.5*TILE },
    ],
  },

  {
    id: 2,
    name: "Nivel 2: Datacenter Andino",
    briefing: "Los indicadores muestran intentos de cifrado masivo. Aísla el RANSOMWARE NODO y encuentra la LLAVE DE SEGMENTACIÓN para entrar al rack principal.",
    debriefing: "Aislaste el nodo y recuperaste control de segmentación. La investigación sigue…",
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,1,1,1,1,0,1,1,0,1],
      [1,0,1,0,0,0,0,0,0,0,1,0,0,1,0,1],
      [1,0,1,0,1,1,1,0,1,0,1,1,0,1,0,1],
      [1,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1],
      [1,0,1,0,1,0,1,1,1,1,1,1,0,1,0,1],
      [1,0,1,0,0,0,0,0,0,0,0,1,0,0,0,1],
      [1,0,1,1,1,1,1,1,0,1,0,1,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    start: { x: 2.5*TILE, y: 1.8*TILE, a: Math.PI/2 },
    serverDoor: { x: 14.5*TILE, y: 9.5*TILE, radius: 44, requires: ["llave_segmentacion"] },
    exitZone:  { x: 14.5*TILE, y: 9.5*TILE, radius: 44 },
    pickups: [
      { type: "llave_segmentacion", x: 12.5*TILE, y: 1.5*TILE, label: "Llave de segmentación" },
      { type: "kit_salud", x: 2.5*TILE, y: 9.3*TILE, label: "Kit de primeros auxilios" },
      { type: "bateria", x: 9.5*TILE, y: 5.5*TILE, label: "Batería" },
    ],
    enemies: [
      { type: "malware", x: 6.5*TILE, y: 1.5*TILE },
      { type: "malware", x: 10.5*TILE, y: 3.5*TILE },
      { type: "malware", x: 7.5*TILE, y: 7.5*TILE },
      { type: "ransom", x: 13.5*TILE, y: 6.5*TILE },
      { type: "insider", x: 4.5*TILE, y: 9.5*TILE },
    ],
  },
];
