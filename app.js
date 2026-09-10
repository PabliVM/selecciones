function toggleDark(){
  document.body.classList.toggle('dark');
  var isDark=document.body.classList.contains('dark');
  try{localStorage.setItem('rmconv_dark',isDark?'1':'0');}catch(e){}
  var btn=document.getElementById('darkBtn');
  if(btn)btn.innerHTML=isDark?'☀':'☾';
}
(function(){
  var saved="0";
  try{saved=localStorage.getItem('rmconv_dark')||"0";}catch(e){}
  if(saved==="1"){
    document.body.classList.add('dark');
    var btn=document.getElementById('darkBtn');
    if(btn)btn.innerHTML='☀';
  }
})();

function getCallups_raw(){ return window._callups || []; }
function getPlayers_raw(){ return window._players || []; }
function getRefDates_raw(){ return window._refdates || []; }

function addRefDate(data,cb){
  var obj=Object.assign({},data);
  if(window._db&&window._fbUser){
    var fns=window._fbFns;
    fns.addDoc(fns.collection(window._db,"refdates"),obj).then(function(ref){
      obj.id=ref.id;if(!window._refdates)window._refdates=[];window._refdates.push(obj);if(cb)cb();
    }).catch(function(e){console.error(e);if(cb)cb();});
  } else {
    obj.id=gid();if(!window._refdates)window._refdates=[];window._refdates.push(obj);if(cb)cb();
  }
}
function updateRefDate(id,data,cb){
  var idx=getRefDates_raw().findIndex(function(r){return r.id===id;});
  if(idx===-1){if(cb)cb();return;}
  var merged=Object.assign({},window._refdates[idx],data);
  window._refdates[idx]=merged;
  if(window._db&&window._fbUser){
    var fns=window._fbFns;
    fns.setDoc(fns.doc(window._db,"refdates",id),data,{merge:true}).catch(function(e){console.error("refdate update:",e);});
  }
  if(cb)cb();
}
function getCatsForTipo(tipo){
  var t=(tipo||"").trim();
  var rec=getRefDates_raw().find(function(x){return(x.tipo||"").trim()===t&&x.cats&&x.cats.length;});
  return rec?rec.cats:[];
}
function lightenHex(hex,amt){
  if(!hex)return hex;
  var h=hex.replace("#","");
  if(h.length===3)h=h.split("").map(function(c){return c+c;}).join("");
  var r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);
  if(amt>=0){r=r+(255-r)*amt;g=g+(255-g)*amt;b=b+(255-b)*amt;}
  else{r=r*(1+amt);g=g*(1+amt);b=b*(1+amt);}
  r=Math.round(r);g=Math.round(g);b=Math.round(b);
  return"#"+[r,g,b].map(function(x){return Math.max(0,Math.min(255,x)).toString(16).padStart(2,"0");}).join("");
}
function shadeColorForCat(baseColor,catKey,catsList){
  if(!catKey||!catsList||catsList.length<2)return baseColor;
  var order=Object.keys(CAT).filter(function(k){return k!=="todas";});
  var sortedCats=catsList.slice().sort(function(a,b){return order.indexOf(a)-order.indexOf(b);});
  var idx=sortedCats.indexOf(catKey);
  if(idx===-1)return baseColor;
  var frac=idx/(sortedCats.length-1);
  var amt=0.7-frac*0.95;
  return lightenHex(baseColor,amt);
}
function contrastText(hex){
  if(!hex)return"#fff";
  var h=hex.replace("#","");
  if(h.length===3)h=h.split("").map(function(c){return c+c;}).join("");
  var r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);
  var yiq=(r*299+g*587+b*114)/1000;
  return yiq>=160?"#111":"#fff";
}
function catsDesc(arr){
  var order=Object.keys(CAT).filter(function(k){return k!=="todas";});
  return arr.slice().sort(function(a,b){return order.indexOf(b)-order.indexOf(a);});
}
function getOrderedTipos(){
  var all=getRefDates_raw();
  var seen={};var list=[];
  all.forEach(function(r){
    var k=(r.tipo||"").trim();if(!k||seen[k])return;seen[k]=1;
    var withOrder=all.find(function(x){return(x.tipo||"").trim()===k&&typeof x.order==="number";});
    list.push({tipo:k,order:withOrder?withOrder.order:9999});
  });
  list.sort(function(a,b){return a.order-b.order||a.tipo.localeCompare(b.tipo);});
  return list.map(function(x){return x.tipo;});
}
function getTipoOrder(tipo){
  var order=getOrderedTipos();
  var i=order.indexOf((tipo||"").trim());
  return i===-1?9999:i;
}
function moveTipoOrder(tipo,dir){
  var order=getOrderedTipos();
  var idx=order.indexOf(tipo);
  var swapIdx=idx+dir;
  if(idx===-1||swapIdx<0||swapIdx>=order.length)return;
  var tmp=order[idx];order[idx]=order[swapIdx];order[swapIdx]=tmp;
  order.forEach(function(t,i){
    getRefDates_raw().filter(function(r){return(r.tipo||"").trim()===t;}).forEach(function(r){
      if(r.order!==i)updateRefDate(r.id,{order:i});
    });
  });
  renderFechas();
}
function syncGroupColor(tipo,color){
  var t=(tipo||"").trim();if(!t)return;
  getRefDates_raw().forEach(function(r){
    if((r.tipo||"").trim()===t&&r.color!==color)updateRefDate(r.id,{color:color});
  });
}
function deleteRefDate(id,cb){
  if(window._db&&window._fbUser){
    var fns=window._fbFns;
    fns.deleteDoc(fns.doc(window._db,"refdates",id)).then(function(){
      window._refdates=getRefDates_raw().filter(function(r){return r.id!==id;});if(cb)cb();
    }).catch(function(e){console.error(e);});
  } else {
    window._refdates=getRefDates_raw().filter(function(r){return r.id!==id;});if(cb)cb();
  }
}
function fifaBadge(c){
  if(!c.startDate)return"";
  var end=c.endDate||c.startDate;
  var hit=getRefDates_raw().some(function(r){
    return r.tipo&&r.tipo.toLowerCase().indexOf("fifa")!==-1&&r.startDate<=end&&(r.endDate||r.startDate)>=c.startDate;
  });
  return hit?'<span class="badge" style="background:#111827;color:#fff" title="Coincide con ventana FIFA">🌍 FIFA</span>':"";
}

var _seasons = [];
var _refEvents = [];
function refDatesAsEvents(){
  return getRefDates_raw().map(function(r){return Object.assign({},r,{title:r.title||r.tipo||"Fecha",_isRefDate:true});});
}

var SELS = {};
SELS["madrilena"] = {
  label:"Madrileña",
  short:"MAD",
  cats:["sub12","sub14","sub15"],
  colors:{
    sub12:{badge:"#2563EB"},
    sub14:{badge:"#1D4ED8"},
    sub15:{badge:"#1E40AF"}
  }
};SELS["espanola"]  = {label:"Española",short:"ESP",cats:["sub14","sub15","sub16","sub17","sub18","sub19","sub20","sub21","abs"],colors:{sub14:{badge:"#DC2626"},sub15:{badge:"#DC2626"},sub16:{badge:"#B91C1C"},sub17:{badge:"#B91C1C"},sub18:{badge:"#991B1B"},sub19:{badge:"#7F1D1D"},sub20:{badge:"#7F1D1D"},sub21:{badge:"#450A0A"},abs:{badge:"#1A0000"}}};
SELS["internacional"]={label:"Internacional",short:"INT",cats:["sub16","sub17","sub18","sub19","sub20","sub21","abs"],colors:{sub16:{badge:"#10B981"},sub17:{badge:"#10B981"},sub18:{badge:"#047857"},sub19:{badge:"#047857"},sub20:{badge:"#065F46"},sub21:{badge:"#065F46"},abs:{badge:"#064E3B"}}};

var CAT={todas:"Todas",sub12:"U12",sub14:"U14",sub15:"U15",sub16:"U16",sub17:"U17",sub18:"U18",sub19:"U19",sub20:"U20",sub21:"U21",abs:"Absoluta"};
var STATUS={proxima:{c:"s-prox",i:"⏰",l:"PRÓXIMA"},en_curso:{c:"s-cur",i:"●",l:"EN CURSO"},finalizada:{c:"s-fin",i:"✓",l:"FINALIZADA"}};

var TEAMS=[
  {id:"t_castilla",name:"Castilla",order:12},{id:"t_rmc",name:"RMC",order:11},
  {id:"t_ja",name:"JA",order:10},{id:"t_jb",name:"JB",order:9},{id:"t_jc",name:"JC",order:8},
  {id:"t_ca",name:"CA",order:7},{id:"t_cb",name:"CB",order:6},
  {id:"t_ia",name:"IA",order:5},{id:"t_ib",name:"IB",order:4},
  {id:"t_aa",name:"AA",order:3},{id:"t_ab",name:"AB",order:2},{id:"t_ac",name:"AC",order:1}
];

var FLAGS={
  "España":"🇪🇸","Francia":"🇫🇷","Alemania":"🇩🇪","Portugal":"🇵🇹","Italia":"🇮🇹",
  "Argentina":"🇦🇷","Brasil":"🇧🇷","Marruecos":"🇲🇦","Colombia":"🇨🇴","Suecia":"🇸🇪",
  "Suiza":"🇨🇭","Holanda":"🇳🇱","Bélgica":"🇧🇪","Uruguay":"🇺🇾","Chile":"🇨🇱",
  "México":"🇲🇽","Ecuador":"🇪🇨","Perú":"🇵🇪","Venezuela":"🇻🇪","Bolivia":"🇧🇴",
  "Paraguay":"🇵🇾","Senegal":"🇸🇳","Nigeria":"🇳🇬","Ghana":"🇬🇭","Turquía":"🇹🇷",
  "Polonia":"🇵🇱","Rumania":"🇷🇴","Ucrania":"🇺🇦","Croacia":"🇭🇷",
  "Guinea Ecuatorial":"🇬🇶","Camerún":"🇨🇲"
};
var PAIS_ADJ={
  "Francia":"Francesa","Marruecos":"Marroquí","Argentina":"Argentina","Colombia":"Colombiana",
  "Suecia":"Sueca","Suiza":"Suiza","Brasil":"Brasileña","Portugal":"Portuguesa",
  "Alemania":"Alemana","Italia":"Italiana","Holanda":"Holandesa","Bélgica":"Belga",
  "Uruguay":"Uruguaya","Chile":"Chilena","México":"Mexicana","Ecuador":"Ecuatoriana",
  "Perú":"Peruana","Venezuela":"Venezolana","Bolivia":"Boliviana","Paraguay":"Paraguaya",
  "Senegal":"Senegalesa","Nigeria":"Nigeriana","Ghana":"Ghanesa","Turquía":"Turca",
  "Polonia":"Polaca","Rumania":"Rumana","Ucrania":"Ucraniana","Croacia":"Croata",
  "Guinea Ecuatorial":"Ecuatoguineana","Camerún":"Camerunesa"
};

function selKey(type){if(!type)return"";var t=type.toLowerCase();if(t.indexOf("madril")!==-1)return"madrilena";if(t.indexOf("espa")!==-1)return"espanola";if(t.indexOf("intern")!==-1)return"internacional";return t;}
function paisAdj(p){return PAIS_ADJ[p]||p;}
function getFlag(p){return FLAGS[p]||"🏴";}
function getSelFlag(type,pais){var k=selKey(type);if(k==="madrilena")return"📍";if(k==="espanola")return"🇪🇸";if(k==="internacional")return pais?getFlag(pais):"🌍";return"🏴";}

function canEdit(){return !!window._fbUser;}
function canWrite(){return !!window._fbUser;}
function esc(s){if(!s)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function calcStatus(s,e){var n=new Date();n.setHours(0,0,0,0);var a=new Date(s+"T00:00:00"),b=new Date(e+"T23:59:59");return n<a?"proxima":n>b?"finalizada":"en_curso";}
function daysUntil(dateStr){if(!dateStr)return 999;var now=new Date();now.setHours(0,0,0,0);var d=new Date(dateStr+"T00:00:00");return Math.ceil((d-now)/(1000*60*60*24));}
function provAlertBadge(c){if(c.convType!=="provisional")return"";var days=daysUntil(c.startDate);if(days>7)return"";if(days<0)return'<span class="badge prov-alert prov-alert-late">⚠️ Sin confirmar</span>';if(days===0)return'<span class="badge prov-alert prov-alert-today">⚠️ HOY</span>';return'<span class="badge prov-alert prov-alert-soon">⚠️ '+days+'d</span>';}
function fmtRange(s,e){if(!s)return"—";var a=new Date(s+"T12:00:00"),b=new Date(e+"T12:00:00");return a.toLocaleDateString("es-ES",{day:"2-digit",month:"short"})+" — "+b.toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric"});}
function fmtDateShort(d){if(!d)return"";var dt=new Date(d+"T12:00:00");return dt.toLocaleDateString("es-ES",{day:"2-digit",month:"short"});}
function teamNow(p){if(!p||!p.teamHistory||!p.teamHistory.length)return null;for(var i=0;i<p.teamHistory.length;i++){if(p.teamHistory[i].to===null)return p.teamHistory[i];}return p.teamHistory[p.teamHistory.length-1];}
function teamInSeason(p,sea){if(!p||!p.teamHistory)return null;var hs=p.teamHistory.filter(function(h){return h.season===sea;});if(!hs.length)return null;hs.sort(function(a,b){return new Date(b.from)-new Date(a.from);});return hs[0];}
function nextSea(s){var y=parseInt(s.split("-")[0])+1;return y+"-"+String(y+1).slice(2);}
function gid(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}
function sortDate(arr,dir){dir=dir||"asc";return arr.slice().sort(function(a,b){return(dir==="asc"?1:-1)*(new Date(a.startDate)-new Date(b.startDate));});}
function $(id){return document.getElementById(id);}

function getCallups(f){
  f=f||{};
  var today=new Date();today.setHours(0,0,0,0);
  var r=getCallups_raw().map(function(c){
    var copy=Object.assign({},c,{status:calcStatus(c.startDate,c.endDate)});
    // Auto-descarte: provisional con fecha límite vencida
    if(copy.convType==="provisional"&&copy.limitDate){
      var lim=new Date(copy.limitDate+"T23:59:59");
      if(today>lim){copy.convType="descartada";c.convType="descartada";
        if(window._db&&window._fbUser){var fns=window._fbFns;fns.setDoc(fns.doc(window._db,"callups",c.id),{convType:"descartada"},{merge:true}).catch(function(e){console.error(e);});}
      }
    }
    return copy;
  });
  if(f.season)r=r.filter(function(c){return c.season===f.season;});
  if(f.type)r=r.filter(function(c){return selKey(c.selectionType)===f.type;});
  if(f.cat)r=r.filter(function(c){return c.selectionCategory===f.cat||(f.cat==="abs"&&!c.selectionCategory);});
  if(f.excludeDescartadas)r=r.filter(function(c){return c.convType!=="descartada";});
  return r;
}

function addCallup(data,sea,cb){
  var obj=Object.assign({},data,{season:sea,status:calcStatus(data.startDate,data.endDate),createdAt:new Date().toISOString()});
  if(window._db&&window._fbUser){
    var fns=window._fbFns;
    fns.addDoc(fns.collection(window._db,"callups"),obj).then(function(ref){
      obj.id=ref.id;
      if(!window._callups)window._callups=[];
      window._callups.push(obj);
      if(cb)cb();
    }).catch(function(e){console.error(e);alert("Error guardando: "+e.message);});
  } else {
    obj.id=gid();
    if(!window._callups)window._callups=[];
    window._callups.push(obj);
    if(cb)cb();
  }
}

function deleteCallup(id,cb){
  if(window._db&&window._fbUser){
    var fns=window._fbFns;
    fns.deleteDoc(fns.doc(window._db,"callups",id)).then(function(){
      window._callups=getCallups_raw().filter(function(c){return c.id!==id;});
      if(cb)cb();
    }).catch(function(e){console.error(e);alert("Error eliminando: "+e.message);});
  } else {
    window._callups=getCallups_raw().filter(function(c){return c.id!==id;});
    if(cb)cb();
  }
}

function updateCallup(id,data,cb){
  var existing=null;
  for(var i=0;i<getCallups_raw().length;i++){if(getCallups_raw()[i].id===id){existing=getCallups_raw()[i];break;}}
  var obj=Object.assign({},existing||{},data,{status:calcStatus(data.startDate,data.endDate)});
  Object.keys(obj).forEach(function(k){if(obj[k]===undefined)delete obj[k];});
  if(window._db&&window._fbUser){
    var fns=window._fbFns;
    fns.setDoc(fns.doc(window._db,"callups",id),obj,{merge:true}).then(function(){
      for(var i=0;i<getCallups_raw().length;i++){if(getCallups_raw()[i].id===id){Object.assign(getCallups_raw()[i],obj);break;}}
      if(cb)cb();
    }).catch(function(e){console.error(e);alert("Error actualizando: "+e.message);});
  } else {
    for(var i=0;i<getCallups_raw().length;i++){if(getCallups_raw()[i].id===id){Object.assign(getCallups_raw()[i],obj);break;}}
    if(cb)cb();
  }
}

function getPlayersBySeason(sea){
  return getPlayers_raw().filter(function(p){return p.teamHistory&&p.teamHistory.some(function(h){return h.season===sea;});});
}

function buildStats(callups){
  var s={};
  getPlayers_raw().forEach(function(p){s[p.id]={player:p,total:0,mad:0,esp:0,intl:0,callups:[]};});
  callups.forEach(function(c){
    if(!c.players)return;
    c.players.forEach(function(cp){
      if(!s[cp.playerId])return;
      s[cp.playerId].total++;
      var k=selKey(c.selectionType);
      if(k==="madrilena")s[cp.playerId].mad++;
      else if(k==="espanola")s[cp.playerId].esp++;
      else s[cp.playerId].intl++;
      s[cp.playerId].callups.push(c);
    });
  });
  return Object.keys(s).map(function(k){return s[k];}).sort(function(a,b){return b.total-a.total;});
}

// ── HELPER: match type icon ──
function matchIcon(mtype){
  if(mtype==="oficial")return"🏆";
  if(mtype==="entrenamiento")return"🏋";
  return"⚽";
}

// ── BADGES ──
function selBadge(type,cat,pais){
  var k=selKey(type);var s=SELS[k];if(!s)return"";
  if(!cat)cat="abs";
  var c=(s.colors&&s.colors[cat])?s.colors[cat]:{badge:"#666"};
  var flag=k==="madrilena"?'<img src="https://raw.githubusercontent.com/PabliVM/selecciones/main/MADRID.png" style="width:16px;height:12px;object-fit:cover;border-radius:2px;vertical-align:middle"/>':k==="espanola"?'<img src="https://raw.githubusercontent.com/PabliVM/selecciones/main/Espa%C3%B1a.png" style="width:16px;height:12px;object-fit:cover;border-radius:2px;vertical-align:middle"/>':(pais?getFlag(pais):"🌍");
  var label=k==="internacional"&&pais?(CAT[cat]||cat)+" "+paisAdj(pais):(CAT[cat]||cat)+" "+s.short;
  return'<span class="badge" style="background:'+c.badge+';color:#fff">'+flag+" "+label+"</span>";
}
function convTypeBadge(t){
  if(t==="definitiva")return'<span class="badge conv-def" title="Definitiva">✅</span>';
  if(t==="descartada")return'<span class="badge conv-desc" title="No seleccionados">❌</span>';
  return'<span class="badge conv-prov" title="Provisional">⏳</span>';
}
function statusBadge(st){var c=STATUS[st]||STATUS.finalizada;return'<span class="badge '+c.c+'">'+c.i+" "+c.l+"</span>";}
function emptyState(msg,ico){return'<div class="empty"><span class="empty-ico">'+(ico||"📋")+'</span><p class="empty-t">'+msg+"</p></div>";}
function toast(msg){var t=document.createElement("div");t.className="toast";t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.classList.add("on");},10);setTimeout(function(){t.classList.remove("on");setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},2800);}

// ── CARD ──
function callupCard(c){
  var k=selKey(c.selectionType),sel=SELS[k];
  var col=(sel&&sel.colors&&sel.colors[c.selectionCategory])?sel.colors[c.selectionCategory]:{badge:"#1A3A8F"};
  var pc=(c.players&&c.players.length)||0;
  var flag=getSelFlag(c.selectionType,c.pais);
  var chips="";
  for(var i=0;i<Math.min(pc,3);i++){var pts=c.players[i].fullName.split(" ");chips+='<span class="chip">'+esc(pts[0]+(pts[1]?" "+pts[1]:""))+"</span>";}
  if(pc>3)chips+='<span class="chip chip-more">+'+(pc-3)+"</span>";
  return'<article class="cc'+(c.convType==="descartada"?" cc-descartada":"")+'" style="--ca:'+col.badge+'" data-id="'+c.id+'" tabindex="0" role="button">'+
    '<div class="cc-convtype" style="display:flex;align-items:center;gap:8px;margin:-16px -16px 10px;padding:8px 16px;border-radius:var(--r) var(--r) 0 0;background:rgba(255,255,255,.03)">'+
    '<span style="font-size:24px;line-height:1">'+(c.convType==="definitiva"?"✅":(c.convType==="descartada"?"❌":"⏳"))+'</span>'+
    '<span style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:'+(c.convType==="definitiva"?"#34D399":(c.convType==="descartada"?"#EF4444":"#FBBF24"))+'">'+(c.convType==="definitiva"?"Definitiva":(c.convType==="descartada"?"No seleccionados":"Provisional"))+'</span>'+
    provAlertBadge(c)+
    '</div>'+
    '<div class="cc-hdr"><div class="cc-badges">'+selBadge(c.selectionType,c.selectionCategory,c.pais)+statusBadge(c.status)+fifaBadge(c)+"</div></div>"+
    '<h3 class="cc-title">'+esc(c.title)+"</h3>"+
    '<div class="cc-meta">'+
    '<div class="cc-mi"><span class="mi">📅</span><span>'+fmtRange(c.startDate,c.endDate)+"</span></div>"+
    (function(){
      var tl=[];
      if(c.conc&&(c.conc.date||c.conc.time||c.conc.lugar))
        tl.push({s:c.conc.date||"0",type:"cite",label:"Citación",line:(c.conc.date?fmtDateShort(c.conc.date)+" ":"")+(c.conc.time?c.conc.time+"h ":"")+(c.conc.lugar?"· "+esc(c.conc.lugar):"")});
      if(c.traslado&&(c.traslado.date||c.traslado.transporte||c.traslado.desde))
        tl.push({s:c.traslado.date||"1",type:"trasl",label:"Traslado",line:(c.traslado.date?fmtDateShort(c.traslado.date)+" ":"")+(c.traslado.time?c.traslado.time+"h ":"")+(c.traslado.desde&&c.traslado.hasta?esc(c.traslado.desde)+" → "+esc(c.traslado.hasta):(c.traslado.transporte?esc(c.traslado.transporte):""))});
      if(c.matches&&c.matches.length)c.matches.forEach(function(m){
        tl.push({s:m.date||"5",type:"match",label:matchIcon(m.matchType)+" "+(m.rival?esc(m.rival):"TBD"),line:(m.date?fmtDateShort(m.date)+" ":"")+(m.time?m.time+"h":"")});
      });
      if(c.vuelta&&(c.vuelta.date||c.vuelta.time||c.vuelta.desde))
        tl.push({s:c.vuelta.date||"9",type:"vuelta",label:"Vuelta",line:(c.vuelta.date?fmtDateShort(c.vuelta.date)+" ":"")+(c.vuelta.time?c.vuelta.time+"h ":"")+(c.vuelta.desde&&c.vuelta.hasta?esc(c.vuelta.desde)+" → "+esc(c.vuelta.hasta):"")});
      if(c.llegada&&(c.llegada.date||c.llegada.time||c.llegada.lugar))
        tl.push({s:(c.llegada.date||"9")+"z",type:"llegada",label:"🏁 Llegada",line:(c.llegada.date?fmtDateShort(c.llegada.date)+" ":"")+(c.llegada.time?c.llegada.time+"h ":"")+(c.llegada.lugar?esc(c.llegada.lugar):"")});
      if(!tl.length)return"";
      tl.sort(function(a,b){return a.s.localeCompare(b.s);});
      var colors={cite:"var(--navy)",trasl:"#3B82F6",match:"var(--gold)",vuelta:"var(--text-muted)",llegada:"#10B981"};
      var bgColors={cite:"rgba(26,58,143,.12)",trasl:"rgba(59,130,246,.12)",match:"rgba(200,169,110,.15)",vuelta:"rgba(107,114,128,.12)",llegada:"rgba(16,185,129,.12)"};
      return'<div class="cc-tl" style="position:relative;padding-left:18px;margin-top:6px">'+
        '<div style="position:absolute;left:5px;top:4px;bottom:4px;width:1.5px;background:var(--border-strong)"></div>'+
        tl.map(function(t){
          return'<div style="position:relative;margin-bottom:6px;padding-left:2px">'+
            '<div style="position:absolute;left:-18px;top:3px;width:12px;height:12px;border-radius:50%;border:1.5px solid '+colors[t.type]+';background:'+bgColors[t.type]+'"></div>'+
            '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:'+colors[t.type]+'">'+t.label+'</div>'+
            (t.line?'<div style="font-size:12px;color:var(--text-mid)">'+t.line+'</div>':"")+
            '</div>';
        }).join("")+'</div>';
    })()+
    "</div>"+(pc>0?'<div class="cc-players">'+chips+"</div>":"")+
    "</article>";
}

