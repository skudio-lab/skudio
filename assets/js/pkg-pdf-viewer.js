(() => {
  const nextScale = (scale, deltaY) => Math.max(.5, Math.min(4, Math.round((scale + (deltaY < 0 ? .1 : -.1)) * 10) / 10));
  const canStartPan = ({ button }) => button === 0;
  const rasterScale = ({ fitScale, zoom, pixelRatio }) => Math.min(8, fitScale * zoom * Math.min(pixelRatio || 1, 2.5));

  async function mount(stage, source) {
    stage.replaceChildren();
    stage.tabIndex = 0;
    stage.classList.add("pkg-pdf-canvas");
    const viewport = document.createElement("div");
    viewport.className = "pkg-pdf-pages";
    stage.append(viewport);

    let pdfjs;
    const pages = [];
    let scale = 1;
    try {
      pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.mjs";
      const pdf = await pdfjs.getDocument({ url: source, isEvalSupported: false }).promise;
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const original = page.getViewport({ scale: 1 });
        const fitScale = Math.max(.1, (stage.clientWidth - 64) / original.width);
        const canvas = document.createElement("canvas");
        canvas.style.width = `${original.width * fitScale}px`;
        canvas.style.height = `${original.height * fitScale}px`;
        viewport.append(canvas);
        pages.push({ page, canvas, fitScale, renderTask: null });
      }
    } catch (error) {
      viewport.textContent = "PDF 無法載入";
      viewport.classList.add("pkg-pdf-error");
      return;
    }

    const renderPages = zoom => Promise.all(pages.map(async record => {
      if (record.renderTask) record.renderTask.cancel();
      const detailScale = rasterScale({ fitScale: record.fitScale, zoom, pixelRatio: window.devicePixelRatio || 1 });
      const pageViewport = record.page.getViewport({ scale: detailScale });
      record.canvas.width = Math.ceil(pageViewport.width);
      record.canvas.height = Math.ceil(pageViewport.height);
      record.renderTask = record.page.render({ canvasContext: record.canvas.getContext("2d"), viewport: pageViewport });
      try { await record.renderTask.promise; } catch (error) { if (error?.name !== "RenderingCancelledException") throw error; }
    }));
    await renderPages(scale);

    let x = 0;
    let y = 24;
    let spacePressed = false;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let renderTimer;
    const draw = () => { viewport.style.transform = `translate(${x}px, ${y}px) scale(${scale})`; };
    draw();

    stage.addEventListener("wheel", event => {
      event.preventDefault();
      const next = nextScale(scale, event.deltaY);
      const rect = stage.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const ratio = next / scale;
      x = pointerX - (pointerX - x) * ratio;
      y = pointerY - (pointerY - y) * ratio;
      scale = next;
      draw();
      clearTimeout(renderTimer);
      renderTimer = setTimeout(() => renderPages(scale), 160);
    }, { passive: false });

    window.addEventListener("keydown", event => {
      if (event.code !== "Space") return;
      if (!stage.matches(":hover") && document.activeElement !== stage) return;
      event.preventDefault();
      spacePressed = true;
      stage.classList.add("is-pan-ready");
    });
    window.addEventListener("keyup", event => {
      if (event.code !== "Space") return;
      spacePressed = false;
      dragging = false;
      stage.classList.remove("is-pan-ready", "is-panning");
    });
    stage.addEventListener("blur", () => {
      spacePressed = false;
      dragging = false;
      stage.classList.remove("is-pan-ready", "is-panning");
    });
    stage.addEventListener("pointerdown", event => {
      if (!canStartPan({ spacePressed, button: event.button })) return;
      dragging = true;
      startX = event.clientX - x;
      startY = event.clientY - y;
      stage.setPointerCapture(event.pointerId);
      stage.classList.add("is-panning");
    });
    stage.addEventListener("pointermove", event => {
      if (!dragging) return;
      x = event.clientX - startX;
      y = event.clientY - startY;
      draw();
    });
    stage.addEventListener("pointerup", () => {
      dragging = false;
      stage.classList.remove("is-panning");
    });
  }

  const api = { nextScale, canStartPan, rasterScale, mount };
  if (typeof window !== "undefined") window.PKGPdfViewer = api;
  if (typeof module !== "undefined") module.exports = api;
})();
