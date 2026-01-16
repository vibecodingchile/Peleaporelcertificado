import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { openDb, run, get, all } from "./db.js";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3000", 10);
const JWT_SECRET = process.env.JWT_SECRET || "DEV_ONLY_CHANGE_ME";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const DB_PATH = process.env.DB_PATH || "./data.db";

const app = express();
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(cors({
  origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN,
}));

app.use(rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

const db = openDb(DB_PATH);

function signToken(user){
  return jwt.sign(
    { sub: user.id, email: user.email, displayName: user.display_name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function auth(req, res, next){
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if(!m) return res.status(401).json({ error: "missing_token" });

  try{
    const payload = jwt.verify(m[1], JWT_SECRET);
    req.user = payload;
    next();
  }catch{
    return res.status(401).json({ error: "invalid_token" });
  }
}

function validateEmail(email){
  return typeof email === "string" && email.length <= 254 && /.+@.+\..+/.test(email);
}

app.get("/api/health", (req,res)=> res.json({ ok:true }));

app.post("/api/register", async (req,res)=>{
  const { email, password, displayName } = req.body || {};
  if(!validateEmail(email)) return res.status(400).json({ error: "invalid_email" });
  if(typeof password !== "string" || password.length < 8 || password.length > 72) return res.status(400).json({ error: "invalid_password" });
  if(typeof displayName !== "string" || displayName.trim().length < 2 || displayName.length > 30) return res.status(400).json({ error: "invalid_display_name" });

  const existing = await get(db, "SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
  if(existing) return res.status(409).json({ error: "email_in_use" });

  const hash = await bcrypt.hash(password, 12);
  const createdAt = Date.now();

  const r = await run(db,
    "INSERT INTO users(email, display_name, password_hash, created_at) VALUES(?,?,?,?)",
    [email.toLowerCase(), displayName.trim(), hash, createdAt]
  );

  const user = await get(db, "SELECT id, email, display_name FROM users WHERE id = ?", [r.lastID]);
  const token = signToken(user);

  res.json({ token, displayName: user.display_name });
});

app.post("/api/login", async (req,res)=>{
  const { email, password } = req.body || {};
  if(!validateEmail(email)) return res.status(400).json({ error: "invalid_email" });
  if(typeof password !== "string" || password.length < 1) return res.status(400).json({ error: "invalid_password" });

  const user = await get(db, "SELECT id, email, display_name, password_hash FROM users WHERE email = ?", [email.toLowerCase()]);
  if(!user) return res.status(401).json({ error: "invalid_credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if(!ok) return res.status(401).json({ error: "invalid_credentials" });

  const token = signToken(user);
  res.json({ token, displayName: user.display_name });
});

app.post("/api/score", auth, async (req,res)=>{
  const { score, roleId, diffId, levelId, timeMs, kills } = req.body || {};

  const s = Number(score);
  const lvl = Number(levelId);
  const t = Number(timeMs);
  const k = Number(kills);

  if(!Number.isFinite(s) || s < 0 || s > 10_000_000) return res.status(400).json({ error:"invalid_score" });
  if(typeof roleId !== "string" || roleId.length > 30) return res.status(400).json({ error:"invalid_role" });
  if(typeof diffId !== "string" || diffId.length > 30) return res.status(400).json({ error:"invalid_diff" });
  if(!Number.isFinite(lvl) || lvl < 1 || lvl > 999) return res.status(400).json({ error:"invalid_level" });
  if(!Number.isFinite(t) || t < 0 || t > 86_400_000) return res.status(400).json({ error:"invalid_time" });
  if(!Number.isFinite(k) || k < 0 || k > 9999) return res.status(400).json({ error:"invalid_kills" });

  const createdAt = Date.now();
  await run(db,
    "INSERT INTO scores(user_id, score, role_id, diff_id, level_id, time_ms, kills, created_at) VALUES(?,?,?,?,?,?,?,?)",
    [req.user.sub, Math.round(s), roleId, diffId, Math.round(lvl), Math.round(t), Math.round(k), createdAt]
  );

  res.json({ ok:true });
});

app.get("/api/leaderboard", async (req,res)=>{
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 20)));
  const rows = await all(db, `
    SELECT s.score, s.role_id as roleId, s.diff_id as diffId, s.level_id as levelId,
           u.display_name as displayName
    FROM scores s
    JOIN users u ON u.id = s.user_id
    ORDER BY s.score DESC
    LIMIT ?
  `, [limit]);

  res.json({ items: rows });
});

app.listen(PORT, ()=>{
  console.log(`CyberDoom server listening on http://localhost:${PORT}`);
});
