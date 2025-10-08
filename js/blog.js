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
  const modal = qs('#post-modal');
  const modalContent = qs('#modal-content');
  const modalClose = qs('#modal-close');

  const STORAGE_KEY = 'portfolioPosts_v1';

  function loadPosts(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }catch(e){return []}
  }
  function savePosts(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)) }

  function renderPosts(){
    const posts = loadPosts().slice().reverse();
    postsList.innerHTML = '';
    posts.forEach((p, i)=>{
      const el = document.createElement('article');
      el.className = 'card';
      el.innerHTML = `
        <div class="card-media">${p.image ? `<img src="${p.image}" alt="cover">` : 'PG' }</div>
        <div class="card-body">
          <h3>${escapeHtml(p.title||'Untitled')}</h3>
          <p class="muted">${p.external ? 'External post' : 'Published on portfolio'}</p>
          <div style="margin-top:.5rem;display:flex;gap:.5rem;align-items:center">
            ${p.external ? `<a class="btn btn-small" href="${escapeHtml(p.external)}" target="_blank" rel="noopener">Visit</a>` : `<button class="btn btn-small view-post" data-id="${p.id}">View</button>`}
            <button class="btn btn-outline delete-post" data-id="${p.id}">Delete</button>
          </div>
        </div>
      `;
      postsList.appendChild(el);
    });

    // attach view/delete handlers
    qsa('.view-post').forEach(btn=> btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-id');
      openPost(id);
    }));
    qsa('.delete-post').forEach(btn=> btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-id');
      deletePost(id);
    }));
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
    posts.push({id,title,external:imageData?imageData:null,content:rawHtml,created:Date.now()});
    savePosts(posts);
    statusEl.textContent = 'Published!';
    setTimeout(()=> statusEl.textContent = '',1500);
    // clear editor
    titleEl.value=''; externalEl.value=''; imageEl.value=''; contentEl.innerHTML='';
    renderPosts();
  });

  clearBtn.addEventListener('click', ()=>{ titleEl.value=''; externalEl.value=''; imageEl.value=''; contentEl.innerHTML=''; statusEl.textContent=''; });

  // initial render
  renderPosts();
})();