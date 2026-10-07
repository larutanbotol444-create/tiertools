const $=s=>document.querySelector(s),app=$('#app');
const L=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}};
const S=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tt;const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2200)};
const copy=async(x,clr)=>{try{await navigator.clipboard.writeText(x);toast('Disalin');if(clr)setTimeout(()=>navigator.clipboard.writeText('').catch(()=>{}),30000)}catch{toast('Gagal menyalin')}};
const theme=t=>{document.documentElement.dataset.t=t;$('meta[name=theme-color]').content=t=='dark'?'#0f1514':'#1f6f5c'};
theme(L('jo_th',matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
const fmtN=n=>n.toLocaleString('id-ID',{maximumFractionDigits:10});

/* ---------- Vault crypto (AES-GCM + PBKDF2) ---------- */
let key=null,items=[],lockT=null,q='',shown=new Set(),editId=null;
const b64=b=>{let s='';for(const x of new Uint8Array(b))s+=String.fromCharCode(x);return btoa(s)};
const ub=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function derive(pw,salt){const m=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:200000,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function enc(o){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(o)));return{iv:b64(iv),ct:b64(ct)}}
async function dec(o){return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:ub(o.iv)},key,ub(o.ct))))}
async function saveVault(){S('jo_vd',await enc(items));S('jo_cnt',items.length);S('jo_vts',Date.now());syncSoon()}
async function setupVault(pw){const salt=crypto.getRandomValues(new Uint8Array(16));key=await derive(pw,salt);S('jo_vm',{salt:b64(salt),check:await enc({ok:1})});items=[];await saveVault()}
async function unlockVault(pw){const m=L('jo_vm');try{key=await derive(pw,ub(m.salt));await dec(m.check);const d=L('jo_vd');items=d?await dec(d):[];return true}catch{key=null;items=[];return false}}
function lockVault(){key=null;items=[];shown.clear();clearTimeout(lockT);if(route=='vault')render()}
function resetLock(){clearTimeout(lockT);const m=L('jo_al',5);if(key&&m>0)lockT=setTimeout(lockVault,m*60000)}
['pointerdown','keydown'].forEach(e=>document.addEventListener(e,resetLock,{passive:true}));
const rnd=n=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n};
function genPw(){const o=L('jo_gen',{n:16,U:1,L:1,D:1,S:1});const sets=[o.U&&'ABCDEFGHJKLMNPQRSTUVWXYZ',o.L&&'abcdefghijkmnopqrstuvwxyz',o.D&&'23456789',o.S&&'!@#$%^&*-_=+?'].filter(Boolean);if(!sets.length)sets.push('abcdefghijkmnopqrstuvwxyz');const all=sets.join('');const c=sets.map(s=>s[rnd(s.length)]);while(c.length<o.n)c.push(all[rnd(all.length)]);for(let i=c.length-1;i>0;i--){const j=rnd(i+1);[c[i],c[j]]=[c[j],c[i]]}return c.join('')}

