 'use client';
import {usePathname} from 'next/navigation';
const links=[['About','/about'],['Journal','/journal'],['Publications','/publications'],['Conference','/conference/2027'],['Contact','/contact'],['Portal','/portal']];
export default function Navigation(){const path=usePathname();return <><nav className="sitenav desktopnav" aria-label="Main navigation">{links.map(([n,u])=><a aria-current={path===u||path.startsWith(u+'/')?'page':undefined} key={u} href={u}>{n}</a>)}</nav><details className="mobilemenu"><summary>Menu</summary><nav aria-label="Mobile navigation">{links.map(([n,u])=><a key={u} href={u}>{n}</a>)}</nav></details></>}
