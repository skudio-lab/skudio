(() => {
  if (new URLSearchParams(location.search).get("edit") !== "1") return;
  const core = window.ProjectContent;
  const page = window.ProjectContentPage;
  const slug = document.body.dataset.project;
  const panel = document.querySelector("[data-project-editor]");
  let state;

  const makeField = (label, value, onInput, type = "text") => {
    const wrapper = document.createElement("label");
    wrapper.className = "project-editor-field";
    wrapper.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("input");
    input.type = type;
    input.value = value;
    input.addEventListener("input", () => onInput(input.value));
    wrapper.append(input);
    return wrapper;
  };

  const makeSelect = (label, value, options, onChange) => {
    const wrapper = document.createElement("label");
    wrapper.className = "project-editor-field";
    wrapper.innerHTML = `<span>${label}</span>`;
    const select = document.createElement("select");
    options.forEach(([optionValue, text]) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = text;
      select.append(option);
    });
    select.value = value;
    select.addEventListener("change", () => onChange(select.value));
    wrapper.append(select);
    return wrapper;
  };

  function syncCmf() {
    page.renderCmf(state.cmf);
    bindMarkers();
  }

  function syncGallery() {
    page.renderGallery(state.gallery);
  }

  function updatePart(index, patch) {
    Object.assign(state.cmf.parts[index], patch);
    syncCmf();
  }

  function renderEditor() {
    panel.hidden = false;
    panel.replaceChildren();
    const header = document.createElement("header");
    header.className = "project-editor-header";
    header.innerHTML = `<div><small>EDIT MODE</small><h2>Project Editor</h2></div><a href="${slug}.html">Close</a>`;

    const imageHeading = document.createElement("h3");
    imageHeading.className = "project-editor-section-title";
    imageHeading.textContent = "Project Images";
    const imageFolder = document.createElement("small");
    imageFolder.className = "project-editor-folder";
    imageFolder.textContent = `assets/images/projects/${slug}/`;
    const imageControls = document.createElement("div");
    imageControls.className = "project-editor-controls project-editor-image-controls";
    imageControls.append(
      makeField("Size L（mm）", state.overview.size?.length ?? "", (value) => {
        state.overview.size = state.overview.size || { length: "", width: "", height: "", unit: "mm" };
        state.overview.size.length = value;
        page.renderIdentity(state);
      }, "number"),
      makeField("Size W（mm）", state.overview.size?.width ?? "", (value) => {
        state.overview.size = state.overview.size || { length: "", width: "", height: "", unit: "mm" };
        state.overview.size.width = value;
        page.renderIdentity(state);
      }, "number"),
      makeField("Size H（mm）", state.overview.size?.height ?? "", (value) => {
        state.overview.size = state.overview.size || { length: "", width: "", height: "", unit: "mm" };
        state.overview.size.height = value;
        page.renderIdentity(state);
      }, "number"),
      makeField("Hero 圖片檔名", state.hero?.image || "", (value) => {
        state.hero = state.hero || { image: "", alt: "產品主視覺" };
        state.hero.image = value;
        page.renderHero(state.hero);
      }),
      makeField("CMF 爆炸圖檔名", state.cmf.explodedImage?.image || "", (value) => {
        state.cmf.explodedImage = state.cmf.explodedImage || { image: "", alt: "產品爆炸圖" };
        state.cmf.explodedImage.image = value;
        syncCmf();
      })
    );

    const galleryHeading = document.createElement("h3");
    galleryHeading.className = "project-editor-section-title";
    galleryHeading.textContent = "Gallery Editor";
    const folder = document.createElement("small");
    folder.className = "project-editor-folder";
    folder.textContent = `assets/images/projects/${slug}/`;
    const galleryList = document.createElement("div");
    galleryList.className = "project-editor-gallery";
    state.gallery.forEach((item, index) => galleryList.append(buildGalleryEditor(item, index)));
    const addImage = document.createElement("button");
    addImage.type = "button";
    addImage.className = "project-editor-add";
    addImage.textContent = "+ 新增圖片";
    addImage.addEventListener("click", () => {
      state.gallery.push({ image: "", title: "", description: "", alt: "", ratio: "1:1", width: "half", visible: true });
      state = core.normalizeProject(state);
      syncGallery();
      renderEditor();
    });

    const cmfHeading = document.createElement("h3");
    cmfHeading.className = "project-editor-section-title";
    cmfHeading.textContent = "CMF Parts";
    const sectionToggle = document.createElement("label");
    sectionToggle.className = "project-editor-toggle";
    const sectionCheck = document.createElement("input");
    sectionCheck.type = "checkbox";
    sectionCheck.checked = state.cmf.visible;
    sectionCheck.addEventListener("change", () => { state.cmf.visible = sectionCheck.checked; syncCmf(); });
    sectionToggle.append(sectionCheck, document.createTextNode(" 顯示 CMF 區塊"));

    const list = document.createElement("div");
    list.className = "project-editor-parts";
    state.cmf.parts.forEach((part, index) => list.append(buildPartEditor(part, index)));

    const add = document.createElement("button");
    add.type = "button";
    add.className = "project-editor-add";
    add.textContent = "+ 新增 Part";
    add.addEventListener("click", () => {
      state.cmf.parts.push({ name: "", colorPlan: "", material: "", finish: { main: "", local: "" }, visible: true });
      state = core.normalizeProject(state);
      syncCmf();
      renderEditor();
    });
    const download = document.createElement("button");
    download.type = "button";
    download.className = "project-editor-download";
    download.textContent = "下載 JSON";
    const status = document.createElement("small");
    status.className = "project-editor-status";
    download.addEventListener("click", () => {
      const json = core.serializeProject(state);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug}.json`;
      link.click();
      URL.revokeObjectURL(url);
      status.textContent = `已下載 ${slug}.json`;
    });
    panel.append(header, imageHeading, imageFolder, imageControls, galleryHeading, folder, galleryList, addImage, cmfHeading, sectionToggle, list, add, download, status);
  }

  function buildGalleryEditor(item, index) {
    const details = document.createElement("details");
    details.className = "project-editor-part";
    const summary = document.createElement("summary");
    summary.textContent = `${String(index + 1).padStart(2, "0")} · ${item.title || item.image || "未命名圖片"}`;
    const controls = document.createElement("div");
    controls.className = "project-editor-controls";
    controls.append(
      makeField("圖片檔名", item.image, (value) => { state.gallery[index].image = value; syncGallery(); }),
      makeSelect("圖片比例", item.ratio, [["1:1", "1:1"], ["4:3", "4:3"], ["3:2", "3:2"], ["16:9", "16:9"], ["4:5", "4:5"], ["3:4", "3:4"], ["original", "Original"]], (value) => { state.gallery[index].ratio = value; syncGallery(); }),
      makeSelect("顯示寬度", item.width, [["half", "Half／半版"], ["full", "Full／全版"], ["auto", "Auto／自動"]], (value) => { state.gallery[index].width = value; syncGallery(); }),
      makeField("標題", item.title, (value) => { state.gallery[index].title = value; syncGallery(); }),
      makeField("文字敘述", item.description, (value) => { state.gallery[index].description = value; syncGallery(); })
    );
    const actions = document.createElement("div");
    actions.className = "project-editor-actions project-editor-gallery-actions";
    const visible = document.createElement("label");
    const visibleCheck = document.createElement("input");
    visibleCheck.type = "checkbox";
    visibleCheck.checked = item.visible;
    visibleCheck.addEventListener("change", () => { state.gallery[index].visible = visibleCheck.checked; syncGallery(); });
    visible.append(visibleCheck, document.createTextNode(" 顯示圖片"));
    const move = (direction) => {
      const next = index + direction;
      if (next < 0 || next >= state.gallery.length) return;
      [state.gallery[index], state.gallery[next]] = [state.gallery[next], state.gallery[index]];
      state = core.normalizeProject(state);
      syncGallery();
      renderEditor();
    };
    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "上移";
    up.disabled = index === 0;
    up.addEventListener("click", () => move(-1));
    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "下移";
    down.disabled = index === state.gallery.length - 1;
    down.addEventListener("click", () => move(1));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "刪除";
    remove.addEventListener("click", () => {
      if (!confirm(`刪除圖片 ${item.title || item.image || index + 1}？`)) return;
      state.gallery.splice(index, 1);
      state = core.normalizeProject(state);
      syncGallery();
      renderEditor();
    });
    actions.append(visible, up, down, remove);
    controls.append(actions);
    details.append(summary, controls);
    return details;
  }

  function buildPartEditor(part, index) {
    const details = document.createElement("details");
    details.className = "project-editor-part";
    const summary = document.createElement("summary");
    const swatch = document.createElement("span");
    swatch.className = "project-editor-swatch";
    swatch.style.background = core.swatchBackground(part.swatch);
    summary.append(swatch, document.createTextNode(`${String(index + 1).padStart(2, "0")} · ${part.name}`));
    const controls = document.createElement("div");
    controls.className = "project-editor-controls";
    controls.append(
      makeField("Part 名稱", part.name, (value) => updatePart(index, { name: value })),
      makeField("色彩計畫", part.colorPlan, (value) => updatePart(index, { colorPlan: value })),
      makeField("材料選擇", part.material, (value) => updatePart(index, { material: value })),
      makeField("主要表面處理", part.finish.main, (value) => { part.finish.main = value; syncCmf(); }),
      makeField("局部表面處理", part.finish.local, (value) => { part.finish.local = value; syncCmf(); })
    );
    const typeLabel = document.createElement("label");
    typeLabel.className = "project-editor-field";
    typeLabel.innerHTML = "<span>色票類型</span>";
    const select = document.createElement("select");
    select.innerHTML = '<option value="solid">單色</option><option value="gradient">漸層</option>';
    select.value = part.swatch.type;
    select.addEventListener("change", () => { part.swatch.type = select.value; syncCmf(); renderEditor(); });
    typeLabel.append(select);
    controls.append(typeLabel, makeField("起始顏色", part.swatch.start, (value) => { part.swatch.start = value; syncCmf(); }, "color"));
    if (part.swatch.type === "gradient") controls.append(
      makeField("結束顏色", part.swatch.end, (value) => { part.swatch.end = value; syncCmf(); }, "color"),
      makeField("漸層角度", part.swatch.angle, (value) => { part.swatch.angle = Number(value); syncCmf(); }, "number")
    );
    const actions = document.createElement("div");
    actions.className = "project-editor-actions";
    const show = document.createElement("label");
    const showCheck = document.createElement("input");
    showCheck.type = "checkbox";
    showCheck.checked = part.visible;
    showCheck.addEventListener("change", () => updatePart(index, { visible: showCheck.checked }));
    show.append(showCheck, document.createTextNode(" 顯示 Part"));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "刪除";
    remove.addEventListener("click", () => {
      if (!confirm(`刪除 ${part.name}？`)) return;
      state.cmf.parts.splice(index, 1);
      syncCmf();
      renderEditor();
    });
    actions.append(show, remove);
    controls.append(actions);
    details.append(summary, controls);
    return details;
  }

  function movePart(index, x, y) {
    state.cmf.parts[index].position = { x: core.clampPercent(x), y: core.clampPercent(y) };
    const marker = document.querySelector(`[data-part-index="${index}"]`);
    if (marker) {
      marker.style.left = `${state.cmf.parts[index].position.x}%`;
      marker.style.top = `${state.cmf.parts[index].position.y}%`;
      marker.classList.toggle("project-part-marker--tooltip-left", state.cmf.parts[index].position.x > 60);
    }
  }

  function bindMarkers() {
    const stage = document.querySelector("[data-cmf-stage]");
    stage.querySelectorAll(".project-part-marker").forEach((marker) => {
      const index = Number(marker.dataset.partIndex);
      marker.classList.add("is-draggable");
      marker.addEventListener("pointerdown", (event) => {
        marker.setPointerCapture(event.pointerId);
        const drag = (moveEvent) => {
          const point = core.pointToPercent(moveEvent.clientX, moveEvent.clientY, stage.getBoundingClientRect());
          movePart(index, point.x, point.y);
        };
        marker.addEventListener("pointermove", drag);
        const stop = () => marker.removeEventListener("pointermove", drag);
        marker.addEventListener("pointerup", stop, { once: true });
        marker.addEventListener("pointercancel", stop, { once: true });
      });
      marker.addEventListener("keydown", (event) => {
        const amount = event.shiftKey ? 5 : 1;
        const delta = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] }[event.key];
        if (!delta) return;
        event.preventDefault();
        const position = state.cmf.parts[index].position;
        movePart(index, position.x + delta[0], position.y + delta[1]);
      });
    });
  }

  addEventListener("project-content:data-ready", (event) => {
    state = core.normalizeProject(event.detail);
    document.body.classList.add("is-project-editing");
    renderEditor();
    bindMarkers();
  }, { once: true });
})();