/* ---------- Notes ---------- */
let notes=L('jo_notes',[]),nq='',curN=null,nTm;
/* ---------- Calculator ---------- */
let ex='';
function ev(s){let t=s.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');t=t.replace(/(\d+(?:\.\d+)?)([+-])(\d+(?:\.\d+)?)%/g,'$1$2($1*$3/100)').replace(/(\d+(?:\.\d+)?)%/g,'($1/100)');t+=')'.repeat(Math.max(0,(t.match(/\(/g)||[]).length-(t.match(/\)/g)||[]).length));if(!/^[\d+\-*/().\s]+$/.test(t)||/[+\-*/]\s*$/.test(t))return null;try{const v=Function('"use strict";return('+t+')')();return Number.isFinite(v)?+v.toPrecision(12):null}catch{return null}}
const W={nol:0,kosong:0,satu:1,dua:2,tiga:3,empat:4,lima:5,enam:6,tujuh:7,delapan:8,sembilan:9};
const O={tambah:'+',ditambah:'+',plus:'+','+':'+',kurang:'−',dikurangi:'−',minus:'−','-':'−',kali:'×',dikali:'×',x:'×','*':'×','×':'×',bagi:'÷',dibagi:'÷',per:'÷','/':'÷','÷':'÷',persen:'%','%':'%',buka:'(','(':'(',tutup:')',')':')'};
function parseVoice(t){const tk=t.toLowerCase().replace(/([+\-*/×÷()%])/g,' $1 ').split(/\s+/).filter(Boolean);let out='',tot=0,cur=0,last=0,has=false;const flush=()=>{if(has){out+=tot+cur;tot=cur=last=0;has=false}};
for(const w of tk){if(/^\d+([.,]\d+)?$/.test(w)){flush();out+=w.replace(',','.');continue}
if(w in W){cur+=W[w];last=W[w];has=true}else if(w=='sepuluh'){cur+=10;last=0;has=true}else if(w=='sebelas'){cur+=11;last=0;has=true}else if(w=='belas'){cur+=10;last=0;has=true}
else if(w=='puluh'){cur+=last*9;last=0;has=true}else if(w=='seratus'){cur+=100;last=0;has=true}else if(w=='ratus'){cur+=last*99;last=0;has=true}
else if(w=='seribu'){tot+=1000;has=true}else if(w=='ribu'){tot+=(cur||1)*1000;cur=last=0;has=true}
else if(w=='sejuta'){tot+=1e6;has=true}else if(w=='juta'){tot+=(cur||1)*1e6;cur=last=0;has=true}
else if(w in O){flush();out+=O[w]}}
flush();return out}
function startVoice(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return toast('Browser ini belum mendukung input suara');try{const r=new R();r.lang='id-ID';r.onstart=()=>toast('Silakan bicara…');r.onerror=()=>toast('Suara gagal. Cek izin mikrofon dan koneksi internet.');r.onresult=e=>{const t=e.results[0][0].transcript;ex=parseVoice(t);if(route=='calc')calcUpd();toast('Terdengar: '+t)};r.start()}catch{toast('Mikrofon sedang dipakai')}}
const fmtEx=s=>s.replace(/([+−×÷])/g,' $1 ');
function calcUpd(){const x=$('#cx');if(!x)return;x.textContent=fmtEx(ex)||'0';const r=ex?ev(ex):null;$('#cr').textContent=r!==null&&/[+−×÷%()]/.test(ex)?'= '+fmtN(r):''}
function histUpd(){const h=L('jo_hist',[]);$('#hl').innerHTML=h.length?h.map((x,i)=>`<div class="hi" data-i="${i}"><span>${esc(fmtEx(x.e))}</span><b>${esc(fmtN(x.r))}</b></div>`).join(''):'<p class="mut">Belum ada perhitungan.</p>'}
function press(k){if(k=='C')ex='';else if(k=='⌫')ex=ex.slice(0,-1);else if(k=='='){const r=ev(ex);if(r===null)return toast('Perhitungan belum valid');const h=L('jo_hist',[]);h.unshift({e:ex,r});S('jo_hist',h.slice(0,30));ex=String(r);histUpd()}else ex+=k;calcUpd()}

/* ---------- Timer & Stopwatch ---------- */
let ttab='tm';const sw={run:false,base:0,t0:0},tm={run:false,left:0,end:0};
const swEl=()=>sw.base+(sw.run?performance.now()-sw.t0:0),p2=n=>String(n).padStart(2,'0');
function alarm(){toast('Timer selesai');navigator.vibrate?.([300,150,300]);try{const a=new AudioContext();[0,.35,.7].forEach(d=>{const o=a.createOscillator();o.connect(a.destination);o.frequency.value=880;o.start(a.currentTime+d);o.stop(a.currentTime+d+.2)})}catch{}}
function tick(){if(tm.run&&tm.end-Date.now()<=0){tm.run=false;tm.left=0;alarm()}
if($('#swd')){const e=swEl(),m=Math.floor(e/60000);$('#swd').textContent=`${p2(m)}:${p2(Math.floor(e/1000)%60)}.${p2(Math.floor(e/10)%100)}`;$('#swgo').textContent=sw.run?'Jeda':sw.base?'Lanjut':'Start'}
if($('#tmd')){let ms=tm.run?tm.end-Date.now():tm.left;if(!tm.run&&!tm.left)ms=((+$('#tmm').value||0)*60+(+$('#tms').value||0))*1000;const s=Math.ceil(ms/1000);$('#tmd').textContent=`${p2(Math.floor(s/60))}:${p2(s%60)}`;$('#tmgo').textContent=tm.run?'Jeda':tm.left?'Lanjut':'Start';$('#tmin').hidden=tm.run||tm.left>0}}
setInterval(tick,100);

