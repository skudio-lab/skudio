(() => {
  const put = (selector, value) => document.querySelectorAll(selector).forEach(node => node.textContent = value);
  fetch('../data/teamgroup.json', {cache:'no-store'}).then(r => {if (!r.ok) throw Error(); return r.json();}).then(data => {
    put('[data-project-title]', data.title);
    put('[data-project-brand]', 'TeamGroup');
    put('[data-project-company]', 'TeamGroup / T-FORCE');
    put('[data-project-category]', 'Storage & Gaming / Selected Works');
    put('[data-project-year]', data.year);
    put('[data-project-role]', data.role);
    const host=document.querySelector('[data-teamgroup-sections]');
    data.sections.forEach((section,i) => {
      const block=document.createElement('section'); block.className='editorial-grid project-section';
      block.id=['selected-works','concepts','sketches'][i] || 'section-'+i;
      const heading=document.createElement('header'); heading.className='project-section__heading';
      const kicker=document.createElement('p'); kicker.className='editorial-kicker'; kicker.textContent=String(i+1).padStart(2,'0')+' / '+section.title;
      const title=document.createElement('h2'); title.className='display-serif'; title.textContent=section.label; heading.append(kicker,title);
      const gallery=document.createElement('div'); gallery.className='project-section__content project-gallery';
      if(i===0 && data.intro){const intro=document.createElement('p');intro.style.gridColumn='1 / -1';intro.textContent=data.intro;gallery.append(intro);}
      section.items.forEach((item,j) => {
        const article=document.createElement('article');article.className='project-gallery-item project-gallery-item--'+(item.width==='full'?'full':'half');
        if(i===0) article.id=['rgb-ssd','t183','tuf-vulcan'][j] || 'work-'+j;
        article.style.scrollMarginTop='24px';
        const figure=document.createElement('figure');figure.className='media-slot project-media';figure.style.aspectRatio='4 / 3';
        const image=document.createElement('img');image.src='../assets/images/'+item.image;image.alt='';image.loading='lazy';image.style.objectFit='contain';figure.append(image);
        const caption=document.createElement('div');caption.className='project-gallery-caption';
        const num=document.createElement('span');num.textContent=String(j+1).padStart(2,'0');const h=document.createElement('h3');h.textContent=item.title;if(item.title) caption.append(num,h);
        if(item.description){const p=document.createElement('p');p.textContent=item.description;caption.append(p);}
        article.append(figure);if(item.title || item.description) article.append(caption);gallery.append(article);
      });
      block.append(heading,gallery);host.append(block);
    });
    const jumpToSection=()=>{const target=document.getElementById(location.hash.slice(1));if(target)target.scrollIntoView({block:'start'});};
    requestAnimationFrame(jumpToSection);
    window.addEventListener('hashchange',jumpToSection);
  }).catch(()=>{put('[data-project-title]','TeamGroup');const p=document.createElement('p');p.textContent='資料載入失敗，請重新整理。';document.querySelector('[data-teamgroup-sections]').append(p);});
})();
