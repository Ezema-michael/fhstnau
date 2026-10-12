import {cookies} from 'next/headers';
import {cookieName,getSession} from '@/runtime/auth.mjs';
export async function currentUser(){const token=(await cookies()).get(cookieName)?.value;return getSession(token) as {id:string;email:string;name:string;role:'author'|'reviewer'|'editor'|'super_admin';mustChange:number}|null}
export function secureCookies(){return process.env.COOKIE_SECURE!=='false'}