/* ---------- Cloud sync (Supabase, vault terenkripsi) ---------- */
const SB='https://thezmwyseyxsiplywoba.supabase.co',SK='sb_publishable_74DjFX-vkH1b3vYnm9d_dQ_mS26hM4-';
let syncMsg='',syncBusy=false,syncConflict=null,syncTm;
const sess=()=>L('jo_sess',null),clock=()=>new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
async function sbf(path,o={},tok){const r=await fetch(SB+path,{...o,headers:{apikey:SK,'Content-Type':'application/json',...(tok?{Authorization:'Bearer '+tok}:{}),...(o.headers||{})}});const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{}if(!r.ok)throw new Error(d?.msg||d?.error_description||d?.message||d?.error||('Error '+r.status));return d}
function saveSess(d){S('jo_sess',{a:d.access_token,r:d.refresh_token,e:Date.now()+(d.expires_in-60)*1000,u:d.user.id,m:d.user.email})}
async function token(){const s=sess();if(!s)return null;if(Date.now()<s.e)return s.a;const d=await sbf('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.r})});saveSess(d);return d.access_token}
async function authDo(kind,email,pw){const d=await sbf(kind=='in'?'/auth/v1/token?grant_type=password':'/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password:pw})});if(!d.access_token){toast('Cek email untuk konfirmasi, lalu masuk');return false}saveSess(d);return true}
async function push(tk,uid){const ts=L('jo_vts',0)||Date.now();S('jo_vts',ts);await sbf('/rest/v1/user_data?on_conflict=user_id,kind',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:uid,kind:'vault',payload:{m:L('jo_vm'),d:L('jo_vd'),c:L('jo_cnt',0),ts},updated_at:new Date().toISOString()})},tk);syncMsg='Tersinkron '+clock()}
async function pull(rp){S('jo_vm',rp.m);S('jo_vd',rp.d);S('jo_cnt',rp.c||0);S('jo_vts',rp.ts);if(key){try{items=await dec(rp.d);if(route=='vault')vlist()}catch{lockVault();toast('Vault diperbarui dari cloud, buka kembali')}}syncMsg='Tersinkron '+clock()}
function syncSoon(){clearTimeout(syncTm);syncTm=setTimeout(syncNow,2000)}
async function syncNow(){const s=sess();if(!s||syncBusy||syncConflict)return;if(!navigator.onLine){syncMsg='Offline, akan sync saat online';cloudUI();return}
syncBusy=true;syncMsg='Menyinkronkan…';cloudUI();
try{const tk=await token(),u=sess().u,rows=await sbf('/rest/v1/user_data?kind=eq.vault&select=payload',{},tk),rp=rows?.[0]?.payload,lm=L('jo_vm'),ts=L('jo_vts',0);
if(!lm&&!rp)syncMsg='Belum ada vault untuk disinkronkan';else if(!rp)await push(tk,u);else if(!lm)await pull(rp);
else if(rp.m.salt!=lm.salt){syncConflict=rp;syncMsg='Vault di cloud berbeda dengan di perangkat ini'}
else if(rp.ts>ts)await pull(rp);else if(rp.ts<ts)await push(tk,u);else syncMsg='Tersinkron '+clock()}
catch(e){syncMsg=e instanceof TypeError?'Offline, akan sync saat online':'Gagal: '+e.message}
syncBusy=false;cloudUI()}
async function resolveConflict(cloud){try{const tk=await token(),u=sess().u;if(cloud){key=null;items=[];await pull(syncConflict)}else{S('jo_vts',Date.now());await push(tk,u)}syncConflict=null}catch(e){syncMsg='Gagal: '+e.message}cloudUI();if(route=='vault')render()}
function cloudUI(){const c=$('#cl');if(!c)return;const s=sess();
if(!s){c.innerHTML=`<b>Sinkron cloud</b><p class="mut">Masuk agar vault tersimpan di cloud dan bisa dibuka di perangkat lain. Data tetap terenkripsi, master password tidak pernah dikirim.</p><input id="ce" type="email" placeholder="Email" autocomplete="email"><input id="cp" type="password" placeholder="Password akun (beda dengan master password)" autocomplete="current-password"><div class="row"><button class="b p" id="ci">Masuk</button><button class="b" id="cu">Daftar</button></div><p class="err" id="cerr"></p>`;
const act=async k=>{const er=$('#cerr');er.textContent='';try{if(await authDo(k,$('#ce').value.trim(),$('#cp').value)){toast('Berhasil masuk');syncMsg='';await syncNow();cloudUI()}}catch(e){er.textContent=e instanceof TypeError?'Butuh internet untuk masuk.':e.message}};
$('#ci').onclick=()=>act('in');$('#cu').onclick=()=>act('up');return}
c.innerHTML=`<b>Sinkron cloud</b><p class="mut">${esc(s.m)}</p><p>${esc(syncMsg||'Siap')}</p>${syncConflict?'<p class="err">Vault di cloud dan di perangkat ini berbeda. Pilih yang dipakai (yang lain akan tertimpa).</p><div class="row"><button class="b" id="cc">Pakai versi cloud</button><button class="b" id="cd">Pakai versi perangkat ini</button></div>':''}<div class="row"><button class="b p" id="cn">Sync sekarang</button><button class="b" id="co">Keluar</button></div>`;
$('#cn').onclick=()=>{syncMsg='';syncNow()};$('#co').onclick=()=>{localStorage.removeItem('jo_sess');syncMsg='';syncConflict=null;cloudUI()};
if(syncConflict){$('#cc').onclick=()=>resolveConflict(true);$('#cd').onclick=()=>resolveConflict(false)}}

/* ---------- Views ---------- */
let route=(location.hash||'#home').slice(1);const V={};
const go=n=>{route=n;history.replaceState(null,'','#'+n);render()};
function render(){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.r==route));(V[route]||V.home)();scrollTo(0,0)}
$('nav').onclick=e=>{const b=e.target.closest('button');if(b){if(b.dataset.r=='notes')curN=null;go(b.dataset.r)}};

