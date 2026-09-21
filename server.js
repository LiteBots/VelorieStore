import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID,createHash,scrypt as scryptCb,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
const scrypt=promisify(scryptCb), ROOT=path.dirname(fileURLToPath(import.meta.url));
const DATA=path.resolve(process.env.DATA_DIR||path.join(ROOT,'data')), PROD=process.env.NODE_ENV==='production';
fs.mkdirSync(path.join(DATA,'files'),{recursive:true});
const db=new DatabaseSync(path.join(DATA,'velorie.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(kind,id));
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL);`);
const all=k=>db.prepare('SELECT data FROM records WHERE kind=?').all(k).map(x=>JSON.parse(x.data));
const get=(k,id)=>{const r=db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(k,id);return r&&JSON.parse(r.data)};
const put=(k,r)=>{db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(k,r.id,JSON.stringify(r));return r};
const remove=(k,id)=>db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(k,id);
const now=()=>new Date().toISOString(), id=()=>randomUUID(), hash=s=>createHash('sha256').update(s).digest('hex');
const fail=(msg,status=400)=>{throw Object.assign(new Error(msg),{status})};
const str=(v,min=0,max=1000)=>{if(typeof v!=='string'||v.trim().length<min||v.length>max)fail('Nieprawidłowa długość pola.');return v.trim()};
const integer=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)fail('Nieprawidłowa wartość liczbowa.');return v};
const userById=id=>{let r=db.prepare('SELECT * FROM users WHERE id=?').get(id);return r?{...JSON.parse(r.data),id:r.id,email:r.email}:null};
const users=()=>db.prepare('SELECT id FROM users').all().map(x=>userById(x.id));
const saveUser=u=>db.prepare('UPDATE users SET data=? WHERE id=?').run(JSON.stringify(u),u.id);
const publicUser=u=>u&&({id:u.id,name:u.name,bio:u.bio||'',role:u.role,created:u.created});
const audit=(u,action,target)=>put('audit',{id:id(),user:u?.id||'system',name:u?.name||'System',action,target,date:now()});
const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}};
async function passwordHash(password){str(password,12,128);let salt=randomBytes(16).toString('hex');return salt+':'+(await scrypt(password,salt,64)).toString('hex')}
async function passwordValid(p,h){if(typeof p!=='string'||p.length>128)return false;let [s,k]=h.split(':');return timingSafeEqual(await scrypt(p,s,64),Buffer.from(k,'hex'))}
if(!get('settings','main'))put('settings',{id:'main',siteName:'VelorieStore',heroTitle:'Twój następny projekt zaczyna się tutaj.',heroSubtitle:'Mapy, pluginy, skrypty i cyfrowe zasoby. Odkrywaj prace twórców i buduj po swojemu.',announcement:'Miejsce dla twórców. Przestrzeń dla Twoich pomysłów.',commission:10,bankAccount:'',bankOwner:'',supportEmail:'',salesEnabled:false,registrationEnabled:true,legalReady:false});
const cats=[['minecraft-maps','Mapy Minecraft','MC'],['minecraft-plugins','Pluginy Minecraft','</>'],['fivem-maps','Mapy FiveM','V'],['fivem-interiors','Interiory FiveM','MLO'],['fivem-scripts','Skrypty FiveM','LUA'],['discord','Boty Discord','BOT'],['web','Strony i aplikacje','WEB'],['graphics','Grafika i UI','UI']];
if(!get('meta','categories')){for(const [slug,name,mark]of cats)put('categories',{id:slug,name,mark});put('meta',{id:'categories'})}
for(const [slug,title,body]of [['about','O VelorieStore','VelorieStore łączy autorów zasobów cyfrowych z osobami, które rozwijają swoje serwery, społeczności i projekty.'],['help','Centrum pomocy','Wyszukaj produkt, sprawdź wymagania i licencję, następnie dodaj go do koszyka. Po zatwierdzeniu płatności pliki pojawią się w zakładce Moja biblioteka. W razie problemu utwórz zgłoszenie w panelu.'],['terms','Regulamin','Treść wymaga uzupełnienia przez operatora przed uruchomieniem sprzedaży.'],['privacy','Polityka prywatności','Treść wymaga uzupełnienia przez administratora danych przed uruchomieniem sprzedaży.'],['cookies','Pliki cookie','Używamy niezbędnego ciasteczka sesji do logowania. Koszyk jest zapisywany lokalnie w przeglądarce. Nie instalujemy skryptów reklamowych ani analitycznych.']])if(!get('pages',slug))put('pages',{id:slug,title,body});
if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD&&!db.prepare('SELECT id FROM users WHERE email=?').get(process.env.ADMIN_EMAIL.toLowerCase())){
 const u={id:id(),name:'Administrator',role:'admin',blocked:false,created:now(),bio:''};
 db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(u.id,process.env.ADMIN_EMAIL.toLowerCase(),await passwordHash(process.env.ADMIN_PASSWORD),JSON.stringify(u));
}
// Demonstration listings have no purchasable files and are explicitly marked.
if(process.env.SEED_DEMO==='true'&&!get('meta','demo')){
 const admin=users().find(u=>u.role==='admin');
 if(admin){const names=['Elysium • Survival Spawn','Nexus • Core Essentials','Los Santos • City Extension','Noir • Luxury Penthouse','Velocity • Advanced Garage','Orbit • Community Bot','Studio • Portfolio Kit','Prism • Interface System'];
 cats.forEach(([cat],i)=>put('products',{id:id(),title:names[i],category:cat,seller:admin.id,price:[8900,4900,14900,12900,7900,3900,5900,2900][i],description:'Przykładowa karta pokazująca możliwości katalogu VelorieStore. To produkt demonstracyjny, bez plików do sprzedaży. Dodaj własny produkt w panelu twórcy.',requirements:'Wymagania ustala autor produktu.',license:'Licencja demonstracyjna — produkt nie jest dostępny do zakupu.',version:'1.0.0',status:'published',demo:true,featured:i<4,created:now(),updated:now(),image:'',file:'',tags:['demo','inspiracja']}));put('meta',{id:'demo'});}
}
const settings=()=>get('settings','main');
function productView(p){const reviews=all('reviews').filter(r=>r.product===p.id&&!r.hidden);const {file,...out}=p;return {...out,hasFile:!!file,sellerName:userById(p.seller)?.name||'Twórca',rating:reviews.length?reviews.reduce((a,r)=>a+r.rating,0)/reviews.length:null,reviewCount:reviews.length}}
function wallet(uid){const sales=all('orders').filter(o=>o.status==='paid').flatMap(o=>o.items.filter(i=>i.seller===uid));const revenue=sales.reduce((s,i)=>s+i.net,0), payouts=all('payouts').filter(p=>p.user===uid);return {revenue,reserved:payouts.filter(p=>p.status==='pending').reduce((s,p)=>s+p.amount,0),paid:payouts.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0),available:revenue-payouts.filter(p=>p.status!=='rejected').reduce((s,p)=>s+p.amount,0),sales:sales.length}}
const limits=new Map();function rate(key,max=80){let r=limits.get(key),t=Date.now();if(!r||t>r.end){r={n:0,end:t+60000};limits.set(key,r)}if(++r.n>max)fail('Za dużo prób. Spróbuj za minutę.',429)}
setInterval(()=>{for(const[k,v]of limits)if(v.end<Date.now())limits.delete(k);db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now())},60000).unref();
async function body(req,limit=1024*1024){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)fail('Plik lub formularz jest za duży.',413);chunks.push(chunk)}return Buffer.concat(chunks)}
function auth(req){const token=/\bvs_session=([a-f0-9]{64})/.exec(req.headers.cookie||'')?.[1];if(!token)return {};const s=db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hash(token),Date.now());const u=s&&userById(s.user_id);return u&&!u.blocked?{u,s}:{}}
function login(res,u){const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(token),u.id,csrf,Date.now()+7*86400000);res.setHeader('Set-Cookie',`vs_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${PROD?'; Secure':''}`);return {user:u,csrf}}
function send(res,status,data,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type});res.end(type.startsWith('application/json')?JSON.stringify(data):data)}
const requireUser=u=>{if(!u)fail('Zaloguj się, aby kontynuować.',401)};
const requireAdmin=u=>{requireUser(u);if(u.role!=='admin')fail('Brak uprawnień administratora.',403)};
const requireSeller=u=>{requireUser(u);if(!['seller','admin'].includes(u.role))fail('Najpierw aktywuj konto twórcy.',403)};
const secureHeaders={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
const server=http.createServer(async(req,res)=>{for(const[k,v]of Object.entries(secureHeaders))res.setHeader(k,v);try{
 const url=new URL(req.url,'http://local'),p=url.pathname,method=req.method,{u,s}=auth(req);res.setHeader('Cache-Control','no-store');
 if(p==='/health')return send(res,200,{ok:true});
 if(p.startsWith('/api/')){
 const ip=process.env.TRUST_PROXY==='true'?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').pop().trim():req.socket.remoteAddress;
 rate(ip,250);
 if(!['GET','HEAD'].includes(method)){
  const origin=req.headers.origin, expected=process.env.APP_URL?.replace(/\/$/,'')||`${PROD?'https':'http'}://${req.headers.host}`;
  if(origin&&origin!==expected)fail('Niedozwolone źródło żądania.',403);
  if(!req.headers['x-velorie-request'])fail('Brak nagłówka żądania.',403);
  if(u&&req.headers['x-csrf-token']!==s.csrf)fail('Sesja formularza wygasła. Odśwież stronę.',403);
 }
 let b={};if(['POST','PATCH','PUT'].includes(method)&&!p.startsWith('/api/uploads')){try{b=JSON.parse((await body(req)).toString()||'{}')}catch(e){if(e.status)throw e;fail('Nieprawidłowy JSON.')}}
 if(p==='/api/bootstrap'&&method==='GET')return send(res,200,{user:u||null,csrf:s?.csrf,categories:all('categories'),settings:settings(),pages:all('pages'),counts:{products:all('products').filter(p=>p.status==='published'&&!p.demo).length,creators:users().filter(u=>u.role==='seller').length}});
 if(p==='/api/register'&&method==='POST'){
  rate('auth:'+ip,12);if(!settings().registrationEnabled)fail('Rejestracja jest wyłączona.');const email=str(b.email,5,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Wpisz poprawny e-mail.');
  const name=str(b.name,2,60),password=await passwordHash(b.password);if(db.prepare('SELECT id FROM users WHERE email=?').get(email))fail('Ten adres jest już zarejestrowany.',409);
  const user={id:id(),name,role:'buyer',bio:'',blocked:false,created:now()};db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(user.id,email,password,JSON.stringify(user));audit(user,'Rejestracja',user.id);return send(res,201,login(res,userById(user.id)));
 }
 if(p==='/api/login'&&method==='POST'){
  rate('auth:'+ip,12);let row=db.prepare('SELECT * FROM users WHERE email=?').get(String(b.email).toLowerCase());if(!row||!await passwordValid(b.password,row.password))fail('Niepoprawny e-mail lub hasło.',401);let user=userById(row.id);if(user.blocked)fail('Konto zostało zablokowane.',403);return send(res,200,login(res,user));
 }
 if(p==='/api/logout'&&method==='POST'){if(s)db.prepare('DELETE FROM sessions WHERE token=?').run(s.token);res.setHeader('Set-Cookie','vs_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return send(res,200,{ok:true})}
 if(p==='/api/profile'&&method==='PATCH'){requireUser(u);u.name=str(b.name,2,60);u.bio=str(b.bio,0,2000);saveUser(u);return send(res,200,u)}
 if(p==='/api/password'&&method==='POST'){requireUser(u);rate('password:'+u.id,8);const row=db.prepare('SELECT password FROM users WHERE id=?').get(u.id);if(!await passwordValid(b.current,row.password))fail('Obecne hasło jest błędne.');db.prepare('UPDATE users SET password=? WHERE id=?').run(await passwordHash(b.password),u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);audit(u,'Zmiana hasła',u.id);return send(res,200,login(res,u))}
 if(p==='/api/become-seller'&&method==='POST'){requireUser(u);if(u.role==='buyer'){u.role='seller';saveUser(u);audit(u,'Aktywacja twórcy',u.id)}return send(res,200,u)}
 if(p==='/api/creators'&&method==='GET')return send(res,200,users().filter(x=>!x.blocked&&['seller','admin'].includes(x.role)).map(x=>({...publicUser(x),products:all('products').filter(p=>p.seller===x.id&&p.status==='published').length})));
 if(p==='/api/products'&&method==='GET'){
  let products=all('products').filter(x=>x.status==='published'&&!userById(x.seller)?.blocked);const q=(url.searchParams.get('q')||'').toLowerCase(),cat=url.searchParams.get('category'),seller=url.searchParams.get('seller');if(q)products=products.filter(x=>(x.title+' '+x.description+' '+x.tags.join(' ')).toLowerCase().includes(q));if(cat)products=products.filter(x=>x.category===cat);if(seller)products=products.filter(x=>x.seller===seller);const sort=url.searchParams.get('sort');products.sort(sort==='price-asc'?(a,b)=>a.price-b.price:sort==='price-desc'?(a,b)=>b.price-a.price:(a,b)=>b.created.localeCompare(a.created));return send(res,200,products.map(productView));
 }
 const productMatch=p.match(/^\/api\/products\/([^/]+)$/);
 if(productMatch&&method==='GET'){let item=get('products',productMatch[1]);if(!item||item.status!=='published'&&u?.id!==item.seller&&u?.role!=='admin')fail('Nie znaleziono produktu.',404);return send(res,200,{...productView(item),reviews:all('reviews').filter(r=>r.product===item.id&&!r.hidden).map(r=>({...r,name:userById(r.user)?.name||'Użytkownik'}))})}
 if(p==='/api/my'&&method==='GET'){
  requireUser(u);return send(res,200,{products:all('products').filter(p=>p.seller===u.id).map(productView),orders:all('orders').filter(o=>o.user===u.id),sales:all('orders').filter(o=>o.items.some(i=>i.seller===u.id)).map(o=>({...o,items:o.items.filter(i=>i.seller===u.id),user:undefined,total:undefined})),favorites:all('favorites').filter(f=>f.user===u.id).map(f=>get('products',f.product)).filter(p=>p&&p.status==='published').map(productView),tickets:all('tickets').filter(t=>t.user===u.id),payouts:all('payouts').filter(p=>p.user===u.id),wallet:wallet(u.id)});
 }
 if(p==='/api/products'&&method==='POST'||productMatch&&method==='PATCH'){
  requireSeller(u);const old=productMatch?get('products',productMatch[1]):null;if(productMatch&&!old)fail('Nie znaleziono produktu.',404);if(old&&old.seller!==u.id&&u.role!=='admin')fail('Brak dostępu.',403);
  if(!get('categories',b.category))fail('Wybierz kategorię.');const file=b.file||old?.file||'',image=b.image??old?.image??'';
  for(const [fid,kind]of [[file,'archive'],[image,'image']])if(fid){let f=get('files',fid);if(!f||f.kind!==kind||f.user!==u.id&&u.role!=='admin'&&fid!==old?.file&&fid!==old?.image)fail('Nieprawidłowy plik.')}
  const status=u.role==='admin'&&['draft','pending','published','rejected','archived'].includes(b.status)?b.status:(b.status==='draft'?'draft':'pending');
  if(['published','pending'].includes(status)&&!file&&!old?.demo)fail('Dodaj archiwum produktu.');
  const product={id:old?.id||id(),seller:old?.seller||u.id,title:str(b.title,3,120),category:b.category,price:integer(b.price,0,100000000),description:str(b.description,20,30000),requirements:str(b.requirements,0,5000),license:str(b.license,5,5000),version:str(b.version,1,40),tags:str(b.tags||'',0,300).split(',').map(x=>x.trim()).filter(Boolean).slice(0,12),file,image,status,featured:u.role==='admin'?!!b.featured:old?.featured||false,demo:old?.demo&&!file||false,created:old?.created||now(),updated:now()};put('products',product);audit(u,old?'Edycja produktu':'Nowy produkt',product.id);return send(res,200,productView(product));
 }
 if(p==='/api/uploads'&&method==='POST'){
  requireSeller(u);rate('upload:'+u.id,12);const kind=url.searchParams.get('kind'),name=str(decodeURIComponent(req.headers['x-file-name']||''),1,200).replace(/[^a-zA-Z0-9._-]/g,'_');
  const buf=await body(req,kind==='image'?5*1024*1024:50*1024*1024);let mime,ext=path.extname(name).toLowerCase();
  if(kind==='image'){if(ext==='.png'&&buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';else if(['.jpg','.jpeg'].includes(ext)&&buf[0]===255&&buf[1]===216&&buf[2]===255)mime='image/jpeg';else if(ext==='.webp'&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP')mime='image/webp';else fail('Dodaj obraz PNG, JPG lub WebP.')}else if(kind==='archive'&&ext==='.zip'&&buf[0]===80&&buf[1]===75)mime='application/zip';else fail('Plik produktu musi być archiwum ZIP.');
  const f={id:id(),user:u.id,kind,name,mime,size:buf.length,created:now()};fs.writeFileSync(path.join(DATA,'files',f.id),buf,{flag:'wx'});put('files',f);return send(res,201,f);
 }
 if(p==='/api/favorites'&&method==='POST'){requireUser(u);if(!get('products',b.product))fail('Produkt nie istnieje.');let fid=u.id+':'+b.product;if(get('favorites',fid))remove('favorites',fid);else put('favorites',{id:fid,user:u.id,product:b.product});return send(res,200,{ok:true})}
 if(p==='/api/orders'&&method==='POST'){
  requireUser(u);const cfg=settings();if(!cfg.salesEnabled||!cfg.legalReady)fail('Sprzedaż nie została jeszcze uruchomiona.');if(!b.accepted)fail('Zaakceptuj regulamin i warunki licencji.');if(!Array.isArray(b.products)||!b.products.length||b.products.length>20)fail('Nieprawidłowy koszyk.');
  return send(res,201,tx(()=>{let code=b.coupon?all('coupons').find(c=>c.code===String(b.coupon).trim().toUpperCase()):null;if(b.coupon&&(!code||!code.active||code.expires&&code.expires<now().slice(0,10)))fail('Kod rabatowy jest nieaktywny.');
   const items=[...new Set(b.products)].map(pid=>{let p=get('products',pid);if(!p||p.status!=='published'||p.demo||!p.file||userById(p.seller)?.blocked)fail('Produkt jest niedostępny.');if(p.seller===u.id)fail('Nie możesz kupić własnego produktu.');if(all('orders').some(o=>o.user===u.id&&['paid','pending'].includes(o.status)&&o.items.some(i=>i.product===pid)))fail('Produkt jest już w Twoich zamówieniach.');let amount=Math.round(p.price*(100-(code?.percent||0))/100);return {product:pid,title:p.title,seller:p.seller,amount,net:Math.round(amount*(100-cfg.commission)/100),file:p.file,version:p.version,license:p.license,key:randomBytes(16).toString('hex').toUpperCase()}});
   const total=items.reduce((s,i)=>s+i.amount,0);if(total>0&&(!cfg.bankAccount||!cfg.bankOwner))fail('Operator nie skonfigurował płatności.');const order={id:id(),user:u.id,items,total,status:total===0?'paid':'pending',created:now(),paidAt:total===0?now():null,coupon:code?.code||'',payment:{account:cfg.bankAccount,owner:cfg.bankOwner},acceptedAt:now(),terms:get('pages','terms').body};put('orders',order);audit(u,'Utworzenie zamówienia',order.id);return order}));
 }
 const cancel=p.match(/^\/api\/orders\/([^/]+)\/cancel$/);if(cancel&&method==='POST'){requireUser(u);const o=get('orders',cancel[1]);if(!o||o.user!==u.id)fail('Brak dostępu.',403);if(o.status!=='pending')fail('Można anulować tylko nieopłacone zamówienie.');o.status='cancelled';put('orders',o);return send(res,200,o)}
 if(p==='/api/reviews'&&method==='POST'){requireUser(u);if(!all('orders').some(o=>o.user===u.id&&o.status==='paid'&&o.items.some(i=>i.product===b.product)))fail('Opinię może dodać tylko kupujący.',403);let r={id:u.id+':'+b.product,product:b.product,user:u.id,rating:integer(b.rating,1,5),body:str(b.body,5,3000),hidden:false,created:now()};put('reviews',r);return send(res,200,r)}
 if(p==='/api/tickets'&&method==='POST'){requireUser(u);rate('ticket:'+u.id,10);let t={id:id(),user:u.id,subject:str(b.subject,3,160),status:'open',created:now(),messages:[{name:u.name,user:u.id,body:str(b.body,5,10000),date:now()}]};put('tickets',t);return send(res,201,t)}
 const ticket=p.match(/^\/api\/tickets\/([^/]+)$/);if(ticket&&method==='POST'){requireUser(u);let t=get('tickets',ticket[1]);if(!t||t.user!==u.id&&u.role!=='admin')fail('Brak dostępu.',403);if(b.body)t.messages.push({name:u.name,user:u.id,body:str(b.body,1,10000),date:now()});if(['open','closed'].includes(b.status))t.status=b.status;put('tickets',t);return send(res,200,t)}
 if(p==='/api/payouts'&&method==='POST'){requireSeller(u);return send(res,201,tx(()=>{let amount=integer(b.amount,100,100000000);if(wallet(u.id).available<amount)fail('Niewystarczające saldo.');let out={id:id(),user:u.id,amount,account:str(b.account,10,100),owner:str(b.owner,3,200),status:'pending',created:now()};put('payouts',out);audit(u,'Wniosek o wypłatę',out.id);return out}))}
 if(p==='/api/admin'&&method==='GET'){requireAdmin(u);return send(res,200,{users:users(),products:all('products').map(productView),orders:all('orders'),payouts:all('payouts'),tickets:all('tickets'),reviews:all('reviews'),coupons:all('coupons'),categories:all('categories'),pages:all('pages'),settings:settings(),audit:all('audit').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,500)})}
 if(p==='/api/admin/settings'&&method==='PATCH'){requireAdmin(u);let c={...settings()};for(const key of ['siteName','heroTitle','heroSubtitle','announcement','bankAccount','bankOwner','supportEmail'])if(key in b)c[key]=str(b[key],0,1000);if('commission'in b)c.commission=integer(b.commission,0,100);for(const key of ['salesEnabled','registrationEnabled','legalReady'])if(key in b)c[key]=!!b[key];put('settings',c);audit(u,'Ustawienia platformy','main');return send(res,200,c)}
 const admin=p.match(/^\/api\/admin\/(users|products|orders|payouts|reviews|categories|pages|coupons)\/([^/]+)$/);
 if(admin){requireAdmin(u);const kind=admin[1],rid=decodeURIComponent(admin[2]);return send(res,200,tx(()=>{
  let r=kind==='users'?userById(rid):get(kind,rid);
  if(kind==='categories'&&method==='DELETE'){if(all('products').some(p=>p.category===rid))fail('Kategoria zawiera produkty. Przenieś je najpierw.');remove(kind,rid);audit(u,'Usunięcie kategorii',rid);return {ok:true}}
  if(!['PATCH','POST'].includes(method))fail('Niedozwolona metoda.',405);
  if(['categories','pages','coupons'].includes(kind)){
   if(!/^[a-zA-Z0-9_-]{1,80}$/.test(rid))fail('Nieprawidłowy identyfikator.');
   if(kind==='categories')r={id:rid,name:str(b.name,2,80),mark:str(b.mark,1,8)};
   if(kind==='pages'){if(!get('pages',rid))fail('Nieznana podstrona.');r={id:rid,title:str(b.title,2,160),body:str(b.body,10,50000)}}
   if(kind==='coupons'){const code=str(b.code,2,30).toUpperCase();if(all('coupons').some(c=>c.id!==rid&&c.code===code))fail('Kod już istnieje.');r={id:rid,code,percent:integer(b.percent,1,100),active:!!b.active,expires:str(b.expires||'',0,10)}}
  }else if(!r)fail('Nie znaleziono rekordu.',404);
  if(kind==='users'){if(r.id===u.id)fail('Własne dane zmienisz w ustawieniach konta.');if('role'in b){if(!['buyer','seller','admin'].includes(b.role))fail('Nieprawidłowa rola.');r.role=b.role}if('blocked'in b)r.blocked=!!b.blocked;if('name'in b)r.name=str(b.name,2,60);saveUser(r);db.prepare('DELETE FROM sessions WHERE user_id=?').run(r.id)}
  if(kind==='products'){if('status'in b){if(!['draft','pending','published','rejected','archived'].includes(b.status))fail('Niepoprawny status.');if(b.status==='published'&&!r.file&&!r.demo)fail('Brak pliku produktu.');r.status=b.status}if('featured'in b)r.featured=!!b.featured;r.updated=now()}
  if(kind==='orders'){const allowed={pending:['paid','cancelled'],paid:['refunded'],cancelled:[],refunded:[]};if(!allowed[r.status]?.includes(b.status))fail('Niedozwolona zmiana statusu.');if(b.status==='refunded'&&!b.confirmed)fail('Potwierdź wykonanie zwrotu poza platformą.');r.status=b.status;if(b.status==='paid')r.paidAt=now();r.note=str(b.note||'',0,2000)}
  if(kind==='payouts'){if(r.status!=='pending'||!['paid','rejected'].includes(b.status))fail('Niedozwolona zmiana statusu.');if(b.status==='paid'&&wallet(r.user).available<0)fail('Saldo jest ujemne po zwrocie. Odrzuć wniosek.');r.status=b.status;r.note=str(b.note||'',0,2000);r.processedAt=now()}
  if(kind==='reviews')r.hidden=!!b.hidden;
  if(kind!=='users')put(kind,r);audit(u,'Zmiana: '+kind,rid);return kind==='products'?productView(r):r;
 }))}
 fail('Nie znaleziono endpointu.',404);
 }
 const image=p.match(/^\/media\/([a-f0-9-]+)$/),download=p.match(/^\/download\/([a-f0-9-]+)\/([a-f0-9-]+)$/);
 if(image||download){let f;if(image){f=get('files',image[1]);if(f?.kind!=='image')fail('Nie znaleziono obrazu.',404)}else{requireUser(u);let o=get('orders',download[1]),item=o?.items.find(i=>i.product===download[2]);if(!o||o.user!==u.id||o.status!=='paid'||!item)fail('Brak dostępu do pliku.',403);let product=get('products',item.product);f=get('files',product?.file||item.file);audit(u,'Pobranie produktu',item.product)}if(!f||!fs.existsSync(path.join(DATA,'files',f.id)))fail('Brak pliku. Skontaktuj się ze wsparciem.',404);res.writeHead(200,{'Content-Type':f.mime,'Content-Length':f.size,...(download?{'Content-Disposition':`attachment; filename="${f.name}"`}:{})});fs.createReadStream(path.join(DATA,'files',f.id)).pipe(res);return}
 if(!['GET','HEAD'].includes(method))fail('Niedozwolona metoda.',405);
 const assets={'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css'],'/favicon.svg':['favicon.svg','image/svg+xml'],'/logo.png':['logo.png','image/png']};
 if(assets[p]){let [f,mime]=assets[p];if(!fs.existsSync(path.join(ROOT,'public',f)))fail('Brak pliku.',404);return send(res,200,fs.readFileSync(path.join(ROOT,'public',f)),mime)}
 if(p==='/robots.txt')return send(res,200,'User-agent: *\nDisallow: /panel\nDisallow: /admin\nDisallow: /api\n','text/plain');
 return send(res,200,fs.readFileSync(path.join(ROOT,'public','index.html')),'text/html; charset=utf-8');
 }catch(e){if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'Wystąpił błąd serwera.'});else res.end();if(!e.status)console.error(e)}});
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('VelorieStore listening on port '+(process.env.PORT||3000)));
process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0)}));
