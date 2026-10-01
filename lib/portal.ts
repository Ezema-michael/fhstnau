import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users, invitations } from '@/db/schema';
import { getChatGPTUser } from '@/app/chatgpt-auth';

const editorId = (env as Cloudflare.Env & {FHST_EDITOR_USER_ID?: string}).FHST_EDITOR_USER_ID;
const editorEmail = (env as Cloudflare.Env & {FHST_EDITOR_EMAIL?: string}).FHST_EDITOR_EMAIL?.trim().toLowerCase();
export async function actor() {
  const identity = await getChatGPTUser();
  if (!identity) return null;
  const db = getDb();
  const email = identity.email.trim().toLowerCase();
  const existing = await db.select().from(users).where(eq(users.id,identity.userId)).get();
  const invitation = await db.select().from(invitations).where(eq(invitations.email,email)).get();
  const role = ((editorId && identity.userId === editorId) || (editorEmail && email === editorEmail)) ? 'editor' : invitation?.role ?? 'author';
  if (!existing) {
    await db.insert(users).values({id:identity.userId,email,name:identity.displayName,role,createdAt:Date.now()});
  } else if (existing.email !== email || existing.role !== role || existing.name !== identity.displayName) {
    await db.update(users).set({email,name:identity.displayName,role}).where(eq(users.id,identity.userId));
  }
  return {id:identity.userId,email,name:identity.displayName,role};
}
export function bucket(){if(!env.BUCKET)throw new Error('File storage is unavailable');return env.BUCKET}
export function fail(message:string,status=400){return Response.json({error:message},{status})}
export function serverError(e:unknown){console.error('Portal request failed',e);return fail('The portal is temporarily unavailable. Please try again.',503)}
export const validStatus = ['draft','submitted','under_review','revision_requested','accepted','rejected'];