V.home=()=>{const on=navigator.onLine;app.innerHTML=`<h1>JO Connect Hub</h1><div class="stats"><div class="card"><span class="mut">Password tersimpan</span><strong>${L('jo_cnt',0)}</strong></div><div class="card"><span class="mut">Status</span><strong id="ost">${on?'Online':'Offline'}</strong><span class="mut">Semua fitur utama jalan tanpa internet</span></div></div>
<h2>Fitur</h2><div class="tiles">${[['vault','🔐','Password Vault'],['notes','📝','Catatan'],['calc','🧮','Kalkulator'],['timer','⏱️','Timer & Stopwatch'],['set','⚙️','Setelan']].map(t=>`<button class="tile" data-r="${t[0]}"><span>${t[1]}</span>${t[2]}</button>`).join('')}</div>
<h2>Akses cepat</h2><div class="row"><button class="b" data-q="note">Catatan baru</button><button class="b" data-q="voice">Hitung dengan suara</button><button class="b" data-q="sw">Stopwatch</button></div>`;
app.querySelectorAll('.tile').forEach(b=>b.onclick=()=>{if(b.dataset.r=='notes')curN=null;go(b.dataset.r)});
app.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const a=b.dataset.q;if(a=='note'){go('notes');newNote()}else if(a=='voice'){go('calc');startVoice()}else{ttab='sw';go('timer')}})};
addEventListener('online',()=>route=='home'&&render());addEventListener('offline',()=>route=='home'&&render());

