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
      const media = p.image ? `<img src="${p.image}" alt="cover">` : 'PG';
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

  saveBtn.addEventListener('click', async ()=>{
    const title = titleEl.value.trim();
    const external = externalEl.value.trim();
    const rawHtml = contentEl.innerHTML.trim();
    if(!title){ statusEl.textContent = 'Please add a title.'; return }
    statusEl.textContent = 'Saving...';
    let imageData = null;
    if(imageEl.files && imageEl.files[0]){
      try{ imageData = await readImageAsDataURL(imageEl.files[0]) }catch(e){console.error(e)}
    }
    const posts = loadPosts();
    const id = 'p'+Date.now().toString(36);
    const postObj = {
      id,
      title,
      external: external || '',
      image: imageData || '',
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

  clearBtn.addEventListener('click', ()=>{ titleEl.value=''; externalEl.value=''; imageEl.value=''; contentEl.innerHTML=''; statusEl.textContent=''; });

  // initial render
  (async function boot(){
    const ok = await initFirestoreIfNeeded();
    if(ok){
      // realtime update: listen to collection changes
      postsCol.orderBy('created','desc').onSnapshot(()=>{
        renderPosts();
      });
    }
    // initial render (remote or local)
    renderPosts();
  })();
})();