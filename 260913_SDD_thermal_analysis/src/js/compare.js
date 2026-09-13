// src/js/compare.js
// 기능 3: Hot-plate ↔ Wafer 비교 분석 (analysis.js, heatmap.js에 의존)

/**
 * 두 온도 격자의 크기가 같으면 원소별 차이(wafer - hotplate)를 계산하고,
 * 크기가 다르면 null을 반환해 "대응 불확실"을 신호한다.
 * @param {number[][]} hotplateMatrix
 * @param {number[][]} waferMatrix
 * @returns {number[][]|null}
 */
function computeDelta(hotplateMatrix, waferMatrix) {
  if (!hotplateMatrix || !waferMatrix) return null;
  if (hotplateMatrix.length !== waferMatrix.length) return null;

  const delta = [];
  for (let row = 0; row < hotplateMatrix.length; row++) {
    const hotRow = hotplateMatrix[row];
    const waferRow = waferMatrix[row];
    if (!waferRow || hotRow.length !== waferRow.length) return null;

    const deltaRow = [];
    for (let col = 0; col < hotRow.length; col++) {
      deltaRow.push(waferRow[col] - hotRow[col]);
    }
    delta.push(deltaRow);
  }
  return delta;
}

/**
 * POSITION_MAPPING을 기준으로 hot-plate/wafer 이미지를 나란히 배치하고,
 * computeDelta 결과를 편차 히트맵(또는 대응 불가 안내)으로 렌더링한다.
 * @param {HTMLElement} container
 * @param {Dataset["hotplate"]} hotplateSet
 * @param {Dataset["wafer"]} waferSet
 * @param {Array<{hotplateId:string, waferId:string}>} mapping
 */
function renderComparison(container, hotplateSet, waferSet, mapping) {
  container.innerHTML = "";
  container.appendChild(buildMappingBanner());

  for (const pair of mapping) {
    container.appendChild(buildCompareRow(hotplateSet, waferSet, pair));
  }
}

function buildMappingBanner() {
  const banner = document.createElement("div");
  banner.className = "mapping-banner";
  banner.textContent =
    "⚠ hot-plate ↔ wafer 위치 대응은 추정값입니다 (POSITION_MAPPING 참고, 실측 위치 확인 필요)";
  return banner;
}

function buildCompareRow(hotplateSet, waferSet, pair) {
  const hotplateItem = hotplateSet[pair.hotplateId];
  const waferItem = waferSet[pair.waferId];

  const row = document.createElement("div");
  row.className = "compare-row";

  const rowTitle = document.createElement("h4");
  rowTitle.textContent = `${hotplateItem.label} (hot-plate) ↔ ${waferItem.label} (wafer)`;
  row.appendChild(rowTitle);

  const panels = document.createElement("div");
  panels.className = "compare-panels";

  panels.appendChild(
    buildHeatmapPanel(`Hot-plate: ${hotplateItem.label}`, hotplateItem.matrix, { markExtremes: true })
  );
  panels.appendChild(
    buildHeatmapPanel(`Wafer: ${waferItem.label}`, waferItem.matrix, { markExtremes: true })
  );

  const delta = computeDelta(hotplateItem.matrix, waferItem.matrix);
  panels.appendChild(delta === null ? buildDeltaUnavailablePanel() : buildDeltaPanel(delta));

  row.appendChild(panels);
  return row;
}

function buildHeatmapPanel(title, matrix, options) {
  const panel = document.createElement("div");
  panel.className = "compare-panel";

  const heading = document.createElement("h5");
  heading.textContent = title;
  panel.appendChild(heading);

  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  canvas.className = "heatmap-canvas";
  renderHeatmap(canvas, matrix, options);
  panel.appendChild(canvas);

  return panel;
}

function buildDeltaPanel(delta) {
  const panel = document.createElement("div");
  panel.className = "compare-panel";

  const heading = document.createElement("h5");
  heading.textContent = "편차 (Wafer - Hot-plate)";
  panel.appendChild(heading);

  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  canvas.className = "heatmap-canvas";
  renderHeatmap(canvas, delta, { mode: "diverging", center: 0 });
  panel.appendChild(canvas);

  const totalCells = delta.length * delta[0].length;
  const avgDelta = delta.flat().reduce((sum, v) => sum + v, 0) / totalCells;
  const avgLabel = document.createElement("div");
  avgLabel.className = "delta-avg-label";
  avgLabel.textContent = `평균 편차: ${avgDelta >= 0 ? "+" : ""}${avgDelta.toFixed(2)} °C`;
  panel.appendChild(avgLabel);

  return panel;
}

function buildDeltaUnavailablePanel() {
  const panel = document.createElement("div");
  panel.className = "compare-panel";
  panel.innerHTML = `<p class="badge badge-warning">이 위치는 두 데이터의 격자 크기가 달라 비교할 수 없습니다.</p>`;
  return panel;
}