// ── TABLE ROW ──
function callupTableRow(c){
  var k=selKey(c.selectionType);var sel=SELS[k];
  var col=(sel&&sel.colors&&sel.colors[c.selectionCategory])?sel.colors[c.selectionCategory]:{badge:"#1A3A8F"};
  var flag=getSelFlag(c.selectionType,c.pais);
  var st=STATUS[c.status]||STATUS.finalizada;
  var catLabel=CAT[c.selectionCategory]||c.selectionCategory;
  var selLabel=k==="internacional"&&c.pais?paisAdj(c.pais):(sel?sel.label:c.selectionType);
  var activePlayers=(c.players||[]).filter(function(p){return !p.dropStatus||p.dropStatus==="active";});
  var pc=activePlayers.length;
  var playerChips=activePlayers.map(function(p){var pts=p.fullName.split(" ");return'<span class="chip" style="font-size:10px;padding:2px 6px">'+esc(pts[0]+(pts[1]?" "+pts[1].charAt(0)+".":""))+"</span>";}).join("");
  if(!pc)playerChips='<span style="color:var(--text-muted);font-size:11px">—</span>';
  function logCellConc(obj,fallbackDate){
    if(!obj||(!obj.date&&!obj.time&&!obj.lugar&&!obj.hotel))return'<span class="td-log-empty">—</span>';
    return (obj.date?'<span class="td-log-date">'+fmtDateShort(obj.date)+"</span>":"")+
      (obj.time||obj.lugar?'<span class="td-log-sub">'+(obj.time?obj.time+"h ":"")+esc(obj.lugar||"")+"</span>":"")+
      (obj.hotel?'<span class="td-log-trans">🏨 '+esc(obj.hotel)+"</span>":"");
  }
  function logCellTraslado(obj){
    if(!obj||(!obj.date&&!obj.time&&!obj.lugar&&!obj.transporte))return'<span class="td-log-empty">—</span>';
    return (obj.date?'<span class="td-log-date">'+fmtDateShort(obj.date)+"</span>":"")+
      (obj.time?'<span class="td-log-sub">'+obj.time+"h"+(obj.lugar?" · "+esc(obj.lugar):"")+"</span>":
        (obj.lugar?'<span class="td-log-sub">'+esc(obj.lugar)+"</span>":""))+
      (obj.transporte?'<span class="td-log-trans">'+esc(obj.transporte)+"</span>":"");
  }
  function logCellVuelta(obj,fallbackDate){
    if(!obj||(!obj.date&&!obj.time&&!obj.lugar&&!obj.transporte))return'<span class="td-log-empty">—</span>';
    return (obj.date?'<span class="td-log-date">'+fmtDateShort(obj.date)+"</span>":"")+
      (obj.time||obj.lugar?'<span class="td-log-sub">'+(obj.time?obj.time+"h ":"")+esc(obj.lugar||"")+"</span>":"")+
      (obj.transporte?'<span class="td-log-trans">'+esc(obj.transporte)+"</span>":"");
  }
  var _mcells=c.matches&&c.matches.length?c.matches.map(function(m){
    if(!m.rival&&!m.date&&!m.time)return"";
    return'<div class="td-match"><span class="td-match-rival">'+matchIcon(m.matchType)+" "+esc(m.rival||"Por confirmar")+"</span>"+
      '<span class="td-match-sub">'+(m.date?fmtDateShort(m.date)+" ":"")+(m.time?m.time+"h":(!m.date?"Fecha TBD":""))+"</span></div>";
  }).filter(Boolean):[];
  var matchCell=_mcells.length?_mcells.join(""):'<span class="td-log-empty">—</span>';
  return'<tr class="trow'+(pc===0?" trow-empty":"")+(c.convType==="descartada"?" trow-empty":"")+'" data-id="'+c.id+'">'+
    '<td style="text-align:center;font-size:20px;width:44px;padding:8px 4px">'+(c.convType==="definitiva"?"✅":(c.convType==="descartada"?"❌":"⏳"))+provAlertBadge(c)+"</td>"+
    '<td class="td-cat">'+selBadge(c.selectionType,c.selectionCategory,c.pais)+"</td>"+
    '<td class="td-status"><span class="badge '+st.c+'" style="font-size:9px;padding:2px 7px">'+st.l+"</span></td>"+
    '<td><div style="display:flex;flex-wrap:wrap;gap:2px">'+playerChips+"</div></td>"+
    '<td class="td-log">'+logCellConc(c.conc,c.startDate)+"</td>"+
    '<td class="td-log">'+logCellTraslado(c.traslado)+"</td>"+
    '<td class="td-log">'+logCellVuelta(c.vuelta,c.endDate)+"</td>"+
    '<td class="td-matches">'+matchCell+"</td></tr>";
}

