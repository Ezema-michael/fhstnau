import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { submissions, assignments } from '@/db/schema';
import { actor, bucket, fail, serverError } from '@/lib/portal';

async function permitted(submissionId:string,user:{id:string;role:string}){
 const db=getDb(),s=await db.select().from(submissions).where(eq(submissions.id,submissionId)).get();
 if(!s)return null;
 if(user.role==='editor'||s.authorId===user.id)return s;
 const a=await db.select().from(assignments).where(and(eq(assignments.submissionId,submissionId),eq(assignments.reviewerId,user.id))).get();
 return a?s:null;
}
export async function GET(request:Request){try{
 const user=await actor();if(!user)return fail('Sign in to continue',401);
 const sid=new URL(request.url).searchParams.get('id')||'';const s=await permitted(sid,user);
 if(!s||!s.fileKey)return fail('File not found',404);
 const object=await bucket().get(s.fileKey);if(!object)return fail('File not found',404);
 return new Response(object.body,{headers:{'Content-Type':s.fileType||'application/octet-stream','Content-Disposition':`attachment; filename="${(s.fileName||'manuscript').replace(/["\r\n]/g,'')}"`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
 }catch(e){return serverError(e)}}
export async function POST(request:Request){try{
 const user=await actor();if(!user)return fail('Sign in to continue',401);
 const form=await request.formData(),sid=String(form.get('id')||''),file=form.get('file');
 const db=getDb(),s=await db.select().from(submissions).where(eq(submissions.id,sid)).get();
 if(!s||s.authorId!==user.id)return fail('Access denied',403);
 if(!['draft','revision_requested'].includes(s.status))return fail('Files cannot be replaced at this stage.',409);
 if(!(file instanceof File)||!file.size||file.size>10*1024*1024)return fail('Upload a file under 10 MB.');
 const name=file.name.slice(0,180),ext=name.split('.').pop()?.toLowerCase();
 if(!['pdf','docx'].includes(ext||''))return fail('Upload a PDF or DOCX file.');
 const signature=new Uint8Array(await file.slice(0,8).arrayBuffer());
 const pdf=ext==='pdf'&&[37,80,68,70,45].every((n,i)=>signature[i]===n),docx=ext==='docx'&&signature[0]===80&&signature[1]===75;
 if(!pdf&&!docx)return fail('File contents do not match the extension.');
 const key=`manuscripts/${sid}/${crypto.randomUUID()}.${ext}`;
 await bucket().put(key,file.stream(),{httpMetadata:{contentType:pdf?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}});
 await db.update(submissions).set({fileKey:key,fileName:name,fileType:pdf?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',updatedAt:Date.now()}).where(eq(submissions.id,sid));
 if(s.fileKey)await bucket().delete(s.fileKey);
 return Response.json({ok:true,name});
 }catch(e){return serverError(e)}}