function lockView(){const has=!!L('jo_vm');app.innerHTML=`<h1>Password Vault</h1><form id="lf" class="card"><p>${has?'Masukkan master password untuk membuka vault.':'Buat master password. Kalau lupa, data vault tidak bisa dipulihkan.'}</p><input id="mp" type="password" placeholder="Master password" autocomplete="${has?'current-password':'new-password'}" required>${has?'':'<input id="mp2" type="password" placeholder="Ulangi master password" autocomplete="new-password" required>'}<button class="b p" id="lb">${has?'Buka vault':'Buat vault'}</button><p class="err" id="le"></p></form>`;
$('#lf').onsubmit=async e=>{e.preventDefault();const pw=$('#mp').value,er=$('#le'),bt=$('#lb');er.textContent='';
if(!has){if(pw.length<8)return er.textContent='Minimal 8 karakter.';if(pw!==$('#mp2').value)return er.textContent='Kedua password tidak sama.'}
bt.disabled=true;bt.textContent='Memproses…';if(has){if(!await unlockVault(pw)){bt.disabled=false;bt.textContent='Buka vault';return er.textContent='Master password salah.'}}else await setupVault(pw);resetLock();render()}}
V.vault=()=>{if(!key)return lockView();app.innerHTML=`<h1>Password Vault</h1><div class="row"><input id="q" placeholder="Cari akun" value="${esc(q)}"><button class="b p" id="add">Tambah</button></div><div class="row"><button class="b" id="gen">Generator</button><button class="b" id="lk">Kunci</button></div><div id="vl"></div>`;
$('#q').oninput=e=>{q=e.target.value;vlist()};$('#add').onclick=()=>openForm();$('#lk').onclick=lockVault;$('#gen').onclick=openGen;
$('#vl').onclick=async e=>{const b=e.target.closest('[data-a]');if(!b)return;const id=+b.closest('[data-id]').dataset.id,it=items.find(x=>x.id==id),a=b.dataset.a;
if(a=='sh'){shown.has(id)?shown.delete(id):shown.add(id);vlist()}else if(a=='cp')copy(it.p,true);else if(a=='cu')copy(it.u);else if(a=='ed')openForm(it);
else if(a=='dl'&&confirm('Hapus akun "'+it.n+'"?')){items=items.filter(x=>x.id!=id);await saveVault();vlist()}};vlist()};
function vlist(){const s=q.toLowerCase(),l=items.filter(i=>(i.n+' '+i.u+' '+i.c).toLowerCase().includes(s));
$('#vl').innerHTML=l.length?l.map(i=>`<div class="card" data-id="${i.id}"><b>${esc(i.n)}</b><div class="mut">${esc(i.u)}</div><div class="pw">${shown.has(i.id)?esc(i.p):'••••••••••'}</div>${i.c?`<div class="mut">${esc(i.c)}</div>`:''}<div class="row" style="margin:8px 0 0"><button class="b" data-a="sh">${shown.has(i.id)?'Sembunyi':'Tampil'}</button><button class="b" data-a="cp">Salin password</button><button class="b" data-a="cu">Salin user</button><button class="b" data-a="ed">Edit</button><button class="b d" data-a="dl">Hapus</button></div></div>`).join(''):`<p class="mut">${items.length?'Tidak ada akun yang cocok.':'Vault masih kosong. Tekan Tambah untuk menyimpan akun pertama.'}</p>`}
function openForm(it){editId=it?.id??null;$('#dt').textContent=it?'Edit akun':'Tambah akun';$('#fn').value=it?.n||'';$('#fu').value=it?.u||'';$('#fp').value=it?.p||'';$('#fc').value=it?.c||'';$('#fp').type='password';$('#fs').textContent='Tampil';$('#dlg').showModal()}
$('#fs').onclick=()=>{const f=$('#fp'),h=f.type=='password';f.type=h?'text':'password';$('#fs').textContent=h?'Sembunyi':'Tampil'};
$('#fg').onclick=()=>{$('#fp').value=genPw();$('#fp').type='text';$('#fs').textContent='Sembunyi'};
$('#fx').onclick=()=>$('#dlg').close();
$('#ff').onsubmit=async e=>{e.preventDefault();const d={n:$('#fn').value.trim(),u:$('#fu').value.trim(),p:$('#fp').value,c:$('#fc').value.trim()};if(!d.n||!d.p)return;
if(editId!=null)Object.assign(items.find(x=>x.id==editId),d);else items.unshift({id:Date.now(),...d});await saveVault();$('#dlg').close();vlist();toast('Tersimpan')};
function genRead(){const o={n:+$('#gn').value,U:+$('#gU').checked,L:+$('#gL').checked,D:+$('#gD').checked,S:+$('#gS').checked};S('jo_gen',o);$('#gv').textContent=o.n;$('#go').value=genPw()}
function openGen(){const o=L('jo_gen',{n:16,U:1,L:1,D:1,S:1});$('#gn').value=o.n;['U','L','D','S'].forEach(k=>$('#g'+k).checked=!!o[k]);genRead();$('#gdlg').showModal()}
['#gn','#gU','#gL','#gD','#gS'].forEach(s=>$(s).oninput=genRead);$('#gr').onclick=genRead;$('#gc').onclick=()=>copy($('#go').value,true);$('#gx').onclick=()=>$('#gdlg').close();