// ── DETAIL ──
function callupDetail(c){
  var pc=(c.players&&c.players.length)||0,rows="";
  var activePlayers=[],droppedPlayers=[];
  for(var i=0;i<pc;i++){
    if(c.players[i].dropStatus&&c.players[i].dropStatus!=="active")droppedPlayers.push({idx:i,p:c.players[i]});
    else activePlayers.push({idx:i,p:c.players[i]});
  }
  for(var i=0;i<activePlayers.length;i++){
    var ap=activePlayers[i];
    rows+='<li class="pl-item" data-pidx="'+ap.idx+'"><span class="pl-num">'+(i+1)+'</span>'+
      '<div class="pl-info"><span class="pl-name">'+esc(ap.p.fullName)+'</span><span class="pl-team">'+esc(ap.p.teamName)+"</span></div>"+
      '<button class="pl-drop-btn" data-pidx="'+ap.idx+'" title="Descartar">▼</button>'+
      '<button class="pl-rm-btn" data-pidx="'+ap.idx+'" title="Eliminar">×</button>'+"</li>";
  }
  if(droppedPlayers.length){
    rows+='<li class="pl-dropped-hdr">❌ No convocados / No liberados ('+droppedPlayers.length+')</li>';
    for(var j=0;j<droppedPlayers.length;j++){
      var dp2=droppedPlayers[j];
      var dropLabel=dp2.p.dropStatus==="no_convocado"?"No convocado":dp2.p.dropStatus==="no_liberado"?"No liberado":"Otros";
      rows+='<li class="pl-item pl-item-dropped" data-pidx="'+dp2.idx+'">'+
        '<span class="pl-num" style="color:#EF4444;text-decoration:line-through">'+(j+1)+'</span>'+
        '<div class="pl-info"><span class="pl-name" style="text-decoration:line-through;color:#EF4444;opacity:.7">'+esc(dp2.p.fullName)+'</span>'+
        '<span class="pl-team" style="color:#EF4444;opacity:.6">'+esc(dp2.p.teamName)+' — '+dropLabel+"</span></div>"+
        '<button class="pl-restore-btn" data-pidx="'+dp2.idx+'" title="Restaurar">↩</button>'+"</li>";
    }
  }
  var promBtn=canEdit()&&c.convType==="provisional"?'<button class="btn btn-gold btn-sm" data-promote="'+c.id+'" style="flex:1">✅ Confirmar definitiva</button>':"";
  var descBtn=canEdit()&&c.convType==="provisional"?'<button class="btn btn-danger btn-sm" data-descartar="'+c.id+'" style="flex:1">❌ Descartar</button>':"";
  var restoreBtn=canEdit()&&c.convType==="descartada"?'<button class="btn btn-gold btn-sm" data-restore-conv="'+c.id+'" style="flex:1">↩ Restaurar a provisional</button>':"";
  var printBtn='<button class="btn btn-ghost btn-sm btn-print-ficha" style="flex:1">🖨️ Imprimir ficha</button>';
  var editBtn=canEdit()?'<button class="btn btn-ghost btn-sm" data-edit="'+c.id+'" style="flex:1">✎ Editar</button>':"";
  var delBtn=canEdit()?'<button class="btn btn-danger btn-sm" data-del="'+c.id+'" style="flex:1">🗑 Eliminar</button>':"";

  return'<div class="dp-hdr">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'+
    '<div class="dp-badges">'+selBadge(c.selectionType,c.selectionCategory,c.pais)+statusBadge(c.status)+convTypeBadge(c.convType||"provisional")+provAlertBadge(c)+fifaBadge(c)+"</div>"+
    '<span style="font-size:32px;line-height:1">'+getSelFlag(c.selectionType,c.pais)+"</span></div>"+
    '<h2 class="dp-title">'+esc(c.title)+"</h2>"+
    '<p class="dp-sea">Temporada '+c.season+"</p></div>"+
    '<div class="dp-grid">'+
    '<div class="di"><span class="di-l">📅 Período</span><span class="di-v">'+fmtRange(c.startDate,c.endDate)+"</span></div>"+
    (c.rival?'<div class="di"><span class="di-l">🆚 Rival/Torneo</span><span class="di-v">'+esc(c.rival)+"</span></div>":"")+
    (c.location?'<div class="di"><span class="di-l">📍 Lugar</span><span class="di-v">'+esc(c.location)+"</span></div>":"")+
    (c.limitDate&&c.convType==="provisional"?'<div class="di"><span class="di-l">⏰ Límite confirmación</span><span class="di-v">'+fmtDateShort(c.limitDate)+"</span></div>":"")+
    "</div>"+
    (function(){
      var items=[];
      // Citación
      if(c.conc&&(c.conc.date||c.conc.time||c.conc.lugar||c.conc.hotel)){
        var h2='<div class="dp-tl-item"><div class="dp-tl-dot dp-tl-dot-cite"></div><div class="dp-tl-type dp-tl-type-cite">Citación</div>';
        if(c.conc.date||c.conc.time)h2+='<div class="dp-tl-date">'+(c.conc.date?fmtDateShort(c.conc.date)+" ":"")+(c.conc.time?c.conc.time+"h":"")+"</div>";
        if(c.conc.lugar)h2+='<div class="dp-tl-detail">'+esc(c.conc.lugar)+"</div>";
        if(c.conc.hotel)h2+='<div class="dp-tl-detail">🏨 '+esc(c.conc.hotel)+"</div>";
        if(c.conc.notas)h2+='<div class="dp-tl-note">'+esc(c.conc.notas)+"</div>";
        h2+="</div>";items.push({sort:c.conc.date||c.startDate||"0",html:h2});
      }
      // Traslado
      if(c.traslado&&(c.traslado.date||c.traslado.time||c.traslado.desde||c.traslado.transporte||c.traslado.hasta)){
        var h3='<div class="dp-tl-item"><div class="dp-tl-dot dp-tl-dot-trasl"></div><div class="dp-tl-type dp-tl-type-trasl">Traslado</div>';
        if(c.traslado.date||c.traslado.time)h3+='<div class="dp-tl-date">'+(c.traslado.date?fmtDateShort(c.traslado.date)+" ":"")+(c.traslado.time?c.traslado.time+"h":"")+"</div>";
        if(c.traslado.desde||c.traslado.hasta)h3+='<div class="dp-tl-detail">'+(c.traslado.desde?esc(c.traslado.desde):"")+(c.traslado.desde&&c.traslado.hasta?" → ":"")+(c.traslado.hasta?esc(c.traslado.hasta):"")+"</div>";
        if(c.traslado.transporte)h3+='<div class="dp-tl-detail">'+esc(c.traslado.transporte)+"</div>";
        if(c.traslado.hotel)h3+='<div class="dp-tl-detail">🏨 '+esc(c.traslado.hotel)+"</div>";
        if(c.traslado.notas)h3+='<div class="dp-tl-note">'+esc(c.traslado.notas)+"</div>";
        h3+="</div>";items.push({sort:c.traslado.date||c.startDate||"1",html:h3});
      }
      // Partidos / Entrenamientos
      if(c.matches&&c.matches.length){
        c.matches.forEach(function(m){
          var dt=m.date?new Date(m.date+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short",day:"2-digit",month:"short"}):"";
          var h4='<div class="dp-tl-item"><div class="dp-tl-dot dp-tl-dot-match"></div><div class="dp-tl-type dp-tl-type-match">'+matchIcon(m.matchType)+" "+(m.matchType==="entrenamiento"?"Entrenamiento":(m.matchType==="oficial"?"Partido oficial":"Partido amistoso"))+"</div>";
          if(dt)h4+='<div class="dp-tl-date">'+dt+(m.time?" · "+m.time+"h":"")+"</div>";
          if(m.rival)h4+='<div class="dp-tl-detail">'+(m.matchType==="entrenamiento"?"":"vs ")+esc(m.rival)+"</div>";
          h4+="</div>";items.push({sort:m.date||"5",html:h4});
        });
      }
      // Vuelta
      if(c.vuelta&&(c.vuelta.date||c.vuelta.time||c.vuelta.desde||c.vuelta.transporte||c.vuelta.hasta)){
        var h5='<div class="dp-tl-item"><div class="dp-tl-dot dp-tl-dot-vuelta"></div><div class="dp-tl-type dp-tl-type-vuelta">Vuelta</div>';
        if(c.vuelta.date||c.vuelta.time)h5+='<div class="dp-tl-date">'+(c.vuelta.date?fmtDateShort(c.vuelta.date)+" ":"")+(c.vuelta.time?c.vuelta.time+"h":"")+"</div>";
        if(c.vuelta.desde||c.vuelta.hasta)h5+='<div class="dp-tl-detail">'+(c.vuelta.desde?esc(c.vuelta.desde):"")+(c.vuelta.desde&&c.vuelta.hasta?" → ":"")+(c.vuelta.hasta?esc(c.vuelta.hasta):"")+"</div>";
        if(c.vuelta.transporte)h5+='<div class="dp-tl-detail">'+esc(c.vuelta.transporte)+"</div>";
        if(c.vuelta.notas)h5+='<div class="dp-tl-note">'+esc(c.vuelta.notas)+"</div>";
        h5+="</div>";items.push({sort:c.vuelta.date||c.endDate||"9",html:h5});
      }
      // Llegada a Madrid
      if(c.llegada&&(c.llegada.date||c.llegada.time||c.llegada.lugar)){
        var h6='<div class="dp-tl-item"><div class="dp-tl-dot" style="border-color:#10B981;background:rgba(16,185,129,.12)"></div><div class="dp-tl-type" style="color:#34D399">🏁 Llegada a Madrid</div>';
        if(c.llegada.date||c.llegada.time)h6+='<div class="dp-tl-date">'+(c.llegada.date?fmtDateShort(c.llegada.date)+" ":"")+(c.llegada.time?c.llegada.time+"h":"")+"</div>";
        if(c.llegada.lugar)h6+='<div class="dp-tl-detail">'+esc(c.llegada.lugar)+"</div>";
        if(c.llegada.notas)h6+='<div class="dp-tl-note">'+esc(c.llegada.notas)+"</div>";
        h6+="</div>";items.push({sort:(c.llegada.date||c.endDate||"9")+"z",html:h6});
      }
      if(!items.length)return"";
      items.sort(function(a,b){return a.sort.localeCompare(b.sort);});
      return'<h4 class="dp-st">📋 Logística y partidos</h4><div class="dp-timeline">'+items.map(function(i){return i.html;}).join("")+"</div>";
    })()+
    '<div style="margin-bottom:16px"><h4 class="dp-st">👕 Jugadores convocados ('+pc+")</h4><ul class=\"pl\">"+rows+"</ul></div>"+
    (c.notes?'<div class="dp-notes"><h4 class="dp-st">📝 Observaciones</h4><p class="notes-t">'+esc(c.notes)+"</p></div>":"")+
    '<div class="dp-act" style="display:flex;gap:8px;flex-wrap:wrap">'+promBtn+descBtn+restoreBtn+printBtn+editBtn+delBtn+"</div>";
}

// ── STATE ──
var _savedView="agenda";try{_savedView=localStorage.getItem("rmconv_view")||"agenda";}catch(e){}
var S={view:_savedView,season:"2025-26",filterType:null,agendaView:"fichas",finOpen:false,editingId:null,planView:"bloques",intlPais:null,statsSearch:"",statsPlayer:null,jugTeam:"",jugSearch:"",calPlanTab:"calendario",fechaTipo:"",calMode:"vertical",calFilterTipo:[],calFilterSel:[],calFilterCat:[],calClasicoYear:null,calClasicoMonth:null};

function renderSeasonSel(){
  var opts=_seasons.filter(function(s){return s!=="2025-26";}).slice().reverse().map(function(s){return'<option value="'+s+'"'+(s===S.season?" selected":"")+">"+s+"</option>";}).join("");
  $("season-sel").innerHTML='<select class="season-sel" id="ss">'+opts+"</select>";
  $("ss").addEventListener("change",function(e){S.season=e.target.value;route(S.view);});
}

function makeTabs(cats,activeCat){
  var tabs=cats.map(function(c){return'<button class="tbtn'+(c===activeCat?" on":"")+'" data-c="'+c+'">'+(CAT[c]||c)+"</button>";}).join("");
  return'<div class="tbar-wrap"><button class="tbar-arrow tbar-arrow-l" id="tbar-l">‹</button><div class="tbar" id="tbar-inner">'+tabs+'</div><button class="tbar-arrow tbar-arrow-r" id="tbar-r">›</button></div>';
}
function bindTabs(onSelect){
  var tbar=$("tbar-inner"),btnL=$("tbar-l"),btnR=$("tbar-r");
  if(tbar&&btnL&&btnR){
    function upd(){btnL.disabled=tbar.scrollLeft<=0;btnR.disabled=tbar.scrollLeft+tbar.clientWidth>=tbar.scrollWidth-2;}
    btnL.addEventListener("click",function(){tbar.scrollBy({left:-120,behavior:"smooth"});setTimeout(upd,300);});
    btnR.addEventListener("click",function(){tbar.scrollBy({left:120,behavior:"smooth"});setTimeout(upd,300);});
    tbar.addEventListener("scroll",upd);setTimeout(upd,50);
  }
  document.querySelectorAll(".tbtn").forEach(function(b){
    b.addEventListener("click",function(){
      document.querySelectorAll(".tbtn").forEach(function(x){x.classList.remove("on");});
      b.classList.add("on");
      if(onSelect)onSelect(b.dataset.c);
    });
  });
}

function route(v){
  S.view=v;
  try{localStorage.setItem("rmconv_view",v);}catch(e){}
  document.querySelectorAll(".nb").forEach(function(b){b.classList.toggle("active",b.dataset.v===v);});
  document.querySelectorAll(".nb-new,.nb[data-v='jugadores']").forEach(function(b){b.style.display=canEdit()?"":"none";});
  var views={
    agenda:renderAgenda,
    nueva:renderNueva,
    madrilena:function(){renderSel("madrilena");},
    espanola:function(){renderSel("espanola");},
    internacional:renderIntl,
    calendario:renderCalendarioPlan,
    planificacion:renderCalendarioPlan,
    jugadores:renderJugadores,
    stats:renderStats
  };
  (views[v]||renderAgenda)();
}

document.querySelector(".nav").addEventListener("click",function(e){
  var btn=e.target.closest("[data-v]");
  if(btn)route(btn.dataset.v);
});

function bindCards(){
  document.querySelectorAll(".cc[data-id]").forEach(function(el){
    el.addEventListener("click",function(){openDetail(el.dataset.id);});
  });
}

// ── DETAIL MODAL ──
function openDetail(id){
  var raw=getCallups_raw();
  var c=null;
  for(var i=0;i<raw.length;i++){if(raw[i].id===id){c=Object.assign({},raw[i],{status:calcStatus(raw[i].startDate,raw[i].endDate)});break;}}
  if(!c)return;
  var ov=document.createElement("div");ov.className="mo";
  ov.innerHTML='<div class="modal modal-tall"><button class="mcl" id="mo-cl">×</button>'+callupDetail(c)+"</div>";
  document.body.appendChild(ov);
  function close(){if(ov.parentNode)ov.parentNode.removeChild(ov);}
  document.getElementById("mo-cl").addEventListener("click",close);
  ov.addEventListener("click",function(e){if(e.target===ov)close();});

  ov.querySelectorAll(".pl-rm-btn").forEach(function(btn){
    btn.addEventListener("click",function(e){
      e.stopPropagation();
      var idx=parseInt(btn.dataset.pidx);
      var conv=null;for(var i=0;i<getCallups_raw().length;i++){if(getCallups_raw()[i].id===id){conv=getCallups_raw()[i];break;}}
      if(!conv||!conv.players)return;
      var pname=conv.players[idx]?conv.players[idx].fullName:"jugador";
      if(!confirm("¿Eliminar a "+pname+" de esta convocatoria?"))return;
      conv.players.splice(idx,1);
      if(window._db&&window._fbUser){var fns=window._fbFns;fns.setDoc(fns.doc(window._db,"callups",id),Object.assign({},conv)).catch(function(e){console.error(e);});}
      toast("🗑 "+pname+" eliminado");close();openDetail(id);
    });
  });

  ov.querySelectorAll(".pl-drop-btn").forEach(function(btn){
    btn.addEventListener("click",function(e){
      e.stopPropagation();
      var idx=parseInt(btn.dataset.pidx);
      var conv=null;for(var i=0;i<getCallups_raw().length;i++){if(getCallups_raw()[i].id===id){conv=getCallups_raw()[i];break;}}
      if(!conv||!conv.players||!conv.players[idx])return;
      var pname=conv.players[idx].fullName;
      var mo2=document.createElement("div");mo2.className="mo";
      mo2.innerHTML='<div class="modal" style="padding-bottom:40px"><button class="mcl" id="dr-close">×</button>'+
        '<div class="mtitle">Descartar jugador</div><p class="msub">'+esc(pname)+' no irá a esta convocatoria.</p>'+
        '<div class="fg"><label class="fl">Motivo</label><select class="fsel" id="dr-reason">'+
        '<option value="no_convocado">No convocado</option>'+
        '<option value="no_liberado">No liberado</option>'+
        '<option value="otros">Otros</option></select></div>'+
        '<div style="display:flex;gap:8px;margin-top:12px">'+
        '<button class="btn btn-ghost btn-sm" id="dr-cancel" style="flex:1">Cancelar</button>'+
        '<button class="btn btn-danger btn-sm" id="dr-ok" style="flex:1">❌ Descartar</button></div></div>';
      document.body.appendChild(mo2);
      function closeMo2(){if(mo2.parentNode)mo2.parentNode.removeChild(mo2);}
      $("dr-close").addEventListener("click",closeMo2);$("dr-cancel").addEventListener("click",closeMo2);
      mo2.addEventListener("click",function(ev){if(ev.target===mo2)closeMo2();});
      $("dr-ok").addEventListener("click",function(){
        var reason=$("dr-reason").value;
        conv.players[idx].dropStatus=reason;
        if(window._db&&window._fbUser){var fns=window._fbFns;fns.setDoc(fns.doc(window._db,"callups",id),Object.assign({},conv)).catch(function(e){console.error(e);});}
        toast("❌ "+pname+" descartado");closeMo2();close();openDetail(id);
      });
    });
  });

  ov.querySelectorAll(".pl-restore-btn").forEach(function(btn){
    btn.addEventListener("click",function(e){
      e.stopPropagation();
      var idx=parseInt(btn.dataset.pidx);
      var conv=null;for(var i=0;i<getCallups_raw().length;i++){if(getCallups_raw()[i].id===id){conv=getCallups_raw()[i];break;}}
      if(!conv||!conv.players||!conv.players[idx])return;
      var pname=conv.players[idx].fullName;
      conv.players[idx].dropStatus="active";
      if(window._db&&window._fbUser){var fns=window._fbFns;fns.setDoc(fns.doc(window._db,"callups",id),Object.assign({},conv)).catch(function(e){console.error(e);});}
      toast("✅ "+pname+" restaurado");close();openDetail(id);
    });
  });

  var editBtn=ov.querySelector("[data-edit]");
  if(editBtn)editBtn.addEventListener("click",function(){
    close();S.editingId=id;route("nueva");
    setTimeout(function(){
      var form=document.getElementById("cf");if(!form)return;
      var rb=form.querySelector('[name="selType"][value="'+c.selectionType+'"]');
      if(rb){rb.checked=true;rb.dispatchEvent(new Event("change"));}
      setTimeout(function(){
        var cat=$("sel-cat");if(cat)cat.value=c.selectionCategory;
        var pf=$("f-pais");if(pf&&c.pais)pf.value=c.pais;
        var pg=$("pais-g");if(pg&&selKey(c.selectionType)==="internacional")pg.style.display="block";
        var fields={title:c.title,startDate:c.startDate,endDate:c.endDate,rival:c.rival||"",location:c.location||"",notes:c.notes||"",convType:c.convType||"provisional",limitDate:c.limitDate||""};
        Object.keys(fields).forEach(function(k){if(fields[k]===undefined||fields[k]===null)return;var el=form.querySelector('[name="'+k+'"]');if(el)el.value=fields[k];});
        if(c.conc){var cf2={concDate:c.conc.date,concTime:c.conc.time,concLugar:c.conc.lugar,concHotel:c.conc.hotel,concNotas:c.conc.notas};Object.keys(cf2).forEach(function(k){if(!cf2[k])return;var el=form.querySelector('[name="'+k+'"]');if(el)el.value=cf2[k];}); }if(c.traslado){var ct={trasladoDesde:c.traslado.desde,trasladoDate:c.traslado.date,trasladoTime:c.traslado.time,trasladoTransporte:c.traslado.transporte,trasladoHasta:c.traslado.hasta,trasladoHotel:c.traslado.hotel,trasladoNotas:c.traslado.notas};Object.keys(ct).forEach(function(k){if(!ct[k])return;var el=form.querySelector('[name="'+k+'"]');if(el)el.value=ct[k];});}
if(c.vuelta){var vf={vueltaDesde:c.vuelta.desde,vueltaDate:c.vuelta.date,vueltaTime:c.vuelta.time,vueltaTransporte:c.vuelta.transporte,vueltaHasta:c.vuelta.hasta,vueltaNotas:c.vuelta.notas};Object.keys(vf).forEach(function(k){if(!vf[k])return;var el=form.querySelector('[name="'+k+'"]');if(el)el.value=vf[k];});}
if(c.llegada){var lf={llegadaDate:c.llegada.date,llegadaTime:c.llegada.time,llegadaLugar:c.llegada.lugar,llegadaNotas:c.llegada.notas};Object.keys(lf).forEach(function(k){if(!lf[k])return;var el=form.querySelector('[name="'+k+'"]');if(el)el.value=lf[k];});}        if(c.matches&&c.matches.length){
          var ml=$("matches-list");if(ml){ml.innerHTML="";
            c.matches.forEach(function(m,i){
              var row=document.createElement("div");row.className="match-row";
              row.innerHTML='<input class="fi" type="date" name="mdate_'+i+'" value="'+(m.date||"")+'" style="flex:1.2"/>'+
                '<input class="fi" type="time" name="mtime_'+i+'" value="'+(m.time||"")+'" style="flex:.8"/>'+
                '<input class="fi" type="text" name="mrival_'+i+'" value="'+esc(m.rival||"")+'" placeholder="Rival" style="flex:1.5"/>'+
                '<select class="fsel" name="mtype_'+i+'" style="flex:.8;min-height:38px;font-size:12px;padding:6px 28px 6px 8px">'+
                '<option value="amistoso"'+(m.matchType==="amistoso"?" selected":"")+'>⚽ Amistoso</option>'+
                '<option value="oficial"'+(m.matchType==="oficial"?" selected":"")+'>🏆 Oficial</option>'+
                '<option value="entrenamiento"'+(m.matchType==="entrenamiento"?" selected":"")+'>🏋 Entrenamiento</option></select>'+
                '<button type="button" class="btn-rm">×</button>';
              row.querySelector(".btn-rm").addEventListener("click",function(){row.remove();});
              ml.appendChild(row);
            });
          }
        }
        if(c.players&&c.players.length){
          c.players.forEach(function(cp){var cb=form.querySelector('[name="pids"][value="'+cp.playerId+'"]');if(cb){cb.checked=true;cb.dispatchEvent(new Event("change"));}});
        }
        var sb=form.querySelector('[type="submit"]');if(sb)sb.textContent="💾 Guardar";
        var vt=document.querySelector(".vt");if(vt)vt.textContent="Editar Convocatoria";
        if(sb)sb.scrollIntoView({behavior:"smooth",block:"center"});
      },50);
    },50);
  });

  var promBtn2=ov.querySelector("[data-promote]");
  if(promBtn2)promBtn2.addEventListener("click",function(){
    var conv=null;for(var i=0;i<getCallups_raw().length;i++){if(getCallups_raw()[i].id===id){conv=getCallups_raw()[i];break;}}
    if(!conv)return;
    conv.convType="definitiva";
    if(window._db&&window._fbUser){var fns=window._fbFns;fns.setDoc(fns.doc(window._db,"callups",id),Object.assign({},conv)).catch(function(e){console.error(e);});}
    toast("✅ Confirmada como definitiva");close();openDetail(id);
  });

  var descBtn2=ov.querySelector("[data-descartar]");
  if(descBtn2)descBtn2.addEventListener("click",function(){
    if(!confirm("¿Descartar esta convocatoria? Los jugadores no han sido seleccionados."))return;
    var conv=null;for(var i=0;i<getCallups_raw().length;i++){if(getCallups_raw()[i].id===id){conv=getCallups_raw()[i];break;}}
    if(!conv)return;
    conv.convType="descartada";
    if(window._db&&window._fbUser){var fns=window._fbFns;fns.setDoc(fns.doc(window._db,"callups",id),{convType:"descartada"},{merge:true}).catch(function(e){console.error(e);});}
    toast("❌ Convocatoria descartada");close();route(S.view);
  });

  var restoreConvBtn=ov.querySelector("[data-restore-conv]");
  if(restoreConvBtn)restoreConvBtn.addEventListener("click",function(){
    var conv=null;for(var i=0;i<getCallups_raw().length;i++){if(getCallups_raw()[i].id===id){conv=getCallups_raw()[i];break;}}
    if(!conv)return;
    conv.convType="provisional";
    if(window._db&&window._fbUser){var fns=window._fbFns;fns.setDoc(fns.doc(window._db,"callups",id),{convType:"provisional"},{merge:true}).catch(function(e){console.error(e);});}
    toast("↩ Restaurada a provisional");close();openDetail(id);
  });

  var delBtn=ov.querySelector("[data-del]");
  if(delBtn)delBtn.addEventListener("click",function(){
    if(!confirm("¿Eliminar \""+c.title+"\"?"))return;
    deleteCallup(id,function(){close();toast("🗑 Eliminada");route(S.view);});
  });

  var printFichaBtn=ov.querySelector(".btn-print-ficha");
  if(printFichaBtn)printFichaBtn.addEventListener("click",function(){
    var win=window.open("","_blank","width=800,height=600");
    var sel=SELS[selKey(c.selectionType)];
    var col=(sel&&sel.colors&&sel.colors[c.selectionCategory])?sel.colors[c.selectionCategory]:{badge:"#2563eb"};
    var activePlayers=(c.players||[]).filter(function(p){return !p.dropStatus||p.dropStatus==="active";});
    var droppedPlayers=(c.players||[]).filter(function(p){return p.dropStatus&&p.dropStatus!=="active";});
    var playersHtml=activePlayers.map(function(p,i){
      return '<div class="pl-row"><span class="pl-num">'+(i+1)+'</span><span class="pl-name">'+esc(p.fullName)+'</span><span class="pl-team">'+esc(p.teamName)+'</span></div>';
    }).join("");
    if(droppedPlayers.length){
      playersHtml+='<div class="pl-dropped-hdr">❌ No convocados / No liberados</div>';
      playersHtml+=droppedPlayers.map(function(p){
        var lbl=p.dropStatus==="no_convocado"?"No convocado":p.dropStatus==="no_liberado"?"No liberado":"Otros";
        return '<div class="pl-row pl-dropped"><span class="pl-name" style="text-decoration:line-through;color:#c00">'+esc(p.fullName)+'</span><span class="pl-team">'+esc(p.teamName)+' — '+lbl+'</span></div>';
      }).join("");
    }
    function logBlock(label,ico,obj){
      if(!obj)return"";
      var rows="";
      if(obj.date||obj.time) rows+='<div class="log-row"><span class="log-l">Fecha y hora</span><span class="log-v">'+(obj.date?fmtDateShort(obj.date)+" ":"")+(obj.time?obj.time+"h":"")+"</span></div>";
      if(obj.lugar) rows+='<div class="log-row"><span class="log-l">Lugar</span><span class="log-v">'+esc(obj.lugar)+"</span></div>";
      if(obj.hotel) rows+='<div class="log-row"><span class="log-l">🏨 Alojamiento</span><span class="log-v">'+esc(obj.hotel)+"</span></div>";
      if(obj.transporte) rows+='<div class="log-row"><span class="log-l">Transporte</span><span class="log-v">'+esc(obj.transporte)+"</span></div>";
      if(!rows)return"";
      return '<div class="log-block"><div class="log-title">'+ico+" "+label+"</div>"+rows+"</div>";
    }
    var matchesHtml="";
    if(c.matches&&c.matches.length){
      matchesHtml='<div class="section-title">⚽ Partidos / Entrenamientos</div>';
      matchesHtml+=c.matches.map(function(m){
        var dt=m.date?new Date(m.date+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short",day:"2-digit",month:"short"}):"Fecha TBD";
        return '<div class="match-row">'+matchIcon(m.matchType)+' <strong>'+(m.matchType==="entrenamiento"?"":"vs ")+esc(m.rival||"Por confirmar")+'</strong> — '+dt+(m.time?" · "+m.time+"h":"")+"</div>";
      }).join("");
    }
    win.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>'+esc(c.title)+'</title><style>'+
      '*{box-sizing:border-box;margin:0;padding:0}'+
      'body{font-family:Arial,sans-serif;font-size:10pt;color:#000;padding:16px 20px}'+
      '.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid '+col.badge+';padding-bottom:10px;margin-bottom:14px}'+
      '.hdr-left{}'+
      '.title{font-size:16pt;font-weight:700;color:'+col.badge+';margin-bottom:3px}'+
      '.meta{font-size:9pt;color:#555}'+
      '.badge{display:inline-block;background:'+col.badge+';color:#fff;padding:2px 8px;border-radius:10px;font-size:8pt;font-weight:700;margin-right:4px}'+
      '.rm-logo{font-size:11pt;font-weight:700;color:#2563eb;text-align:right}'+
      '.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}'+
      '.log-block{border:1px solid #ddd;border-radius:4px;padding:7px 9px;border-left:3px solid '+col.badge+'}'+
      '.log-title{font-size:8pt;font-weight:700;color:'+col.badge+';text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}'+
      '.log-row{display:flex;gap:8px;margin-bottom:3px;font-size:9pt}'+
      '.log-l{color:#888;min-width:110px;font-size:8pt;font-weight:600;text-transform:uppercase}'+
      '.log-v{color:#000;flex:1}'+
      '.section-title{font-size:9pt;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.5px;margin:10px 0 6px;border-bottom:1px solid #ddd;padding-bottom:3px}'+
      '.match-row{font-size:9pt;padding:3px 0;border-bottom:1px solid #eee}'+
      '.players-grid{columns:2;column-gap:14px;margin-top:6px}'+
      '.pl-row{display:flex;gap:6px;align-items:baseline;padding:3px 0;border-bottom:1px solid #eee;break-inside:avoid;font-size:9pt}'+
      '.pl-num{color:'+col.badge+';font-weight:700;min-width:20px;font-size:8pt}'+
      '.pl-name{flex:1;font-weight:600}'+
      '.pl-team{color:#888;font-size:8pt}'+
      '.pl-dropped-hdr{font-size:8pt;font-weight:700;color:#c00;text-transform:uppercase;margin:8px 0 4px;letter-spacing:.5px}'+
      '.pl-dropped .pl-name{text-decoration:line-through;color:#c00}'+
      '.notes{background:#f9f9f9;border:1px solid #ddd;border-radius:4px;padding:8px;font-size:9pt;margin-top:10px}'+
      '.footer{margin-top:14px;padding-top:6px;border-top:1px solid #ddd;font-size:8pt;color:#888;display:flex;justify-content:space-between}'+
      '@media print{body{padding:10px 14px}@page{margin:1cm}}'+
      '</style></head><body>'+
      '<div class="hdr">'+
        '<div class="hdr-left">'+
          '<div class="title">'+esc(c.title)+'</div>'+
          '<div class="meta">'+
            '<span class="badge">'+(CAT[c.selectionCategory]||c.selectionCategory)+(sel?" "+sel.short:"")+'</span>'+
            (c.pais?'<span class="badge">'+getFlag(c.pais)+" "+esc(c.pais)+'</span>':"")+
            " "+fmtRange(c.startDate,c.endDate)+
          '</div>'+
        '</div>'+
        '<div class="rm-logo">⚽ Real Madrid<br/><span style="font-weight:400;font-size:9pt;color:#888">Temporada '+c.season+'</span></div>'+
      '</div>'+
      (c.rival||c.location?'<div class="section-title">📋 Datos generales</div>'+
        (c.rival?'<div class="log-row"><span class="log-l">Rival / Torneo</span><span class="log-v">'+esc(c.rival)+'</span></div>':"")+
        (c.location?'<div class="log-row"><span class="log-l">Lugar concentración</span><span class="log-v">'+esc(c.location)+'</span></div>':"")+
      "":"")+
      '<div class="grid">'+
        logBlock("Citación","📍",c.conc)+
        logBlock("Traslado / Salida","✈️",c.traslado)+
        logBlock("Vuelta","🔙",c.vuelta)+
      '</div>'+
      matchesHtml+
      '<div class="section-title">👕 Jugadores convocados ('+activePlayers.length+')</div>'+
      '<div class="players-grid">'+playersHtml+'</div>'+
      (c.notes?'<div class="notes"><strong>📝 Observaciones:</strong> '+esc(c.notes)+'</div>':"")+
      '<div class="footer"><span>Real Madrid Cantera · '+esc(c.title)+'</span><span>Generado '+new Date().toLocaleDateString("es-ES")+'</span></div>'+
      '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(function(){win.print();},400);
  });
}

// ── AGENDA ──
function agendaBannerHtml(){
  if(!S.agendaMonths)S.agendaMonths=1;
  if(!S.agendaFilterTipos)S.agendaFilterTipos=[];
  if(S.agendaCollapseCurso===undefined)S.agendaCollapseCurso=false;
  if(S.agendaCollapseProx===undefined)S.agendaCollapseProx=false;
  var today=new Date();today.setHours(0,0,0,0);
  var todayStr=today.getFullYear()+"-"+String(today.getMonth()+1).padStart(2,"0")+"-"+String(today.getDate()).padStart(2,"0");
  var monthEnd=new Date(today);monthEnd.setDate(monthEnd.getDate()+30*S.agendaMonths);
  var monthEndStr=monthEnd.getFullYear()+"-"+String(monthEnd.getMonth()+1).padStart(2,"0")+"-"+String(monthEnd.getDate()).padStart(2,"0");

  var allCallups=getCallups({season:S.season});
  var allFechasRaw=getRefDates_raw().filter(function(r){return!!r.startDate;});
  var tipoList=getOrderedTipos();
  var allFechas=S.agendaFilterTipos.length?allFechasRaw.filter(function(r){return S.agendaFilterTipos.indexOf((r.tipo||"").trim())!==-1;}):allFechasRaw;
  var activeFechas=allFechas.filter(function(r){return r.startDate<=todayStr&&(r.endDate||r.startDate)>=todayStr;}).sort(function(a,b){return getTipoOrder(a.tipo)-getTipoOrder(b.tipo);});

  var activeCallups=allCallups.filter(function(c){var end=c.endDate||c.startDate;return c.status!=="finalizada"&&c.startDate<=todayStr&&end>=todayStr;});
  var cursoRows=activeCallups.map(function(c){
    return'<div class="agenda-upcoming-row" data-openid="'+c.id+'">'+
      '<span class="agenda-banner-dot" style="background:#1A3A8F"></span>'+
      '<span class="agenda-upcoming-title">'+esc(c.title)+"</span>"+
      '<span class="agenda-upcoming-date">'+fmtRange(c.startDate,c.endDate)+"</span>"+
      "</div>";
  }).join("")+activeFechas.map(function(r){
    var label=r.cat?(CAT[r.cat]||r.cat):(r.tipo||"Fecha");
    return'<div class="agenda-upcoming-row">'+
      '<span class="agenda-banner-dot" style="background:'+(r.color||"#888")+'"></span>'+
      '<span class="agenda-upcoming-title">'+esc(label)+"</span>"+
      '<span class="agenda-upcoming-date">'+fmtRange(r.startDate,r.endDate)+"</span>"+
      "</div>";
  }).join("");
  var cursoHtml=(activeCallups.length||activeFechas.length)?'<div class="agenda-upcoming" style="margin-bottom:10px">'+
    '<div class="agenda-upcoming-hdr" data-toggle-curso="1" style="cursor:pointer;display:flex;align-items:center;gap:6px">'+
    '<span class="fecha-cat-group-chev">'+(S.agendaCollapseCurso?"▶":"▼")+"</span>"+
    '<span>🔴 EN CURSO</span></div>'+
    (S.agendaCollapseCurso?"":cursoRows)+
    "</div>":"";

  var items=[];
  allCallups.forEach(function(c){
    if(c.status==="finalizada")return;
    var end=c.endDate||c.startDate;
    if(!c.startDate||end<todayStr||c.startDate>monthEndStr)return;
    if(c.startDate<=todayStr&&end>=todayStr)return;
    items.push({kind:"callup",startDate:c.startDate,endDate:end,title:c.title,id:c.id,color:"#1A3A8F"});
  });
  allFechas.forEach(function(r){
    var end=r.endDate||r.startDate;
    if(end<todayStr||r.startDate>monthEndStr)return;
    if(r.startDate<=todayStr&&end>=todayStr)return;
    var label=r.cat?(CAT[r.cat]||r.cat):(r.tipo||"Fecha");
    items.push({kind:"fecha",tipo:r.tipo,startDate:r.startDate,endDate:end,title:label,color:r.color||"#888"});
  });
  items.sort(function(a,b){
    return a.startDate.localeCompare(b.startDate)||
      (a.kind==="callup"?-1:b.kind==="callup"?1:getTipoOrder(a.tipo)-getTipoOrder(b.tipo));
  });

  var tipoFilterHtml=tipoList.length?'<div class="agenda-tipo-filter">'+
    tipoList.map(function(t){
      var on=S.agendaFilterTipos.indexOf(t)!==-1;
      return'<button class="agenda-tipo-btn'+(on?" on":"")+'" data-agtipo="'+esc(t)+'">'+esc(t)+"</button>";
    }).join("")+
    '<button class="agenda-tipo-btn agenda-tipo-clear" data-agtipo-clear="1"'+(S.agendaFilterTipos.length?"":' style="visibility:hidden;pointer-events:none"')+'>✕</button>'+
    "</div>":"";

  var rightBlock='<div class="agenda-hdr-right">'+
    '<div class="agenda-months-sel">'+
    [1,2,3].map(function(n){return'<button class="agenda-months-btn'+(S.agendaMonths===n?" on":"")+'" data-months="'+n+'">'+n+"m</button>";}).join("")+
    "</div>"+
    tipoFilterHtml+
    "</div>";
  var listHtml='<div class="agenda-upcoming"><div class="agenda-upcoming-hdr" style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">'+
    '<span style="padding-top:6px;cursor:pointer;display:flex;align-items:center;gap:6px" data-toggle-prox="1">'+
    '<span class="fecha-cat-group-chev">'+(S.agendaCollapseProx?"▶":"▼")+"</span>PRÓXIMAMENTE</span>"+
    rightBlock+
    "</div>"+
    (S.agendaCollapseProx?"":(items.length?items.map(function(it){
      return'<div class="agenda-upcoming-row"'+(it.kind==="callup"?' data-openid="'+it.id+'"':"")+'>'+
        '<span class="agenda-banner-dot" style="background:'+it.color+'"></span>'+
        '<span class="agenda-upcoming-title">'+esc(it.title)+"</span>"+
        '<span class="agenda-upcoming-date">'+fmtRange(it.startDate,it.endDate)+"</span>"+
        "</div>";
    }).join(""):'<p class="msub" style="padding:10px 14px">Nada próximamente</p>'))+
    "</div>";

  if(!cursoHtml&&!listHtml)return"";
  return cursoHtml+listHtml;
}

function renderAgenda(viewMode){
  viewMode=viewMode||S.agendaView||"fichas";S.agendaView=viewMode;
  if(!S.agendaTab)S.agendaTab="conv";
  if(S.showDescartadas===undefined)S.showDescartadas=false;
  if(!S.filterCats)S.filterCats=[];

  var tabsHtml='<div class="pill-tabs" style="margin-bottom:14px">'+
    '<button class="pill-btn'+(S.agendaTab==="conv"?" on":"")+'" id="atab-conv">📋 Convocatorias</button>'+
    '<button class="pill-btn'+(S.agendaTab==="fechas"?" on":"")+'" id="atab-fechas">🗓️ Fechas</button>'+
    "</div>";

  if(S.agendaTab==="fechas"){
    var h0='<div class="vh" style="margin-bottom:12px"><h1 class="vt">Agenda</h1></div>'+tabsHtml+agendaBannerHtml();
    $("main").innerHTML=h0;
    document.querySelectorAll("[data-openid]").forEach(function(b){b.addEventListener("click",function(){openDetail(b.dataset.openid);});});
    document.querySelectorAll(".agenda-months-btn").forEach(function(b){b.addEventListener("click",function(){S.agendaMonths=parseInt(b.dataset.months,10);renderAgenda(S.agendaView);});});
    document.querySelectorAll("[data-agtipo]").forEach(function(b){b.addEventListener("click",function(){
      var t=b.dataset.agtipo;var i=S.agendaFilterTipos.indexOf(t);
      if(i===-1)S.agendaFilterTipos.push(t);else S.agendaFilterTipos.splice(i,1);
      renderAgenda(S.agendaView);
    });});
    var agClear=document.querySelector("[data-agtipo-clear]");if(agClear)agClear.addEventListener("click",function(){S.agendaFilterTipos=[];renderAgenda(S.agendaView);});
    var toggleCurso=document.querySelector("[data-toggle-curso]");if(toggleCurso)toggleCurso.addEventListener("click",function(){S.agendaCollapseCurso=!S.agendaCollapseCurso;renderAgenda(S.agendaView);});
    var toggleProx=document.querySelector("[data-toggle-prox]");if(toggleProx)toggleProx.addEventListener("click",function(){S.agendaCollapseProx=!S.agendaCollapseProx;renderAgenda(S.agendaView);});
    $("atab-conv").addEventListener("click",function(){S.agendaTab="conv";renderAgenda(S.agendaView);});
    $("atab-fechas").addEventListener("click",function(){S.agendaTab="fechas";renderAgenda(S.agendaView);});
    return;
  }

  var all=sortDate(getCallups({season:S.season}),"asc");
  var descartadas=all.filter(function(c){return c.convType==="descartada";});
  var visible=S.showDescartadas?all:all.filter(function(c){return c.convType!=="descartada";});
  var filtered=S.filterType?visible.filter(function(c){return selKey(c.selectionType)===S.filterType;}):visible;
  if(S.filterCats.length)filtered=filtered.filter(function(c){return S.filterCats.indexOf(c.selectionCategory)!==-1;});
  var up=filtered.filter(function(c){return c.status!=="finalizada";});
  var done=sortDate(filtered.filter(function(c){return c.status==="finalizada";}),"asc");
  // Build category pills — always visible, collected from all visible convocatorias
  var allCatsSet={};
  visible.forEach(function(c){if(c.selectionCategory)allCatsSet[c.selectionCategory]=true;});
  var catOrder=["sub12","sub14","sub15","sub16","sub17","sub18","sub19","sub20","sub21","abs"];
  var allCats=catOrder.filter(function(c){return allCatsSet[c];});
  var catPills="";
  if(allCats.length>1){
    catPills='<div class="fb" style="margin-top:-8px">'+
      allCats.map(function(c){var isOn=S.filterCats.indexOf(c)!==-1;return'<button class="fbtn'+(isOn?" on":"")+'" data-cat="'+c+'">'+(CAT[c]||c)+"</button>";}).join("")+
      (S.filterCats.length?'<button class="fbtn" data-cat-clear="" style="border-style:dashed;color:var(--text-muted)">✕ Limpiar</button>':"")+
      '</div>';
  }
  var h='<div class="vh" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:8px;justify-content:space-between">'+
    '<h1 class="vt">Agenda</h1>'+
    '<div class="view-toggle">'+
    '<button class="vtbtn'+(viewMode==="fichas"?" on":"")+'" data-vm="fichas">⊢□ Fichas</button>'+
    '<button class="vtbtn'+(viewMode==="tabla"?" on":"")+'" data-vm="tabla">≡ Tabla</button>'+
    '</div>'+
    '<button class="btn-print" id="btn-print-agenda">🖨️</button>'+
    '</div></div>'+tabsHtml+
    '<div class="fb">'+
    '<button class="fbtn'+(!S.filterType?" on":"")+'" data-f="">Todas</button>'+
    '<button class="fbtn fbtn-mad'+(S.filterType==="madrilena"?" on":"")+'" data-f="madrilena"><img src="https://raw.githubusercontent.com/PabliVM/selecciones/main/MADRID.png" style="width:14px;height:10px;object-fit:cover;border-radius:1px;vertical-align:middle"/> RFFM</button>'+
    '<button class="fbtn fbtn-esp'+(S.filterType==="espanola"?" on":"")+'" data-f="espanola"><img src="https://raw.githubusercontent.com/PabliVM/selecciones/main/Espa%C3%B1a.png" style="width:14px;height:10px;object-fit:cover;border-radius:1px;vertical-align:middle"/> RFEF</button>'+
    '<button class="fbtn fbtn-int'+(S.filterType==="internacional"?" on":"")+'" data-f="internacional">🌍 OTRAS</button>'+
    (descartadas.length?'<button class="fbtn'+(S.showDescartadas?" on":"")+'" id="btn-show-desc" style="border-color:rgba(239,68,68,.4);'+(S.showDescartadas?"background:rgba(239,68,68,.15);color:#EF4444":"")+'">❌ Descartadas ('+descartadas.length+')</button>':"")+
    '</div>'+catPills;

  if(!filtered.length){h+=emptyState("Sin convocatorias en "+S.season,"📋");}
  else if(viewMode==="tabla"){
    var thead='<thead><tr><th style="width:44px"></th><th>Cat.</th><th>Estado</th><th>Jugadores</th><th class="th-ida">📍 Citación</th><th class="th-ida">✈️ Traslado</th><th class="th-vuelta">🔙 Vuelta</th><th class="th-matches">⚽ Partidos</th></tr></thead>';
    if(up.length)h+='<div class="tabla-wrap"><table class="tabla">'+thead+'<tbody>'+up.map(callupTableRow).join("")+"</tbody></table></div>";
    if(done.length)h+='<details class="fin-details"'+(S.finOpen?" open":"")+'><summary class="fin-summary"><span class="fin-summary__label">Finalizadas</span><span class="fin-summary__count">'+done.length+'</span></summary><div style="margin-top:8px"><div class="tabla-wrap"><table class="tabla">'+thead+'<tbody>'+done.map(callupTableRow).join("")+"</tbody></table></div></div></details>";
  } else {
    if(up.length)h+='<h2 class="st">Próximas y en curso</h2><div class="cl">'+up.map(callupCard).join("")+"</div>";
    if(done.length)h+='<details class="fin-details"'+(S.finOpen?" open":"")+'><summary class="fin-summary"><span class="fin-summary__label">Finalizadas</span><span class="fin-summary__count">'+done.length+'</span></summary><div class="cl cl-past" style="margin-top:10px">'+done.map(callupCard).join("")+"</div></details>";
  }
  $("main").innerHTML=h;

  var det=$("main").querySelector(".fin-details");
  if(det)det.addEventListener("toggle",function(){S.finOpen=det.open;});
  if(viewMode==="fichas")bindCards();
  else document.querySelectorAll(".trow").forEach(function(row){row.addEventListener("click",function(){openDetail(row.dataset.id);});});
  document.querySelectorAll("[data-f]").forEach(function(b){b.addEventListener("click",function(){S.filterType=b.dataset.f||null;S.filterCats=[];renderAgenda(S.agendaView);});});
  $("atab-conv").addEventListener("click",function(){S.agendaTab="conv";renderAgenda(S.agendaView);});
  $("atab-fechas").addEventListener("click",function(){S.agendaTab="fechas";renderAgenda(S.agendaView);});
  document.querySelectorAll("[data-cat]").forEach(function(b){b.addEventListener("click",function(){var cat=b.dataset.cat;if(!cat)return;var idx=S.filterCats.indexOf(cat);if(idx===-1)S.filterCats.push(cat);else S.filterCats.splice(idx,1);renderAgenda(S.agendaView);});});
  document.querySelectorAll("[data-cat-clear]").forEach(function(b){b.addEventListener("click",function(){S.filterCats=[];renderAgenda(S.agendaView);});});
  document.querySelectorAll("[data-vm]").forEach(function(b){b.addEventListener("click",function(){renderAgenda(b.dataset.vm);});});
  var btnDesc=document.getElementById("btn-show-desc");
  if(btnDesc)btnDesc.addEventListener("click",function(){S.showDescartadas=!S.showDescartadas;renderAgenda(S.agendaView);});

  var btnPrint=document.getElementById("btn-print-agenda");
  if(btnPrint)btnPrint.addEventListener("click",function(){
    var det=document.querySelector(".fin-details");
    if(det&&!det.open)det.open=true;
    if(viewMode==="fichas") document.querySelectorAll(".cl").forEach(function(el){el.classList.add("print-2col");});
    setTimeout(function(){
      window.print();
      if(viewMode==="fichas") document.querySelectorAll(".cl").forEach(function(el){el.classList.remove("print-2col");});
    },100);
  });
}

function renderSel(type){
  if(type==="internacional"){renderIntl();return;}
  var sel=SELS[type];
  var allC=sortDate(getCallups({season:S.season,type:type}),"desc");
  var activeCats=["todas"].concat(sel.cats);
  $("main").innerHTML='<div class="vh"><h1 class="vt">'+sel.label+"</h1></div>"+makeTabs(activeCats,"todas")+
    '<div id="catc">'+(allC.length?'<div class="cl">'+allC.map(callupCard).join("")+"</div>":emptyState("Sin convocatorias","📋"))+"</div>";
  bindTabs(function(cat){
    var cs=cat==="todas"?allC:sortDate(getCallups({season:S.season,type:type,cat:cat}),"desc");
    $("catc").innerHTML=cat==="todas"?(cs.length?'<div class="cl">'+cs.map(callupCard).join("")+"</div>":emptyState("Sin convocatorias","📋")):renderCatCallups(cs,cat);
    bindCards();
  });
  bindCards();
}
function renderCatCallups(cs,cat){
  var f=cs.filter(function(c){return c.selectionCategory===cat||(cat==="abs"&&!c.selectionCategory);});
  return f.length?'<div class="cl">'+f.map(callupCard).join("")+"</div>":emptyState("Sin convocatorias para "+(CAT[cat]||cat),"📋");
}

function renderIntl(){
  var allC=sortDate(getCallups({season:S.season,type:"internacional"}),"desc");
  var paisList=[],paisMap={};
  allC.forEach(function(c){var p=c.pais||"Sin país";if(!paisMap[p])paisMap[p]=[];if(paisList.indexOf(p)===-1)paisList.push(p);paisMap[p].push(c);});
  paisList.sort();
  if(!S.intlPais||paisList.indexOf(S.intlPais)===-1)S.intlPais=paisList[0]||null;

  function renderPaisContent(pais){
    if(!pais)return emptyState("Sin selecciones internacionales","🌍");
    var cs=paisMap[pais]||[];
    var cats=[];cs.forEach(function(c){if(cats.indexOf(c.selectionCategory)===-1)cats.push(c.selectionCategory);});
    cats.sort(function(a,b){var o=["sub16","sub17","sub18","sub19","sub20","sub21","abs"];return o.indexOf(a)-o.indexOf(b);});
    if(cats.length<=1)return cs.length?'<div class="cl">'+cs.map(callupCard).join("")+"</div>":emptyState("Sin convocatorias","📋");
    return'<div class="tbar-wrap tbar-wrap-sm">'+
      cats.map(function(c){return'<button class="tbtn tbtn-sm'+(c===cats[0]?" on":"")+'" data-cat="'+c+'">'+(CAT[c]||c)+"</button>";}).join("")+
      "</div>"+'<div id="catc2">'+renderCatCallups(cs,cats[0])+"</div>";
  }

  var paisBtns=paisList.map(function(p){return'<button class="ibtn'+(p===S.intlPais?" on":"")+'" data-pais="'+esc(p)+'">'+getFlag(p)+" "+esc(p)+"</button>";}).join("");
  $("main").innerHTML='<div class="vh" style="margin-bottom:10px"><h1 class="vt">Internacional</h1></div>'+
    '<div class="ibar">'+paisBtns+'<button class="ibtn ibtn-add" id="btn-add-pais">+ País</button></div>'+
    '<div id="intl-content">'+renderPaisContent(S.intlPais)+"</div>";

  document.querySelectorAll(".ibtn[data-pais]").forEach(function(b){
    b.addEventListener("click",function(){
      S.intlPais=b.dataset.pais;
      document.querySelectorAll(".ibtn[data-pais]").forEach(function(x){x.classList.remove("on");});
      b.classList.add("on");
      $("intl-content").innerHTML=renderPaisContent(S.intlPais);
      bindCards();bindCatTabs();
    });
  });

  var addBtn=$("btn-add-pais");
  if(addBtn)addBtn.addEventListener("click",function(){
    var mo=document.createElement("div");mo.className="mo";
    mo.innerHTML='<div class="modal" style="padding-bottom:40px"><button class="mcl" id="mc-close">×</button>'+
      '<div class="mtitle">Nuevo país</div><p class="msub">País de la selección internacional</p>'+
      '<div class="fg"><label class="fl">País</label><input class="fi" id="np-pais" type="text" placeholder="Ej: Brasil, Portugal..." autocomplete="off" style="font-size:16px"/></div>'+
      '<div style="margin-top:16px;display:flex;gap:8px"><button class="btn btn-ghost" id="np-cancel" style="flex:1">Cancelar</button><button class="btn btn-primary" id="np-ok" style="flex:1">Añadir</button></div></div>';
    document.body.appendChild(mo);
    var inp=$("np-pais");if(inp)setTimeout(function(){inp.focus();},100);
    function closeMo(){if(mo.parentNode)mo.parentNode.removeChild(mo);}
    $("mc-close").addEventListener("click",closeMo);$("np-cancel").addEventListener("click",closeMo);
    mo.addEventListener("click",function(e){if(e.target===mo)closeMo();});
    $("np-ok").addEventListener("click",function(){
      var val=(inp?inp.value:"").trim();if(!val){inp.style.borderColor="red";return;}
      closeMo();S.editingId=null;S.intlPais=val;route("nueva");
      setTimeout(function(){
        var rb=document.querySelector('[name="selType"][value="internacional"]');
        if(rb){rb.checked=true;rb.dispatchEvent(new Event("change"));}
        setTimeout(function(){var pf=$("f-pais");if(pf)pf.value=val;var pg=$("pais-g");if(pg)pg.style.display="block";},60);
      },60);
    });
  });
  bindCards();bindCatTabs();
}

function bindCatTabs(){
  document.querySelectorAll(".tbtn-sm[data-cat]").forEach(function(b){
    b.addEventListener("click",function(){
      document.querySelectorAll(".tbtn-sm[data-cat]").forEach(function(x){x.classList.remove("on");});
      b.classList.add("on");
      var allC=sortDate(getCallups({season:S.season,type:"internacional"}),"desc");
      var cs=allC.filter(function(c){return(c.pais||"Sin país")===S.intlPais;});
      var el=$("catc2");if(el){el.innerHTML=renderCatCallups(cs,b.dataset.cat);bindCards();}
    });
  });
}

function titleCase(s){
  if(!s)return"";
  return s.toLowerCase().replace(/(?:^|\s|-)([a-záéíóúüñàèìòùâêîôûäëïöüçã])/g,function(m,l){return m.replace(l,l.toUpperCase());});
}

// ── Helper: genera el HTML del select de matchType ──
function matchTypeSelectHTML(name, selected) {
  selected = selected || "amistoso";
  return '<select class="fsel" name="' + name + '" style="flex:.8;min-height:38px;font-size:12px;padding:6px 28px 6px 8px">' +
    '<option value="amistoso"' + (selected === "amistoso" ? " selected" : "") + '>⚽ Amistoso</option>' +
    '<option value="oficial"' + (selected === "oficial" ? " selected" : "") + '>🏆 Oficial</option>' +
    '<option value="entrenamiento"' + (selected === "entrenamiento" ? " selected" : "") + '>🏋 Entrenamiento</option></select>';
}

// ── NUEVA / EDITAR ──
function renderNueva(){
  if(!canEdit()){$("main").innerHTML=emptyState("Inicia sesión para crear convocatorias","🔒");return;}
  var players=getPlayersBySeason(S.season).filter(function(p){return p.active;});
  var byTeam={},tord={};TEAMS.forEach(function(t){tord[t.name]=t.order;});
  players.forEach(function(p){
    var per=teamInSeason(p,S.season)||teamNow(p);if(!per)return;
    if(!byTeam[per.teamName])byTeam[per.teamName]=[];
    byTeam[per.teamName].push({id:p.id,fullName:titleCase(p.fullName),teamName:per.teamName});
  });
  Object.keys(byTeam).forEach(function(t){byTeam[t].sort(function(a,b){return a.fullName.localeCompare(b.fullName,"es");});});
  var sortedTeams=Object.keys(byTeam).sort(function(a,b){return(tord[b]||0)-(tord[a]||0);});
  var pselHTML=sortedTeams.map(function(team){
    return'<div class="pg"><div class="pg-hdr" data-team="'+esc(team)+'">'+
      '<span>'+esc(team)+'</span><span style="font-size:11px;opacity:.7;font-family:Inter,sans-serif;font-weight:400">('+byTeam[team].length+')</span></div>'+
      '<div class="pg-body" id="pgb-'+esc(team)+'">'+
      byTeam[team].map(function(p){
        return'<label class="po" data-pn="'+esc(p.fullName.toLowerCase())+'" data-pt="'+esc(team)+'">'+
          '<input type="checkbox" name="pids" value="'+p.id+'" data-n="'+esc(p.fullName)+'" data-t="'+esc(team)+'"/>'+
          '<span class="po-n">'+esc(p.fullName)+'</span><span class="po-t">'+esc(team)+"</span></label>";
      }).join("")+"</div></div>";
  }).join("");

  $("main").innerHTML=
    '<div class="vh" style="margin-bottom:8px"><h1 class="vt">'+(S.editingId?"Editar Convocatoria":"Nueva Convocatoria")+'</h1><span class="vs">'+S.season+"</span></div>"+
    '<div id="ai-parser-wrap" style="margin-bottom:12px"><button type="button" class="btn-ai-parser" id="btn-ai-parser">✨ Rellenar con nota de prensa</button></div>'+
    '<form id="cf" autocomplete="off">'+
    '<div class="fblock fblock-info">'+
    '<div class="fsec fsec-info"><span class="fsec-ico">📋</span><span class="fsec-lbl">Información general</span></div>'+
    '<div class="fg"><label class="fl">Tipo de selección *</label><div class="rc-group">'+
    '<label class="rc"><input type="radio" name="selType" value="madrilena"/><span class="rc-ico"><img src="https://raw.githubusercontent.com/PabliVM/selecciones/main/MADRID.png" style="width:24px;height:16px;object-fit:cover;border-radius:2px"/></span><span class="rc-lbl">Madrileña</span></label>'+
    '<label class="rc"><input type="radio" name="selType" value="espanola"/><span class="rc-ico"><img src="https://raw.githubusercontent.com/PabliVM/selecciones/main/Espa%C3%B1a.png" style="width:24px;height:16px;object-fit:cover;border-radius:2px"/></span><span class="rc-lbl">Española</span></label>'+
    '<label class="rc"><input type="radio" name="selType" value="internacional"/><span class="rc-ico">🌍</span><span class="rc-lbl">Internacional</span></label>'+
    "</div></div>"+
    '<div class="fg" id="pais-g" style="display:none"><label class="fl">País *</label><div id="pais-pills" class="pais-pills"></div><input class="fi" type="text" id="f-pais" name="pais" placeholder="Escribe el país..." style="display:none;margin-top:6px"/></div>'+
    '<div class="fg" id="cat-g" style="display:none"><label class="fl">Categoría *</label><select class="fsel" id="sel-cat" name="selCat"><option value="">Selecciona categoría</option></select></div>'+
    '<div class="fg"><label class="fl">Título *</label><input class="fi" type="text" name="title" placeholder="Ej: Concentración U17 Marzo"/></div>'+
    '<div class="fg"><label class="fl">Rival / Torneo</label><input class="fi" type="text" name="rival" placeholder="Ej: Portugal, Francia"/></div>'+
    '<div class="fg"><label class="fl">Tipo de convocatoria</label><select class="fsel" name="convType"><option value="provisional">⏳ Provisional</option><option value="definitiva">✅ Definitiva</option></select></div>'+
    '<div class="fg" id="limit-date-g"><label class="fl">Fecha límite confirmación</label><input class="fi" type="date" name="limitDate"/><p style="font-size:11px;color:var(--text-muted);margin-top:4px">Si no se confirma antes de esta fecha, se descartará automáticamente</p></div>'+
    '<div class="frow"><div class="fg"><label class="fl">Inicio *</label><input class="fi" type="date" name="startDate"/></div><div class="fg"><label class="fl">Fin *</label><input class="fi" type="date" name="endDate"/></div></div>'+
    '<div class="fg"><label class="fl">Lugar de concentración</label><input class="fi" type="text" name="location" placeholder="Ej: Ciudad del Fútbol, Las Rozas"/></div>'+
    '</div>'+
'<div class="fblock fblock-conc">'+
'<div class="fsec fsec-conc"><span class="fsec-ico">📍</span><span class="fsec-lbl">Citación</span></div>'+
'<div class="frow"><div class="fg"><label class="fl">Fecha citación</label><input class="fi" type="date" name="concDate"/></div><div class="fg"><label class="fl">Hora</label><input class="fi" type="time" name="concTime"/></div></div>'+
'<div class="fg"><label class="fl">Lugar de citación</label><input class="fi" type="text" name="concLugar" placeholder="Ej: Ciudad del Fútbol, Las Rozas..."/></div>'+
'<div class="fg"><label class="fl">Alojamiento</label><input class="fi" type="text" name="concHotel" placeholder="Ej: Hotel NH Las Rozas..."/></div>'+
'<div class="fg"><label class="fl">Notas citación</label><textarea class="fta" name="concNotas" rows="2" placeholder="Ej: Presentarse con DNI. Cena a las 21:00..." style="min-height:50px"></textarea></div>'+
'</div>'+
'<div class="fblock fblock-traslado">'+
'<div class="fsec fsec-traslado"><span class="fsec-ico">✈️</span><span class="fsec-lbl">Traslado (ida)</span></div>'+
'<div class="fg"><label class="fl">Desde (origen)</label><input class="fi" type="text" name="trasladoDesde" placeholder="Ej: Aeropuerto T4 Madrid..."/></div>'+
'<div class="frow"><div class="fg"><label class="fl">Fecha salida</label><input class="fi" type="date" name="trasladoDate"/></div><div class="fg"><label class="fl">Hora</label><input class="fi" type="time" name="trasladoTime"/></div></div>'+
'<div class="fg"><label class="fl">Medio y localizador</label><input class="fi" type="text" name="trasladoTransporte" placeholder="Ej: Vuelo IB1234 · Localizador ABC123"/></div>'+
'<div class="fg"><label class="fl">Hasta (destino)</label><input class="fi" type="text" name="trasladoHasta" placeholder="Ej: Aeropuerto de Lisboa..."/></div>'+
'<div class="fg"><label class="fl">Alojamiento en destino</label><input class="fi" type="text" name="trasladoHotel" placeholder="Ej: Hotel Marriott Lisboa..."/></div>'+
'<div class="fg"><label class="fl">Notas traslado</label><textarea class="fta" name="trasladoNotas" rows="2" placeholder="Ej: Bus desde aeropuerto al hotel (30 min)..." style="min-height:50px"></textarea></div>'+
'</div>'+
'<div class="fblock fblock-vuelta">'+
'<div class="fsec fsec-vuelta"><span class="fsec-ico">🔙</span><span class="fsec-lbl">Vuelta</span></div>'+
'<div class="fg"><label class="fl">Desde (origen vuelta)</label><input class="fi" type="text" name="vueltaDesde" placeholder="Ej: Aeropuerto de Lisboa..."/></div>'+
'<div class="frow"><div class="fg"><label class="fl">Fecha vuelta</label><input class="fi" type="date" name="vueltaDate"/></div><div class="fg"><label class="fl">Hora</label><input class="fi" type="time" name="vueltaTime"/></div></div>'+
'<div class="fg"><label class="fl">Medio y localizador</label><input class="fi" type="text" name="vueltaTransporte" placeholder="Ej: Vuelo IB5678 · Localizador XYZ789"/></div>'+
'<div class="fg"><label class="fl">Hasta (destino vuelta)</label><input class="fi" type="text" name="vueltaHasta" placeholder="Ej: Aeropuerto T4 Madrid..."/></div>'+
'<div class="fg"><label class="fl">Notas vuelta</label><textarea class="fta" name="vueltaNotas" rows="2" placeholder="Ej: Bus al CRM. Llegada 16:30h. Recogida familias..." style="min-height:50px"></textarea></div>'+
'</div>'+
'<div class="fblock fblock-llegada">'+
'<div class="fsec fsec-llegada"><span class="fsec-ico">🏁</span><span class="fsec-lbl">Llegada a Madrid / CRM</span></div>'+
'<div class="frow"><div class="fg"><label class="fl">Fecha llegada</label><input class="fi" type="date" name="llegadaDate"/></div><div class="fg"><label class="fl">Hora</label><input class="fi" type="time" name="llegadaTime"/></div></div>'+
'<div class="fg"><label class="fl">Lugar de llegada</label><input class="fi" type="text" name="llegadaLugar" placeholder="Ej: Ciudad Real Madrid, Valdebebas..."/></div>'+
'<div class="fg"><label class="fl">Notas llegada</label><textarea class="fta" name="llegadaNotas" rows="2" placeholder="Ej: Recogida por familias en CRM a las 16:30h..." style="min-height:50px"></textarea></div>'+
'</div>'+
    '<div class="fblock fblock-match">'+
    '<div class="fsec fsec-match"><span class="fsec-ico">⚽</span><span class="fsec-lbl">Partidos / Entrenamientos</span></div>'+
    '<div class="fg matches-wrap"><div id="matches-list"></div><button type="button" class="btn-add-match" id="btn-add-match">+ Añadir partido / entrenamiento</button></div>'+
    '</div>'+
    '<div class="fblock fblock-players">'+
    '<div class="fsec fsec-players"><span class="fsec-ico">👕</span><span class="fsec-lbl">Jugadores convocados</span></div>'+
    '<div class="fg">'+
    '<input class="fi" type="text" id="psearch" placeholder="🔍 Buscar jugador..." autocomplete="off" style="margin-bottom:8px"/>'+
    '<div class="psel" id="psel">'+pselHTML+'</div><div id="sprev" class="sp"></div></div>'+
    '</div>'+
    '<div class="fblock fblock-extra">'+
    '<div class="fsec fsec-extra"><span class="fsec-ico">📝</span><span class="fsec-lbl">Información adicional</span></div>'+
    '<div class="fg"><label class="fl">Observaciones</label><textarea class="fta" name="notes" rows="3" placeholder="Info adicional..."></textarea></div>'+
    '</div>'+
    '<div id="ferr" class="ferr" style="display:none"></div>'+
    '<div class="fact"><button type="button" class="btn btn-ghost" id="btn-cancel">Cancelar</button><button type="submit" class="btn btn-primary" id="btn-submit">✓ Guardar convocatoria</button></div>'+
    "</form>";

  $("btn-cancel").addEventListener("click",function(){S.editingId=null;route("agenda");});
  bindAiParser();

  document.querySelectorAll('.rc').forEach(function(label){
    var input=label.querySelector('input[type="radio"]');
    if(input){input.addEventListener('change',function(){document.querySelectorAll('.rc').forEach(function(l){l.classList.toggle('on',l.querySelector('input[type="radio"]').checked);});});}
  });

  document.querySelectorAll(".pg-hdr").forEach(function(h){
    h.addEventListener("click",function(){
      var b=$("pgb-"+h.dataset.team);
      if(b)b.style.display=b.style.display==="none"?"":"none";
    });
  });

  document.querySelectorAll('[name="selType"]').forEach(function(r){
    r.addEventListener("change",function(){
      var k=selKey(r.value);
      var cs=$("sel-cat");cs.innerHTML='<option value="">Selecciona categoría</option>';
      var cats=SELS[k]?SELS[k].cats.slice().reverse():[];
      cats.forEach(function(c){cs.innerHTML+='<option value="'+c+'">'+(CAT[c]||c)+"</option>";});
      $("cat-g").style.display="block";
      var paisG=$("pais-g");if(paisG)paisG.style.display=(k==="internacional")?"block":"none";
      if(k==="internacional"){
        var existingPaises=[];
        getCallups_raw().forEach(function(cv){if(cv.pais&&existingPaises.indexOf(cv.pais)===-1)existingPaises.push(cv.pais);});
        existingPaises.sort();
        var pillsDiv=$("pais-pills"),paisInput=$("f-pais");
        if(pillsDiv&&paisInput){
          pillsDiv.innerHTML=existingPaises.map(function(p){return'<button type="button" class="pais-pill" data-pais="'+esc(p)+'">'+getFlag(p)+" "+esc(p)+"</button>";}).join("")+
            '<button type="button" class="pais-pill pais-pill-other" id="pais-other">+ Otro</button>';
          pillsDiv.querySelectorAll(".pais-pill[data-pais]").forEach(function(btn){
            btn.addEventListener("click",function(){
              pillsDiv.querySelectorAll(".pais-pill").forEach(function(b){b.classList.remove("on");});
              btn.classList.add("on");paisInput.style.display="none";paisInput.value=btn.dataset.pais;
            });
          });
          var otherBtn=$("pais-other");
          if(otherBtn)otherBtn.addEventListener("click",function(){
            pillsDiv.querySelectorAll(".pais-pill").forEach(function(b){b.classList.remove("on");});
            otherBtn.classList.add("on");paisInput.style.display="block";paisInput.value="";
            setTimeout(function(){paisInput.focus();},50);
          });
        }
      }
    });
  });

  var psearch=$("psearch");
  if(psearch)psearch.addEventListener("input",function(){
    var q=psearch.value.toLowerCase().trim();
    document.querySelectorAll(".po").forEach(function(po){
      var match=!q||(po.dataset.pn||"").indexOf(q)!==-1;
      po.style.display=match?"":"none";
    });
    document.querySelectorAll(".pg").forEach(function(pg){
      var anyVis=false;
      pg.querySelectorAll(".po").forEach(function(po){if(po.style.display!=="none")anyVis=true;});
      pg.style.display=anyVis?"":"none";
    });
  });

  function updatePreview(){
    var checked=Array.prototype.slice.call(document.querySelectorAll('[name="pids"]:checked'));
    var prev=$("sprev");if(!checked.length){prev.innerHTML="";return;}
    prev.innerHTML='<div class="sp-label">Seleccionados ('+checked.length+')</div><div class="sp-chips">'+
      checked.map(function(cb){
        return'<span class="chip chip-sel" style="display:inline-flex;align-items:center;gap:3px">'+esc(cb.dataset.n)+
          ' <span style="color:var(--text-muted);font-size:10px">('+esc(cb.dataset.t)+')</span>'+
          '<button type="button" data-uncheck="'+cb.value+'" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;padding:0 2px;line-height:1">×</button></span>';
      }).join("")+"</div>";
    prev.querySelectorAll("[data-uncheck]").forEach(function(btn){
      btn.addEventListener("click",function(){
        var cb=document.querySelector('[name="pids"][value="'+btn.dataset.uncheck+'"]');
        if(cb){cb.checked=false;cb.dispatchEvent(new Event("change"));}
      });
    });
  }
  document.querySelectorAll('[name="pids"]').forEach(function(cb){cb.addEventListener("change",updatePreview);});

  var matchCount=0;
  function addMatchRow(date,time,rival,mtype){
    var idx=matchCount++;mtype=mtype||"amistoso";
    var row=document.createElement("div");row.className="match-row";
    row.innerHTML='<input class="fi" type="date" name="mdate_'+idx+'" value="'+(date||"")+'" style="flex:1.2"/>'+
      '<input class="fi" type="time" name="mtime_'+idx+'" value="'+(time||"")+'" style="flex:.8"/>'+
      '<input class="fi" type="text" name="mrival_'+idx+'" value="'+esc(rival||"")+'" placeholder="Rival / Descripción" style="flex:1.5"/>'+
      matchTypeSelectHTML("mtype_"+idx, mtype)+
      '<button type="button" class="btn-rm">×</button>';
    row.querySelector(".btn-rm").addEventListener("click",function(){row.remove();});
    var ml=$("matches-list");if(ml)ml.appendChild(row);
  }
  $("btn-add-match").addEventListener("click",function(){addMatchRow();});

  $("cf").addEventListener("submit",function(e){
    e.preventDefault();
    var fd=new FormData($("cf"));
    var matchesData=[];
    document.querySelectorAll(".match-row").forEach(function(row){
      var d=row.querySelector('[type="date"]'),t=row.querySelector('[type="time"]'),r=row.querySelector('[type="text"]');
      var tp=row.querySelector('select');
      var rival=r?r.value.trim():"";
      if((d&&d.value)||rival)matchesData.push({date:d?d.value:"",time:t?t.value:"",rival:rival,matchType:tp?tp.value:"amistoso"});
    });
    var checked=Array.prototype.slice.call(document.querySelectorAll('[name="pids"]:checked'));
    var players=checked.map(function(cb){
      var pl=null;for(var i=0;i<getPlayers_raw().length;i++){if(getPlayers_raw()[i].id===cb.value){pl=getPlayers_raw()[i];break;}}
      var per=pl?(teamInSeason(pl,S.season)||teamNow(pl)):null;
      return{playerId:cb.value,fullName:cb.dataset.n,teamId:per?per.teamId:"",teamName:cb.dataset.t,dropStatus:"active"};
    });
    var paisVal=(fd.get("pais")||"").trim()||($("f-pais")?$("f-pais").value.trim():"");
    var data={
      selectionType:fd.get("selType")||"",
      selectionCategory:fd.get("selCat")||"",
      pais:paisVal,
      title:fd.get("title")||"",
      startDate:fd.get("startDate")||"",
      endDate:fd.get("endDate")||"",
      rival:fd.get("rival")||"",
      convType:fd.get("convType")||"provisional",
      limitDate:fd.get("limitDate")||"",
      location:fd.get("location")||"",
      notes:fd.get("notes")||"",
      conc:{date:fd.get("concDate")||"",time:fd.get("concTime")||"",lugar:fd.get("concLugar")||"",hotel:fd.get("concHotel")||"",notas:fd.get("concNotas")||""},
      traslado:{desde:fd.get("trasladoDesde")||"",date:fd.get("trasladoDate")||"",time:fd.get("trasladoTime")||"",transporte:fd.get("trasladoTransporte")||"",hasta:fd.get("trasladoHasta")||"",hotel:fd.get("trasladoHotel")||"",notas:fd.get("trasladoNotas")||""},
      vuelta:{desde:fd.get("vueltaDesde")||"",date:fd.get("vueltaDate")||"",time:fd.get("vueltaTime")||"",transporte:fd.get("vueltaTransporte")||"",hasta:fd.get("vueltaHasta")||"",notas:fd.get("vueltaNotas")||""},
      llegada:{date:fd.get("llegadaDate")||"",time:fd.get("llegadaTime")||"",lugar:fd.get("llegadaLugar")||"",notas:fd.get("llegadaNotas")||""},
      matches:matchesData,
      players:players
    };
    var errs=[];
    if(!data.selectionType)errs.push("Selecciona el tipo de selección");
    if(!data.selectionCategory)errs.push("Selecciona la categoría");
    if(data.selectionType==="internacional"&&!data.pais)errs.push("Introduce el país");
    if(!data.title)errs.push("El título es obligatorio");
    if(!data.startDate)errs.push("La fecha de inicio es obligatoria");
    if(!data.endDate)errs.push("La fecha de fin es obligatoria");
    if(data.startDate&&data.endDate&&data.startDate>data.endDate)errs.push("Fecha inicio no puede ser posterior a fin");
    var errDiv=$("ferr");
    if(errs.length){errDiv.style.display="block";errDiv.innerHTML=errs.map(function(x){return"<p>• "+x+"</p>";}).join("");errDiv.scrollIntoView({behavior:"smooth",block:"center"});return;}
    errDiv.style.display="none";
    var btn=$("btn-submit");btn.disabled=true;btn.textContent="Guardando...";
    var eid=S.editingId;S.editingId=null;
    if(eid){updateCallup(eid,data,function(){toast("✅ Convocatoria actualizada");route("agenda");});}
    else{addCallup(data,S.season,function(){toast("✅ Convocatoria guardada");route("agenda");});}
  });
}

// ── AI PARSER ──
function bindAiParser(){
  var btn=$("btn-ai-parser");if(!btn)return;
  btn.addEventListener("click",function(){
    var mo=document.createElement("div");mo.className="mo";
    mo.innerHTML='<div class="modal modal-tall" style="padding-bottom:40px"><button class="mcl" id="aip-close">×</button>'+
      '<div class="mtitle">✨ Rellenar con IA</div><p class="msub">Pega texto o sube una foto del documento.</p>'+
      '<div style="display:flex;gap:6px;margin-bottom:12px">'+
      '<button class="plan-tbtn on" id="aip-tab-text" style="flex:1">📝 Texto</button>'+
      '<button class="plan-tbtn" id="aip-tab-img" style="flex:1">📷 Foto</button>'+
      '</div>'+
      '<div id="aip-text-panel"><textarea class="ai-textarea" id="aip-text" placeholder="Pega aquí el texto de la convocatoria..."></textarea></div>'+
      '<div id="aip-img-panel" style="display:none">'+
        '<label style="display:block;border:2px dashed var(--gold);border-radius:10px;padding:24px;text-align:center;cursor:pointer;color:var(--gold);font-weight:600;font-size:14px" id="aip-img-label">'+
          '📷 Toca para subir · o pega (Ctrl+V)<br><span style="font-size:11px;color:var(--text-muted);font-weight:400">JPG, PNG</span>'+
          '<input type="file" id="aip-file" accept="image/*" style="display:none"/>'+
        '</label>'+
        '<div id="aip-img-preview" style="margin-top:8px;text-align:center"></div>'+
      '</div>'+
      '<div class="ai-status" id="aip-status" style="margin-top:8px"></div>'+
      '<div style="display:flex;gap:8px;margin-top:12px">'+
      '<button class="btn btn-ghost" id="aip-cancel" style="flex:1">Cancelar</button>'+
      '<button class="btn btn-gold" id="aip-ok" style="flex:1">✨ Extraer datos</button></div></div>';
    document.body.appendChild(mo);
    function closeMo(){if(mo.parentNode)mo.parentNode.removeChild(mo);}
    $("aip-close").addEventListener("click",closeMo);$("aip-cancel").addEventListener("click",closeMo);
    mo.addEventListener("click",function(e){if(e.target===mo)closeMo();});

    var tabText=$("aip-tab-text"),tabImg=$("aip-tab-img");
    var panelText=$("aip-text-panel"),panelImg=$("aip-img-panel");
    tabText.addEventListener("click",function(){tabText.classList.add("on");tabImg.classList.remove("on");panelText.style.display="";panelImg.style.display="none";});
    tabImg.addEventListener("click",function(){tabImg.classList.add("on");tabText.classList.remove("on");panelText.style.display="none";panelImg.style.display="";});

    var fileInput=$("aip-file");var pastedFile=null;
    if(fileInput)fileInput.addEventListener("change",function(){
      var f=fileInput.files[0];if(!f)return;pastedFile=f;
      var url=URL.createObjectURL(f);
      $("aip-img-preview").innerHTML='<img src="'+url+'" style="max-width:100%;max-height:160px;border-radius:8px"/><div style="font-size:12px;color:var(--text-muted);margin-top:4px">'+esc(f.name)+"</div>";
    });
    mo.addEventListener("paste",function(e){
      var items=e.clipboardData&&e.clipboardData.items;if(!items)return;
      for(var i=0;i<items.length;i++){
        if(items[i].type.indexOf("image")===0){
          tabImg.classList.add("on");tabText.classList.remove("on");panelText.style.display="none";panelImg.style.display="";
          pastedFile=items[i].getAsFile();
          var url=URL.createObjectURL(pastedFile);
          $("aip-img-preview").innerHTML='<img src="'+url+'" style="max-width:100%;max-height:160px;border-radius:8px"/><div style="font-size:12px;color:var(--gold);margin-top:4px">✅ Imagen pegada</div>';
          break;
        }
      }
    });

    $("aip-ok").addEventListener("click",function(){
      var status=$("aip-status"),okBtn=$("aip-ok");
      var isImg=panelImg.style.display!=="none";
      var text=($("aip-text")?$("aip-text").value||"":"").trim();
      var imgFile=fileInput&&fileInput.files&&fileInput.files[0]?fileInput.files[0]:null;
      if(!isImg&&!text){status.textContent="Pega un texto primero.";return;}
      if(isImg&&!imgFile&&!pastedFile){status.textContent="Sube o pega una foto primero.";return;}
      status.className="ai-status";status.textContent="⏳ Analizando...";okBtn.disabled=true;okBtn.textContent="Analizando...";
      var today=new Date().toISOString().slice(0,10);
      var prompt="Eres un experto en convocatorias del Real Madrid Cantera. Analiza el texto y devuelve SOLO JSON válido, sin markdown.\nHoy es "+today+". Fechas en formato YYYY-MM-DD. Si un dato no aparece usa null o [].\nJSON schema:\n{\"selectionType\":\"madrilena|espanola|internacional\",\"convType\":\"definitiva|provisional\",\"selectionCategory\":\"sub12|sub14|sub15|sub16|sub17|sub18|sub19|sub20|sub21|abs\",\"pais\":\"pais si internacional sino null\",\"title\":\"titulo descriptivo\",\"startDate\":\"YYYY-MM-DD\",\"endDate\":\"YYYY-MM-DD\",\"rival\":\"rivales\",\"location\":\"lugar\",\"conc\":{\"date\":\"YYYY-MM-DD\",\"time\":\"HH:MM\",\"lugar\":\"lugar citacion\",\"hotel\":\"alojamiento\"},\"traslado\":{\"date\":\"YYYY-MM-DD\",\"time\":\"HH:MM\",\"lugar\":\"punto salida\",\"transporte\":\"vuelo/tren ida\"},\"vuelta\":{\"date\":\"YYYY-MM-DD\",\"time\":\"HH:MM\",\"lugar\":\"punto salida vuelta\",\"transporte\":\"vuelo/tren vuelta\"},\"matches\":[{\"date\":\"YYYY-MM-DD\",\"time\":\"HH:MM\",\"rival\":\"rival\",\"matchType\":\"amistoso|oficial|entrenamiento\"}],\"notes\":\"obs\",\"players\":[\"NOMBRE APELLIDO\"]}\nTEXTO:\n"+text;

      function doFetch(body){
        return fetch("/api/convocatoria",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
          .then(function(r){if(!r.ok)return r.text().then(function(t){throw new Error("Servidor: "+t.slice(0,120));});return r.json();});
      }

      var fetchPromise;
      var actualFile=imgFile||pastedFile;
      if(isImg&&actualFile){
        fetchPromise=new Promise(function(resolve,reject){
          var reader=new FileReader();
          reader.onload=function(e){resolve(doFetch({prompt:prompt,image:e.target.result.split(",")[1],imageType:actualFile.type||"image/jpeg"}));};
          reader.onerror=reject;
          reader.readAsDataURL(actualFile);
        }).then(function(p){return p;});
      } else {
        fetchPromise=doFetch({prompt:prompt});
      }

      fetchPromise.then(function(data){
        var raw=(data.content&&data.content[0]&&data.content[0].text)||"";
        raw=raw.replace(/```json|```/g,"").trim();
        var parsed;try{parsed=JSON.parse(raw);}catch(e){throw new Error("JSON inválido");}
        var form=$("cf");if(!form)throw new Error("Formulario no encontrado");
        if(parsed.selectionType){var rb=form.querySelector('[name="selType"][value="'+parsed.selectionType+'"]');if(rb){rb.checked=true;rb.dispatchEvent(new Event("change"));}}
        setTimeout(function(){
          if(parsed.selectionCategory){var cat=$("sel-cat");if(cat)cat.value=parsed.selectionCategory;}
          if(parsed.pais){var pf=$("f-pais");if(pf){pf.value=parsed.pais;pf.style.display="block";}var pg=$("pais-g");if(pg)pg.style.display="block";}
          var fields={title:parsed.title,startDate:parsed.startDate,endDate:parsed.endDate,rival:parsed.rival,location:parsed.location,notes:parsed.notes};
          Object.keys(fields).forEach(function(k){if(!fields[k])return;var el=form.querySelector('[name="'+k+'"]');if(el)el.value=fields[k];});
          if(parsed.conc){var cf2={concDate:parsed.conc.date,concTime:parsed.conc.time,concLugar:parsed.conc.lugar,concHotel:parsed.conc.hotel};Object.keys(cf2).forEach(function(k){if(!cf2[k])return;var el=form.querySelector('[name="'+k+'"]');if(el)el.value=cf2[k];}); }if(parsed.traslado){var ct={trasladoDate:parsed.traslado.date,trasladoTime:parsed.traslado.time,trasladoLugar:parsed.traslado.lugar,trasladoTransporte:parsed.traslado.transporte};Object.keys(ct).forEach(function(k){if(!ct[k])return;var el=form.querySelector('[name="'+k+'"]');if(el)el.value=ct[k];});}
          if(parsed.vuelta){var vf={vueltaDate:parsed.vuelta.date,vueltaTime:parsed.vuelta.time,vueltaLugar:parsed.vuelta.lugar,vueltaTransporte:parsed.vuelta.transporte};Object.keys(vf).forEach(function(k){if(!vf[k])return;var el=form.querySelector('[name="'+k+'"]');if(el)el.value=vf[k];});}
          if(parsed.matches&&parsed.matches.length){
            var ml=$("matches-list");if(ml){ml.innerHTML="";
              parsed.matches.forEach(function(m,i){
                var row=document.createElement("div");row.className="match-row";
                row.innerHTML='<input class="fi" type="date" name="mdate_'+i+'" value="'+(m.date||"")+'" style="flex:1.2"/>'+
                  '<input class="fi" type="time" name="mtime_'+i+'" value="'+(m.time||"")+'" style="flex:.8"/>'+
                  '<input class="fi" type="text" name="mrival_'+i+'" value="'+esc(m.rival||"")+'" placeholder="Rival / Descripción" style="flex:1.5"/>'+
                  matchTypeSelectHTML("mtype_"+i, m.matchType||"amistoso")+
                  '<button type="button" class="btn-rm">×</button>';
                row.querySelector(".btn-rm").addEventListener("click",function(){row.remove();});
                ml.appendChild(row);
              });
            }
          }
          if(parsed.players&&parsed.players.length){
            function normalize(s){return(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"").trim();}
            function lev(a,b){var m=a.length,n=b.length,dp=[];for(var i=0;i<=m;i++){dp[i]=[i];for(var j=1;j<=n;j++)dp[i][j]=0;}for(var j=0;j<=n;j++)dp[0][j]=j;for(var i=1;i<=m;i++)for(var j=1;j<=n;j++){dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);}return dp[m][n];}
            function fuzzyWord(a,b){if(a===b)return true;if(a.length<3||b.length<3)return false;return lev(a,b)<=(a.length<=5?1:2);}
            var matched=[],unmatched=[];
            parsed.players.forEach(function(rawName){
              var normRaw=normalize(rawName);var rawParts=normRaw.split(" ").filter(function(w){return w.length>1;});
              var best=null,bestScore=0;
              getPlayers_raw().forEach(function(p){
                if(!p.active)return;
                var normP=normalize(p.fullName);var pParts=normP.split(" ").filter(function(w){return w.length>1;});
                var score=0;
                rawParts.forEach(function(rw){pParts.forEach(function(pw){if(rw===pw)score+=2;else if(rw.length>=4&&pw.length>=4&&fuzzyWord(rw,pw))score+=1.5;});});
                var rawLast=rawParts[rawParts.length-1];var pLast=pParts[pParts.length-1];
                if(rawLast&&pLast&&fuzzyWord(rawLast,pLast))score+=1;
                if(score>bestScore){bestScore=score;best=p;}
              });
              if(best&&bestScore>=2){var cb=form.querySelector('[name="pids"][value="'+best.id+'"]');if(cb){cb.checked=true;cb.dispatchEvent(new Event("change"));}matched.push({raw:rawName,player:best});}
              else unmatched.push(rawName);
            });
            var summary="";
            if(matched.length)summary+="✅ "+matched.length+" jugador"+(matched.length!==1?"es":"")+" identificado"+(matched.length!==1?"s":"");
            if(unmatched.length)summary+=(summary?" · ":"")+"⚠️ No encontrado"+(unmatched.length!==1?"s":"")+" (búscalos manualmente): "+unmatched.join(", ");
            status.className="ai-status"+(unmatched.length?" err":" ok");
            status.textContent=summary||"✓ Datos extraídos.";
            okBtn.textContent="Hecho";
            setTimeout(function(){closeMo();},unmatched.length?3000:1500);
          } else {
            status.className="ai-status ok";status.textContent="✓ Datos extraídos. Revisa y completa.";okBtn.textContent="Hecho";
            setTimeout(function(){closeMo();},1200);
          }
        },80);
      }).catch(function(err){status.className="ai-status err";status.textContent="⚠ Error: "+err.message;okBtn.disabled=false;okBtn.textContent="✨ Extraer datos";});
    });
  });
}

// ── JUGADORES ──
function renderJugadores(){
  if(!canWrite()){$("main").innerHTML=emptyState("Inicia sesión para ver los jugadores","🔒");return;}
  if(!S.jugTeam)S.jugTeam="";
  var players=getPlayersBySeason(S.season);
  var q=(S.jugSearch||"").toLowerCase();
  var filtered=players.filter(function(p){
    var per=teamInSeason(p,S.season)||teamNow(p);
    if(S.jugTeam&&(!per||per.teamName!==S.jugTeam))return false;
    if(q&&p.fullName.toLowerCase().indexOf(q)===-1)return false;
    return true;
  });
  var byTeam={};var tord={};TEAMS.forEach(function(t){tord[t.name]=t.order;});
  filtered.forEach(function(p){var per=teamInSeason(p,S.season)||teamNow(p);if(!per)return;if(!byTeam[per.teamName])byTeam[per.teamName]=[];byTeam[per.teamName].push(p);});
  Object.keys(byTeam).forEach(function(t){byTeam[t].sort(function(a,b){return titleCase(a.fullName).localeCompare(titleCase(b.fullName),"es");});});
  var sortedTeams=Object.keys(byTeam).sort(function(a,b){return(tord[b]||0)-(tord[a]||0);});
  var callups=getCallups({season:S.season});
  var callupCount={};
  callups.forEach(function(c){if(c.players)c.players.forEach(function(cp){callupCount[cp.playerId]=(callupCount[cp.playerId]||0)+1;});});
  var allTeams=TEAMS.slice();
  var teamPills='<div class="jug-team-bar">'+
    '<button class="fbtn'+(S.jugTeam===""?" on":"")+'" data-jt="">Todos</button>'+
    allTeams.map(function(t){return'<button class="fbtn'+(S.jugTeam===t.name?" on":"")+'" data-jt="'+esc(t.name)+'">'+esc(t.name)+'</button>';}).join("")+
    '</div>';
  var h='<div class="vh"><h1 class="vt">Jugadores</h1><span class="vs">'+filtered.filter(function(p){return p.active;}).length+" activos</span></div>"+
    '<input class="fi" id="jug-search" type="text" placeholder="🔍 Buscar jugador..." value="'+esc(S.jugSearch||"")+'" style="margin-bottom:8px" autocomplete="off"/>'+
    teamPills+
    '<button class="btn btn-gold" id="btn-add-player" style="width:100%;margin-bottom:8px;margin-top:10px">+ Añadir jugador</button>'+
    '<button class="btn btn-ghost" id="btn-add-player-bulk" style="width:100%;margin-bottom:8px">+ Añadir en lista</button>'+
    '<button class="btn btn-ghost" id="btn-new-season" style="width:100%;margin-bottom:12px">📅 Nueva temporada '+nextSea(S.season)+'</button>';
  h+=sortedTeams.map(function(team){
    var ps=byTeam[team];
    return'<div class="tb"><div class="tb-hdr"><span class="tb-name">'+esc(team)+'</span><span class="tb-cnt">'+ps.filter(function(p){return p.active;}).length+'</span></div>'+
      '<ul class="tpl">'+ps.map(function(p){
        var n=callupCount[p.id]||0;
        return'<li class="tpl-item">'+
          '<div style="flex:1;min-width:0"><span class="tpl-name"'+(!p.active?' style="opacity:.4;text-decoration:line-through"':'')+">"+esc(titleCase(p.fullName))+"</span></div>"+
          (n?'<span class="tpl-badge">'+n+"</span>":"")+
          '<button class="jug-edit-btn" data-pid="'+p.id+'">✎</button>'+
          "</li>";
      }).join("")+"</ul></div>";
  }).join("");
  if(!sortedTeams.length)h+=emptyState("Sin jugadores"+(S.jugTeam?" en "+S.jugTeam:"")+(q?" con \""+q+"\"":""),"👥");
  $("main").innerHTML=h;
  var inp=$("jug-search");
  if(inp){inp.addEventListener("input",function(){S.jugSearch=inp.value;renderJugadores();});if(S.jugSearch)setTimeout(function(){inp.focus();inp.setSelectionRange(9999,9999);},50);}
  document.querySelectorAll("[data-jt]").forEach(function(btn){btn.addEventListener("click",function(){S.jugTeam=btn.dataset.jt;S.jugSearch="";renderJugadores();});});
  document.querySelectorAll(".jug-edit-btn").forEach(function(btn){btn.addEventListener("click",function(e){e.stopPropagation();openPlayerEdit(btn.dataset.pid);});});
  var addBtn=$("btn-add-player");if(addBtn)addBtn.addEventListener("click",openPlayerAdd);
  var addBulkBtn=$("btn-add-player-bulk");if(addBulkBtn)addBulkBtn.addEventListener("click",openPlayerAddBulk);
  var nsBtn=$("btn-new-season");if(nsBtn)nsBtn.addEventListener("click",function(){openNewSeasonWizard(S.season,nextSea(S.season));});
}

function deletePlayer(id,cb){
  if(window._db&&window._fbUser){
    var fns=window._fbFns;
    fns.deleteDoc(fns.doc(window._db,"players",id)).then(function(){
      window._players=getPlayers_raw().filter(function(p){return p.id!==id;});if(cb)cb();
    }).catch(function(e){console.error(e);});
  } else {
    window._players=getPlayers_raw().filter(function(p){return p.id!==id;});if(cb)cb();
  }
}
function openPlayerEdit(pid){
  var p=null;for(var i=0;i<getPlayers_raw().length;i++){if(getPlayers_raw()[i].id===pid){p=getPlayers_raw()[i];break;}}
  if(!p)return;
  var cur=teamInSeason(p,S.season)||teamNow(p);
  var teamOpts=TEAMS.map(function(t){return'<option value="'+t.id+'"'+(cur&&cur.teamId===t.id?" selected":"")+">"+esc(t.name)+"</option>";}).join("");
  var mo=document.createElement("div");mo.className="mo";
  mo.innerHTML='<div class="modal"><button class="mcl" id="pe-close">×</button>'+
    '<div class="mtitle">Editar jugador</div>'+
    '<div class="fg"><label class="fl">Nombre</label><input class="fi" id="pe-name" type="text" value="'+esc(p.fullName)+'"/></div>'+
    '<div class="fg"><label class="fl">Equipo</label><select class="fsel" id="pe-team">'+teamOpts+"</select></div>"+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
    '<button class="btn btn-danger btn-sm" id="pe-toggle" style="flex:1">'+(p.active?"🚫 Dar de baja":"✅ Reactivar")+'</button>'+
    '<button class="btn btn-ghost btn-sm" id="pe-cancel" style="flex:1">Cancelar</button>'+
    '<button class="btn btn-primary btn-sm" id="pe-save" style="flex:1">Guardar</button>'+
    "</div>"+
    '<button class="btn btn-danger btn-sm" id="pe-delete" style="width:100%;margin-top:8px">🗑 Eliminar jugador</button>'+
    "</div>";
  document.body.appendChild(mo);
  function closeMo(){if(mo.parentNode)mo.parentNode.removeChild(mo);}
  $("pe-close").addEventListener("click",closeMo);$("pe-cancel").addEventListener("click",closeMo);
  mo.addEventListener("click",function(e){if(e.target===mo)closeMo();});
  $("pe-toggle").addEventListener("click",function(){p.active=!p.active;toast(p.active?"✅ Reactivado":"🚫 Dado de baja");closeMo();renderJugadores();});
  $("pe-delete").addEventListener("click",function(){
    if(!confirm("¿Eliminar a "+p.fullName+" definitivamente? Esta acción no se puede deshacer."))return;
    deletePlayer(p.id,function(){toast("🗑 Jugador eliminado");closeMo();renderJugadores();});
  });
  $("pe-save").addEventListener("click",function(){
    var newName=($("pe-name").value||"").trim();
    var newTeamId=$("pe-team").value;
    var newTeam=null;for(var i=0;i<TEAMS.length;i++){if(TEAMS[i].id===newTeamId){newTeam=TEAMS[i];break;}}
    if(!newName||!newTeam)return;
    p.fullName=newName;
    p.teamHistory=p.teamHistory.map(function(h){return h.to===null?Object.assign({},h,{to:new Date().toISOString().slice(0,10)}):h;});
    p.teamHistory.push({teamId:newTeam.id,teamName:newTeam.name,season:S.season,from:new Date().toISOString().slice(0,10),to:null});
    toast("✅ Jugador actualizado");closeMo();renderJugadores();
  });
}

function openPlayerAdd(){
  var teamOpts=TEAMS.map(function(t){return'<option value="'+t.id+'">'+esc(t.name)+"</option>";}).join("");
  var mo=document.createElement("div");mo.className="mo";
  mo.innerHTML='<div class="modal"><button class="mcl" id="pa-close">×</button>'+
    '<div class="mtitle">Nuevo jugador</div>'+
    '<div class="fg"><label class="fl">Nombre completo</label><input class="fi" id="pa-name" type="text" placeholder="Nombre Apellido" autocomplete="off"/></div>'+
    '<div class="fg"><label class="fl">Equipo</label><select class="fsel" id="pa-team">'+teamOpts+"</select></div>"+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
    '<button class="btn btn-ghost btn-sm" id="pa-cancel" style="flex:1">Cancelar</button>'+
    '<button class="btn btn-primary btn-sm" id="pa-save" style="flex:1">Añadir</button>'+
    '</div></div>';
  document.body.appendChild(mo);
  setTimeout(function(){var n=$("pa-name");if(n)n.focus();},100);
  function closeMo(){if(mo.parentNode)mo.parentNode.removeChild(mo);}
  $("pa-close").addEventListener("click",closeMo);$("pa-cancel").addEventListener("click",closeMo);
  mo.addEventListener("click",function(e){if(e.target===mo)closeMo();});
  $("pa-save").addEventListener("click",function(){
    var name=($("pa-name").value||"").trim();
    var teamId=$("pa-team").value;
    var team=null;for(var i=0;i<TEAMS.length;i++){if(TEAMS[i].id===teamId){team=TEAMS[i];break;}}
    if(!name){$("pa-name").style.borderColor="red";return;}
    var newP={id:gid(),fullName:name,active:true,teamHistory:[{teamId:team.id,teamName:team.name,season:S.season,from:new Date().toISOString().slice(0,10),to:null}]};
    if(!window._players)window._players=[];
    window._players.push(newP);
    toast("✅ "+name+" añadido");closeMo();renderJugadores();
  });
}

function openPlayerAddBulk(){
  var teamOpts=TEAMS.map(function(t){return'<option value="'+t.id+'">'+esc(t.name)+"</option>";}).join("");
  var mo=document.createElement("div");mo.className="mo";
  mo.innerHTML='<div class="modal"><button class="mcl" id="pab-close">×</button>'+
    '<div class="mtitle">Añadir jugadores en lista</div>'+
    '<p class="msub">Un nombre por línea.</p>'+
    '<div class="fg"><label class="fl">Equipo</label><select class="fsel" id="pab-team">'+teamOpts+"</select></div>"+
    '<div class="fg"><label class="fl">Jugadores</label><textarea class="fi" id="pab-list" rows="8" placeholder="Nombre Apellido\nNombre Apellido\n..." style="resize:vertical;font-family:inherit"></textarea></div>'+
    '<div id="pab-err" class="ferr" style="display:none"></div>'+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
    '<button class="btn btn-ghost btn-sm" id="pab-cancel" style="flex:1">Cancelar</button>'+
    '<button class="btn btn-primary btn-sm" id="pab-save" style="flex:1">Añadir</button>'+
    '</div></div>';
  document.body.appendChild(mo);
  setTimeout(function(){var n=$("pab-list");if(n)n.focus();},100);
  function closeMo(){if(mo.parentNode)mo.parentNode.removeChild(mo);}
  $("pab-close").addEventListener("click",closeMo);$("pab-cancel").addEventListener("click",closeMo);
  mo.addEventListener("click",function(e){if(e.target===mo)closeMo();});
  $("pab-save").addEventListener("click",function(){
    var teamId=$("pab-team").value;
    var team=null;for(var i=0;i<TEAMS.length;i++){if(TEAMS[i].id===teamId){team=TEAMS[i];break;}}
    var raw=($("pab-list").value||"");
    var names=raw.split("\n").map(function(s){return s.trim();}).filter(function(s){return s.length>0;});
    if(!names.length){$("pab-err").style.display="block";$("pab-err").textContent="Pega al menos un nombre.";return;}
    var existing=getPlayers_raw().filter(function(p){var t=teamInSeason(p,S.season)||teamNow(p);return t&&t.teamId===team.id;}).map(function(p){return p.fullName.trim().toLowerCase();});
    var seen={};var toAdd=[];var skipped=[];
    names.forEach(function(n){
      var key=n.toLowerCase();
      if(existing.indexOf(key)!==-1||seen[key]){skipped.push(n);return;}
      seen[key]=true;toAdd.push(n);
    });
    if(!toAdd.length){$("pab-err").style.display="block";$("pab-err").textContent="Todos esos nombres ya están en "+team.name+".";return;}
    var saveBtn=$("pab-save");saveBtn.disabled=true;saveBtn.textContent="Añadiendo...";
    var done=0,total=toAdd.length;
    toAdd.forEach(function(name){
      var newP={fullName:name,active:true,teamHistory:[{teamId:team.id,teamName:team.name,season:S.season,from:new Date().toISOString().slice(0,10),to:null}]};
      if(window._db&&window._fbUser){
        var fns=window._fbFns;
        fns.addDoc(fns.collection(window._db,"players"),newP).then(function(ref){
          newP.id=ref.id;if(!window._players)window._players=[];window._players.push(newP);
        }).catch(function(e){console.error(e);}).finally(function(){done++;if(done===total)finish();});
      } else {
        newP.id=gid();if(!window._players)window._players=[];window._players.push(newP);
        done++;if(done===total)finish();
      }
    });
    function finish(){
      var msg="✅ "+toAdd.length+" jugador"+(toAdd.length>1?"es":"")+" añadido"+(toAdd.length>1?"s":"");
      if(skipped.length)msg+=" ("+skipped.length+" ya existían, omitidos)";
      toast(msg);closeMo();renderJugadores();
    }
  });
}

function genRoster(players,curSea,newSea){
  return players.filter(function(p){return p.active;}).map(function(p){
    var cur=teamInSeason(p,curSea)||teamNow(p);if(!cur)return null;
    var curT=null,nextT=null;
    for(var i=0;i<TEAMS.length;i++){if(TEAMS[i].id===cur.teamId){curT=TEAMS[i];break;}}
    if(curT){for(var j=0;j<TEAMS.length;j++){if(TEAMS[j].order===curT.order+1){nextT=TEAMS[j];break;}}}
    return{playerId:p.id,fullName:p.fullName,curTeamId:cur.teamId,curTeamName:cur.teamName,teamId:nextT?nextT.id:cur.teamId,teamName:nextT?nextT.name:cur.teamName,hasNext:!!nextT,keep:true};
  }).filter(function(x){return x!==null;});
}

function openNewSeasonWizard(curSea,newSea){
  var roster=genRoster(getPlayersBySeason(curSea),curSea,newSea);
  var ov=document.createElement("div");ov.className="mo";
  var rows=roster.map(function(e,i){
    var teamOpts=TEAMS.map(function(t){return'<option value="'+t.id+'"'+(t.id===e.teamId?" selected":"")+">"+esc(t.name)+"</option>";}).join("");
    return'<div class="ri" id="ri-'+i+'">'+
      '<label class="ri-cl"><input type="checkbox" class="rk" data-i="'+i+'" checked/>'+
      '<span class="ri-name">'+esc(e.fullName)+"</span></label>"+
      '<div class="ri-teams"><span class="ri-from">'+esc(e.curTeamName)+'</span>'+
      '<span class="ri-arr">'+(e.hasNext?"→":"↻")+"</span>"+
      '<select class="ri-sel" data-i="'+i+'">'+teamOpts+"</select></div></div>";
  }).join("");
  ov.innerHTML='<div class="modal modal-tall" role="dialog"><button class="mcl" id="ws-cl">×</button>'+
    '<div class="mtitle">Nueva temporada '+newSea+'</div>'+
    '<p class="msub">Revisa los ascensos. Desmarca los que no continúen.</p>'+
    '<div class="rl">'+rows+'</div>'+
    '<div id="ws-err" class="ferr" style="display:none"></div>'+
    '<div class="mact">'+
    '<button class="btn btn-ghost" id="ws-can">Cancelar</button>'+
    '<button class="btn btn-gold" id="ws-ok">✓ Crear temporada '+newSea+'</button>'+
    '</div></div>';
  document.body.appendChild(ov);
  function closeOv(){if(ov.parentNode)ov.parentNode.removeChild(ov);}
  $("ws-cl").addEventListener("click",closeOv);$("ws-can").addEventListener("click",closeOv);
  $("ws-ok").addEventListener("click",function(){
    var start=newSea.split("-")[0]+"-09-01";
    roster.forEach(function(entry,i){
      var cb=ov.querySelector('.rk[data-i="'+i+'"]');
      var sel=ov.querySelector('.ri-sel[data-i="'+i+'"]');
      var keep=cb?cb.checked:true;
      var teamId=sel?sel.value:entry.teamId;
      var teamName="";for(var t=0;t<TEAMS.length;t++){if(TEAMS[t].id===teamId){teamName=TEAMS[t].name;break;}}
      var p=null;for(var j=0;j<getPlayers_raw().length;j++){if(getPlayers_raw()[j].id===entry.playerId){p=getPlayers_raw()[j];break;}}
      if(!p)return;
      if(!keep){p.active=false;p.teamHistory=p.teamHistory.map(function(h){return h.to===null?Object.assign({},h,{to:start}):h;});}
      else{
        p.teamHistory=p.teamHistory.map(function(h){return h.to===null?Object.assign({},h,{to:start}):h;});
        p.teamHistory.push({teamId:teamId,teamName:teamName,season:newSea,from:start,to:null});
      }
      if(window._db&&window._fbUser){
        var fns=window._fbFns;
        fns.setDoc(fns.doc(window._db,"players",p.id),Object.assign({},p)).catch(function(e){console.error("player save:",e);});
      }
    });
    if(_seasons.indexOf(newSea)===-1)_seasons.push(newSea);
    if(window._db&&window._fbUser){
      var fns2=window._fbFns;
      fns2.setDoc(fns2.doc(window._db,"meta","app"),{seasons:_seasons},{merge:true}).catch(function(e){console.error("meta save:",e);});
    }
    S.season=newSea;
    renderSeasonSel();
    toast("✅ Temporada "+newSea+" creada");
    closeOv();route("jugadores");
  });
}

// ── STATS ──
function renderStats(){S.statsSearch="";S.statsPlayer=null;renderStatsMain();}
function renderStatsMain(){
  var allCs=getCallups({});
  var allStats=buildStats(allCs).filter(function(s){return s.total>0;});
  var q=(S.statsSearch||"").toLowerCase();
  var filtered=q?allStats.filter(function(s){return s.player.fullName.toLowerCase().indexOf(q)!==-1;}):allStats;
  var h='<div class="vh"><h1 class="vt">Estadísticas</h1></div>'+
    '<input class="fi" id="stats-search" type="text" placeholder="🔍 Buscar jugador..." value="'+esc(S.statsSearch||"")+'" style="margin-bottom:14px;font-size:15px" autocomplete="off"/>'+
    '<div id="stats-list">';
  if(!filtered.length){h+=emptyState(q?"Sin resultados":"Sin convocatorias registradas","📊");}
  else{
    h+=filtered.map(function(s,i){
      var cur=teamNow(s.player);
      var barW=filtered[0].total>0?Math.round((s.total/filtered[0].total)*100):100;
      return'<div class="stc2" data-pid="'+s.player.id+'">'+
        '<div class="stc2-top">'+
        '<div class="stc2-rank">#'+(i+1)+'</div>'+
        '<div class="stc2-info"><div class="stc2-name">'+esc(s.player.fullName)+'</div><div class="stc2-team">'+esc(cur?cur.teamName:"—")+"</div></div>"+
        '<div class="stc2-right"><div class="stc2-tot">'+s.total+"</div>"+
        '<div class="stc2-chips">'+(s.mad?'<span class="bb bb-m">MAD '+s.mad+"</span>":"")+(s.esp?'<span class="bb bb-e">ESP '+s.esp+"</span>":"")+(s.intl?'<span class="bb bb-i">INT '+s.intl+"</span>":"")+"</div></div></div>"+
        '<div class="stc2-bar"><div class="stc2-bar-fill" style="width:'+barW+'%"></div></div></div>';
    }).join("");
  }
  h+='</div>';
  $("main").innerHTML=h;
  var inp=$("stats-search");
  if(inp){inp.addEventListener("input",function(){S.statsSearch=inp.value;renderStatsMain();});if(S.statsSearch)setTimeout(function(){inp.focus();inp.setSelectionRange(9999,9999);},50);}
  document.querySelectorAll(".stc2").forEach(function(el){el.addEventListener("click",function(){S.statsPlayer=el.dataset.pid;renderPlayerDetail(el.dataset.pid);});});
}

function renderPlayerDetail(pid){
  var player=null;for(var i=0;i<getPlayers_raw().length;i++){if(getPlayers_raw()[i].id===pid){player=getPlayers_raw()[i];break;}}if(!player)return;
  var allCs=getCallups({}).filter(function(c){return c.players&&c.players.some(function(p){return p.playerId===pid;});});
  allCs=sortDate(allCs,"asc");
  var total=allCs.length,mad=0,esp=0,intl=0;
  var bySea={},cats={};
  allCs.forEach(function(c){
    var k=selKey(c.selectionType);if(k==="madrilena")mad++;else if(k==="espanola")esp++;else intl++;
    if(!bySea[c.season])bySea[c.season]={total:0,mad:0,esp:0,intl:0};
    bySea[c.season].total++;if(k==="madrilena")bySea[c.season].mad++;else if(k==="espanola")bySea[c.season].esp++;else bySea[c.season].intl++;
    var ck=k+"|"+c.selectionCategory+(c.pais?"|"+c.pais:"");
    if(!cats[ck])cats[ck]={type:k,cat:c.selectionCategory,pais:c.pais||null,count:0};cats[ck].count++;
  });
  var catList=Object.keys(cats).map(function(k){return cats[k];}).sort(function(a,b){return b.count-a.count;});
  var cur=teamNow(player);var maxSea=0;
  Object.keys(bySea).forEach(function(s){if(bySea[s].total>maxSea)maxSea=bySea[s].total;});
  var h='<div class="vh"><button class="btn-back" id="btn-back-stats">← Rankings</button><h1 class="vt" style="margin-top:6px">'+esc(player.fullName)+'</h1><span class="vs">'+esc(cur?cur.teamName:"—")+"</span></div>"+
    '<div class="pd-summary">'+
    '<div class="pd-sum-item"><div class="pd-sum-n">'+total+'</div><div class="pd-sum-l">Total</div></div>'+
    (mad?'<div class="pd-sum-item pd-sum-mad"><div class="pd-sum-n">'+mad+'</div><div class="pd-sum-l">Madrileña</div></div>':"")+
    (esp?'<div class="pd-sum-item pd-sum-esp"><div class="pd-sum-n">'+esp+'</div><div class="pd-sum-l">Española</div></div>':"")+
    (intl?'<div class="pd-sum-item pd-sum-int"><div class="pd-sum-n">'+intl+'</div><div class="pd-sum-l">Internacional</div></div>':"")+
    "</div>"+
    (catList.length?'<div class="pd-section"><div class="pd-sec-title">Selecciones</div><div class="pd-cats">'+
      catList.map(function(ct){
        var sel=SELS[ct.type];var col=(sel&&sel.colors&&sel.colors[ct.cat])?sel.colors[ct.cat]:{badge:"#1A3A8F"};
        var flag=getSelFlag(ct.type,ct.pais);
        var label=(CAT[ct.cat]||ct.cat)+(ct.pais?" "+paisAdj(ct.pais):" "+(sel?sel.short:""));
        return'<div class="pd-cat-pill" style="border-color:'+col.badge+'">'+
          '<span class="pd-cat-flag">'+flag+'</span><span class="pd-cat-label">'+label+'</span>'+
          '<span class="pd-cat-count" style="background:'+col.badge+'">'+ct.count+"</span></div>";
      }).join("")+"</div></div>":"")+
    (Object.keys(bySea).length?'<div class="pd-section"><div class="pd-sec-title">Evolución por temporada</div><div class="pd-seasbars">'+
      Object.keys(bySea).sort().map(function(sea){
        var d=bySea[sea];var pct=maxSea>0?Math.round((d.total/maxSea)*100):100;
        return'<div class="pd-sb"><div class="pd-sb-bar-wrap"><div class="pd-sb-bar" style="height:'+pct+'%">'+
          (d.mad?'<div class="pd-sb-seg pd-sb-mad" style="flex:'+d.mad+'"></div>':"")+
          (d.esp?'<div class="pd-sb-seg pd-sb-esp" style="flex:'+d.esp+'"></div>':"")+
          (d.intl?'<div class="pd-sb-seg pd-sb-int" style="flex:'+d.intl+'"></div>':"")+
          '</div></div><div class="pd-sb-n">'+d.total+'</div><div class="pd-sb-sea">'+sea.replace("20","").replace("-","/")+' </div></div>';
      }).join("")+"</div></div>":"")+
    '<div class="pd-section"><div class="pd-sec-title">Convocatorias ('+total+')</div><div class="pd-list">'+
    (allCs.length?[].concat(allCs).reverse().map(function(conv){
      var k=selKey(conv.selectionType);var sel=SELS[k];
      var col=(sel&&sel.colors&&sel.colors[conv.selectionCategory])?sel.colors[conv.selectionCategory]:{badge:"#1A3A8F"};
      return'<div class="pd-conv-item" data-id="'+conv.id+'">'+
        '<span class="pd-conv-flag">'+getSelFlag(conv.selectionType,conv.pais)+'</span>'+
        '<div class="pd-conv-info"><div class="pd-conv-title">'+esc(conv.title)+'</div>'+
        '<div class="pd-conv-meta"><span class="badge" style="background:'+col.badge+';color:#fff;font-size:9px;padding:2px 6px">'+(CAT[conv.selectionCategory]||conv.selectionCategory)+"</span> "+fmtRange(conv.startDate,conv.endDate)+"</div></div>"+
        '<span class="pd-conv-sea">'+conv.season+"</span></div>";
    }).join(""):emptyState("Sin convocatorias","📋"))+"</div></div>";
  $("main").innerHTML=h;
  $("btn-back-stats").addEventListener("click",function(){renderStatsMain();});
  document.querySelectorAll(".pd-conv-item").forEach(function(el){el.addEventListener("click",function(){openDetail(el.dataset.id);});});
}

// ── CALENDARIO + PLANIFICACION ──
// ── CALENDARIO UNIFICADO: datos únicos → filtros → vista clásica o vertical ──
function getCalEvents(season){
  var events=[];
  getCallups({season:season}).forEach(function(c){
    var k=selKey(c.selectionType);
    var sel=SELS[k];
    var col=(sel&&sel.colors&&sel.colors[c.selectionCategory])?sel.colors[c.selectionCategory].badge:"#1A3A8F";
    events.push({id:"c_"+c.id,kind:"callup",tipoKey:"conv",selType:k,selCat:c.selectionCategory,
      title:c.title,startDate:c.startDate,endDate:c.endDate||c.startDate,color:col,raw:c});
  });
  getRefDates_raw().forEach(function(r){
    if(!r.startDate)return;
    var tipoKey=(r.tipo||"").trim().toLowerCase();
    var parts=[];
    if(r.cat)parts.push(CAT[r.cat]||r.cat);
    if(r.title)parts.push(r.title);
    if(!parts.length)parts.push(r.tipo);
    var baseColor=r.color||"#888";
    var shaded=r.cat?shadeColorForCat(baseColor,r.cat,getCatsForTipo(r.tipo)):baseColor;
    events.push({id:"f_"+r.id,kind:"fecha",tipoKey:tipoKey,tipoLabel:r.tipo,selType:null,selCat:null,
      title:parts.join(" · "),startDate:r.startDate,endDate:r.endDate||r.startDate,color:shaded,raw:r});
  });
  return events;
}
function calEventSelKey(e){
  if(e.selType==="madrilena")return"mad:*";
  if(e.selType==="internacional")return"int:*";
  if(e.selType==="espanola")return"esp:"+e.selCat;
  return null;
}
function calAvailableTipos(events){
  var seen={};var list=[];
  events.forEach(function(e){
    var key=e.kind==="callup"?"conv":e.tipoKey;
    var label=e.kind==="callup"?"Convocatorias":(e.tipoLabel||key);
    var color=e.kind==="callup"?"#1A3A8F":e.raw.color;
    if(key&&!seen[key]){seen[key]=1;list.push({key:key,label:label,color:color,tipoLabel:e.tipoLabel||""});}
  });
  list.sort(function(a,b){
    if(a.key==="conv")return-1;if(b.key==="conv")return 1;
    return getTipoOrder(a.tipoLabel)-getTipoOrder(b.tipoLabel);
  });
  return list;
}
function calAvailableSels(events){
  var seen={};var list=[];
  events.forEach(function(e){
    if(e.kind!=="callup")return;
    var key=calEventSelKey(e);if(!key)return;
    var label=e.selType==="madrilena"?"Selecciones territoriales":e.selType==="internacional"?"Internacional":"España "+(CAT[e.selCat]||e.selCat);
    if(!seen[key]){seen[key]=1;list.push({key:key,label:label,color:e.color});}
  });
  list.sort(function(a,b){return a.label.localeCompare(b.label);});
  return list;
}
function calAvailableCats(){
  var activeTipos=S.calFilterTipo.filter(function(k){return k!=="conv";});
  if(!activeTipos.length)return[];
  var set={};
  activeTipos.forEach(function(tk){
    var cats=getRefDates_raw().find(function(r){return(r.tipo||"").trim().toLowerCase()===tk&&r.cats&&r.cats.length;});
    if(cats)cats.cats.forEach(function(c){set[c]=1;});
  });
  return catsDesc(Object.keys(set));
}
function calEventOrderKey(e){
  if(e.kind==="callup")return[-1,0];
  var order=Object.keys(CAT).filter(function(k){return k!=="todas";});
  var catIdx=e.raw&&e.raw.cat?order.indexOf(e.raw.cat):order.length;
  return[getTipoOrder(e.tipoLabel||""),-catIdx];
}
function calEventOrderCompare(a,b){
  var ka=calEventOrderKey(a),kb=calEventOrderKey(b);
  return ka[0]-kb[0]||ka[1]-kb[1];
}
function calMatchesFilters(e){
  if(S.calFilterTipo.length){
    var tk=e.kind==="callup"?"conv":e.tipoKey;
    if(S.calFilterTipo.indexOf(tk)===-1)return false;
  }
  if(S.calFilterSel.length&&e.kind==="callup"){
    var sk=calEventSelKey(e);
    if(!sk||S.calFilterSel.indexOf(sk)===-1)return false;
  }
  if(S.calFilterCat.length&&e.kind==="fecha"){
    if(!e.raw.cat||S.calFilterCat.indexOf(e.raw.cat)===-1)return false;
  }
  return true;
}

function renderCalendarioPlan(){
  $("main").innerHTML='<div id="cpt-content"></div>';
  renderCalMain();
}

function calSwitchMode(mode){
  var cpt=$("cpt-content");
  if(cpt)window.scrollTo({top:cpt.getBoundingClientRect().top+window.scrollY-8,behavior:"auto"});
  S.calMode=mode;
  renderCalMain();
}
function loadHtml2Canvas(cb){
  if(window.html2canvas){cb();return;}
  var s=document.createElement("script");
  s.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
  s.onload=function(){cb();};
  s.onerror=function(){toast("❌ No se pudo cargar el generador de imagen (revisa tu conexión)");};
  document.head.appendChild(s);
}

function exportFechasPNG(filtro){
  var wrap=document.querySelector("#cal-body .cl");
  if(!wrap){toast("No hay nada que exportar");return;}
  var isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  var label=filtro?filtro:"todas";
  var w=null;
  if(isMobile){
    w=window.open();
    if(w){w.document.write('<title>Fechas</title><body style="margin:0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#666">Generando imagen…</body>');w.document.close();}
  }
  toast("Generando imagen...");
  loadHtml2Canvas(function(){
    var bg=getComputedStyle(document.body).backgroundColor||"#ffffff";
    html2canvas(wrap,{backgroundColor:bg,scale:2,useCORS:true,width:wrap.scrollWidth,height:wrap.scrollHeight,windowWidth:wrap.scrollWidth,x:0,y:0}).then(function(canvas){
      if(isMobile){
        var dataUrl=canvas.toDataURL("image/png");
        if(w&&!w.closed){
          w.document.open();
          w.document.write('<title>Fechas</title><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center"><img src="'+dataUrl+'" style="max-width:100%;height:auto"/></body>');
          w.document.close();
          toast("📷 Mantén pulsada la imagen para guardarla");
        } else {
          toast("❌ El navegador bloqueó la ventana. Permite pop-ups para ver la imagen.");
        }
      } else {
        var link=document.createElement("a");
        link.download="fechas-"+label+".png";
        link.href=canvas.toDataURL("image/png");
        link.click();
        toast("✅ Imagen descargada");
      }
    }).catch(function(e){console.error(e);toast("❌ Error generando la imagen");if(w&&!w.closed)w.close();});
  });
}

function exportCalendarPNG(season){
  var wrap=document.querySelector("#cal-body .calv-wrap");
  if(!wrap){toast("No hay nada que exportar");return;}
  var isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  var w=null;
  if(isMobile){
    w=window.open();
    if(w){w.document.write('<title>Calendario '+esc(season)+'</title><body style="margin:0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#666">Generando imagen…</body>');w.document.close();}
  }
  toast("Generando imagen...");
  loadHtml2Canvas(function(){
    var bg=getComputedStyle(document.body).backgroundColor||"#ffffff";
    html2canvas(wrap,{backgroundColor:bg,scale:2,useCORS:true,width:wrap.scrollWidth,height:wrap.scrollHeight,windowWidth:wrap.scrollWidth,x:0,y:0}).then(function(canvas){
      if(isMobile){
        var dataUrl=canvas.toDataURL("image/png");
        if(w&&!w.closed){
          w.document.open();
          w.document.write('<title>Calendario '+esc(season)+'</title><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center"><img src="'+dataUrl+'" style="max-width:100%;height:auto"/></body>');
          w.document.close();
          toast("📷 Mantén pulsada la imagen para guardarla");
        } else {
          toast("❌ El navegador bloqueó la ventana. Permite pop-ups para ver la imagen.");
        }
      } else {
        var link=document.createElement("a");
        link.download="calendario-"+season+".png";
        link.href=canvas.toDataURL("image/png");
        link.click();
        toast("✅ Imagen descargada");
      }
    }).catch(function(e){console.error(e);toast("❌ Error generando la imagen");if(w&&!w.closed)w.close();});
  });
}

function exportCalendarPDF(season){
  var body=$("cal-body");
  if(!body||!body.querySelector(".calv-wrap")){toast("No hay nada que exportar");return;}
  var activeChips=[];
  document.querySelectorAll("#cpt-content .fbtn.on").forEach(function(b){
    if(b.id!=="cal-todos")activeChips.push(b.textContent.trim());
  });
  var win=window.open("","_blank","width=1400,height=900");
  if(!win){toast("El navegador bloqueó la ventana emergente. Permite pop-ups para exportar.");return;}
  win.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Calendario '+esc(season)+'</title><style>'+
    '*{box-sizing:border-box}'+
    'body{font-family:Arial,sans-serif;padding:14px;color:#111}'+
    '.hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #2563eb;padding-bottom:8px;margin-bottom:14px}'+
    '.hdr h1{font-size:16pt;margin:0 0 3px}'+
    '.hdr p{font-size:9pt;color:#555;margin:0}'+
    '.rm-logo{font-weight:700;color:#2563eb;font-size:11pt}'+
    '.calv-wrap{border:1px solid #ccc;padding:6px}'+
    '.calv-grid{display:flex;gap:0;border-left:1px solid #ccc;border-top:1px solid #ccc}'+
    '.calv-col{flex:1;min-width:90px;position:relative}'+
    '.calv-mhdr{text-align:center;font-weight:700;padding:5px 0;background:#f2f4f7;font-size:9pt;text-transform:uppercase;border-right:1px solid #ccc;border-bottom:1px solid #ccc}'+
    '.calv-body{position:relative;border-right:1px solid #ccc}'+
    '.calv-row{display:flex;align-items:center;gap:3px;padding:0 4px;font-size:7.5pt;color:#666;border-bottom:1px solid #eee;box-sizing:border-box}'+
    '.calv-dow{width:9px;font-weight:700;flex-shrink:0;border-right:1px solid #eee;height:100%;display:flex;align-items:center}'+
    '.calv-dn2{min-width:13px;flex-shrink:0}'+
    '.calv-bars-layer{position:absolute;top:0;left:32px;right:0;bottom:0}'+
    '.calv-bar{position:absolute;border-radius:2px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1px rgba(0,0,0,.15)}'+
    '.calv-bar-label{writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);font-size:7pt;font-weight:700;letter-spacing:.2px;white-space:nowrap;overflow:hidden}'+
    '@media print{@page{size:landscape;margin:8mm}}'+
    "</style></head><body>"+
    '<div class="hdr"><div><h1>Calendario de Fechas</h1><p>Temporada '+esc(season)+(activeChips.length?" · Filtro: "+esc(activeChips.join(", ")):" · Sin filtros (todo visible)")+'</p></div><div class="rm-logo">Real Madrid Cantera</div></div>'+
    body.querySelector(".calv-wrap").outerHTML+
    "</body></html>");
  win.document.close();
  win.focus();
  setTimeout(function(){win.print();},400);
}

function renderCalMain(){
  var season=S.season;
  var h='<div class="view-toggle">'+
    '<button class="vtbtn'+(S.calMode==="vertical"?" on":"")+'" id="cm-vertical">📊 Temporada</button>'+
    '<button class="vtbtn'+(S.calMode==="clasico"?" on":"")+'" id="cm-clasico">🗓️ Mensual</button>'+
    "</div>";
  h+='<div style="display:flex;gap:8px;align-items:center;margin:8px 0 12px;flex-wrap:wrap">'+
    '<button class="btn btn-ghost btn-sm" id="cm-fechas">'+(S.calMode==="fechas"?"× Cerrar":"+ Nuevas fechas")+"</button>"+
    (S.calMode==="vertical"?'<button class="btn btn-ghost btn-sm" id="cm-export">📷 Exportar PNG</button>':"")+
    "</div>";

  if(S.calMode==="fechas"){
    h+='<div id="cal-body"></div>';
    var target0=$("cpt-content");if(!target0)return;
    target0.innerHTML=h;
    $("cm-clasico").addEventListener("click",function(){calSwitchMode("clasico");});
    $("cm-vertical").addEventListener("click",function(){calSwitchMode("vertical");});
    $("cm-fechas").addEventListener("click",function(){calSwitchMode("vertical");});
    renderFechas();
    return;
  }

  var events=getCalEvents(season);
  var tipos=calAvailableTipos(events);
  var sels=calAvailableSels(events);
  var cats=calAvailableCats();
  var anyFilter=S.calFilterTipo.length||S.calFilterSel.length||S.calFilterCat.length;

  h+='<div class="fb"><button class="fbtn'+(!anyFilter?" on":"")+'" id="cal-todos">Todos</button></div>';
  if(tipos.length){
    h+='<div class="cal-fgroup"><span class="cal-fglabel">Tipo</span><div class="fb">'+
      tipos.map(function(t){return'<button class="fbtn'+(S.calFilterTipo.indexOf(t.key)!==-1?" on":"")+'" data-tipo="'+esc(t.key)+'"><span class="fbtn-dot" style="background:'+(t.color||"#999")+'"></span>'+esc(t.label)+"</button>";}).join("")+
      "</div></div>";
  }
  if(cats.length){
    h+='<div class="cal-fgroup"><span class="cal-fglabel">Subcategoría</span><div class="fb">'+
      cats.map(function(c){return'<button class="fbtn'+(S.calFilterCat.indexOf(c)!==-1?" on":"")+'" data-cat="'+esc(c)+'">'+esc(CAT[c]||c)+"</button>";}).join("")+
      "</div></div>";
  }
  if(sels.length){
    h+='<div class="cal-fgroup"><span class="cal-fglabel">Selección</span><div class="fb">'+
      sels.map(function(s){return'<button class="fbtn'+(S.calFilterSel.indexOf(s.key)!==-1?" on":"")+'" data-sel="'+esc(s.key)+'"><span class="fbtn-dot" style="background:'+(s.color||"#999")+'"></span>'+esc(s.label)+"</button>";}).join("")+
      "</div></div>";
  }
  if(anyFilter)h+='<button class="btn btn-ghost btn-sm" id="cal-clear" style="margin-bottom:12px">Limpiar filtros</button>';
  h+='<div id="cal-body"></div>';

  var target=$("cpt-content");if(!target)return;
  target.innerHTML=h;

  $("cm-clasico").addEventListener("click",function(){calSwitchMode("clasico");});
  $("cm-vertical").addEventListener("click",function(){calSwitchMode("vertical");});
  $("cm-fechas").addEventListener("click",function(){calSwitchMode("fechas");});
  var exportBtn=$("cm-export");if(exportBtn)exportBtn.addEventListener("click",function(){exportCalendarPNG(season);});
  $("cal-todos").addEventListener("click",function(){S.calFilterTipo=[];S.calFilterSel=[];S.calFilterCat=[];renderCalMain();});
  var clearBtn=$("cal-clear");if(clearBtn)clearBtn.addEventListener("click",function(){S.calFilterTipo=[];S.calFilterSel=[];S.calFilterCat=[];renderCalMain();});
  target.querySelectorAll("[data-tipo]").forEach(function(b){b.addEventListener("click",function(){
    var k=b.dataset.tipo;var i=S.calFilterTipo.indexOf(k);
    if(i===-1)S.calFilterTipo.push(k);else S.calFilterTipo.splice(i,1);
    S.calFilterCat=[];
    renderCalMain();
  });});
  target.querySelectorAll("[data-cat]").forEach(function(b){b.addEventListener("click",function(){
    var k=b.dataset.cat;var i=S.calFilterCat.indexOf(k);
    if(i===-1)S.calFilterCat.push(k);else S.calFilterCat.splice(i,1);
    renderCalMain();
  });});
  target.querySelectorAll("[data-sel]").forEach(function(b){b.addEventListener("click",function(){
    var k=b.dataset.sel;var i=S.calFilterSel.indexOf(k);
    if(i===-1)S.calFilterSel.push(k);else S.calFilterSel.splice(i,1);
    renderCalMain();
  });});

  var filtered=events.filter(calMatchesFilters);
  if(S.calMode==="clasico")renderCalClasico(filtered);else renderCalVertical(filtered,season);
}

function calDayPanelHtml(ds,dayEvents,dayMatches){
  var dt=new Date(ds+"T12:00:00");
  var rows=dayEvents.map(function(e){
    return'<div class="cal-ev-item" data-kind="'+e.kind+'" data-id="'+(e.raw.id||"")+'">'+
      '<span class="cal-ev-flag">'+(e.kind==="callup"?getSelFlag(e.raw.selectionType,e.raw.pais):"🗓️")+'</span>'+
      '<div class="cal-ev-info"><div class="cal-ev-title">'+esc(e.title)+'</div>'+
      '<div class="cal-ev-dates">'+fmtRange(e.startDate,e.endDate)+"</div></div></div>";
  }).join("");
  var mrows=(dayMatches||[]).map(function(x){
    return'<div class="cal-ev-item"><span class="cal-ev-flag">'+matchIcon(x.match.matchType)+'</span>'+
      '<div class="cal-ev-info"><div class="cal-ev-title">'+(x.match.matchType==="entrenamiento"?"":"vs ")+esc(x.match.rival||"Por confirmar")+'</div>'+
      '<div class="cal-ev-dates">'+esc(x.conv.title)+(x.match.time?" · "+x.match.time+"h":"")+"</div></div></div>";
  }).join("");
  return'<div class="cal-panel-date">'+dt.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})+"</div>"+rows+mrows;
}

