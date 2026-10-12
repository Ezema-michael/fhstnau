import JournalReviewNote from '@/components/site/journal-review-note';
import ContentPage from '@/components/site/content-page';import {getContent} from '@/lib/site-content';
export const dynamic='force-dynamic';export default async function Page(){const c=await getContent();return <ContentPage title={'Author guidelines'} eyebrow="FHST Journal and Scientific Conference" text={c.guidelines} approved={c.contentApproved==='true'}><JournalReviewNote/></ContentPage>}