function newNote(){const n={id:Date.now(),t:'',b:'',u:Date.now()};notes.unshift(n);S('jo_notes',notes);curN=n.id;render()}
V.notes=()=>{if(curN!=null)return editNote();app.innerHTML=`<h1>Catatan</h1><div class="row"><input id="nq" placeholder="Cari catatan" value="${esc(nq)}"><button class="b p" id="nn">Baru</button></div><div id="nl"></div>`;
$('#nq').oninput=e=>{nq=e.target.value;nlist()};$('#nn').onclick=newNote;$('#nl').onclick=e=>{const c=e.target.closest('[data-id]');if(c){curN=+c.dataset.id;render()}};nlist()};
function nlist(){const s=nq.toLowerCase(),l=notes.filter(n=>(n.t+' '+n.b).toLowerCase().includes(s)).sort((a,b)=>b.u-a.u);
$('#nl').innerHTML=l.length?l.map(n=>`<div class="card" data-id="${n.id}" style="cursor:pointer"><b>${esc(n.t||'Tanpa judul')}</b><div class="mut">${esc(n.b.slice(0,90))}</div></div>`).join(''):`<p class="mut">${notes.length?'Tidak ada catatan yang cocok.':'Belum ada catatan. Tekan Baru untuk mulai menulis.'}</p>`}
function editNote(){const n=notes.find(x=>x.id==curN);if(!n){curN=null;return V.notes()}
app.innerHTML=`<div class="row"><button class="b" id="bk">Kembali</button><span class="mut" id="st" style="flex:1">Tersimpan</span><button class="b d" id="dn">Hapus</button></div><input id="nt" placeholder="Judul" value="${esc(n.t)}"><textarea id="nb" rows="16" placeholder="Tulis catatan…">${esc(n.b)}</textarea>`;
const sv=()=>{clearTimeout(nTm);S('jo_notes',notes);$('#st')&&($('#st').textContent='Tersimpan')};
const ch=()=>{n.t=$('#nt').value;n.b=$('#nb').value;n.u=Date.now();$('#st').textContent='Menyimpan…';clearTimeout(nTm);nTm=setTimeout(sv,400)};
$('#nt').oninput=ch;$('#nb').oninput=ch;
$('#bk').onclick=()=>{if(!n.t&&!n.b)notes=notes.filter(x=>x.id!=n.id);sv();curN=null;render()};
$('#dn').onclick=()=>{if(confirm('Hapus catatan ini?')){notes=notes.filter(x=>x.id!=n.id);sv();curN=null;render()}}}

