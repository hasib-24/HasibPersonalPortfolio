// Simple client-side blog: saves posts to localStorage and renders them
(function(){
  function qs(sel){return document.querySelector(sel)}
  function qsa(sel){return Array.from(document.querySelectorAll(sel))}

  const titleEl = qs('#post-title');
  const externalEl = qs('#post-external');
  const imageEl = qs('#post-image');
  const contentEl = qs('#post-content');
  const saveBtn = qs('#save-post');
  const clearBtn = qs('#clear-editor');
  const statusEl = qs('#editor-status');
  const postsList = qs('#posts-list');
  const postsExternal = qs('#posts-external');
  const postsInternal = qs('#posts-internal');
  const modal = qs('#post-modal');
  const modalContent = qs('#modal-content');
  const modalClose = qs('#modal-close');
  const exportBtn = qs('#export-posts');
  const importBtn = qs('#import-posts');
  const migrateBtn = qs('#migrate-posts');

  const STORAGE_KEY = 'portfolioPosts_v1';
  // Firestore variables (populated if firebaseConfig is provided)
  let useFirestore = false;
  let db = null;
  let postsCol = null;

  function loadPosts(){
    // local fallback
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }catch(e){return []}
  }
  function savePosts(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)) }

  // remote (Firestore) helpers
  async function initFirestoreIfNeeded(){
    if(typeof firebaseConfig === 'object' && firebaseConfig){
      try{
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        postsCol = db.collection('portfolio_posts');
        useFirestore = true;
        return true;
      }catch(e){
        console.warn('Firestore init failed', e);
        useFirestore = false;
        return false;
      }
    }
    return false;
  }

  // migrate localStorage posts to Firestore once, to make them visible to others
  async function migrateLocalToRemote(){
    if(!useFirestore) return;
    try{
      const migrated = localStorage.getItem('portfolio_migrated_to_firestore_v1');
      if(migrated) return;
      const local = loadPosts();
      if(!local || !local.length) return;
      for(const p of local){
        const obj = {
          title: p.title || '',
          external: p.external || '',
          image: p.image || '',
          thumb: p.thumb || '',
          content: p.content || '',
          created: p.created || Date.now()
        };
        try{ await postsCol.add(obj); }catch(e){ console.warn('upload failed for post', p, e); }
      }
      localStorage.setItem('portfolio_migrated_to_firestore_v1','1');
      console.log('Local posts migrated to Firestore');
    }catch(e){ console.warn('Migration failed', e) }
  }

  async function loadPostsRemote(){
    if(!useFirestore) return loadPosts();
    try{
      const snap = await postsCol.orderBy('created','desc').get();
      const arr = [];
      snap.forEach(d=> arr.push(Object.assign({id:d.id}, d.data())));
      return arr;
    }catch(e){ console.warn('loadPostsRemote failed', e); return loadPosts(); }
  }

  async function savePostRemote(obj){
    if(!useFirestore) return null;
    try{
      // push with created timestamp
      const doc = await postsCol.add(obj);
      return doc.id;
    }catch(e){ console.warn('savePostRemote failed', e); return null }
  }

  async function renderPosts(){
    const postsArr = useFirestore ? await loadPostsRemote() : loadPosts();
    const posts = (postsArr || []).slice().reverse();
    // separate external and internal posts
    postsExternal.innerHTML = '';
    postsInternal.innerHTML = '';

    posts.forEach((p)=>{
      const el = document.createElement('article');
      el.className = 'card';
  const thumbnailSrc = p.thumb || p.image || '';
  const media = thumbnailSrc ? `<img src="${thumbnailSrc}" alt="cover">` : 'PG';
      const body = document.createElement('div');
      body.className = 'card-body';
      body.innerHTML = `
        <h3>${escapeHtml(p.title||'Untitled')}</h3>
        <p class="muted">${p.external ? 'External post' : 'Published on portfolio'}</p>
        <div style="margin-top:.5rem;display:flex;gap:.5rem;align-items:center">
          ${p.external ? `<a class="btn btn-small external-read" href="${escapeHtml(p.external)}" target="_blank" rel="noopener">Read</a>` : `<button class="btn btn-small view-post" data-id="${p.id}">Read</button>`}
          <button class="btn btn-outline delete-post" data-id="${p.id}">Delete</button>
        </div>`;

      el.innerHTML = `<div class="card-media">${media}</div>`;
      el.appendChild(body);

      if(p.external){
        postsExternal.appendChild(el);
      } else {
        postsInternal.appendChild(el);
      }
    });

    // attach handlers
    qsa('.view-post').forEach(btn=> btn.addEventListener('click', ()=> openPost(btn.getAttribute('data-id'))));
    qsa('.delete-post').forEach(btn=> btn.addEventListener('click', ()=> deletePost(btn.getAttribute('data-id'))));
  }

  function escapeHtml(s){ return String(s).replace(/[&<>\"]/g, c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
  }[c])) }

  function openPost(id){
    if(useFirestore){
      // fetch remote document
      postsCol.doc(id).get().then(doc=>{
        if(!doc.exists) return alert('Post not found');
        const post = Object.assign({id:doc.id}, doc.data());
        modalContent.innerHTML = `
          <h2>${escapeHtml(post.title)}</h2>
          ${post.image ? `<img src="${post.image}" style="max-width:100%;border-radius:8px;margin-bottom:.75rem">` : ''}
          <div>${post.content}</div>
        `;
        modal.classList.remove('hidden');
      }).catch(e=>{console.error(e); alert('Failed to load post')});
      return;
    }
    const posts = loadPosts();
    const post = posts.find(x=>x.id === id);
    if(!post) return alert('Post not found');
    modalContent.innerHTML = `
      <h2>${escapeHtml(post.title)}</h2>
      ${post.image ? `<img src="${post.image}" style="max-width:100%;border-radius:8px;margin-bottom:.75rem">` : ''}
      <div>${post.content}</div>
    `;
    modal.classList.remove('hidden');
  }

  function deletePost(id){
    if(!confirm('Delete this post?')) return;
    let posts = loadPosts();
    if(useFirestore){
      // in Firestore we store posts as documents; id is doc id
      postsCol.doc(id).delete().then(()=> renderPosts()).catch(err=>{console.error(err); alert('Failed to delete remote post')});
      return;
    }
    posts = posts.filter(p=>p.id!==id);
    savePosts(posts);
    renderPosts();
  }

  modalClose.addEventListener('click', ()=> modal.classList.add('hidden'));

  // helper to read image as data URL
  function readImageAsDataURL(file){
    return new Promise((resolve,reject)=>{
      const r = new FileReader();
      r.onload = ()=> resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    })
  }

  // helper: load file into an Image element
  function loadImageFromFile(file){
    return new Promise((resolve,reject)=>{
      const fr = new FileReader();
      fr.onload = ()=>{
        const img = new Image();
        img.onload = ()=> resolve(img);
        img.onerror = reject;
        img.src = fr.result;
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // helper: resize an Image element to max dimensions and return dataURL (jpeg)
  function resizeImageElement(img, maxW, maxH, mime='image/jpeg', quality=0.82){
    const canvas = document.createElement('canvas');
    let {width: w, height: h} = img;
    const ratio = Math.min(1, Math.min(maxW / w, maxH / h));
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL(mime, quality);
  }

  // helper: create a centered-cropped thumbnail (exact width/height)
  function makeThumbnail(img, w, h, mime='image/jpeg', quality=0.82){
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    // compute crop box (cover behavior)
    const srcRatio = img.width / img.height;
    const destRatio = w / h;
    let sx, sy, sw, sh;
    if(srcRatio > destRatio){
      // source is wider -> crop left/right
      sh = img.height;
      sw = Math.round(sh * destRatio);
      sx = Math.round((img.width - sw) / 2);
      sy = 0;
    } else {
      // source taller -> crop top/bottom
      sw = img.width;
      sh = Math.round(sw / destRatio);
      sx = 0;
      sy = Math.round((img.height - sh) / 2);
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    return canvas.toDataURL(mime, quality);
  }

  saveBtn.addEventListener('click', async ()=>{
    const title = titleEl.value.trim();
    const external = externalEl.value.trim();
    const rawHtml = contentEl.innerHTML.trim();
    if(!title){ statusEl.textContent = 'Please add a title.'; return }
    statusEl.textContent = 'Saving...';
    let imageData = '';
    let thumbData = '';
    if(imageEl.files && imageEl.files[0]){
      try{
        const img = await loadImageFromFile(imageEl.files[0]);
        // full image: max 1200px each dimension
        imageData = resizeImageElement(img, 1200, 1200, 'image/jpeg', 0.86);
        // thumbnail: exact 320x240 crop
        thumbData = makeThumbnail(img, 320, 240, 'image/jpeg', 0.82);
      }catch(e){console.error('Image processing failed', e);}
    }
    const posts = loadPosts();
    const id = 'p'+Date.now().toString(36);
    const postObj = {
      id,
      title,
      external: external || '',
      image: imageData || '',
      thumb: thumbData || '',
      content: rawHtml,
      created: Date.now()
    };

    if(useFirestore){
      // save remotely and then re-render
      statusEl.textContent = 'Publishing to remote...';
      const docId = await savePostRemote(postObj);
      if(docId){ statusEl.textContent = 'Published!'; setTimeout(()=> statusEl.textContent = '',1500); }
      else { statusEl.textContent = 'Published locally'; setTimeout(()=> statusEl.textContent = '',1500); }
      // clear editor
      titleEl.value=''; externalEl.value=''; imageEl.value=''; contentEl.innerHTML='';
      renderPosts();
      return;
    }

    posts.push(postObj);
    savePosts(posts);
    statusEl.textContent = 'Published!';
    setTimeout(()=> statusEl.textContent = '',1500);
    // clear editor
    titleEl.value=''; externalEl.value=''; imageEl.value=''; contentEl.innerHTML='';
    renderPosts();
  });

  // export local posts as JSON file
  if(exportBtn){
    exportBtn.addEventListener('click', ()=>{
      const data = JSON.stringify(loadPosts() || [], null, 2);
      const blob = new Blob([data], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'portfolio-posts.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  // import posts from pasted JSON (merge)
  if(importBtn){
    importBtn.addEventListener('click', async ()=>{
      const text = prompt('Paste posts JSON here (it will be merged with existing posts)');
      if(!text) return;
      try{
        const arr = JSON.parse(text);
        if(!Array.isArray(arr)) throw new Error('Invalid format');
        const current = loadPosts() || [];
        const merged = current.concat(arr.map(p=>({
          id: p.id || ('p'+Date.now().toString(36)),
          title: p.title||'', external: p.external||'', image: p.image||'', content: p.content||'', created: p.created||Date.now()
        })));
        savePosts(merged);
        alert('Imported '+arr.length+' posts locally.');
        renderPosts();
      }catch(e){ alert('Failed to import JSON: '+e.message) }
    });
  }

  // manual migrate trigger
  if(migrateBtn){
    migrateBtn.addEventListener('click', async ()=>{
      if(!useFirestore){ alert('Firestore not initialized — add js/firebase-config.js and reload'); return }
      migrateBtn.textContent = 'Migrating...';
      await migrateLocalToRemote();
      migrateBtn.textContent = 'Migrate local → Remote';
      alert('Migration attempted — check console for details.');
      renderPosts();
    });
  }

  clearBtn.addEventListener('click', ()=>{ titleEl.value=''; externalEl.value=''; imageEl.value=''; contentEl.innerHTML=''; statusEl.textContent=''; });

  // initial render
  (async function boot(){
    const ok = await initFirestoreIfNeeded();
    if(ok){
      // migrate any local posts (one-time)
      await migrateLocalToRemote();
      // realtime update: listen to collection changes
      postsCol.orderBy('created','desc').onSnapshot(()=>{
        renderPosts();
      });
    }
    // initial render (remote or local)
    renderPosts();
  })();
})();