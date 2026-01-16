import sqlite3 from "sqlite3";

export function openDb(path){
  const db = new sqlite3.Database(path);

  db.serialize(()=>{
    db.run(`
      CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS scores(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        role_id TEXT NOT NULL,
        diff_id TEXT NOT NULL,
        level_id INTEGER NOT NULL,
        time_ms INTEGER NOT NULL,
        kills INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at DESC)`);
  });

  return db;
}

export function run(db, sql, params=[]){
  return new Promise((resolve, reject)=>{
    db.run(sql, params, function(err){
      if(err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function get(db, sql, params=[]){
  return new Promise((resolve, reject)=>{
    db.get(sql, params, (err, row)=>{
      if(err) reject(err);
      else resolve(row);
    });
  });
}

export function all(db, sql, params=[]){
  return new Promise((resolve, reject)=>{
    db.all(sql, params, (err, rows)=>{
      if(err) reject(err);
      else resolve(rows);
    });
  });
}
