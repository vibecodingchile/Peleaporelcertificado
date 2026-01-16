export const ROLES = [
  {
    id: "junior",
    name: "Técnico(a) Junior",
    desc: "Más salud y energía. Enemigos más lentos.",
    mods: { hp: 120, energy: 120, enemySpeed: 0.85, enemyDamage: 0.85, scoreMult: 0.9 }
  },
  {
    id: "soc",
    name: "Analista SOC",
    desc: "Balanceado. Respuesta rápida y puntaje normal.",
    mods: { hp: 100, energy: 100, enemySpeed: 1.0, enemyDamage: 1.0, scoreMult: 1.0 }
  },
  {
    id: "engineer",
    name: "Ingeniero(a) de Seguridad",
    desc: "Amenazas más agresivas. Más puntaje.",
    mods: { hp: 95, energy: 100, enemySpeed: 1.15, enemyDamage: 1.1, scoreMult: 1.15 }
  },
  {
    id: "ciso",
    name: "CISO (Modo crisis)",
    desc: "Difícil: menos margen de error. Máximo puntaje.",
    mods: { hp: 85, energy: 90, enemySpeed: 1.25, enemyDamage: 1.2, scoreMult: 1.35 }
  },
];

export const DIFFICULTIES = [
  { id: "facil", name: "Fácil", desc: "Más recursos. Amenazas menos densas.", mods: { enemyCount: 0.8, scoreMult: 0.9 } },
  { id: "normal", name: "Normal", desc: "Experiencia estándar.", mods: { enemyCount: 1.0, scoreMult: 1.0 } },
  { id: "dificil", name: "Difícil", desc: "Más amenazas y presión.", mods: { enemyCount: 1.25, scoreMult: 1.15 } },
  { id: "extremo", name: "Extremo", desc: "Para expertos. Poca piedad.", mods: { enemyCount: 1.5, scoreMult: 1.3 } },
];
