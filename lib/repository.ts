import {env} from 'cloudflare:workers';
import {seed} from './seed';
import type {Catalog} from './domain';
export type Kind=keyof Catalog;
export const kinds:Kind[]=['items','rules','points','sources','areas'];
export function db(){if(!env.DB)throw new Error('STORAGE_UNAVAILABLE');return env.DB}
export async function catalog():Promise<Catalog>{const rows=await db().prepare('SELECT kind,id,payload FROM records').all<{kind:Kind;id:string;payload:string}>();const c=structuredClone(seed);for(const row of rows.results){if(!kinds.includes(row.kind))continue;const list=c[row.kind] as {id:string}[];const item=JSON.parse(row.payload);const at=list.findIndex(i=>i.id===row.id);if(at>=0)list[at]=item;else list.push(item)}return c}
export function config(key:string){return (env as unknown as Record<string,string>)[key]??''}
