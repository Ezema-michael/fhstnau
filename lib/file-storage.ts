import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,rename,unlink,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {dataDirectory} from '@/runtime/database.mjs';
const directory=()=>join(dataDirectory(),'uploads');
const filename=(key:string)=>join(directory(),createHash('sha256').update(key).digest('hex'));
export const fileStorage={
 async put(key:string,value:ReadableStream|Uint8Array,options?:{httpMetadata?:{contentType?:string}}){
  await mkdir(directory(),{recursive:true,mode:0o700});
  const bytes=value instanceof Uint8Array?value:new Uint8Array(await new Response(value).arrayBuffer());
  const target=filename(key),temp=target+'.'+randomUUID()+'.tmp';
  try{await writeFile(temp,bytes,{mode:0o600});await rename(temp,target)}finally{await unlink(temp).catch(()=>{})}
 },
 async get(key:string){try{const bytes=await readFile(filename(key));return {body:new Uint8Array(bytes)}}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e}},
 async delete(key:string){try{await unlink(filename(key))}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}}
};
