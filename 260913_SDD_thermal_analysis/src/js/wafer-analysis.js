// src/js/wafer-analysis.js
// 기능 2: Wafer 온도 분포 정량 분석 화면 (analysis.js, heatmap.js에 의존)

/**
 * wafer 4사분면 통계 카드 + 히트맵 + 균일도 요약을 container에 렌더링한다.
 * @param {HTMLElement} container
 * @param {Dataset["wafer"]} waferSet
 */
function renderWaferAnalysis(container, waferSet) {
  container.innerHTML = "";

  const quadrantKeys = Object.keys(waferSet);
  const quadrants = quadrantKeys.map((key) => ({
    id: waferSet[key].id,
    label: waferSet[key].label,
    matrix: waferSet[key].matrix,
  }));

  const uniformity = computeUniformity(quadrants);

  container.appendChild(buildUniformitySummary(uniformity));

  const grid = document.createElement("div");
  grid.className = "wafer-grid";

  for (const key of quadrantKeys) {
    const item = waferSet[key];
    const quadrantResult = uniformity.perQuadrant.find((q) => q.id === item.id);
    grid.appendChild(buildQuadrantCard(item, quadrantResult));
  }

  container.appendChild(grid);
}

function buildUniformitySummary(uniformity) {
  const summary = document.createElement("div");
  summary.className = "uniformity-summary";

  if (Number.isNaN(uniformity.uniformityIndex)) {
    summary.innerHTML = `<span class="badge badge-warning">분석 가능한 사분면 데이터가 없습니다</span>`;
    return summary;
  }

  summary.innerHTML = `
    <div class="uniformity-badge">
      <span class="uniformity-label">Wafer 전체 균일도 (Max - Min)</span>
      <span class="uniformity-value">${uniformity.uniformityIndex.toFixed(2)} °C</span>
    </div>
    <div class="uniformity-detail">
      최고 ${uniformity.overallMax.toFixed(1)}°C · 최저 ${uniformity.overallMin.toFixed(1)}°C · 평균 ${uniformity.overallAvg.toFixed(1)}°C
    </div>
  `;
  return summary;
}

function buildQuadrantCard(item, quadrantResult) {
  const card = document.createElement("div");
  card.className = "quadrant-card";

  const heading = document.createElement("h4");
  heading.textContent = item.label;
  card.appendChild(heading);

  if (!quadrantResult || quadrantResult.status === "unavailable") {
    const badge = document.createElement("span");
    badge.className = "badge badge-warning";
    badge.textContent = "분석 불가";
    card.appendChild(badge);
    return card;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 240;
  canvas.className = "heatmap-canvas";
  renderHeatmap(canvas, item.matrix, { markExtremes: true });
  card.appendChild(canvas);

  const statCard = document.createElement("div");
  statCard.className = "quadrant-stat-card";
  statCard.innerHTML = `
    <div>최고 <strong>${quadrantResult.max.toFixed(1)}°C</strong></div>
    <div>최저 <strong>${quadrantResult.min.toFixed(1)}°C</strong></div>
    <div>평균 <strong>${quadrantResult.avg.toFixed(1)}°C</strong></div>
  `;
  card.appendChild(statCard);

  return card;
}
