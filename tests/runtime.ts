import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export const sqlite=new DatabaseSync(':memory:');
// Every migration in journal order, as `wrangler d1 migrations apply` runs them.
for(const {tag} of (JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8')) as {entries:{tag:string}[]}).entries)sqlite.exec(readFileSync(new URL(`../drizzle/${tag}.sql`,import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
class Prepared{args:unknown[]=[];constructor(public sql:string){}bind(...args:unknown[]){this.args=args;return this}async all(){return{results:sqlite.prepare(this.sql).all(...this.args as [])}}async first(){return sqlite.prepare(this.sql).get(...this.args as [])??null}async run(){const r=sqlite.prepare(this.sql).run(...this.args as []);return{meta:{changes:Number(r.changes)}}}}
export const env:Record<string,unknown>={ADMIN_EMAILS:'admin@example.invalid',DB:{prepare:(sql:string)=>new Prepared(sql),async batch(statements:Prepared[]){sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}}}};
