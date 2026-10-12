import {NextResponse} from 'next/server';
import {sqlite} from '@/runtime/database.mjs';
import {cookieName,sessionSeconds,createSession,normalEmail,validEmail,verifyPassword,takeAttempt,hashPassword} from '@/runtime/auth.mjs';
import {secureCookies} from '@/lib/auth';
export const runtime='nodejs';
let dummy:Promise<string>|undefined;
export async function POST(request:Request){try{
 const body=await request.json();const email=normalEmail(body.email),password=typeof body.password==='string'?body.password:'';
 if(!validEmail(email)||password.length>128)return NextResponse.json({error:'Invalid email or password.'},{status:401});
 const ip=request.headers.get('x-real-ip')||'unknown';
 if(!takeAttempt('ip:'+ip,100)||!takeAttempt('email:'+email))return NextResponse.json({error:'Too many attempts. Try again in 15 minutes.'},{status:429});
 const user=sqlite().prepare('SELECT u.id,a.password_hash AS hash,a.must_change AS mustChange FROM users u JOIN auth_accounts a ON a.user_id=u.id WHERE u.email=?').get(email) as {id:string;hash:string;mustChange:number}|undefined;
 dummy??=hashPassword('dummy-not-a-real-password-'+crypto.randomUUID());
 const verified=await verifyPassword(password,user?.hash||await dummy);
 if(!user||!verified)return NextResponse.json({error:'Invalid email or password.'},{status:401});
 const response=NextResponse.json({ok:true,mustChange:!!user.mustChange});response.cookies.set(cookieName,createSession(user.id),{httpOnly:true,secure:secureCookies(),sameSite:'lax',path:'/',maxAge:sessionSeconds});response.headers.set('Cache-Control','no-store');return response;
 }catch(e){console.error('Sign-in failed',e);return NextResponse.json({error:'Sign-in is temporarily unavailable.'},{status:503})}}