var FIXED_LANE_ORDER=[
  {label:"FIFA",match:function(e){return e.kind==="fecha"&&(e.tipoLabel||"").trim().toLowerCase()==="fifa";}},
  {label:"España U21",match:function(e){return e.kind==="callup"&&e.raw.selectionType==="espanola"&&e.raw.selectionCategory==="sub21";}},
  {label:"España U20",match:function(e){return e.kind==="callup"&&e.raw.selectionType==="espanola"&&e.raw.selectionCategory==="sub20";}},
  {label:"España U19",match:function(e){return e.kind==="callup"&&e.raw.selectionType==="espanola"&&e.raw.selectionCategory==="sub19";}},
  {label:"España U18",match:function(e){return e.kind==="callup"&&e.raw.selectionType==="espanola"&&e.raw.selectionCategory==="sub18";}},
  {label:"España U17",match:function(e){return e.kind==="callup"&&e.raw.selectionType==="espanola"&&e.raw.selectionCategory==="sub17";}},
  {label:"España U16",match:function(e){return e.kind==="callup"&&e.raw.selectionType==="espanola"&&e.raw.selectionCategory==="sub16";}},
  {label:"España U15",match:function(e){return e.kind==="callup"&&e.raw.selectionType==="espanola"&&e.raw.selectionCategory==="sub15";}},
  {label:"España U14",match:function(e){return e.kind==="callup"&&e.raw.selectionType==="espanola"&&e.raw.selectionCategory==="sub14";}},
  {label:"Madrileña U16",match:function(e){return e.kind==="callup"&&e.raw.selectionType==="madrilena"&&e.raw.selectionCategory==="sub16";}},
  {label:"Madrileña U14",match:function(e){return e.kind==="callup"&&e.raw.selectionType==="madrilena"&&e.raw.selectionCategory==="sub14";}},
  {label:"Madrileña U12",match:function(e){return e.kind==="callup"&&e.raw.selectionType==="madrilena"&&e.raw.selectionCategory==="sub12";}}
];
function calGroupKey(e){
  if(e.kind==="callup")return"c|"+(e.raw.selectionType||"")+"|"+(e.raw.selectionCategory||"");
  return"f|"+(e.tipoLabel||"")+"|"+(e.raw.cat||"");
}
function fixedLaneIndex(e){
  for(var i=0;i<FIXED_LANE_ORDER.length;i++){if(FIXED_LANE_ORDER[i].match(e))return i;}
  return-1;
}
function computeGlobalLanes(allEvents){
  var base=FIXED_LANE_ORDER.length;
  var seen={};var extra=[];
  allEvents.slice().sort(function(a,b){return calEventOrderCompare(a,b)||a.startDate.localeCompare(b.startDate);}).forEach(function(e){
    if(fixedLaneIndex(e)!==-1)return;
    var k=calGroupKey(e);
    if(!seen[k]){seen[k]=1;extra.push(e);}
  });
  var laneOfExtraKey={};
  extra.forEach(function(e,i){laneOfExtraKey[calGroupKey(e)]=base+i;});
  return{laneOfExtraKey:laneOfExtraKey,laneCount:base+extra.length};
}
function laneForEvent(e,global){
  var fi=fixedLaneIndex(e);
  if(fi!==-1)return fi;
  var k=calGroupKey(e);
  return global.laneOfExtraKey[k]!==undefined?global.laneOfExtraKey[k]:global.laneCount-1;
}
function renderCalVertical(events,season){
  var startYear=parseInt(season.split("-")[0]);
  var today=new Date();var ty=today.getFullYear(),tm=today.getMonth(),td=today.getDate();
  var monthNames=["Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre","Enero","Febrero","Marzo","Abril","Mayo","Junio"];
  var dowLetters=["L","M","X","J","V","S","D"];
  var months=[];
  for(var m=6;m<18;m++){var y=startYear+(m>=12?1:0);var mo=m%12;months.push({year:y,month:mo,label:monthNames[m-6]});}
  var ROWH=34;
  var LANEW=10;
  var pad2=function(n){return String(n).padStart(2,"0");};
  var global=computeGlobalLanes(events);
  var laneCount=global.laneCount;
  var colWidth=36+laneCount*LANEW;
  var colsHtml=months.map(function(mn){
    var y=mn.year,mo=mn.month;
    var daysInMonth=new Date(y,mo+1,0).getDate();
    var monthStart=y+"-"+pad2(mo+1)+"-01";
    var monthEnd=y+"-"+pad2(mo+1)+"-"+pad2(daysInMonth);
    var rowsHtml="";
    for(var d=1;d<=daysInMonth;d++){
      var dow=(new Date(y,mo,d).getDay()+6)%7;
      var isToday=(y===ty&&mo===tm&&d===td);
      rowsHtml+='<div class="calv-row'+(isToday?" calv-today":"")+'" style="height:'+ROWH+'px"><span class="calv-dow">'+dowLetters[dow]+'</span><span class="calv-dn2">'+d+"</span></div>";
    }
    var monthEvents=events.filter(function(e){return e.startDate<=monthEnd&&e.endDate>=monthStart;});
    var barsHtml=monthEvents.map(function(e){
      var s=e.startDate<monthStart?monthStart:e.startDate;
      var en=e.endDate>monthEnd?monthEnd:e.endDate;
      var sd=parseInt(s.split("-")[2],10),ed=parseInt(en.split("-")[2],10);
      var top=(sd-1)*ROWH,height=(ed-sd+1)*ROWH-2;
      var lane=laneForEvent(e,global);
      var leftPx=36+lane*LANEW;
      return'<div class="calv-bar" data-kind="'+e.kind+'" data-id="'+(e.raw.id||"")+'" style="top:'+top+'px;height:'+height+'px;left:'+leftPx+'px;width:'+(LANEW-2)+'px;background:'+e.color+'" title="'+esc(e.title)+" · "+fmtRange(e.startDate,e.endDate)+'"><span class="calv-bar-label" style="color:'+contrastText(e.color)+'">'+esc(e.title)+"</span></div>";
    }).join("");
    return'<div class="calv-col" style="min-width:'+colWidth+'px;width:'+colWidth+'px;flex:0 0 '+colWidth+'px"><div class="calv-mhdr">'+mn.label+" "+y+'</div><div class="calv-body" style="height:'+(daysInMonth*ROWH)+'px">'+rowsHtml+'<div class="calv-bars-layer" style="left:0">'+barsHtml+"</div></div></div>";
  }).join("");
  var h='<div class="calv-wrap"><div class="calv-grid">'+colsHtml+"</div></div>"+
    '<div id="cal-panel" class="cal-panel" style="display:none"></div>';
  var target=$("cal-body");if(!target)return;
  target.innerHTML=h;
  target.querySelectorAll(".calv-bar[data-kind='callup']").forEach(function(el){el.addEventListener("click",function(){openDetail(el.dataset.id);});});
  target.querySelectorAll(".calv-bar[data-kind='fecha']").forEach(function(el){el.addEventListener("click",function(){toast("🗓️ "+el.title);});});
}

