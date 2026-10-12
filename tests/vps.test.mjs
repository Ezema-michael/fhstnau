import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';
const dir=await mkdtemp(join(tmpdir(),'fhst-vps-test-'));process.env.DATA_DIR=dir;
const {sqlite,batch}=await import('../runtime/database.mjs');const auth=await import('../runtime/auth.mjs');
let server;const origin='http://127.0.0.1:3337';let logs='';
async function request(path,body,cookie){return fetch(origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual'})}
async function login(email,password){let r=await request('/api/auth/login',{email,password});assert.equal(r.status,200,await r.text());return r.headers.get('set-cookie').split(';')[0]}
await test('VPS authentication, private review and publication workflow',async()=>{
 try{
  const editor=await auth.provisionAccount('editor@example.org','Editor','editor','temporary-editor-password');
  const author=await auth.provisionAccount('author@example.org','Author','author','temporary-author-password');
  const reviewer=await auth.provisionAccount('reviewer@example.org','Reviewer','reviewer','temporary-review-password');
  const hash=sqlite().prepare('SELECT password_hash FROM auth_accounts WHERE user_id=?').get(editor).password_hash;
  assert.notEqual(hash,'temporary-editor-password');assert.equal(await auth.verifyPassword('wrong',hash),false);
  // A batch must roll back all preceding writes on a constraint failure.
  assert.throws(()=>batch([{sql:'INSERT INTO site_content VALUES(?,?,?)',params:['rollback-test','x',1],method:'run'},{sql:'INSERT INTO site_content VALUES(?,?,?)',params:['rollback-test','x',1],method:'run'}]));
  assert.equal(sqlite().prepare('SELECT * FROM site_content WHERE key=?').get('rollback-test'),undefined);
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3337'],{env:{...process.env,APP_URL:origin,COOKIE_SECURE:'false',REVIEW_PRIVATE:'true',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
  let ready=false;for(let n=0;n<100;n++){try{ready=(await request('/api/health')).ok;if(ready)break}catch{}await delay(100)}assert.ok(ready,logs);
  assert.equal((await request('/')).status,307);
  assert.equal((await request('/api/portal')).status,401);
  let bad=await request('/api/auth/login',{email:'editor@example.org',password:'bad'});assert.equal(bad.status,401);
  let ec=await login('editor@example.org','temporary-editor-password');assert.equal((await request('/api/portal',undefined,ec)).status,403);
  let r=await request('/api/auth/password',{currentPassword:'temporary-editor-password',password:'editor-new-long-password'},ec);assert.equal(r.status,200,await r.text());let newec=r.headers.get('set-cookie').split(';')[0];assert.equal((await request('/api/portal',undefined,ec)).status,401);ec=newec;
  // Privileged identity headers must not create a session.
  const spoof=await fetch(origin+'/api/portal',{headers:{'oai-authenticated-user-id':editor,'oai-authenticated-user-email':'editor@example.org'}});assert.equal(spoof.status,401);
  const csrf=await fetch(origin+'/api/portal',{method:'POST',headers:{Cookie:ec,Origin:'https://attacker.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(csrf.status,403);
  const edata=await (await request('/api/portal',undefined,ec)).json();assert.equal(edata.user.role,'editor');assert.ok(edata.rows.length>=6);
  assert.equal((await request('/api/admin/accounts',undefined,ec)).status,403);
  assert.equal((await request('/api/admin/accounts',{action:'create',name:'Blocked',email:'blocked@example.org',role:'super_admin',password:'blocked-password-123'},ec)).status,403);
  assert.equal((await request('/api/portal',{action:'invite',email:'blocked@example.org',role:'editor'},ec)).status,403);
  const superId=await auth.provisionAccount('super@example.org','Super Admin','super_admin','temporary-super-password');
  let sc=await login('super@example.org','temporary-super-password');r=await request('/api/auth/password',{currentPassword:'temporary-super-password',password:'super-new-long-password'},sc);assert.equal(r.status,200,await r.clone().text());sc=r.headers.get('set-cookie').split(';')[0];
  r=await request('/api/admin/accounts',{action:'create',email:'new@example.org',name:'New Reviewer',role:'reviewer',password:'temporary-new-password'},sc);assert.equal(r.status,200,await r.clone().text());const newId=(await r.json()).id;
  r=await request('/api/admin/accounts',undefined,sc);const listing=await r.json();assert.ok(listing.people.some(p=>p.id===newId));assert.ok(!JSON.stringify(listing).includes('temporary-new-password'));assert.ok(!JSON.stringify(listing).includes('password_hash'));
  assert.equal((await request('/api/admin/accounts',{action:'create',email:'new@example.org',name:'Duplicate',role:'editor',password:'duplicate-password-123'},sc)).status,409);
  let nc=await login('new@example.org','temporary-new-password');r=await request('/api/auth/password',{currentPassword:'temporary-new-password',password:'new-account-password-123'},nc);nc=r.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/admin/accounts',{action:'disable',id:newId},sc)).status,200);
  assert.equal((await request('/api/portal',undefined,nc)).status,401);
  assert.equal((await request('/api/auth/login',{email:'new@example.org',password:'new-account-password-123'})).status,401);
  assert.equal((await request('/api/admin/accounts',{action:'reactivate',id:newId},sc)).status,200);
  nc=await login('new@example.org','new-account-password-123');
  assert.equal((await request('/api/admin/accounts',{action:'role',id:newId,role:'editor'},sc)).status,200);
  assert.equal((await request('/api/portal',undefined,nc)).status,401);
  assert.equal((await request('/api/admin/accounts',{action:'reset',id:newId,password:'reset-temporary-password'},sc)).status,200);
  nc=await login('new@example.org','reset-temporary-password');assert.equal((await request('/api/portal',undefined,nc)).status,403);
  assert.equal((await request('/api/admin/accounts',{action:'disable',id:superId},sc)).status,409);
  assert.equal((await request('/api/admin/accounts',{action:'role',id:superId,role:'editor'},sc)).status,409);
  const {protectLastAdmin}=await import('../runtime/admin.mjs');assert.throws(()=>protectLastAdmin(sqlite(),superId,'editor',0),/at least one/);
  assert.equal((await request('/portal/admin',undefined,sc)).status,200);

  let ac=await login('author@example.org','temporary-author-password');r=await request('/api/auth/password',{currentPassword:'temporary-author-password',password:'author-new-long-password'},ac);ac=r.headers.get('set-cookie').split(';')[0];
  let rc=await login('reviewer@example.org','temporary-review-password');r=await request('/api/auth/password',{currentPassword:'temporary-review-password',password:'reviewer-new-long-password'},rc);rc=r.headers.get('set-cookie').split(';')[0];
  r=await request('/api/portal',{action:'save',title:'VPS integration test',abstract:'A fictional test.',authors:'Example author',keywords:'test, sample',track:'Radiography',stream:'journal'},ac);assert.equal(r.status,200,await r.clone().text());let saved=await r.json();const sid=saved.id||saved.submission?.id;assert.ok(sid,JSON.stringify(saved));
  const form=new FormData();form.set('id',sid);form.set('file',new Blob(['%PDF-1.4\nfictional test']), 'test.pdf');r=await fetch(origin+'/api/portal/file',{method:'POST',headers:{Cookie:ac,Origin:origin},body:form});assert.equal(r.status,200,await r.text());
  assert.equal((await request('/api/portal/file?id='+sid,undefined,rc)).status,404);
  r=await request('/api/portal',{action:'submit',id:sid},ac);assert.equal(r.status,200,await r.text());
  r=await request('/api/portal',{action:'assign',id:sid,reviewerId:reviewer},ec);assert.equal(r.status,200,await r.text());
  assert.equal((await request('/api/portal/file?id='+sid,undefined,rc)).status,200);
  r=await request('/api/portal',{action:'review',id:sid,score:4,recommendation:'accept',comments:'Fictional review for VPS integration testing.',confidential:'',conflict:false},rc);assert.equal(r.status,200,await r.text());
  r=await request('/api/portal',{action:'decision',id:sid,status:'accepted',note:'Fictional acceptance'},ec);assert.equal(r.status,200,await r.text());
  const final=new FormData();final.set('id',sid);final.set('rightsConfirmed','true');final.set('volume','TEST');final.set('issue','1');final.set('file',new Blob(['%PDF-1.4\nfinal fictional article']),'final.pdf');r=await fetch(origin+'/api/portal/publication',{method:'POST',headers:{Cookie:ec,Origin:origin},body:final});assert.equal(r.status,200,await r.text());
  r=await request('/api/portal',{action:'publish',id:sid},ec);assert.equal(r.status,200,await r.text());
  assert.equal((await request('/api/publications/file?id='+sid,undefined,ac)).status,200);
  assert.equal((await request('/journal/issues',undefined,ec)).status,200);
  assert.equal((await request('/api/samples',{action:'delete'},ac)).status,403);
  r=await request('/api/samples',{action:'delete'},ec);assert.equal(r.status,200,await r.text());
  assert.equal(sqlite().prepare('SELECT title FROM submissions WHERE id=?').get(sid).title,'VPS integration test');
  const snapshot=join(dir,'snapshot.sqlite');const {backup,DatabaseSync}=await import('node:sqlite');await backup(sqlite(),snapshot);const restored=new DatabaseSync(snapshot);assert.equal(restored.prepare('SELECT title FROM submissions WHERE id=?').get(sid).title,'VPS integration test');restored.close();
  r=await request('/api/auth/logout',{},ec);assert.equal(r.status,303);assert.equal((await request('/api/portal',undefined,ec)).status,401);
  server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3337'],{env:{...process.env,APP_URL:origin,COOKIE_SECURE:'false',REVIEW_PRIVATE:'false',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
  ready=false;for(let n=0;n<100;n++){try{ready=(await request('/api/health')).ok;if(ready)break}catch{}await delay(100)}assert.ok(ready,logs);
  assert.equal((await request('/')).status,200);
  assert.equal((await request('/api/publications/file?id='+sid)).status,200);
  assert.equal((await request('/api/portal/file?id='+sid)).status,401);
 }finally{if(server){server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve))}await rm(dir,{recursive:true,force:true})}
});
