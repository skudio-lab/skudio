(() => {
const hero=document.querySelector('.video-section'),track=document.querySelector('.roulette-track'),prev=document.querySelector('[data-prev]'),next=document.querySelector('[data-next]'),status=document.querySelector('[data-video-status]');
const radius=3375,angle=7.5;let videos=[],index=0;
function render(){
track.style.transform='rotate('+(-index*angle)+'deg)';
document.querySelector('.video-number').textContent=String(index+1).padStart(2,'0')+' / '+String(videos.length).padStart(2,'0');
document.querySelector('.video-meta').textContent=videos[index].title;
document.querySelector('.video-progress i').style.width=((index+1)/videos.length*100)+'%';
prev.disabled=index===0;next.disabled=index===videos.length-1;
}
function step(delta){if(!videos.length)return;index=Math.max(0,Math.min(videos.length-1,index+delta));render();}
prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
hero.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();step(e.key==='ArrowLeft'?-1:1);}});
function fit(){const scale=Math.min(hero.clientWidth/1920,hero.clientHeight/1080);hero.style.setProperty('--s',scale);hero.style.setProperty('--cy',(hero.clientHeight*.72+radius*scale)+'px');}
new ResizeObserver(fit).observe(hero);fit();
fetch('data/videos.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
videos=data.filter(v=>/^[\w-]{11}$/.test(v.id));if(!videos.length)throw Error();
const list=document.querySelector('.video-list');
videos.forEach((v,i)=>{
const start=Math.max(0,Math.floor(Number(v.start)||0));
const watchUrl='https://www.youtube.com/watch?v='+v.id+(start?'&t='+start+'s':'');
const card=document.createElement('a');card.className='video-card';card.href='#film-'+v.id;card.style.transform='rotate('+i*angle+'deg) translateY(-'+radius+'px)';
const img=document.createElement('img');img.src='https://i.ytimg.com/vi/'+v.id+'/hqdefault.jpg';img.alt='';
card.setAttribute('aria-label','查看 '+v.title);card.append(img);track.append(card);
card.addEventListener('focus',()=>{index=i;render();});
const row=document.createElement('article');row.className='video-list-item';row.id='film-'+v.id;
const frame=document.createElement('a');frame.className='video-list-thumb';frame.href=watchUrl;frame.target='_blank';frame.rel='noopener';frame.setAttribute('aria-label','播放 '+v.title);
const thumb=document.createElement('img');thumb.src='https://i.ytimg.com/vi/'+v.id+'/hqdefault.jpg';thumb.alt='';thumb.loading='lazy';const play=document.createElement('span');play.textContent='▷';frame.append(thumb,play);
const copy=document.createElement('div'),num=document.createElement('p'),title=document.createElement('h3'),desc=document.createElement('p'),link=document.createElement('a');
num.className='editorial-kicker';num.textContent=String(i+1).padStart(2,'0')+(v.year?' / '+v.year:'');title.textContent=v.title;
desc.textContent=v.description||'';desc.hidden=!v.description;
link.className='editorial-link';link.href=watchUrl;link.target='_blank';link.rel='noopener';link.textContent='Watch on YouTube ↗';
copy.append(num,title,desc,link);row.append(frame,copy);list.append(row);
});
status.hidden=true;render();
}).catch(()=>{status.textContent='影片資料暫時無法載入，請重新整理。';});
})();