function renderCalClasico(events){
  if(S.calClasicoYear==null){var t0=new Date();S.calClasicoYear=t0.getFullYear();S.calClasicoMonth=t0.getMonth();}
  var y=S.calClasicoYear,mo=S.calClasicoMonth;
  var monthNames=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  var today=new Date();var ty=today.getFullYear(),tm=today.getMonth(),td=today.getDate();
  var first=new Date(y,mo,1).getDay();var fd=(first+6)%7;
  var days=new Date(y,mo+1,0).getDate();
  var h='<div class="cal-nav"><button class="cal-navbtn" id="cal-prev">←</button>'+
    '<span class="cal-navlabel">'+monthNames[mo]+" "+y+"</span>"+
    '<button class="cal-navbtn" id="cal-next">→</button>'+
    '<button class="btn btn-ghost btn-sm" id="cal-hoy">Hoy</button></div>';
  h+='<div class="cal-grid-big"><div class="cal-dow">L</div><div class="cal-dow">M</div><div class="cal-dow">X</div>'+
    '<div class="cal-dow">J</div><div class="cal-dow">V</div><div class="cal-dow">S</div><div class="cal-dow">D</div>';
  for(var i=0;i<fd;i++)h+='<div class="cal-day-big"></div>';
  for(var d=1;d<=days;d++){
    var ds=y+"-"+String(mo+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    var dayEvs=events.filter(function(e){return e.startDate<=ds&&e.endDate>=ds;}).sort(calEventOrderCompare);
    var isToday=(y===ty&&mo===tm&&d===td);
    var shown=dayEvs.slice(0,3);
    var chips=shown.map(function(e){return'<div class="cal-chip" style="background:'+e.color+";color:"+contrastText(e.color)+'" data-kind="'+e.kind+'" data-id="'+(e.raw.id||"")+'" title="'+esc(e.title)+'">'+esc(e.title)+"</div>";}).join("");
    var more=dayEvs.length>3?'<div class="cal-chip-more" data-ds="'+ds+'">+'+(dayEvs.length-3)+" más</div>":"";
    h+='<div class="cal-day-big'+(isToday?" cal-today":"")+'" data-ds="'+ds+'"><span class="cal-dn-big">'+d+"</span>"+chips+more+"</div>";
  }
  h+='<div id="cal-panel" class="cal-panel" style="display:none"></div>';
  var target=$("cal-body");if(!target)return;
  target.innerHTML=h;
  $("cal-prev").addEventListener("click",function(){S.calClasicoMonth--;if(S.calClasicoMonth<0){S.calClasicoMonth=11;S.calClasicoYear--;}renderCalMain();});
  $("cal-next").addEventListener("click",function(){S.calClasicoMonth++;if(S.calClasicoMonth>11){S.calClasicoMonth=0;S.calClasicoYear++;}renderCalMain();});
  $("cal-hoy").addEventListener("click",function(){var t=new Date();S.calClasicoYear=t.getFullYear();S.calClasicoMonth=t.getMonth();renderCalMain();});
  target.querySelectorAll(".cal-chip[data-kind='callup']").forEach(function(el){el.addEventListener("click",function(e){e.stopPropagation();openDetail(el.dataset.id);});});
  target.querySelectorAll(".cal-chip[data-kind='fecha']").forEach(function(el){el.addEventListener("click",function(e){e.stopPropagation();toast("🗓️ "+el.title);});});
  target.querySelectorAll(".cal-chip-more").forEach(function(el){el.addEventListener("click",function(e){
    e.stopPropagation();
    var ds=el.dataset.ds;
    var dayEvs=events.filter(function(ev){return ev.startDate<=ds&&ev.endDate>=ds;}).sort(calEventOrderCompare);
    var panel=$("cal-panel");
    panel.innerHTML=calDayPanelHtml(ds,dayEvs,[]);
    panel.style.display="block";
    panel.querySelectorAll(".cal-ev-item[data-kind='callup']").forEach(function(ei){ei.addEventListener("click",function(){openDetail(ei.dataset.id);});});
  });});
}

function renderPlanificacion(){
  var season=S.season;var pv=S.planView||"bloques";
  var rmCs=getCallups({season:season});
  var CATS=[
    {key:"abs",label:"ABS",type:"espanola"},{key:"sub21",label:"U21",type:"espanola"},
    {key:"sub20",label:"U20",type:"espanola"},{key:"sub19",label:"U19",type:"espanola"},
    {key:"sub18",label:"U18",type:"espanola"},{key:"sub17",label:"U17",type:"espanola"},
    {key:"sub16",label:"U16",type:"espanola"},{key:"sub15",label:"U15",type:"espanola"},
    {key:"sub14",label:"U14",type:"espanola"},{key:"sub14",label:"MAD",type:"madrilena"}
  ];
  var allEvs=rmCs.concat(_refEvents);
  var h='<div class="vh"><div style="display:flex;align-items:center;justify-content:space-between">'+
    '<h1 class="vt">Planificación</h1>'+
    '<div class="plan-toggle">'+
    '<button class="plan-tbtn'+(pv==="semanal"?" on":"")+'" data-pv="semanal">≡ Semanal</button>'+
    '<button class="plan-tbtn'+(pv==="bloques"?" on":"")+'" data-pv="bloques">◾ Bloques</button>'+
    '</div></div></div>';

  var startY=parseInt(season.split("-")[0]);
  var monthNames2=["Jul","Ago","Sep","Oct","Nov","Dic","Ene","Feb","Mar","Abr","May","Jun"];
  var monthStarts=monthNames2.map(function(n,i){var y=startY+(i>=6?1:0);var m=(6+i)%12;return{label:n,y:y,m:m,start:y+"-"+String(m+1).padStart(2,"0")+"-01",end:y+"-"+String(m+1).padStart(2,"0")+"-"+new Date(y,m+1,0).getDate()};});
  var activeMonths=monthStarts.filter(function(mo){return allEvs.some(function(e){return e.startDate<=mo.end&&(e.endDate||e.startDate)>=mo.start;});});
  if(!activeMonths.length)activeMonths=monthStarts;

  if(pv==="semanal"){
    var weeks=[];var cur=new Date(startY,6,1);while(cur.getDay()!==1)cur.setDate(cur.getDate()+1);
    var endDate=new Date(startY+1,5,30);
    while(cur<=endDate){var wStart=new Date(cur),wEnd=new Date(cur);wEnd.setDate(wEnd.getDate()+6);weeks.push({start:wStart,end:wEnd});cur.setDate(cur.getDate()+7);}
    h+='<div class="plan-table-wrap"><table class="plan-table"><thead><tr><th>Semana</th>';
    CATS.forEach(function(c){h+='<th>'+c.label+"</th>";});
    h+="</tr></thead><tbody>";
    weeks.forEach(function(w){
      var ws=w.start.toISOString().slice(0,10),we=w.end.toISOString().slice(0,10);
      var rowEvs=allEvs.filter(function(e){return e.startDate<=we&&(e.endDate||e.startDate)>=ws;});
      if(!rowEvs.length)return;
      h+="<tr><td>"+w.start.toLocaleDateString("es-ES",{day:"2-digit",month:"short"})+"</td>";
      CATS.forEach(function(cat){
        var ev=rowEvs.filter(function(e){return e.selectionCategory===cat.key&&selKey(e.selectionType||e.type||"")===cat.type;});
        if(ev.length){
          var e=ev[0];var k=selKey(e.selectionType||e.type||"");var cls="plan-cel-"+(k==="madrilena"?"mad":k==="espanola"?"esp":"int");
          h+='<td><div class="plan-cel '+cls+'">'+esc(e.title.length>18?e.title.slice(0,18)+"…":e.title)+"</div></td>";
        } else h+="<td></td>";
      });
      h+="</tr>";
    });
    h+="</tbody></table></div>";
  } else {
    h+='<div class="gantt">';
    CATS.forEach(function(cat){
      var catEvs=allEvs.filter(function(e){return e.selectionCategory===cat.key&&selKey(e.selectionType||e.type||"")===cat.type;});
      if(!catEvs.length)return;
      h+='<div class="gantt-row"><div class="gantt-label">'+cat.label+"</div><div class=\"gantt-bars\">";
      activeMonths.forEach(function(mo){
        var ev=catEvs.filter(function(e){return e.startDate<=mo.end&&(e.endDate||e.startDate)>=mo.start;});
        if(ev.length){
          var e=ev[0];var k=selKey(e.selectionType||e.type||"");var cls="gb-"+(k==="madrilena"?"mad":k==="espanola"?"esp":"int");
          h+='<div class="gantt-bar '+cls+'">'+esc(e.title.length>14?e.title.slice(0,14)+"…":e.title)+"</div>";
        } else h+='<div class="gantt-empty"></div>';
      });
      h+="</div></div>";
    });
    h+='<div class="gantt-months"><div class="gantt-label" style="background:var(--surface-alt,var(--off-white-3))"></div>';
    activeMonths.forEach(function(mo){h+='<div class="gantt-ml">'+mo.label+"</div>";});
    h+="</div></div>";
  }

  var planTarget=$("cpt-content");if(!planTarget)return;
  planTarget.innerHTML=h;
  planTarget.querySelectorAll("[data-pv]").forEach(function(b){
    b.addEventListener("click",function(){S.planView=b.dataset.pv;renderPlanificacion();});
  });
}

// ── FECHAS (FIFA, RFFM, etc.) ──
function renderFechas(){
  var all=getRefDates_raw().slice().sort(function(a,b){return(a.startDate||"").localeCompare(b.startDate||"");});
  var tipos=[];var seen={};
  all.forEach(function(r){var k=(r.tipo||"").trim();if(k&&!seen[k]){seen[k]=true;tipos.push(k);}});
  tipos.sort(function(a,b){return a.localeCompare(b);});
  var filtro=S.fechaTipo||"";
  var list=filtro?all.filter(function(r){return(r.tipo||"").trim()===filtro;}):all;
  var editable=canEdit();

  var groups=[];var gIdx={};
  list.forEach(function(r){
    var k=(r.tipo||"").trim()||"—";
    if(gIdx[k]===undefined){gIdx[k]=groups.length;groups.push({tipo:k,color:r.color||"#5a6170",items:[],cats:[]});}
    if(r.cats&&r.cats.length&&!groups[gIdx[k]].cats.length)groups[gIdx[k]].cats=r.cats;
    groups[gIdx[k]].items.push(r);
  });
  groups.sort(function(a,b){return getTipoOrder(a.tipo)-getTipoOrder(b.tipo);});

  if(!S.fechaCollapsed)S.fechaCollapsed={};
  var h='<div class="vh"><h1 class="vt">Fechas</h1><span class="vs">'+list.length+' registradas</span></div>';
  h+='<div class="fb" style="margin-bottom:10px">'+
    '<button class="fbtn'+(filtro===""?" on":"")+'" data-ft="">Todas</button>'+
    tipos.map(function(t){return'<button class="fbtn'+(filtro===t?" on":"")+'" data-ft="'+esc(t)+'">'+esc(t)+"</button>";}).join("")+
    "</div>";
  h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">'+
    (groups.length?'<button class="fecha-action-btn" id="btn-toggle-all"><span class="fecha-action-ic">⇕</span>Expandir/contraer</button>':"")+
    (groups.length?'<button class="fecha-action-btn" id="btn-fechas-export"><span class="fecha-action-ic">📷</span>Exportar PNG</button>':"")+
    (editable?'<button class="fecha-action-btn fecha-action-primary" id="btn-add-fecha" style="margin-left:auto"><span class="fecha-action-ic">+</span>Añadir lista</button>':"")+
    "</div>";
  if(!groups.length){
    h+=emptyState("Sin fechas"+(filtro?' de "'+filtro+'"':""),"🗓️");
  } else {
    h+='<div class="cl">'+groups.map(function(g,gi){
      var collapsed=!!S.fechaCollapsed[g.tipo];
      var realCount=g.items.filter(function(r){return!!r.startDate;}).length;
      var realItems=g.items.filter(function(r){return!!r.startDate;});
      function rowHtml(r){
        return'<div class="fecha-range-row" data-id="'+r.id+'">'+
          '<span class="mi">📅</span><span class="fecha-range-txt">'+(r.title?esc(r.title)+" · ":"")+fmtRange(r.startDate,r.endDate)+"</span>"+
          (editable?'<span class="fecha-range-actions"><button class="jug-edit-btn fecha-edit-btn" data-id="'+r.id+'" title="Editar fecha">✏️</button><button class="jug-edit-btn fecha-del-btn" data-id="'+r.id+'" title="Eliminar">🗑</button></span>':"")+
          "</div>";
      }
      var rows;
      if(g.cats.length){
        var withCat=realItems.filter(function(r){return!!r.cat;});
        var noCat=realItems.filter(function(r){return!r.cat;});
        var catsPresent=catsDesc(g.cats.filter(function(c){return withCat.some(function(r){return r.cat===c;});}));
        rows=catsPresent.map(function(c){
          var itemsC=withCat.filter(function(r){return r.cat===c;});
          var shade=shadeColorForCat(g.color,c,g.cats);
          var subKey=g.tipo+"::"+c;
          var subCollapsed=!!S.fechaCollapsed[subKey];
          return'<div class="fecha-cat-group"><div class="fecha-cat-group-hdr" style="background:'+shade+";color:"+contrastText(shade)+'" data-subtoggle="'+esc(subKey)+'">'+
            '<span class="fecha-cat-group-chev">'+(subCollapsed?"▶":"▼")+"</span>"+esc(CAT[c]||c)+" ("+itemsC.length+")</div>"+
            (subCollapsed?"":itemsC.map(rowHtml).join(""))+"</div>";
        }).join("");
        if(noCat.length){
          var subKeyNo=g.tipo+"::none";
          var subCollapsedNo=!!S.fechaCollapsed[subKeyNo];
          rows+='<div class="fecha-cat-group"><div class="fecha-cat-group-hdr" data-subtoggle="'+esc(subKeyNo)+'">'+
            '<span class="fecha-cat-group-chev">'+(subCollapsedNo?"▶":"▼")+"</span>Sin subcategoría ("+noCat.length+")</div>"+
            (subCollapsedNo?"":noCat.map(rowHtml).join(""))+"</div>";
        }
      } else {
        rows=realItems.map(rowHtml).join("");
      }
      var catsLine=g.cats.length?'<div class="cc-mi" style="margin-top:2px"><span class="mi">🏷️</span><span>'+g.cats.map(function(c){return CAT[c]||c;}).join(", ")+"</span></div>":"";
      var emptyMsg=!realCount?'<p class="msub" style="margin-top:6px">(sin fechas todavía)</p>':"";
      var gdata=' data-tipo="'+esc(g.tipo)+'" data-color="'+esc(g.color)+'" data-cats="'+esc(JSON.stringify(g.cats))+'"';
      var moveBtns=editable?'<span class="fecha-order-btns">'+
        '<button class="jug-edit-btn fecha-order-btn" data-tipo="'+esc(g.tipo)+'" data-dir="-1" title="Subir"'+(gi===0?" disabled":"")+'>▲</button>'+
        '<button class="jug-edit-btn fecha-order-btn" data-tipo="'+esc(g.tipo)+'" data-dir="1" title="Bajar"'+(gi===groups.length-1?" disabled":"")+'>▼</button>'+
        "</span>":"";
      return'<article class="cc" style="--ca:'+g.color+';cursor:default">'+
        '<div class="cc-hdr"><div class="cc-badges">'+
        '<button class="fecha-chevron" data-toggle="'+esc(g.tipo)+'" title="'+(collapsed?"Expandir":"Contraer")+'">'+(collapsed?"▶":"▼")+"</button>"+
        '<span class="badge" style="background:'+g.color+";color:"+contrastText(g.color)+'">'+esc(g.tipo)+"</span>"+
        '<span class="vs" style="margin-left:6px">'+realCount+(realCount===1?" fecha":" fechas")+"</span></div>"+
        '<div style="display:flex;gap:6px;align-items:center">'+moveBtns+
        (editable?'<button class="jug-edit-btn tipo-edit-btn"'+gdata+' title="Editar tipo (nombre/color/subcategorías)">✏️</button>':"")+
        "</div></div>"+
        (collapsed?"":catsLine+emptyMsg+
        '<div class="fecha-range-list">'+rows+"</div>"+
        (editable?'<button class="btn btn-ghost btn-sm fecha-addrange-btn"'+gdata+' style="width:100%;margin-top:8px">+ Añadir fecha</button>':""))+
        "</article>";
    }).join("")+"</div>";
  }
  var target=$("cal-body");if(!target)return;
  target.innerHTML=h;
  target.querySelectorAll("[data-ft]").forEach(function(b){b.addEventListener("click",function(){S.fechaTipo=b.dataset.ft;renderFechas();});});
  var addBtn=$("btn-add-fecha");if(addBtn)addBtn.addEventListener("click",function(){openFechaAdd(tipos);});
  target.querySelectorAll(".fecha-chevron").forEach(function(b){b.addEventListener("click",function(e){
    e.stopPropagation();
    var t=b.dataset.toggle;
    S.fechaCollapsed[t]=!S.fechaCollapsed[t];
    renderFechas();
  });});
  target.querySelectorAll("[data-subtoggle]").forEach(function(el){el.addEventListener("click",function(e){
    e.stopPropagation();
    var k=el.dataset.subtoggle;
    S.fechaCollapsed[k]=!S.fechaCollapsed[k];
    renderFechas();
  });});
  var toggleAllBtn=$("btn-toggle-all");if(toggleAllBtn)toggleAllBtn.addEventListener("click",function(){
    var anyExpanded=groups.some(function(g){return!S.fechaCollapsed[g.tipo];});
    groups.forEach(function(g){S.fechaCollapsed[g.tipo]=anyExpanded;});
    renderFechas();
  });
  var exportFechasBtn=$("btn-fechas-export");if(exportFechasBtn)exportFechasBtn.addEventListener("click",function(){exportFechasPNG(filtro);});
  target.querySelectorAll(".fecha-order-btn").forEach(function(b){b.addEventListener("click",function(e){
    e.stopPropagation();
    if(b.disabled)return;
    moveTipoOrder(b.dataset.tipo,parseInt(b.dataset.dir,10));
  });});
  target.querySelectorAll(".fecha-addrange-btn").forEach(function(b){b.addEventListener("click",function(){
    var cats=[];try{cats=JSON.parse(b.dataset.cats||"[]");}catch(e){}
    openFechaAddToGroup(b.dataset.tipo,b.dataset.color,cats);
  });});
  target.querySelectorAll(".tipo-edit-btn").forEach(function(b){b.addEventListener("click",function(e){
    e.stopPropagation();
    var cats=[];try{cats=JSON.parse(b.dataset.cats||"[]");}catch(e){}
    openTipoEdit(b.dataset.tipo,b.dataset.color,cats);
  });});
  target.querySelectorAll(".fecha-edit-btn").forEach(function(b){b.addEventListener("click",function(e){
    e.stopPropagation();
    var r=getRefDates_raw().find(function(x){return x.id===b.dataset.id;});
    if(r)openFechaEdit(r,tipos);
  });});
  target.querySelectorAll(".fecha-del-btn").forEach(function(b){b.addEventListener("click",function(e){
    e.stopPropagation();
    if(!confirm("¿Eliminar esta fecha?"))return;
    deleteRefDate(b.dataset.id,renderFechas);
  });});
}

function openFechaAddToGroup(tipo,color,cats){
  cats=cats||[];
  var mode="single";
  var mo=document.createElement("div");mo.className="mo";
  var catOptsHtml=cats.length?'<option value="">— Todas —</option>'+catsDesc(cats).map(function(c){return'<option value="'+c+'">'+(CAT[c]||c)+"</option>";}).join(""):"";
  mo.innerHTML='<div class="modal"><button class="mcl" id="fag-close">×</button>'+
    '<div class="mtitle">Añadir fecha a '+esc(tipo)+"</div>"+
    '<div class="view-toggle" style="margin-bottom:12px">'+
    '<button class="vtbtn on" id="fag-mode-single">Una fecha</button>'+
    '<button class="vtbtn" id="fag-mode-list">Lista</button>'+
    "</div>"+
    '<div id="fag-single">'+
    (cats.length?'<div class="fg"><label class="fl">Aplica a (opcional)</label><select class="fsel" id="fag-cat">'+catOptsHtml+"</select></div>":"")+
    '<div class="fg"><label class="fl">Título (opcional)</label><input class="fi" id="fag-title" type="text" placeholder="Ventana marzo"/></div>'+
    '<div class="fg"><label class="fl">Desde</label><input class="fi" id="fag-start" type="date"/></div>'+
    '<div class="fg"><label class="fl">Hasta</label><input class="fi" id="fag-end" type="date"/></div>'+
    "</div>"+
    '<div id="fag-list" style="display:none">'+
    '<p class="msub">Una por línea: DD-MM-AAAA,DD-MM-AAAA,Título opcional</p>'+
    (cats.length?'<div class="fg"><label class="fl">Aplica a (opcional, toda la lista)</label><select class="fsel" id="fag-list-cat">'+catOptsHtml+"</select></div>":"")+
    '<div class="fg"><textarea class="fi" id="fag-list-text" rows="8" placeholder="16-03-2026,24-03-2026,Ventana marzo\n01-06-2026,09-06-2026" style="resize:vertical;font-family:inherit"></textarea></div>'+
    "</div>"+
    '<div id="fag-err" class="ferr" style="display:none"></div>'+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
    '<button class="btn btn-ghost btn-sm" id="fag-cancel" style="flex:1">Cancelar</button>'+
    '<button class="btn btn-primary btn-sm" id="fag-save" style="flex:1">Añadir</button>'+
    "</div></div>";
  document.body.appendChild(mo);
  setTimeout(function(){var n=$("fag-start");if(n)n.focus();},100);
  $("fag-start").addEventListener("change",function(){
    var v=this.value;var endEl=$("fag-end");
    endEl.min=v;
    if(!endEl.value||endEl.value<v)endEl.value=v;
  });
  function setMode(m){
    mode=m;
    $("fag-mode-single").classList.toggle("on",m==="single");
    $("fag-mode-list").classList.toggle("on",m==="list");
    $("fag-single").style.display=m==="single"?"":"none";
    $("fag-list").style.display=m==="list"?"":"none";
    $("fag-err").style.display="none";
  }
  $("fag-mode-single").addEventListener("click",function(){setMode("single");});
  $("fag-mode-list").addEventListener("click",function(){setMode("list");});
  function closeMo(){if(mo.parentNode)mo.parentNode.removeChild(mo);}
  $("fag-close").addEventListener("click",closeMo);$("fag-cancel").addEventListener("click",closeMo);
  mo.addEventListener("click",function(e){if(e.target===mo)closeMo();});
  $("fag-save").addEventListener("click",function(){
    if(mode==="single"){
      var title=($("fag-title").value||"").trim();
      var catEl=$("fag-cat");var cat=catEl?catEl.value:"";
      var start=$("fag-start").value;var end=$("fag-end").value||start;
      if(!start){$("fag-err").style.display="block";$("fag-err").textContent="La fecha de inicio es obligatoria.";return;}
      addRefDate({tipo:tipo,title:title,color:color,cat:cat,startDate:start,endDate:end},function(){toast("✅ Fecha añadida a "+tipo);closeMo();renderFechas();});
      return;
    }
    var catEl2=$("fag-list-cat");var cat2=catEl2?catEl2.value:"";
    var lines=($("fag-list-text").value||"").split("\n").map(function(s){return s.trim();}).filter(function(s){return s.length>0;});
    if(!lines.length){$("fag-err").style.display="block";$("fag-err").textContent="Pega al menos una fecha.";return;}
    var dateRe=/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/;
    function toISO(str){var m=str.match(dateRe);return m?m[3]+"-"+m[2]+"-"+m[1]:null;}
    var toAdd=[];var bad=[];
    lines.forEach(function(line){
      var parts=line.split(",").map(function(s){return s.trim();});
      var start=toISO(parts[0]),end=parts[1]?toISO(parts[1]):start,title=parts[2]||"";
      if(!start||!end){bad.push(line);return;}
      toAdd.push({tipo:tipo,title:title,color:color,cat:cat2,startDate:start,endDate:end});
    });
    if(!toAdd.length){$("fag-err").style.display="block";$("fag-err").textContent="Ningún formato válido. Usa DD-MM-AAAA,DD-MM-AAAA.";return;}
    var saveBtn=$("fag-save");saveBtn.disabled=true;saveBtn.textContent="Añadiendo...";
    var done=0,total=toAdd.length;
    toAdd.forEach(function(item){addRefDate(item,function(){done++;if(done===total)finish();});});
    function finish(){
      var msg="✅ "+toAdd.length+" fecha"+(toAdd.length>1?"s":"")+" añadida"+(toAdd.length>1?"s":"");
      if(bad.length)msg+=" ("+bad.length+" con formato incorrecto, omitidas)";
      toast(msg);closeMo();renderFechas();
    }
  });
}

function openFechaAdd(tipos){
  var dl='<datalist id="fecha-tipos-dl">'+tipos.map(function(t){return'<option value="'+esc(t)+'">';}).join("")+"</datalist>";
  var mo=document.createElement("div");mo.className="mo";
  mo.innerHTML='<div class="modal"><button class="mcl" id="fa-close">×</button>'+
    '<div class="mtitle">Nuevo tipo de fecha</div>'+
    '<div class="fg"><label class="fl">Nombre</label><input class="fi" id="fa-tipo" list="fecha-tipos-dl" type="text" placeholder="FIFA, RFFM sub14..." autocomplete="off"/>'+dl+"</div>"+
    '<div class="fg"><label class="fl">Color</label><input class="fi" id="fa-color" type="color" value="#F5B301" style="height:40px;padding:4px;cursor:pointer"/></div>'+
    '<div class="fg"><label class="fl">Subcategorías (opcional)</label><div class="fecha-cats-grid" id="fa-cats">'+
    catsDesc(Object.keys(CAT).filter(function(k){return k!=="todas";})).map(function(k){return'<label class="fecha-cat-chk"><input type="checkbox" value="'+k+'"/>'+CAT[k]+"</label>";}).join("")+
    "</div></div>"+
    '<div id="fa-err" class="ferr" style="display:none"></div>'+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
    '<button class="btn btn-ghost btn-sm" id="fa-cancel" style="flex:1">Cancelar</button>'+
    '<button class="btn btn-primary btn-sm" id="fa-save" style="flex:1">Crear</button>'+
    "</div></div>";
  document.body.appendChild(mo);
  setTimeout(function(){var n=$("fa-tipo");if(n)n.focus();},100);
  function closeMo(){if(mo.parentNode)mo.parentNode.removeChild(mo);}
  $("fa-close").addEventListener("click",closeMo);$("fa-cancel").addEventListener("click",closeMo);
  mo.addEventListener("click",function(e){if(e.target===mo)closeMo();});
  $("fa-save").addEventListener("click",function(){
    var tipo=($("fa-tipo").value||"").trim();
    var color=($("fa-color").value||"#F5B301");
    var cats=[];$("fa-cats").querySelectorAll("input:checked").forEach(function(c){cats.push(c.value);});
    if(!tipo){$("fa-err").style.display="block";$("fa-err").textContent="El nombre del tipo es obligatorio.";return;}
    addRefDate({tipo:tipo,title:"",color:color,cats:cats,startDate:"",endDate:""},function(){syncGroupColor(tipo,color);toast("✅ Tipo creado");closeMo();renderFechas();});
  });
}

function openFechaEdit(r,tipos){
  var mo=document.createElement("div");mo.className="mo";
  mo.innerHTML='<div class="modal"><button class="mcl" id="fee-close">×</button>'+
    '<div class="mtitle">Editar fecha</div>'+
    '<p class="msub">Tipo: <b>'+esc(r.tipo||"")+'</b></p>'+
    (function(){var cats=getCatsForTipo(r.tipo);return cats.length?'<div class="fg"><label class="fl">Aplica a (opcional)</label><select class="fsel" id="fee-cat"><option value="">— Todas —</option>'+catsDesc(cats).map(function(c){return'<option value="'+c+'"'+(r.cat===c?" selected":"")+">"+(CAT[c]||c)+"</option>";}).join("")+"</select></div>":"";})()+
    '<div class="fg"><label class="fl">Título (opcional)</label><input class="fi" id="fee-title" type="text" value="'+esc(r.title||"")+'"/></div>'+
    '<div class="fg"><label class="fl">Desde</label><input class="fi" id="fee-start" type="date" value="'+esc(r.startDate||"")+'"/></div>'+
    '<div class="fg"><label class="fl">Hasta</label><input class="fi" id="fee-end" type="date" value="'+esc(r.endDate||r.startDate||"")+'"/></div>'+
    '<div id="fee-err" class="ferr" style="display:none"></div>'+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
    '<button class="btn btn-ghost btn-sm" id="fee-cancel" style="flex:1">Cancelar</button>'+
    '<button class="btn btn-primary btn-sm" id="fee-save" style="flex:1">Guardar</button>'+
    "</div></div>";
  document.body.appendChild(mo);
  $("fee-end").min=r.startDate||"";
  $("fee-start").addEventListener("change",function(){
    var v=this.value;var endEl=$("fee-end");
    endEl.min=v;
    if(!endEl.value||endEl.value<v)endEl.value=v;
  });
  function closeMo(){if(mo.parentNode)mo.parentNode.removeChild(mo);}
  $("fee-close").addEventListener("click",closeMo);$("fee-cancel").addEventListener("click",closeMo);
  mo.addEventListener("click",function(e){if(e.target===mo)closeMo();});
  $("fee-save").addEventListener("click",function(){
    var catEl=$("fee-cat");var cat=catEl?catEl.value:(r.cat||"");
    var title=($("fee-title").value||"").trim();
    var start=$("fee-start").value;var end=$("fee-end").value||start;
    if(!start){$("fee-err").style.display="block";$("fee-err").textContent="La fecha de inicio es obligatoria.";return;}
    updateRefDate(r.id,{title:title,cat:cat,startDate:start,endDate:end},function(){toast("✅ Fecha actualizada");closeMo();renderFechas();});
  });
}

function openTipoEdit(tipo,color,cats){
  var mo=document.createElement("div");mo.className="mo";
  mo.innerHTML='<div class="modal"><button class="mcl" id="te-close">×</button>'+
    '<div class="mtitle">Editar tipo de fecha</div>'+
    '<div class="fg"><label class="fl">Nombre</label><input class="fi" id="te-tipo" type="text" value="'+esc(tipo)+'"/></div>'+
    '<div class="fg"><label class="fl">Color</label><input class="fi" id="te-color" type="color" value="'+esc(color||"#F5B301")+'" style="height:40px;padding:4px;cursor:pointer"/></div>'+
    '<div class="fg"><label class="fl">Subcategorías (opcional)</label><div class="fecha-cats-grid" id="te-cats">'+
    catsDesc(Object.keys(CAT).filter(function(k){return k!=="todas";})).map(function(k){return'<label class="fecha-cat-chk"><input type="checkbox" value="'+k+'"'+(cats.indexOf(k)!==-1?" checked":"")+"/>"+CAT[k]+"</label>";}).join("")+
    "</div></div>"+
    '<div id="te-err" class="ferr" style="display:none"></div>'+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
    '<button class="btn btn-ghost btn-sm" id="te-cancel" style="flex:1">Cancelar</button>'+
    '<button class="btn btn-primary btn-sm" id="te-save" style="flex:1">Guardar</button>'+
    "</div></div>";
  document.body.appendChild(mo);
  setTimeout(function(){var n=$("te-tipo");if(n)n.focus();},100);
  function closeMo(){if(mo.parentNode)mo.parentNode.removeChild(mo);}
  $("te-close").addEventListener("click",closeMo);$("te-cancel").addEventListener("click",closeMo);
  mo.addEventListener("click",function(e){if(e.target===mo)closeMo();});
  $("te-save").addEventListener("click",function(){
    var newTipo=($("te-tipo").value||"").trim();
    var newColor=($("te-color").value||"#F5B301");
    var newCats=[];$("te-cats").querySelectorAll("input:checked").forEach(function(c){newCats.push(c.value);});
    if(!newTipo){$("te-err").style.display="block";$("te-err").textContent="El nombre del tipo es obligatorio.";return;}
    var recs=getRefDates_raw().filter(function(r){return(r.tipo||"").trim()===tipo.trim();});
    var done=0,total=recs.length||1;
    function finish(){toast("✅ Tipo actualizado");closeMo();renderFechas();}
    if(!recs.length){finish();return;}
    recs.forEach(function(r){
      updateRefDate(r.id,{tipo:newTipo,color:newColor,cats:newCats},function(){done++;if(done===total)finish();});
    });
  });
}

function openFechaAddBulk(tipos){
  var dl='<datalist id="fecha-tipos-dl2">'+tipos.map(function(t){return'<option value="'+esc(t)+'">';}).join("")+"</datalist>";
  var mo=document.createElement("div");mo.className="mo";
  mo.innerHTML='<div class="modal"><button class="mcl" id="fab-close">×</button>'+
    '<div class="mtitle">Añadir fechas en lista</div>'+
    '<p class="msub">Una por línea: DD-MM-AAAA,DD-MM-AAAA,Título opcional</p>'+
    '<div class="fg"><label class="fl">Tipo (aplica a toda la lista)</label><input class="fi" id="fab-tipo" list="fecha-tipos-dl2" type="text" placeholder="FIFA" autocomplete="off"/>'+dl+"</div>"+
    '<div class="fg"><label class="fl">Color (aplica a toda la lista)</label><input class="fi" id="fab-color" type="color" value="#F5B301" style="height:40px;padding:4px;cursor:pointer"/></div>'+
    '<div class="fg"><label class="fl">Fechas</label><textarea class="fi" id="fab-list" rows="8" placeholder="16-03-2026,24-03-2026,Ventana marzo\n01-06-2026,09-06-2026" style="resize:vertical;font-family:inherit"></textarea></div>'+
    '<div id="fab-err" class="ferr" style="display:none"></div>'+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
    '<button class="btn btn-ghost btn-sm" id="fab-cancel" style="flex:1">Cancelar</button>'+
    '<button class="btn btn-primary btn-sm" id="fab-save" style="flex:1">Añadir</button>'+
    "</div></div>";
  document.body.appendChild(mo);
  setTimeout(function(){var n=$("fab-tipo");if(n)n.focus();},100);
  function closeMo(){if(mo.parentNode)mo.parentNode.removeChild(mo);}
  $("fab-close").addEventListener("click",closeMo);$("fab-cancel").addEventListener("click",closeMo);
  mo.addEventListener("click",function(e){if(e.target===mo)closeMo();});
  $("fab-save").addEventListener("click",function(){
    var tipo=($("fab-tipo").value||"").trim();
    var color=($("fab-color").value||"#F5B301");
    if(!tipo){$("fab-err").style.display="block";$("fab-err").textContent="Indica un tipo.";return;}
    var lines=($("fab-list").value||"").split("\n").map(function(s){return s.trim();}).filter(function(s){return s.length>0;});
    if(!lines.length){$("fab-err").style.display="block";$("fab-err").textContent="Pega al menos una fecha.";return;}
    var dateRe=/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/;
    function toISO(str){var m=str.match(dateRe);return m?m[3]+"-"+m[2]+"-"+m[1]:null;}
    var toAdd=[];var bad=[];
    lines.forEach(function(line){
      var parts=line.split(",").map(function(s){return s.trim();});
      var start=toISO(parts[0]),end=parts[1]?toISO(parts[1]):start,title=parts[2]||"";
      if(!start||!end){bad.push(line);return;}
      toAdd.push({tipo:tipo,title:title,color:color,startDate:start,endDate:end});
    });
    if(!toAdd.length){$("fab-err").style.display="block";$("fab-err").textContent="Ningún formato válido. Usa DD-MM-AAAA,DD-MM-AAAA.";return;}
    var saveBtn=$("fab-save");saveBtn.disabled=true;saveBtn.textContent="Añadiendo...";
    var done=0,total=toAdd.length;
    toAdd.forEach(function(item){addRefDate(item,function(){done++;if(done===total)finish();});});
    function finish(){
      syncGroupColor(tipo,color);
      var msg="✅ "+toAdd.length+" fecha"+(toAdd.length>1?"s":"")+" añadida"+(toAdd.length>1?"s":"");
      if(bad.length)msg+=" ("+bad.length+" con formato incorrecto, omitidas)";
      toast(msg);closeMo();renderFechas();
    }
  });
}

// ── LOGIN ──
function bindLoginBtn(){
  var btn=$("hdr-login-btn");if(!btn)return;
  btn.addEventListener("click",function(){
    if(window._fbUser){
      if(confirm("¿Cerrar sesión?"))window._fbFns.signOut(window._auth).then(function(){toast("Sesión cerrada");route(S.view);});
      return;
    }
    var mo=document.createElement("div");mo.className="mo";
    mo.innerHTML='<div class="modal" style="padding-bottom:40px"><button class="mcl" id="lm-close">×</button>'+
      '<div class="mtitle">Acceso editor</div><p class="msub">Solo para personal autorizado.</p>'+
      '<div class="fg"><label class="fl">Email</label><input class="fi" id="lm-email" type="email" placeholder="email@realmadrid.es" autocomplete="email"/></div>'+
      '<div class="fg"><label class="fl">Contraseña</label><input class="fi" id="lm-pass" type="password" placeholder="••••••••" autocomplete="current-password"/></div>'+
      '<div id="lm-err" style="color:#EF4444;font-size:12px;margin-top:6px;display:none"></div>'+
      '<div style="display:flex;gap:8px;margin-top:16px">'+
      '<button class="btn btn-ghost" id="lm-cancel" style="flex:1">Cancelar</button>'+
      '<button class="btn btn-primary" id="lm-ok" style="flex:1">Entrar</button></div></div>';
    document.body.appendChild(mo);
    var emailEl=$("lm-email"),passEl=$("lm-pass"),errEl=$("lm-err");
    setTimeout(function(){if(emailEl)emailEl.focus();},100);
    function closeMo(){if(mo.parentNode)mo.parentNode.removeChild(mo);}
    $("lm-close").addEventListener("click",closeMo);$("lm-cancel").addEventListener("click",closeMo);
    mo.addEventListener("click",function(e){if(e.target===mo)closeMo();});
    $("lm-ok").addEventListener("click",function(){
      var email=(emailEl?emailEl.value:"").trim(),pass=passEl?passEl.value:"";
      if(!email||!pass){errEl.style.display="block";errEl.textContent="Introduce email y contraseña.";return;}
      var okBtn=$("lm-ok");okBtn.disabled=true;okBtn.textContent="Entrando...";
      window._fbFns.signInWithEmailAndPassword(window._auth,email,pass)
        .then(function(){closeMo();toast("🔓 Sesión iniciada");route(S.view);})
        .catch(function(e){errEl.style.display="block";errEl.textContent=e.code==="auth/invalid-credential"?"Email o contraseña incorrectos.":"Error: "+e.message;okBtn.disabled=false;okBtn.textContent="Entrar";});
    });
    if(passEl)passEl.addEventListener("keydown",function(e){if(e.key==="Enter")$("lm-ok").click();});
  });
}

window._onAuthChange = function(user){
  var lb=$("hdr-login-btn");
  if(lb){
    if(user){lb.textContent="🔓";lb.title="Sesión: "+user.email;lb.classList.add("logged");}
    else{lb.textContent="🔒";lb.title="Iniciar sesión";lb.classList.remove("logged");}
  }
  document.querySelectorAll(".nb-new,.nb[data-v='jugadores']").forEach(function(b){b.style.display=user?"":"none";});
  route(S.view||"agenda");
};

window._callups = window._callups || [];
window._players = window._players || [];
window._refdates = window._refdates || [];

window._onCallupsLoaded = function(){
  window._fbCallupsFlag = true;
  renderSeasonSel();
  route(S.view || "agenda");
};
window._onPlayersLoaded = function(){
  window._fbPlayersFlag = true;
  route(S.view || "agenda");
};
window._onRefDatesLoaded = function(){
  window._fbRefDatesFlag = true;
  route(S.view || "agenda");
};
window._onMetaLoaded = function(){
  window._fbMetaFlag = true;
  (window._seasonsData||[]).forEach(function(s){if(_seasons.indexOf(s)===-1)_seasons.push(s);});
  if(!_seasons.length)_seasons.push(S.season);
  var sorted=_seasons.slice().sort();
  S.season=sorted[sorted.length-1];
  renderSeasonSel();
  route(S.view || "agenda");
};

renderSeasonSel();
bindLoginBtn();
route(S.view || "agenda");

if(window._fbCallupsFlag) { renderSeasonSel(); route(S.view || "agenda"); }
if(window._fbPlayersFlag) { route(S.view || "agenda"); }
if(window._fbRefDatesFlag) { route(S.view || "agenda"); }
if(window._fbMetaFlag) { renderSeasonSel(); route(S.view || "agenda"); }
