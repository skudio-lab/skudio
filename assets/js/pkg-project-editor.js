(() => {
  if (new URLSearchParams(location.search).get("edit") !== "1") return;
  const panel = document.querySelector("[data-pkg-editor]");
  if (!panel) return;
  let state;
  const sync = () => { window.PKGProjectPage.render(state); bindMarkers(); };
  const field = (label, value, change, multiline = false) => {
    const wrap = document.createElement("label"); wrap.className = "project-editor-field";
    const caption = document.createElement("span"); caption.textContent = label;
    const input = document.createElement(multiline ? "textarea" : "input"); input.value = value ?? "";
    input.addEventListener("input", () => { change(input.value); sync(); }); wrap.append(caption, input); return wrap;
  };
  const select = (label, value, options, change) => {
    const wrap = document.createElement("label"); wrap.className = "project-editor-field";
    const caption = document.createElement("span"); caption.textContent = label;
    const input = document.createElement("select"); options.forEach(([v, t]) => input.append(Object.assign(document.createElement("option"), { value: v, textContent: t })));
    input.value = value; input.addEventListener("change", () => { change(input.value); sync(); }); wrap.append(caption, input); return wrap;
  };
  const toggle = (label, checked, change) => { const wrap = document.createElement("label"); wrap.className = "project-editor-toggle"; const input = document.createElement("input"); input.type = "checkbox"; input.checked = checked; input.addEventListener("change", () => { change(input.checked); sync(); }); wrap.append(input, document.createTextNode(` ${label}`)); return wrap; };
  const heading = text => Object.assign(document.createElement("h3"), { className: "project-editor-section-title", textContent: text });
  function itemEditor(title, item, controls, remove) {
    const details = document.createElement("details"); details.className = "project-editor-part";
    const summary = document.createElement("summary"); summary.textContent = title;
    const body = document.createElement("div"); body.className = "project-editor-controls"; body.append(...controls);
    const button = document.createElement("button"); button.type = "button"; button.textContent = "刪除"; button.addEventListener("click", remove); body.append(button); details.append(summary, body); return details;
  }
  function renderEditor() {
    panel.hidden = false; panel.removeAttribute("hidden"); panel.replaceChildren();
    const header = document.createElement("header"); header.className = "project-editor-header"; header.innerHTML = `<div><small>EDIT MODE</small><h2>PKG Editor</h2></div><a href="pkg-${state.slug}.html">Close</a>`;
    const base = document.createElement("div"); base.className = "project-editor-controls project-editor-image-controls";
    base.append(field("Company", state.overview.company, v => state.overview.company = v), field("Brand", state.overview.brand, v => state.overview.brand = v), field("Year", state.overview.year, v => state.overview.year = v), field("Role（逗號分隔）", state.overview.role.join(", "), v => state.overview.role = v.split(",").map(x => x.trim()).filter(Boolean)), field("Hero 圖片檔名", state.hero.image, v => state.hero.image = v), field("Hero 短摘要", state.hero.summary, v => state.hero.summary = v, true));
    const brief = document.createElement("div"); brief.className = "project-editor-controls";
    [["ISTA 等級","ista"],["Carton 重量","weight"],["出口國家／法規","markets"],["產品尺寸","productSize"],["配件／替代料","accessories"],["Cost Down／UX","priority"]].forEach(([label,key]) => brief.append(field(label, state.brief[key], v => state.brief[key] = v, key === "accessories" || key === "priority")));
    const componentList = document.createElement("div"); state.components.items.forEach((item, i) => componentList.append(itemEditor(`${String(i+1).padStart(2,"0")} · ${item.name || "Component"}`, item, [field("品名",item.name,v=>item.name=v),field("敘述（空白不顯示）",item.description,v=>item.description=v,true),field("材質／紙質",item.material,v=>item.material=v),field("數量",item.quantity,v=>item.quantity=v),field("尺寸",item.size,v=>item.size=v),toggle("LABEL 特性",item.label.enabled,v=>{item.label.enabled=v;renderEditor();}),...(item.label.enabled?[select("膠材",item.label.adhesive||"",[["","未指定"],["Acrylic","Acrylic／壓克力膠"],["Rubber","Rubber／橡膠膠"]],v=>item.label.adhesive=v),field("規範認證",item.label.regulations,v=>item.label.regulations=v)]:[]),toggle("顯示組件",item.visible!==false,v=>item.visible=v)], () => { state.components.items.splice(i,1); sync(); renderEditor(); })));
    const addComponent = document.createElement("button"); addComponent.className="project-editor-add"; addComponent.textContent="+ 新增組件"; addComponent.onclick=()=>{state.components.items.push({name:"",description:"",material:"",quantity:"1",size:"",position:{x:50,y:50},label:{enabled:false,adhesive:"",regulations:""},visible:true});sync();renderEditor();};
    const deliveryList=document.createElement("div");state.deliverables.items.forEach((item,i)=>deliveryList.append(itemEditor(`${String(i+1).padStart(2,"0")} · ${item.title||"PDF"}`,item,[field("標題",item.title,v=>item.title=v),field("PDF 檔名",item.pdf,v=>item.pdf=v),toggle("顯示 PDF",item.visible!==false,v=>item.visible=v)],()=>{state.deliverables.items.splice(i,1);sync();renderEditor();})));
    const addDelivery=document.createElement("button");addDelivery.className="project-editor-add";addDelivery.textContent="+ 新增 PDF";addDelivery.onclick=()=>{state.deliverables.items.push({title:"",pdf:"",visible:true});sync();renderEditor();};
    const download=document.createElement("button");download.className="project-editor-download";download.textContent="下載 JSON";download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)+"\n"],{type:"application/json"}));const a=Object.assign(document.createElement("a"),{href:url,download:`${state.slug}.json`});a.click();URL.revokeObjectURL(url);};
    panel.append(header,heading("Project / Hero"),base,heading("Packaging Brief"),brief,heading("Packaging Components / Label"),toggle("顯示組件區",state.components.visible!==false,v=>state.components.visible=v),field("組件圖檔名",state.components.image,v=>state.components.image=v),componentList,addComponent,heading("Label Artwork PDF"),toggle("顯示 PDF Overview",state.labels.visible!==false,v=>state.labels.visible=v),field("PDF 檔名",state.labels.overviewPdf,v=>state.labels.overviewPdf=v),heading("Engineering Deliverables PDF"),toggle("顯示區域",state.deliverables.visible!==false,v=>state.deliverables.visible=v),deliveryList,addDelivery,download);
  }
  function bindMarkers(){const stage=document.querySelector("[data-pkg-stage]");if(!stage)return;stage.querySelectorAll("[data-component-index]").forEach(marker=>{const i=Number(marker.dataset.componentIndex);marker.classList.add("is-draggable");marker.onpointerdown=e=>{marker.setPointerCapture(e.pointerId);marker.onpointermove=move=>{const r=stage.getBoundingClientRect();state.components.items[i].position={x:Math.max(0,Math.min(100,(move.clientX-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(move.clientY-r.top)/r.height*100))};marker.style.left=`${state.components.items[i].position.x}%`;marker.style.top=`${state.components.items[i].position.y}%`;};marker.onpointerup=()=>marker.onpointermove=null;};});}
  addEventListener("pkg-project:data-ready",event=>{state=structuredClone(event.detail);state.components.items.forEach(item=>item.label={enabled:false,adhesive:"",regulations:"",...item.label});state.labels={visible:true,overviewPdf:"",...state.labels};state.deliverables=window.PKGComponentModel.normalizeDeliverables(state.deliverables);document.body.classList.add("is-project-editing");renderEditor();bindMarkers();},{once:true});
})();
