import { and, eq, desc, inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { users, invitations, submissions, assignments, events } from '@/db/schema';
import { actor, fail, serverError } from '@/lib/portal';

const norm = (v:unknown,max:number) => typeof v === 'string' ? v.trim().slice(0,max) : '';
const id = () => crypto.randomUUID();
const log = async (db:ReturnType<typeof getDb>,submissionId:string,actorId:string,action:string) => db.insert(events).values({id:id(),submissionId,actorId,action,at:Date.now()});
export async function GET(request:Request){
  try{
    const user=await actor();if(!user)return fail('Sign in to continue',401);
    const db=getDb(), url=new URL(request.url), detail=url.searchParams.get('id');
    if(detail){
      const submission=await db.select().from(submissions).where(eq(submissions.id,detail)).get();if(!submission)return fail('Submission not found',404);
      const assignment=await db.select().from(assignments).where(and(eq(assignments.submissionId,detail),eq(assignments.reviewerId,user.id))).get();
      if(user.role!=='editor' && submission.authorId!==user.id && !assignment)return fail('Access denied',403);
      const reviews=user.role==='editor'?await db.select({id:assignments.id,reviewerId:assignments.reviewerId,reviewerName:users.name,status:assignments.status,score:assignments.score,recommendation:assignments.recommendation,comments:assignments.comments,confidential:assignments.confidential,conflict:assignments.conflict,completedAt:assignments.completedAt}).from(assignments).innerJoin(users,eq(assignments.reviewerId,users.id)).where(eq(assignments.submissionId,detail)):[];
      const history=await db.select().from(events).where(eq(events.submissionId,detail)).orderBy(desc(events.at));
      return Response.json({user,submission,assignment,reviews,history});
    }
    if(url.searchParams.get('people')==='1'){
      if(user.role!=='editor')return fail('Access denied',403);
      const people=await db.select().from(users).orderBy(users.name);const invites=await db.select().from(invitations);
      return Response.json({user,people,invites});
    }
    let rows;
    if(user.role==='editor')rows=await db.select().from(submissions).orderBy(desc(submissions.updatedAt));
    else if(user.role==='reviewer')rows=await db.select({submission:submissions,assignment:assignments}).from(assignments).innerJoin(submissions,eq(assignments.submissionId,submissions.id)).where(eq(assignments.reviewerId,user.id)).orderBy(desc(submissions.updatedAt));
    else rows=await db.select().from(submissions).where(eq(submissions.authorId,user.id)).orderBy(desc(submissions.updatedAt));
    return Response.json({user,rows});
  }catch(e){return serverError(e)}
}
export async function POST(request:Request){
  try{
    const user=await actor();if(!user)return fail('Sign in to continue',401);
    const body=await request.json() as Record<string,unknown>;const action=body.action;const db=getDb();
    if(action==='save'){
      const title=norm(body.title,240),abstract=norm(body.abstract,5000),authors=norm(body.authors,1000),keywords=norm(body.keywords,300),track=norm(body.track,120);
      const stream=body.stream==='journal'?'journal':'conference';
      if(!title || !abstract || !authors || !keywords || !track)return fail('Complete the title, authors, abstract, keywords and track.');
      const now=Date.now();let submission;
      if(body.id){
        const existing=await db.select().from(submissions).where(eq(submissions.id,String(body.id))).get();
        if(!existing)return fail('Submission not found',404);
        if(existing.authorId!==user.id)return fail('Access denied',403);
        if(!['draft','revision_requested'].includes(existing.status))return fail('This submission cannot be edited now.',409);
        submission=await db.update(submissions).set({title,abstract,authors,keywords,track,stream,updatedAt:now}).where(eq(submissions.id,existing.id)).returning().get();
      }else{
        submission=await db.insert(submissions).values({id:id(),authorId:user.id,title,abstract,authors,keywords,track,stream,status:'draft',createdAt:now,updatedAt:now}).returning().get();
        await log(db,submission.id,user.id,'Draft created');
      }
      return Response.json({submission});
    }
    const sid=norm(body.id,80);
    if(action==='submit'){
      const s=await db.select().from(submissions).where(eq(submissions.id,sid)).get();if(!s)return fail('Submission not found',404);
      if(s.authorId!==user.id)return fail('Access denied',403);
      if(!['draft','revision_requested'].includes(s.status))return fail('This submission is already submitted.',409);
      if(!s.fileKey)return fail('Upload your manuscript before submitting.');
      const updated=await db.update(submissions).set({status:'submitted',submittedAt:Date.now(),updatedAt:Date.now(),decisionNote:null}).where(and(eq(submissions.id,sid),eq(submissions.status,s.status))).returning().get();
      if(!updated)return fail('Submission changed. Refresh and try again.',409);
      await log(db,sid,user.id,s.status==='draft'?'Submitted':'Revision submitted');return Response.json({submission:updated});
    }
    if(action==='invite'){
      if(user.role!=='editor')return fail('Access denied',403);
      const email=norm(body.email,254).toLowerCase(),role=body.role;
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||!['reviewer','editor'].includes(String(role)))return fail('Enter a valid email and role.');
      await db.insert(invitations).values({email,role:role as 'reviewer'|'editor',createdAt:Date.now()}).onConflictDoUpdate({target:invitations.email,set:{role:role as 'reviewer'|'editor'}});
      const existing=await db.select().from(users).where(eq(users.email,email)).get();if(existing)await db.update(users).set({role:role as 'reviewer'|'editor'}).where(eq(users.id,existing.id));
      return Response.json({ok:true});
    }
    if(action==='assign'){
      if(user.role!=='editor')return fail('Access denied',403);
      const s=await db.select().from(submissions).where(eq(submissions.id,sid)).get();if(!s)return fail('Submission not found',404);
      if(!['submitted','under_review'].includes(s.status))return fail('Only submitted work can be assigned.',409);
      const reviewer=await db.select().from(users).where(eq(users.id,norm(body.reviewerId,100))).get();
      if(!reviewer||reviewer.role!=='reviewer'||reviewer.id===s.authorId)return fail('Select an eligible reviewer.');
      const existing=await db.select().from(assignments).where(and(eq(assignments.submissionId,sid),eq(assignments.reviewerId,reviewer.id))).get();if(existing)return fail('Reviewer already assigned.',409);
      await db.insert(assignments).values({id:id(),submissionId:sid,reviewerId:reviewer.id,status:'assigned',createdAt:Date.now()});
      await db.update(submissions).set({status:'under_review',updatedAt:Date.now()}).where(eq(submissions.id,sid));await log(db,sid,user.id,`Assigned reviewer ${reviewer.name}`);return Response.json({ok:true});
    }
    if(action==='review'){
      const assignment=await db.select().from(assignments).where(and(eq(assignments.submissionId,sid),eq(assignments.reviewerId,user.id))).get();
      if(!assignment||user.role!=='reviewer')return fail('Access denied',403);
      if(assignment.status==='completed')return fail('Review already completed.',409);
      const s=await db.select().from(submissions).where(eq(submissions.id,sid)).get();if(!s||s.status!=='under_review')return fail('Review is closed.',409);
      const conflict=body.conflict===true;
      const score=Number(body.score),recommendation=norm(body.recommendation,30),comments=norm(body.comments,5000),confidential=norm(body.confidential,5000);
      if(!conflict&&(!Number.isInteger(score)||score<1||score>5||!['accept','minor_revision','major_revision','reject'].includes(recommendation)||comments.length<20))return fail('Provide a score, recommendation and comments of at least 20 characters.');
      await db.update(assignments).set({status:'completed',conflict:conflict?1:0,score:conflict?null:score,recommendation:conflict?'conflict':recommendation,comments:conflict?null:comments,confidential:conflict?null:confidential,completedAt:Date.now()}).where(eq(assignments.id,assignment.id));
      await log(db,sid,user.id,conflict?'Conflict of interest declared':'Review completed');return Response.json({ok:true});
    }
    if(action==='publish'){
      if(user.role!=='editor')return fail('Access denied',403);
      const s=await db.select().from(submissions).where(eq(submissions.id,sid)).get();
      if(!s)return fail('Submission not found',404);
      if(s.status!=='accepted')return fail('Only accepted work can be published.',409);
      if(s.publishedAt)return fail('Already published.',409);
      await db.update(submissions).set({publishedAt:Date.now(),updatedAt:Date.now()}).where(eq(submissions.id,sid));
      await log(db,sid,user.id,s.stream==='journal'?'Published in FHST Journal':'Published in conference proceedings');
      return Response.json({ok:true});
    }
    if(action==='decision'){
      if(user.role!=='editor')return fail('Access denied',403);
      const status=body.status;if(!['revision_requested','accepted','rejected'].includes(String(status)))return fail('Invalid decision.');
      const s=await db.select().from(submissions).where(eq(submissions.id,sid)).get();if(!s)return fail('Submission not found',404);
      if(!['submitted','under_review'].includes(s.status))return fail('Decision cannot be made at this stage.',409);
      const note=norm(body.note,5000);if(note.length<10)return fail('Provide a decision note of at least 10 characters.');
      if(status!=='rejected'){
        const completed=await db.select().from(assignments).where(and(eq(assignments.submissionId,sid),eq(assignments.status,'completed')));
        if(!completed.some(x=>!x.conflict))return fail('At least one completed review is required.');
      }
      await db.update(submissions).set({status:status as 'accepted'|'rejected'|'revision_requested',decisionNote:note,updatedAt:Date.now()}).where(eq(submissions.id,sid));
      await log(db,sid,user.id,`Decision: ${String(status).replace('_',' ')}`);return Response.json({ok:true});
    }
    return fail('Unknown action',400);
  }catch(e){return serverError(e)}
}
