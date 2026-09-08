window._callups=[];window._players=[];window._fbCallupsFlag=false;window._fbPlayersFlag=false;

function _fbNotify(which){
  if(which==="callups"){window._fbCallupsFlag=true;if(typeof window._onCallupsLoaded==="function")window._onCallupsLoaded();}
  else{window._fbPlayersFlag=true;if(typeof window._onPlayersLoaded==="function")window._onPlayersLoaded();}
}
function _loadScript(src,cb){
  var s=document.createElement("script");s.src=src;
  s.onload=cb;s.onerror=function(){console.warn("Error cargando SDK:",src);cb();};
  document.head.appendChild(s);
}
function _initFirebase(){
  try{
    if(typeof firebase==="undefined"){console.warn("Firebase SDK no disponible. Modo sin conexión.");_fbNotify("callups");_fbNotify("players");return;}
    firebase.initializeApp({apiKey:"AIzaSyCPcij56A4Gc-sgqcVQ4Lj3N1bQtsVFGKU",authDomain:"convocatorias-51f3e.firebaseapp.com",projectId:"convocatorias-51f3e",storageBucket:"convocatorias-51f3e.firebasestorage.app",messagingSenderId:"275421566007",appId:"1:275421566007:web:c6655499e8e5e89503dbb2"});
    var db=firebase.firestore(),auth=firebase.auth();
    window._db=db;window._auth=auth;
    window._fbFns={
      collection:function(d,c){return d.collection(c);},
      getDocs:function(r){return r.get();},
      addDoc:function(r,d){return r.add(d);},
      setDoc:function(r,d,o){return o&&o.merge?r.set(d,{merge:true}):r.set(d);},
      deleteDoc:function(r){return r.delete();},
      doc:function(d,c,i){return d.collection(c).doc(i);},
      signInWithEmailAndPassword:function(a,e,p){return a.signInWithEmailAndPassword(e,p);},
      signOut:function(a){return a.signOut();},
      onAuthStateChanged:function(a,cb){return a.onAuthStateChanged(cb);}
    };
    auth.onAuthStateChanged(function(u){window._fbUser=u||null;if(typeof window._onAuthChange==="function")window._onAuthChange(u);});
    db.collection("callups").get()
      .then(function(s){window._callups=[];s.forEach(function(d){window._callups.push(Object.assign({id:d.id},d.data()));});})
      .catch(function(e){console.error("callups:",e);})
      .finally(function(){_fbNotify("callups");});
    db.collection("players").get()
      .then(function(s){window._players=[];s.forEach(function(d){window._players.push(Object.assign({id:d.id},d.data()));});})
      .catch(function(e){console.error("players:",e);})
      .finally(function(){_fbNotify("players");});
  }catch(e){
    console.error("Firebase error:",e);
    _fbNotify("callups");_fbNotify("players");
  }
}
_loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",function(){
  _loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js",function(){
    _loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js",function(){
      _initFirebase();
    });
  });
});
