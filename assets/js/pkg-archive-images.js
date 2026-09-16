(() => {
  document.querySelectorAll("[data-pkg-archive]").forEach(async figure => {
    const slug = figure.dataset.pkgArchive;
    try {
      const response = await fetch(`data/pkg-projects/${slug}.json`);
      if (!response.ok) return;
      const data = await response.json();
      if (!data.hero?.image) return;
      const image = document.createElement("img");
      image.src = `assets/images/pkg-projects/${slug}/${data.hero.image}`;
      image.alt = "";
      image.addEventListener("error", () => image.remove(), { once: true });
      figure.replaceChildren(image);
    } catch (_) {}
  });
})();
