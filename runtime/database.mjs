import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
let database;
export function dataDirectory(){return resolve(process.env.DATA_DIR || './data');}
export function sqlite(){
 if(database)return database;
 const dir=dataDirectory();mkdirSync(dir,{recursive:true,mode:0o700});
 const db=new DatabaseSync(join(dir,'fhst.sqlite'));
 db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 db.exec('CREATE TABLE IF NOT EXISTS fhst_migrations(name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at INTEGER NOT NULL)');
 const migrationDir=resolve(process.env.MIGRATIONS_DIR||'./drizzle');
 for(const name of readdirSync(migrationDir).filter(x=>x.endsWith('.sql')).sort()){
  const sql=readFileSync(join(migrationDir,name),'utf8');const checksum=createHash('sha256').update(sql).digest('hex');
  const done=db.prepare('SELECT checksum FROM fhst_migrations WHERE name=?').get(name);
  if(done){if(done.checksum!==checksum)throw Error('Applied migration has changed: '+name);continue;}
  db.exec('BEGIN IMMEDIATE');try{db.exec(sql);db.prepare('INSERT INTO fhst_migrations VALUES(?,?,?)').run(name,checksum,Date.now());db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');db.close();throw e;}
 }
 database=db;return db;
}
export function query(sql,params,method){const statement=sqlite().prepare(sql);if(method==='run'){statement.run(...params);return {rows:[]};}statement.setReturnArrays(true);return {rows:method==='get'?statement.get(...params):statement.all(...params)};}
export function batch(queries){const db=sqlite();db.exec('BEGIN IMMEDIATE');try{const results=queries.map(q=>query(q.sql,q.params,q.method));db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}
