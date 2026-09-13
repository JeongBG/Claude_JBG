// src/js/gallery.js
// 기능 1: 열화상 원본 이미지 대시보드

/**
 * hot-plate 섹션 + wafer 섹션으로 나눈 원본 이미지 그리드를 container에 렌더링한다.
 * @param {HTMLElement} container
 * @param {Dataset} dataset
 */
function renderRawGallery(container, dataset) {
  container.innerHTML = "";
  container.appendChild(
    buildGallerySection("gallery-hotplate", "Hot-plate 단독 (4방향)", dataset.hotplate)
  );
  container.appendChild(
    buildGallerySection("gallery-wafer", "Wafer 안착 (1~4사분면)", dataset.wafer)
  );
}

function buildGallerySection(sectionId, title, imageSets) {
  const section = document.createElement("section");
  section.id = sectionId;
  section.className = "gallery-section";

  const heading = document.createElement("h3");
  heading.textContent = title;
  section.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "gallery-grid";

  for (const key of Object.keys(imageSets)) {
    grid.appendChild(buildGalleryCard(imageSets[key]));
  }

  section.appendChild(grid);
  return section;
}

function buildGalleryCard(item) {
  const card = document.createElement("figure");
  card.className = "gallery-card";

  const img = document.createElement("img");
  img.src = item.imageDataUrl;
  img.alt = `${item.label} 열화상 원본 이미지`;
  img.loading = "lazy";
  img.addEventListener("click", () => openImageModal(item.imageDataUrl, item.label));

  const caption = document.createElement("figcaption");
  caption.textContent = item.label;

  card.appendChild(img);
  card.appendChild(caption);
  return card;
}

/**
 * 이미지 1장을 원본 화질로 확대해서 보여주는 모달을 연다.
 * @param {string} imageDataUrl
 * @param {string} label
 */
function openImageModal(imageDataUrl, label) {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("image-modal-img");
  const modalCaption = document.getElementById("image-modal-caption");

  modalImg.src = imageDataUrl;
  modalImg.alt = `${label} 확대 이미지`;
  modalCaption.textContent = label;
  modal.classList.add("is-open");
}

/**
 * 열려있는 이미지 확대 모달을 닫는다.
 */
function closeImageModal() {
  document.getElementById("image-modal").classList.remove("is-open");
}
