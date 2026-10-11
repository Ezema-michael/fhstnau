import ContentPage from '@/components/site/content-page';import {getContent} from '@/lib/site-content';
export const dynamic='force-dynamic';export default async function Page(){const c=await getContent();return <ContentPage title={'Programme and speakers'} eyebrow="FHST Journal and Scientific Conference" text={c.programme} approved={c.contentApproved==='true'}/>}
