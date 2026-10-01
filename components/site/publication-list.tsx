import {and,desc,eq,isNotNull} from 'drizzle-orm';
import {getDb} from '@/db';
import {submissions} from '@/db/schema';

export default async function PublicationList({stream}:{stream?:'journal'|'conference'}){
  let papers;
  try{
    papers=await getDb().select({id:submissions.id,title:submissions.title,authors:submissions.authors,track:submissions.track,stream:submissions.stream,publishedAt:submissions.publishedAt}).from(submissions).where(and(eq(submissions.status,'accepted'),isNotNull(submissions.publishedAt),stream?eq(submissions.stream,stream):undefined)).orderBy(desc(submissions.publishedAt));
  }catch(e){console.error('Publication list unavailable',e);return <div className="empty">The publications are temporarily unavailable. Please try again later.</div>}
  return papers.length?<div className="publicationlist">{papers.map(p=><article className="publication" key={p.id}><span className="eyebrow">{p.stream==='journal'?'FHST Journal':'FHST-ISC 2027'} · {p.track}</span><h3><a href={'/publications/'+p.id}>{p.title}</a></h3><p>{p.authors}</p><p className="muted small">Published {new Date(p.publishedAt!).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p><a className="link" href={'/publications/'+p.id}>Read abstract</a></article>)}</div>:<div className="empty">No {stream==='journal'?'journal articles':stream==='conference'?'conference papers':'publications'} have been released yet. Approved work will appear after editorial publication.</div>;
}
