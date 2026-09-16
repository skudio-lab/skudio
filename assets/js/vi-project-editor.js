(() => {
  if (new URLSearchParams(location.search).get("edit") !== "1") return;
  const panel = document.querySelector("[data-vi-editor]");
  if (!panel) return;
  let state;

  const sync = () => window.VIProjectPage.render(state);
  const field = (label, value, onInput, multiline = false) => {
    const wrapper = document.createElement("label");
    wrapper.className = "project-editor-field";
    const caption = document.createElement("span");
    caption.textContent = label;
    const input = document.createElement(multiline ? "textarea" : "input");
    input.value = value || "";
    input.addEventListener("input", () => { onInput(input.value); sync(); });
    wrapper.append(caption, input);
    return wrapper;
  };

  const selectField = (label, value, options, onChange) => {
    const wrapper = document.createElement("label");
    wrapper.className = "project-editor-field";
    const caption = document.createElement("span");
    caption.textContent = label;
    const select = document.createElement("select");
    options.forEach(([optionValue, text]) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = text;
      select.append(option);
    });
    select.value = value;
    select.addEventListener("change", () => { onChange(select.value); sync(); });
    wrapper.append(caption, select);
    return wrapper;
  };

  function imageEditor(item, index, collectionName) {
    const details = document.createElement("details");
    details.className = "project-editor-part";
    const summary = document.createElement("summary");
    summary.textContent = `${String(index + 1).padStart(2, "0")} · ${item.title || item.image || "未命名圖片"}`;
    const controls = document.createElement("div");
    controls.className = "project-editor-controls";
    controls.append(
      field("圖片檔名", item.image, value => { item.image = value; })
    );
    if (collectionName === "applications") controls.append(
      selectField("圖片比例", item.ratio || "1:1", [["1:1", "1:1"], ["4:3", "4:3"], ["3:2", "3:2"], ["16:9", "16:9"], ["4:5", "4:5"], ["3:4", "3:4"], ["original", "Original"]], value => { item.ratio = value; }),
      selectField("顯示寬度", item.width || "half", [["half", "Half／半版"], ["full", "Full／滿版"], ["auto", "Auto／自動"]], value => { item.width = value; })
    );
    controls.append(
      field("標題（空白不顯示）", item.title, value => { item.title = value; }),
      field("文字敘述（空白不顯示）", item.description, value => { item.description = value; }, true)
    );
    const actions = document.createElement("div");
    actions.className = "project-editor-actions project-editor-gallery-actions";
    const visible = document.createElement("label");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = item.visible !== false;
    check.addEventListener("change", () => { item.visible = check.checked; sync(); });
    visible.append(check, document.createTextNode(" 顯示圖片"));
    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "上移";
    up.disabled = index === 0;
    up.addEventListener("click", () => { [state[collectionName][index - 1], state[collectionName][index]] = [state[collectionName][index], state[collectionName][index - 1]]; sync(); renderEditor(); });
    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "下移";
    down.disabled = index === state[collectionName].length - 1;
    down.addEventListener("click", () => { [state[collectionName][index + 1], state[collectionName][index]] = [state[collectionName][index], state[collectionName][index + 1]]; sync(); renderEditor(); });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "刪除";
    remove.addEventListener("click", () => { state[collectionName].splice(index, 1); sync(); renderEditor(); });
    actions.append(visible, up, down, remove);
    controls.append(actions);
    details.append(summary, controls);
    return details;
  }

  function imageSection(title, collectionName) {
    const fragment = document.createDocumentFragment();
    const heading = document.createElement("h3");
    heading.className = "project-editor-section-title";
    heading.textContent = title;
    const list = document.createElement("div");
    state[collectionName].forEach((item, index) => list.append(imageEditor(item, index, collectionName)));
    const add = document.createElement("button");
    add.type = "button";
    add.className = "project-editor-add";
    add.textContent = "+ 新增圖片";
    add.addEventListener("click", () => {
      const item = { image: "", title: "", description: "", visible: true };
      if (collectionName === "applications") Object.assign(item, { ratio: "1:1", width: "half" });
      state[collectionName].push(item);
      sync();
      renderEditor();
    });
    fragment.append(heading, list, add);
    return fragment;
  }

  function renderEditor() {
    panel.hidden = false;
    panel.replaceChildren();
    const header = document.createElement("header");
    header.className = "project-editor-header";
    header.innerHTML = `<div><small>EDIT MODE</small><h2>VI Editor</h2></div><a href="${state.slug}.html">Close</a>`;
    const folder = document.createElement("small");
    folder.className = "project-editor-folder";
    folder.textContent = `assets/images/vi-projects/${state.slug}/`;
    const overview = document.createElement("div");
    overview.className = "project-editor-controls project-editor-image-controls";
    overview.append(
      field("Company / Brand", state.overview.company, value => { state.overview.company = value; }),
      field("Category", state.overview.category, value => { state.overview.category = value; }),
      field("Year", state.overview.year, value => { state.overview.year = value; }),
      field("Role（以逗號分隔）", state.overview.role.join(", "), value => { state.overview.role = value.split(",").map(text => text.trim()).filter(Boolean); }),
      field("Hero 情境圖檔名", state.hero.image, value => { state.hero.image = value; })
    );
    const briefHeading = document.createElement("h3");
    briefHeading.className = "project-editor-section-title";
    briefHeading.textContent = "Design Brief";
    const brief = document.createElement("div");
    brief.className = "project-editor-controls project-editor-image-controls";
    state.brief.forEach((item, index) => brief.append(
      field(`${String(index + 1).padStart(2, "0")} 標題`, item.title, value => { item.title = value; }),
      field(`${String(index + 1).padStart(2, "0")} 文字敘述`, item.content, value => { item.content = value; }, true)
    ));
    const finalHeading = document.createElement("h3");
    finalHeading.className = "project-editor-section-title";
    finalHeading.textContent = "Final Logo";
    const finalControls = document.createElement("div");
    finalControls.className = "project-editor-controls project-editor-image-controls";
    finalControls.append(
      field("Final Logo 圖片檔名", state.finalLogo.image, value => { state.finalLogo.image = value; })
    );
    const download = document.createElement("button");
    download.type = "button";
    download.className = "project-editor-download";
    download.textContent = "下載 JSON";
    download.addEventListener("click", () => {
      const blob = new Blob([`${JSON.stringify(state, null, 2)}\n`], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${state.slug}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
    panel.append(header, folder, overview, briefHeading, brief, imageSection("Logo Development", "development"), finalHeading, finalControls, imageSection("Logo Application", "applications"), download);
  }

  addEventListener("vi-project:data-ready", event => {
    state = structuredClone(event.detail);
    state.applications = (state.applications || []).map(item => ({ ratio: "1:1", width: "half", ...item }));
    document.body.classList.add("is-project-editing");
    renderEditor();
  }, { once: true });
})();
