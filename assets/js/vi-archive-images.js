(async () => {
  const slots = document.querySelectorAll("[data-vi-archive]");
  for (const slot of slots) {
    const slug = slot.dataset.viArchive;
    try {
      const response = await fetch(`data/vi-projects/${slug}.json`);
      if (!response.ok) continue;
      const data = await response.json();
      if (!data.hero?.image) continue;
      const image = document.createElement("img");
      image.src = `assets/images/vi-projects/${slug}/${data.hero.image}`;
      image.alt = data.hero.alt || `${data.title} 品牌情境圖`;
      slot.replaceChildren(image);
    } catch (_) {}
  }
})();
