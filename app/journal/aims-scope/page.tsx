import ContentPage from '@/components/site/content-page';import {getContent} from '@/lib/site-content';
export const dynamic='force-dynamic';export default async function Page(){const c=await getContent();return <ContentPage title={'Aims and scope'} eyebrow="FHST Journal and Scientific Conference" text={c.aims+'\n'+c.scope} approved={c.contentApproved==='true'}/>}
