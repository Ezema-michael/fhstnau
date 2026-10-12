import {NextRequest,NextResponse} from 'next/server';
import {cookieName,getSession} from './runtime/auth.mjs';
export function proxy(request:NextRequest){
 const path=request.nextUrl.pathname;const configured=process.env.APP_URL;
 if(!configured)return NextResponse.json({error:'APP_URL is not configured.'},{status:503});
 if(!['GET','HEAD','OPTIONS'].includes(request.method)&&request.headers.get('origin')!==new URL(configured).origin)return NextResponse.json({error:'Request origin rejected.'},{status:403});
 if(path==='/api/health')return NextResponse.next();
 const user=getSession(request.cookies.get(cookieName)?.value);
 const authRoute=path==='/login'||path.startsWith('/api/auth/');
 if(user?.mustChange&&!authRoute){if(path.startsWith('/api/'))return NextResponse.json({error:'Change your temporary password before continuing.'},{status:403});return NextResponse.redirect(new URL('/login?change=1',configured));}
 if(process.env.REVIEW_PRIVATE!=='false'&&!user&&!authRoute){if(path.startsWith('/api/'))return NextResponse.json({error:'Sign in to continue.'},{status:401});const url=new URL('/login',configured);url.searchParams.set('returnTo',path+request.nextUrl.search);return NextResponse.redirect(url)}
 const response=NextResponse.next();if(user||process.env.REVIEW_PRIVATE!=='false')response.headers.set('Cache-Control','private, no-store');if(process.env.REVIEW_PRIVATE!=='false')response.headers.set('X-Robots-Tag','noindex, nofollow');return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.svg).*)']};
