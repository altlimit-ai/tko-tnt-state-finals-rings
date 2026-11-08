(function(){
var LIVE_URL='__LIVE_URL__',SITE='https://www.eventxpres.com/RankView.html?EventId=3327&Mode=2',STORE='tko-tnt-rings-3327',EVERY=5*60*1000,LATE=60*60*1000;
var snapshot=JSON.parse(document.getElementById('snapshot').textContent);
var q=document.getElementById('q'),home=document.getElementById('home'),res=document.getElementById('results'),strip=document.getElementById('strip'),rings=document.getElementById('rings'),status=document.getElementById('status'),foot=document.getElementById('notes');
var secs=[],evs=[],index=[],current=null,loading=false,lastError=false;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function clean(s){return String(s==null?'':s).trim().replace(/\s+/g,' ')}
function age(a){
  a=clean(a);
  if(/^ages 0 to 999$|^all ages$/i.test(a))return 'All ages';
  var m=a.match(/^(\d+) plus$/i);if(m)return m[1]+'+';
  return a.toLowerCase().replace(/ and under$/,' & under');
}
function level(l){return clean(l).toLowerCase().replace(/\b[a-z]/g,function(c){return c.toUpperCase()})}
function gender(g){return /m.*f/i.test(g)?'M/F':clean(g).toUpperCase()}
function plural(n,w){return n+' '+w+(n===1?'':'s')}
function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function minutes(t){
  var m=clean(t).match(/^(\d+):(\d+)\s*([ap])\.?m?/i);
  if(!m)return Infinity;
  return (+m[1]%12+(/p/i.test(m[3])?12:0))*60+ +m[2];
}
var STATE={S:'Staged',C:'Closed'};
function tokens(d,lv){
  var src=[d.divisionName,d.ageDisplay,age(d.ageDisplay),lv,d.style,d.disciplineName,d.divisionID2,d.ringDesc].join(' ').toLowerCase().replace(/&/g,' and ');
  var w={},add=function(t){w[t]=1};
  (src.match(/[a-z0-9]+/g)||[]).forEach(function(t){add(t);if(/^\d+$/.test(t))add(String(+t))});
  add(clean(d.divisionID2).toLowerCase().replace(/[^a-z0-9]/g,''));
  var g=clean(d.genders).toLowerCase();
  if(/m/.test(g)){add('m');add('male')}
  if(/f/.test(g)){add('f');add('female')}
  (clean(d.ringDesc).toLowerCase().match(/[a-z]+/g)||[]).forEach(add);
  var also={adv:'advanced',int:'intermediate',beg:'beginner',expert:'black',trad:'traditional',weap:'weapons',cont:'continuous',exibition:'exhibition'};
  Object.keys(also).forEach(function(k){if(w[k])add(also[k])});
  delete w['2026'];delete w.state;delete w.finals;
  return Object.keys(w).sort().join(' ');
}
function evHtml(d,r){
  var lv=level(d.level),bits=['<span class="code">'+esc(clean(d.divisionID2))+'</span>'];
  if(clean(d.ringTime))bits.unshift('<span class="time">'+esc(clean(d.ringTime))+'</span>');
  bits.push(esc(age(d.ageDisplay)));
  if(lv)bits.push(esc(lv));
  bits.push(esc(gender(d.genders)));
  bits.push('<span>'+esc(d.divisionCount)+' entered</span>');
  if(STATE[d.divState])bits.push('<span class="state">'+STATE[d.divState]+'</span>');
  return '<li class="ev" data-s="'+esc(tokens(d,lv))+'"><a class="badge'+(r.numbered?'':' long')+'" href="#'+r.id+'" aria-label="Go to '+esc(r.title)+'">'+(r.numbered?'<small>Ring</small>':'')+esc(r.label)+'</a><div class="body"><div class="name">'+esc(clean(d.divisionName))+'</div><div class="meta">'+bits.join(' · ')+'</div></div></li>';
}
function group(data){
  var byKey={},list=[],dayN={};
  data.forEach(function(d){dayN[clean(d.ringDay)]=(dayN[clean(d.ringDay)]||0)+1});
  var days=Object.keys(dayN),main=days.slice().sort(function(a,b){return dayN[b]-dayN[a]})[0];
  var plain=days.filter(function(x){return !/breaking/i.test(x)});
  data.forEach(function(d){
    var name=clean(d.ringDesc),day=clean(d.ringDay),key=day+'|'+name.toLowerCase(),r=byKey[key];
    if(!r){r=byKey[key]={name:name,day:day,evs:[],entered:0};list.push(r)}
    r.evs.push(d);r.entered+=+d.divisionCount||0;
  });
  var seen={};list.forEach(function(r){seen[slug(r.name)]=(seen[slug(r.name)]||0)+1});
  list.forEach(function(r){
    r.numbered=/^\d/.test(r.name);
    r.kind=/breaking/i.test(r.day)?3:r.numbered?0:/^stage\b/i.test(r.name)?1:2;
    r.label=r.name;r.title=r.numbered?'Ring '+r.name:r.name;
    r.id='ring-'+slug(r.name)+(seen[slug(r.name)]>1?'-'+slug(r.day):'');
    r.tnt=r.evs.every(function(d){return /^tnt\b/i.test(clean(d.disciplineName))});
    r.showDay=r.day!==main;
    r.evs=r.evs.map(function(d,i){return{d:d,i:i}}).sort(function(a,b){var x=minutes(a.d.ringTime),y=minutes(b.d.ringTime);return x===y?a.i-b.i:x<y?-1:1}).map(function(o){return o.d});
    r.group=(plain.length>1?r.day+' – ':'')+['Numbered rings','Stages','Named rings','Breaking'][r.kind];
  });
  list.sort(function(a,b){
    var da=days.indexOf(a.day)-days.indexOf(b.day);
    if(plain.length>1&&a.kind!==3&&b.kind!==3&&da)return da;
    return a.kind-b.kind||a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
  });
  return {list:list,days:days,timed:data.some(function(d){return clean(d.ringTime)})};
}
function when(ev){
  if(!ev||!ev.start)return '';
  var mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var a=ev.start.slice(0,10).split('-'),b=(ev.end||ev.start).slice(0,10).split('-');
  var s=mon[+a[1]-1]+' '+ +a[2];
  if(b.join()!==a.join())s+=(a[1]===b[1]?'–'+ +b[2]:' – '+mon[+b[1]-1]+' '+ +b[2]);
  return s+', '+b[0]+(ev.city?' · '+ev.city+(ev.state?', '+ev.state:''):'');
}
function render(p){
  var g=group(p.divisions),heads={},t='',s='',n='';
  g.list.forEach(function(r){
    if(!heads[r.group]){if(t)t+='</div>';t+='<h2>'+esc(r.group)+'</h2><div class="grid">';heads[r.group]=1}
    var sub=(r.tnt?'TNT · ':'')+plural(r.evs.length,'event');
    t+=r.numbered?'<a class="tile" href="#'+r.id+'"><small>Ring</small><b>'+esc(r.name)+'</b><span>'+sub+'</span></a>':'<a class="tile long" href="#'+r.id+'"><b>'+esc(r.name)+'</b><span>'+sub+'</span></a>';
    n+='<a href="#'+r.id+'" data-r="'+r.id+'">'+esc(r.name)+'</a>';
    s+='<section class="ring" id="'+r.id+'" data-name="'+esc(r.name.toLowerCase())+'"><h2>'+esc(r.title)+'</h2><p class="sum">'+plural(r.evs.length,'event')+' · '+r.entered+' entered'+(r.tnt?' · TNT':'')+(r.showDay?' · '+esc(r.day):'')+'</p><ol class="evs">'+r.evs.map(function(d){return evHtml(d,r)}).join('')+'</ol></section>';
  });
  home.innerHTML=t+'</div>';strip.innerHTML=n;rings.innerHTML=s;
  secs=[].slice.call(rings.querySelectorAll('.ring'));evs=[].slice.call(rings.querySelectorAll('.ev'));
  index=evs.map(function(el){return el.getAttribute('data-s').split(' ')});
  if(p.event){
    document.getElementById('title').textContent=clean(p.event.title)||'Rings';
    document.getElementById('when').textContent=when(p.event);
    document.title=(clean(p.event.title)||'Event')+' – Rings';
  }
  var base=g.days.filter(function(x){return !/breaking/i.test(x)});
  foot.innerHTML='<p>'+plural(p.divisions.length,'event')+' in '+plural(g.list.length,'ring')+', from <a href="'+esc(SITE)+'">EventXpres</a>.</p><p>'+(g.timed?'Times are the site\'s; events without one are listed last.':'The site has no start times yet.')+' It lists '+esc((base.length?base:g.days).join(' and '))+' rings. Events follow the site\'s order, which may not be the running order.</p><p>Unofficial view, for personal use.</p>';
}
function ago(ts){return new Date(ts).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
function clock(ts){return new Date(ts).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}
function setStatus(){
  var src=current,txt,cls;
  if(!LIVE_URL){cls='stale';status.innerHTML='Saved copy from '+esc(ago(src.fetchedAt))+'. It won\'t update. <a href="'+esc(SITE)+'">Check EventXpres</a>';return paint(cls)}
  if(loading&&!src.live){cls='busy';txt='Checking for the latest rings…'}
  else if(lastError||!src.live){cls='stale';txt='Can\'t check for updates. Showing the copy from '+ago(src.fetchedAt)+'. Tap to retry.'}
  else if(Date.now()-src.fetchedAt>LATE){status.innerHTML='Updates are running late. Last read from EventXpres on '+esc(ago(src.fetchedAt))+'. <a href="'+esc(SITE)+'">Check EventXpres</a>';return paint('stale')}
  else{cls='live';txt=(loading?'Checking… ':'')+'Read from EventXpres at '+clock(src.fetchedAt)+'. Updates about every 15 minutes. Tap to check.'}
  status.textContent=txt;paint(cls);
}
function paint(c){status.className=c}
function ringFor(s){
  s=s.trim().toLowerCase().replace(/\s+/g,' ');
  var m=s.match(/^ring ?(.+)$/);
  var n=m?m[1]:s;
  for(var i=0;i<secs.length;i++){
    var name=secs[i].getAttribute('data-name');
    if(name===n&&(m||!/^\d/.test(name)))return secs[i];
  }
  return null;
}
function hit(words,t){
  var digits=/^\d+$/.test(t);
  for(var i=0;i<words.length;i++){if(digits?words[i]===t||words[i]===String(+t):words[i].lastIndexOf(t,0)===0)return true}
  return false;
}
function show(sec){
  home.classList.add('hide');res.classList.remove('show');
  secs.forEach(function(s){s.classList.toggle('show',s===sec)});
  document.documentElement.classList.toggle('ringview',!!sec);
  [].forEach.call(strip.children,function(a){
    var on=sec&&a.getAttribute('data-r')===sec.id;a.classList.toggle('on',!!on);
    if(on)strip.scrollLeft=a.offsetLeft-strip.offsetLeft-(strip.clientWidth-a.offsetWidth)/2;
  });
}
function search(s){
  var r=ringFor(s);
  if(r){show(r);return}
  var ts=s.toLowerCase().match(/[a-z0-9]+/g)||[];
  if(!ts.length||(ts.length===1&&ts[0]==='ring')){home.classList.remove('hide');res.classList.remove('show');secs.forEach(function(x){x.classList.remove('show')});document.documentElement.classList.remove('ringview');return}
  show(null);
  var found=[],code=ts.join('');
  if(/[a-z]\d/.test(code))evs.forEach(function(el,i){if(index[i].indexOf(code)>=0)found.push(el)});
  if(!found.length)evs.forEach(function(el,i){if(ts.every(function(t){return hit(index[i],t)}))found.push(el)});
  res.textContent='';
  var bare=ts.length===1&&ringFor('ring '+ts[0]);
  if(bare){var g=document.createElement('a');g.className='goto';g.href='#'+bare.id;g.textContent='Go to Ring '+ts[0].toUpperCase()+' →';res.appendChild(g)}
  var c=document.createElement('p');c.className='count';
  c.textContent=found.length?found.length+(found.length===1?' event':' events'):'No events match. Try fewer words.';
  res.appendChild(c);
  var ol=document.createElement('ol');ol.className='evs';
  found.forEach(function(el){ol.appendChild(el.cloneNode(true))});
  res.appendChild(ol);res.classList.add('show');
}
function route(keep){
  var h=location.hash.slice(1),y=window.pageYOffset;
  if(h.indexOf('q=')===0){var s=decodeURIComponent(h.slice(2));q.value=s;search(s)}
  else if(h&&document.getElementById(h)&&document.getElementById(h).classList.contains('ring')){q.value='';show(document.getElementById(h))}
  else{q.value='';search('')}
  window.scrollTo(0,keep===true?y:0);
}
function valid(p){return p&&Array.isArray(p.divisions)&&p.divisions.length>0&&p.divisions.every(function(d){return d&&d.ringDesc&&d.divisionName})&&p.fetchedAt}
function use(p,live){
  var same=current&&JSON.stringify(current.divisions)===JSON.stringify(p.divisions)&&JSON.stringify(current.event)===JSON.stringify(p.event);
  current=p;p.live=live;
  if(!same){
    var typing=document.activeElement===q&&q.value;
    render(p);
    if(typing)search(q.value);else route(true);
  }
  setStatus();
}
function saved(){try{var p=JSON.parse(localStorage.getItem(STORE));return valid(p)?p:null}catch(e){return null}}
function refresh(){
  if(!LIVE_URL||loading)return;
  loading=true;setStatus();
  var ctl=window.AbortController?new AbortController():null,t=ctl&&setTimeout(function(){ctl.abort()},20000);
  fetch(LIVE_URL+'?t='+Date.now(),{cache:'no-store',signal:ctl?ctl.signal:undefined}).then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).then(function(p){
    if(!valid(p))throw new Error('bad data');
    loading=false;lastError=false;
    if(p.fetchedAt<current.fetchedAt){current.live=true;setStatus();return}
    use(p,true);
    try{localStorage.setItem(STORE,JSON.stringify({divisions:p.divisions,event:p.event,fetchedAt:p.fetchedAt}))}catch(e){}
  }).catch(function(){
    loading=false;lastError=true;current.live=false;setStatus();
  }).then(function(){if(t)clearTimeout(t)});
}
q.addEventListener('input',function(){
  search(q.value);window.scrollTo(0,0);
  try{history.replaceState(null,'',q.value?'#q='+encodeURIComponent(q.value):location.pathname+location.search)}catch(e){}
});
window.addEventListener('hashchange',route);
status.addEventListener('click',function(e){if(e.target.tagName!=='A')refresh()});
document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh()});
window.addEventListener('online',refresh);
setInterval(function(){if(!document.hidden)refresh()},EVERY);
var s=saved();
use(s&&s.fetchedAt>snapshot.fetchedAt?s:snapshot,false);
route();
refresh();
})();
