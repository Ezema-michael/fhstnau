import PageIntro from './page-intro';
export function TextBlocks({text}:{text:string}){
 const lines=text.split('\n').filter(Boolean);const blocks:React.ReactNode[]=[];
 for(let i=0;i<lines.length;i++){
  const t=lines[i];
  if(t.startsWith('## ')){blocks.push(<h2 key={i}>{t.slice(3)}</h2>);continue}
  if(t.startsWith('- ')){const start=i,items=[];while(i<lines.length&&lines[i].startsWith('- ')){items.push(lines[i].slice(2));i++}i--;blocks.push(<ul key={start}>{items.map((item,n)=><li key={n}>{item}</li>)}</ul>);continue}
  if(t.startsWith('| ')){const start=i,rows:string[][]=[];while(i<lines.length&&lines[i].startsWith('| ')){const cells=lines[i].split('|').slice(1,-1).map(c=>c.trim());if(!cells.every(c=>/^[-: ]+$/.test(c)))rows.push(cells);i++}i--;blocks.push(<div className="journal-table-wrap" key={start}><table className="journal-table"><thead><tr>{rows[0]?.map((c,n)=><th key={n} scope="col">{c}</th>)}</tr></thead><tbody>{rows.slice(1).map((r,n)=><tr key={n}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>);continue}
  blocks.push(<p key={i}>{t}</p>);
 }
 return <div className="prose">{blocks}</div>
}
export default function ContentPage({title,eyebrow,text,approved=false,children}:{title:string;eyebrow:string;text:string;approved?:boolean;children?:React.ReactNode}){return <main><PageIntro title={title} eyebrow={eyebrow} description=""/><section className="section shell split"><div>{!approved&&<div className="alert"><strong>Draft for Faculty approval</strong><p>Proposed wording and bracketed details will be replaced after approval.</p></div>}<TextBlocks text={text}/>{children}</div><aside className="asidecard"><h3>Explore FHST</h3><a className="listlink" href="/journal/aims-scope">Aims and scope</a><a className="listlink" href="/journal/editorial-board">Editorial board</a><a className="listlink" href="/journal/author-guidelines">Author guidelines</a><a className="listlink" href="/journal/policies">Editorial policies</a><a className="listlink" href="/journal/issues">Journal issues</a><a className="listlink" href="/conference/2027">Scientific conference</a><a className="listlink" href="/contact">Contact</a></aside></section></main>}
