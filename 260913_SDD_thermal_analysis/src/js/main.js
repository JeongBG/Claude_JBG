// src/js/main.js
// 대시보드 초기화 및 화면 조립 (entry point)

function init() {
  const dataset = window.DATASET;
  const positionMapping = window.POSITION_MAPPING;

  renderRawGallery(document.getElementById("gallery-root"), dataset);
  renderWaferAnalysis(document.getElementById("wafer-analysis-root"), dataset.wafer);
  renderComparison(
    document.getElementById("compare-root"),
    dataset.hotplate,
    dataset.wafer,
    positionMapping
  );

  document.getElementById("image-modal-close").addEventListener("click", closeImageModal);
  document.getElementById("image-modal").addEventListener("click", (event) => {
    if (event.target.id === "image-modal") closeImageModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeImageModal();
  });
}

document.addEventListener("DOMContentLoaded", init);
