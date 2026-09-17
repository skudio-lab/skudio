(() => {
  const core = window.ProjectContent;
  const slug = document.body.dataset.project;
  let currentData = null;

  const twoDigits = (number) => String(number).padStart(2, "0");

  function renderIdentity(data) {
    const size = data.overview.size || {};
    const unit = size.unit || "mm";
    const sizeText = [["L", size.length], ["W", size.width], ["H", size.height]]
      .filter(([, value]) => value !== "" && value !== undefined && value !== null)
      .map(([label, value]) => `${label} : ${value} ${unit}`).join(", ") || "—";
    const values = {
      "[data-project-title]": data.title || "—",
      "[data-project-sequence]": data.sequence || "—",
      "[data-project-brand]": data.brand || data.overview.company || "—",
      "[data-project-company]": data.overview.company || data.brand || "—",
      "[data-project-category]": data.overview.category || "—",
      "[data-project-year]": data.overview.year || "—",
      "[data-project-role]": (data.overview.role || []).join(" / ") || "—",
      "[data-project-size]": sizeText
    };
    Object.entries(values).forEach(([selector, value]) => {
      document.querySelectorAll(selector).forEach((node) => { node.textContent = value; });
    });
  }

  function createMedia(item, label) {
    const figure = document.createElement("figure");
    figure.className = "media-slot project-media";
    if (item.image) {
      const image = document.createElement("img");
      image.src = item.image.includes("/") ? item.image : `../assets/images/projects/${slug}/${item.image}`;
      image.alt = item.alt || label;
      image.addEventListener("error", () => {
        image.remove();
        const placeholder = document.createElement("span");
        placeholder.className = "media-slot__label";
        placeholder.textContent = `${label || "IMAGE"} · FILE NOT FOUND`;
        figure.append(placeholder);
      }, { once: true });
      figure.append(image);
    } else {
      figure.setAttribute("aria-label", item.alt || `${label} 圖片預留位置`);
      const placeholder = document.createElement("span");
      placeholder.className = "media-slot__label";
      placeholder.textContent = `${label} · IMAGE PLACEHOLDER`;
      figure.append(placeholder);
    }
    return figure;
  }

  function renderBrief(brief) {
    const target = document.querySelector("[data-brief]");
    target.replaceChildren(...brief.map((item, index) => {
      const article = document.createElement("article");
      article.className = "project-numbered-row";
      article.innerHTML = `<span>${twoDigits(index + 1)}</span><h3></h3><p></p>`;
      article.querySelector("h3").textContent = item.title;
      article.querySelector("p").textContent = item.content || "內容待補";
      return article;
    }));
  }

  function renderGallery(gallery) {
    const target = document.querySelector("[data-gallery]");
    const visibleGallery = gallery.filter((item) => item.visible);
    target.replaceChildren(...visibleGallery.map((item, index) => {
      const article = document.createElement("article");
      article.className = `project-gallery-item project-gallery-item--${item.width}`;
      const media = createMedia(item, item.title);
      media.style.aspectRatio = core.aspectRatioValue(item.ratio);
      article.append(media);
      const caption = document.createElement("div");
      caption.className = "project-gallery-caption";
      const number = document.createElement("span");
      number.textContent = twoDigits(index + 1);
      caption.append(number);
      if (item.title) {
        const title = document.createElement("h3");
        title.textContent = item.title;
        caption.append(title);
      }
      if (item.description) {
        const description = document.createElement("p");
        description.textContent = item.description;
        caption.append(description);
      }
      article.append(caption);
      return article;
    }));
  }

  function renderHero(hero) {
    const target = document.querySelector("[data-hero-image]");
    target.hidden = hero?.visible === false;
    if (target.hidden) return;
    target.classList.toggle('project-hero__image--auto', hero?.ratio === 'auto');
    const media = createMedia(hero || {}, "HERO IMAGE");
    target.replaceChildren(...media.childNodes);
    target.setAttribute("aria-label", hero?.alt || "產品主視覺");
  }

  function renderCmf(cmf) {
    const section = document.querySelector('[data-section="cmf"]');
    section.hidden = !cmf.visible;
    const stage = document.querySelector("[data-cmf-stage]");
    const parts = document.querySelector("[data-parts]");
    stage.replaceChildren(createMedia(cmf.explodedImage, "EXPLODED VIEW"));
    const visibleParts = cmf.parts.filter((part) => part.visible);
    visibleParts.forEach((part) => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "project-part-marker";
      if (part.position.x > 60) marker.classList.add("project-part-marker--tooltip-left");
      marker.dataset.partIndex = String(part.number - 1);
      const markerNumber = document.createElement("span");
      markerNumber.textContent = twoDigits(part.number);
      marker.setAttribute("aria-label", `${part.name} 標記`);
      marker.style.left = `${part.position.x}%`;
      marker.style.top = `${part.position.y}%`;
      marker.style.background = core.swatchBackground(part.swatch);
      marker.style.color = core.markerTextColor(part.swatch);
      const tooltip = document.createElement("span");
      tooltip.className = "project-part-tooltip";
      const tooltipRows = [["Color", part.colorPlan], ["M", part.material], ["F Main", part.finish.main]];
      if (part.finish.local) tooltipRows.push(["F Local", part.finish.local]);
      const tooltipTitle = document.createElement("strong");
      tooltipTitle.textContent = `${twoDigits(part.number)} · ${part.name}`;
      const tooltipList = document.createElement("dl");
      tooltipRows.forEach(([label, value]) => {
        const row = document.createElement("div");
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = value || "—";
        row.append(dt, dd);
        tooltipList.append(row);
      });
      tooltip.append(tooltipTitle, tooltipList);
      marker.append(markerNumber, tooltip);
      stage.append(marker);
    });
    parts.replaceChildren(...visibleParts.map((part) => {
      const article = document.createElement("article");
      article.className = "project-part-row";
      const swatch = document.createElement("span");
      swatch.className = "project-part-swatch";
      swatch.style.background = core.swatchBackground(part.swatch);
      const number = document.createElement("span");
      number.className = "project-part-number";
      number.textContent = twoDigits(part.number);
      const copy = document.createElement("div");
      copy.innerHTML = `<h3></h3><dl></dl>`;
      copy.querySelector("h3").textContent = part.name;
      const rows = [["Color", part.colorPlan], ["Material", part.material], ["Finish Main", part.finish.main]];
      if (part.finish.local) rows.push(["Finish Local", part.finish.local]);
      rows.forEach(([label, value]) => {
        const row = document.createElement("div");
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = value || "—";
        row.append(dt, dd);
        copy.querySelector("dl").append(row);
      });
      article.append(swatch, number, copy);
      return article;
    }));
  }

  function renderProject(source) {
    currentData = core.normalizeProject(source);
    renderIdentity(currentData);
    renderHero(currentData.hero);
    renderBrief(currentData.brief);
    renderGallery(currentData.gallery);
    renderCmf(currentData.cmf);
    window.dispatchEvent(new CustomEvent("project-content:data-ready", { detail: currentData }));
    return currentData;
  }

  async function loadProject() {
    const response = await fetch(`../data/projects/${slug}.json`, { cache: "no-store" });
    if (response.ok) return renderProject(await response.json());
    const meta = (window.ID_PROJECTS || []).find((item) => item.slug === slug) || {};
    return renderProject({
      slug,
      sequence: meta.sequence || "—",
      title: meta.title || slug,
      brand: meta.brand || "—",
      hero: { image: "", alt: `${meta.title || slug} 產品主視覺` },
      overview: { company: meta.brand || "—", category: meta.category || "—", year: meta.year || "—", role: [meta.role || "Industrial Design"], size: { length: "", width: "", height: "", unit: "mm" } },
      brief: ["案件由來", "產品定位", "外觀需求", "CMF 需求"].map((title) => ({ title, content: "" })),
      gallery: [
        { title: "Front View", image: "", alt: "", description: "", ratio: "1:1", width: "half", visible: true },
        { title: "Real View", image: "", alt: "", description: "", ratio: "1:1", width: "half", visible: true },
        { title: "Detail", image: "", alt: "", description: "", ratio: "4:3", width: "full", visible: true }
      ],
      cmf: {
        visible: true,
        explodedImage: { image: "", alt: `${meta.title || slug} 產品爆炸圖` },
        parts: Array.from({ length: 6 }, (_, index) => ({
          name: `Part ${String(index + 1).padStart(2, "0")}`,
          colorPlan: "", material: "", finish: { main: "", local: "" },
          swatch: { type: "solid", start: index === 3 ? "#52514f" : "#d9d5cd", end: "#8c8780", angle: 90 },
          position: { x: [18, 36, 64, 80, 30, 70][index], y: [22, 38, 24, 43, 72, 74][index] }, visible: true
        }))
      }
    });
  }

  window.ProjectContentPage = { loadProject, renderProject, renderIdentity, renderHero, renderGallery, renderCmf, getData: () => currentData };
  loadProject().catch((error) => console.error(error));
})();

