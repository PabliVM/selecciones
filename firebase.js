window._callups=[];window._players=[];window._refdates=[];window._seasonsData=[];window._fbCallupsFlag=false;window._fbPlayersFlag=false;window._fbRefDatesFlag=false;window._fbMetaFlag=false;

function _fbNotify(which){
  if(which==="callups"){window._fbCallupsFlag=true;if(typeof window._onCallupsLoaded==="function")window._onCallupsLoaded();}
  else if(which==="refdates"){window._fbRefDatesFlag=true;if(typeof window._onRefDatesLoaded==="function")window._onRefDatesLoaded();}
  else if(which==="meta"){window._fbMetaFlag=true;if(typeof window._onMetaLoaded==="function")window._onMetaLoaded();}
  else{window._fbPlayersFlag=true;if(typeof window._onPlayersLoaded==="function")window._onPlayersLoaded();}
}
function _loadScript(src,cb){
  var s=document.createElement("script");s.src=src;
  s.onload=cb;s.onerror=function(){console.warn("Error cargando SDK:",src);cb();};
  document.head.appendChild(s);
}
function _initFirebase(){
  try{
    if(typeof firebase==="undefined"){console.warn("Firebase SDK no disponible. Modo sin conexión.");_fbNotify("callups");_fbNotify("players");_fbNotify("refdates");_fbNotify("meta");return;}
    firebase.initializeApp({apiKey:"AIzaSyBP3EtZNGNscSUxh6XxZ1viiFN6SNIBA7s",authDomain:"seleciones-8ee75.firebaseapp.com",projectId:"seleciones-8ee75",storageBucket:"seleciones-8ee75.firebasestorage.app",messagingSenderId:"859013254646",appId:"1:859013254646:web:84c239598e300097024bd7"});
    var db=firebase.firestore(),auth=firebase.auth();
    window._db=db;window._auth=auth;
    window._fbFns={
      collection:function(d,c){return d.collection(c);},
      getDocs:function(r){return r.get();},
      addDoc:function(r,d){return _trackWrite(r.add(d));},
      setDoc:function(r,d,o){return _trackWrite(o&&o.merge?r.set(d,{merge:true}):r.set(d));},
      deleteDoc:function(r){return _trackWrite(r.delete());},
      doc:function(d,c,i){return d.collection(c).doc(i);},
      signInWithEmailAndPassword:function(a,e,p){return a.signInWithEmailAndPassword(e,p);},
      signOut:function(a){return a.signOut();},
      onAuthStateChanged:function(a,cb){return a.onAuthStateChanged(cb);},
      sendPasswordResetEmail:function(a,e){return a.sendPasswordResetEmail(e);}
    };
    // Seguridad: sesión solo en esta pestaña (se cierra al cerrar el navegador)
    try{auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);}catch(e){}
    // Seguridad: los datos solo se descargan con sesión iniciada
    var _dataUid=null;
    auth.onAuthStateChanged(function(u){
      window._fbUser=u||null;
      if(u&&_dataUid!==u.uid){_dataUid=u.uid;_loadData(db);}
      else if(!u){_dataUid=null;_unsubAll();window._callups=[];window._players=[];window._refdates=[];window._seasonsData=[];}
      if(typeof window._onAuthChange==="function")window._onAuthChange(u);
    });
  }catch(e){
    console.error("Firebase error:",e);
    _fbNotify("callups");_fbNotify("players");_fbNotify("refdates");_fbNotify("meta");
  }
}
// ── Guardado fiable: sincronización en tiempo real (evita sobrescribir con datos viejos) ──
var _unsubs=[];
function _unsubAll(){_unsubs.forEach(function(f){try{f();}catch(e){}});_unsubs=[];}
function _listen(db,name,key){
  var first=true;
  _unsubs.push(db.collection(name).onSnapshot(function(s){
    if(first){
      first=false;window[key]=[];
      s.forEach(function(d){window[key].push(Object.assign({id:d.id},d.data()));});
      _fbNotify(name);return;
    }
    // Cambios de otros usuarios: se aplican por id (los propios ya los gestiona la app)
    s.docChanges().forEach(function(ch){
      if(ch.doc.metadata.hasPendingWrites)return;
      var arr=window[key]||(window[key]=[]),id=ch.doc.id;
      var idx=arr.findIndex(function(x){return x.id===id;});
      if(ch.type==="removed"){if(idx!==-1)window[key]=arr.filter(function(x){return x.id!==id;});return;}
      var obj=Object.assign({id:id},ch.doc.data());
      if(idx===-1)arr.push(obj);else arr[idx]=obj;
    });
  },function(e){console.error(name+":",e);if(first){first=false;_fbNotify(name);}}));
}
function _loadData(db){
  try{
    _unsubAll();
    _listen(db,"callups","_callups");
    _listen(db,"players","_players");
    _listen(db,"refdates","_refdates");
    var firstMeta=true;
    _unsubs.push(db.collection("meta").doc("app").onSnapshot(function(d){
      window._seasonsData=(d.exists&&d.data().seasons)?d.data().seasons:[];
      if(firstMeta){firstMeta=false;_fbNotify("meta");}
    },function(e){console.error("meta:",e);if(firstMeta){firstMeta=false;_fbNotify("meta");}}));
  }catch(e){
    console.error("Firebase load error:",e);
    _fbNotify("callups");_fbNotify("players");_fbNotify("refdates");_fbNotify("meta");
  }
}
// ── Guardado fiable: cambios pendientes, errores visibles y aviso al salir ──
window._pendingWrites=0;
var _saveErrT=null,_saveShowT=null;
function _saveBar(){
  var b=document.getElementById("save-status");
  if(!b){b=document.createElement("div");b.id="save-status";
    b.style.cssText="position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:9999;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.25);display:none;max-width:90vw;text-align:center";
    document.body.appendChild(b);}
  return b;
}
function _saveIndicator(){
  if(_saveErrT)return;
  var b=_saveBar();clearTimeout(_saveShowT);
  if(window._pendingWrites>0){
    _saveShowT=setTimeout(function(){
      if(window._pendingWrites<=0||_saveErrT)return;
      b.style.background=navigator.onLine?"#2563eb":"#d97706";
      b.textContent=navigator.onLine?"⏳ Guardando cambios...":"📴 Sin conexión — no cierres la app, se guardará al volver";
      b.style.display="block";
    },1200);
  } else b.style.display="none";
}
function _saveError(e){
  var b=_saveBar();
  b.style.background="#dc2626";
  b.textContent="⚠️ NO se ha guardado"+(e&&e.code==="permission-denied"?": sin permiso":"")+". Revisa y repite el cambio.";
  b.style.display="block";
  clearTimeout(_saveErrT);_saveErrT=setTimeout(function(){_saveErrT=null;_saveIndicator();},8000);
}
function _trackWrite(p){
  window._pendingWrites++;_saveIndicator();
  return p.then(function(r){window._pendingWrites--;_saveIndicator();return r;},
    function(e){window._pendingWrites--;_saveError(e);throw e;});
}
window.addEventListener("beforeunload",function(e){
  if(window._pendingWrites>0){e.preventDefault();e.returnValue="Hay cambios sin guardar";return e.returnValue;}
});
window.addEventListener("online",_saveIndicator);
window.addEventListener("offline",_saveIndicator);
_loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",function(){
  _loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js",function(){
    _loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js",function(){
      _initFirebase();
    });
  });
});
