import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { query, batch } from '@/runtime/database.mjs';
import * as schema from './schema';
const db=drizzle(async(sql,params,method)=>query(sql,params,method) as {rows:any[]},async(queries)=>batch(queries) as {rows:any[]}[],{schema});
export function getDb(){return db}
