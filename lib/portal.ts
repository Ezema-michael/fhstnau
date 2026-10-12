import {currentUser} from '@/lib/auth';
import {fileStorage} from '@/lib/file-storage';
export async function actor(){const user=await currentUser();return user&&!user.mustChange?{id:user.id,email:user.email,name:user.name,role:user.role==='super_admin'?'editor':user.role,isSuperAdmin:user.role==='super_admin'}:null}
export function bucket(){return fileStorage}
export function fail(message:string,status=400){return Response.json({error:message},{status})}
export function serverError(e:unknown){console.error('Portal request failed',e);return fail('The portal is temporarily unavailable. Please try again.',503)}
export const validStatus=['draft','submitted','under_review','revision_requested','accepted','rejected'];
