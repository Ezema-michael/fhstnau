import {cookies} from 'next/headers';import {NextResponse} from 'next/server';import {cookieName,deleteSession} from '@/runtime/auth.mjs';
export async function POST(){deleteSession((await cookies()).get(cookieName)?.value);const response=NextResponse.redirect(new URL('/login',process.env.APP_URL!),303);response.cookies.delete(cookieName);return response}
