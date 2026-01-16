import { STORAGE_KEYS } from "./config.js";
import { loadJSON, saveJSON } from "./utils.js";

export function loadSettings(){
  return loadJSON(STORAGE_KEYS.settings, {
    sensitivity: 1.6,
    volume: 0.7,
    minimap: true,
    reducedMotion: false,
  });
}

export function saveSettings(s){
  saveJSON(STORAGE_KEYS.settings, s);
}

export function loadLocalScores(){
  return loadJSON(STORAGE_KEYS.scores, []);
}

export function addLocalScore(entry){
  const scores = loadLocalScores();
  scores.push(entry);
  scores.sort((a,b)=> b.score - a.score);
  saveJSON(STORAGE_KEYS.scores, scores.slice(0, 50));
  return scores.slice(0, 50);
}

export function clearLocalScores(){
  saveJSON(STORAGE_KEYS.scores, []);
}

export function loadProfile(){
  return loadJSON(STORAGE_KEYS.profile, null);
}
export function saveProfile(p){
  saveJSON(STORAGE_KEYS.profile, p);
}
