import PublicationSearch from './publication-search';
import {and,desc,eq,isNotNull} from 'drizzle-orm';
import {getDb} from '@/db';
import {submissions} from '@/db/schema';

export default async function PublicationList({stream}:{stream?:'journal'|'conference'}){
  let papers;
  try{
    papers=await getDb().select({isSample:submissions.isSample,id:submissions.id,title:submissions.title,authors:submissions.authors,track:submissions.track,stream:submissions.stream,publishedAt:submissions.publishedAt}).from(submissions).where(and(eq(submissions.status,'accepted'),isNotNull(submissions.publishedAt),stream?eq(submissions.stream,stream):undefined)).orderBy(desc(submissions.publishedAt));
  }catch(e){console.error('Publication list unavailable',e);return <div className="empty">The publications are temporarily unavailable. Please try again later.</div>}
  return <PublicationSearch papers={papers}/>;
}