V.calc=()=>{const ks=['C','(',')','⌫','7','8','9','÷','4','5','6','×','1','2','3','−','0','.','%','+'];
app.innerHTML=`<h1>Kalkulator</h1><div class="card"><div class="cx" id="cx"></div><div class="cr" id="cr"></div></div><div class="pad">${ks.map(k=>`<button class="k${'÷×−+'.includes(k)?' op':''}" data-k="${k}">${k}</button>`).join('')}<button class="k" id="mic" aria-label="Input suara">🎙️</button><button class="k eq" data-k="=">=</button></div><div class="row" style="margin-top:16px;justify-content:space-between"><h2 style="margin:0">Riwayat</h2><button class="b" id="hc">Hapus riwayat</button></div><div id="hl"></div>`;
app.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>press(b.dataset.k));$('#mic').onclick=startVoice;
$('#hc').onclick=()=>{S('jo_hist',[]);histUpd()};$('#hl').onclick=e=>{const h=e.target.closest('[data-i]');if(h){ex=L('jo_hist',[])[+h.dataset.i].e;calcUpd()}};calcUpd();histUpd()};

V.timer=()=>{app.innerHTML=`<h1>Timer & Stopwatch</h1><div class="seg"><button class="b" data-t="tm">Timer</button><button class="b" data-t="sw">Stopwatch</button></div>
<div id="tmv"><div class="big" id="tmd">00:00</div><div class="row" id="tmin"><input id="tmm" type="number" min="0" value="5" aria-label="Menit"> menit <input id="tms" type="number" min="0" max="59" value="0" aria-label="Detik"> detik</div><div class="row"><button class="b p" id="tmgo">Start</button><button class="b" id="tmrs">Reset</button></div></div>
<div id="swv"><div class="big" id="swd">00:00.00</div><div class="row"><button class="b p" id="swgo">Start</button><button class="b" id="swrs">Reset</button></div></div>`;
const tabs=()=>{$('#tmv').hidden=ttab!='tm';$('#swv').hidden=ttab!='sw';app.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('p',b.dataset.t==ttab))};
app.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ttab=b.dataset.t;tabs()});tabs();
$('#tmgo').onclick=()=>{if(tm.run){tm.left=Math.max(0,tm.end-Date.now());tm.run=false}else{if(tm.left<=0)tm.left=((+$('#tmm').value||0)*60+(+$('#tms').value||0))*1000;if(tm.left<=0)return toast('Isi waktu dulu');tm.end=Date.now()+tm.left;tm.run=true}tick()};
$('#tmrs').onclick=()=>{tm.run=false;tm.left=0;tick()};
$('#swgo').onclick=()=>{if(sw.run){sw.base=swEl();sw.run=false}else{sw.t0=performance.now();sw.run=true}tick()};
$('#swrs').onclick=()=>{sw.run=false;sw.base=0;tick()};tick()};

V.set=()=>{app.innerHTML=`<h1>Setelan</h1><div class="card"><label>Tampilan<select id="th"><option value="light">Terang</option><option value="dark">Gelap</option></select></label><label>Kunci otomatis vault<select id="al">${[1,5,15,30,0].map(m=>`<option value="${m}">${m?m+' menit':'Tidak pernah'}</option>`).join('')}</select></label></div>
<div class="card"><button class="b" id="lk2">Kunci vault sekarang</button></div>
<div class="card" id="cl"></div>
<div class="card"><p class="mut">Hapus password, catatan, dan riwayat dari perangkat ini. Tidak bisa dibatalkan.</p><button class="b d" id="wp">Hapus semua data lokal</button></div>
<p class="mut">JO Connect Hub V1. Semua data hanya tersimpan di perangkat ini.</p>`;
$('#th').value=document.documentElement.dataset.t;$('#al').value=L('jo_al',5);
$('#th').onchange=e=>{theme(e.target.value);S('jo_th',e.target.value)};$('#al').onchange=e=>{S('jo_al',+e.target.value);resetLock()};
$('#lk2').onclick=()=>{lockVault();toast('Vault terkunci')};cloudUI();
$('#wp').onclick=()=>{if(confirm('Hapus SEMUA data lokal (password, catatan, riwayat)? Tidak bisa dibatalkan.')){localStorage.clear();location.hash='home';location.reload()}}};

if(!V[route])route='home';render();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

if(sess())syncNow();addEventListener('online',syncNow);document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncNow()});setInterval(syncNow,120000);
