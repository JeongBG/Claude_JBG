// src/js/heatmap.js
// canvas 기반 온도 컬러맵 히트맵 렌더링 (analysis.js의 computeMatrixStats에 의존)

/**
 * 값 하나를 컬러맵 색상 문자열로 변환한다.
 * mode가 "diverging"이면 center를 기준으로 음수=파랑, 양수=빨강(편차 표시용)으로,
 * 그 외(기본값)에는 저온(파랑)→고온(빨강) 컬러맵으로 변환한다.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @param {{mode?: "sequential"|"diverging", center?: number}} [options]
 * @returns {string} rgb(...) 문자열
 */
function valueToColor(value, min, max, options = {}) {
  const mode = options.mode || "sequential";

  if (mode === "diverging") {
    const center = options.center ?? 0;
    const maxAbs = Math.max(Math.abs(max - center), Math.abs(min - center)) || 1;
    const t = Math.min(1, Math.max(-1, (value - center) / maxAbs));
    if (t >= 0) {
      const g = Math.round(255 * (1 - t));
      return `rgb(255, ${g}, ${g})`;
    }
    const g = Math.round(255 * (1 + t));
    return `rgb(${g}, ${g}, 255)`;
  }

  const range = max - min;
  const t = range === 0 ? 0.5 : Math.min(1, Math.max(0, (value - min) / range));
  const r = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 3))));
  const g = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 2))));
  const b = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 1))));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 온도(또는 편차) 격자를 컬러맵 히트맵으로 canvas에 그린다.
 * options.markExtremes가 true면 최고/최저 지점에 마커와 온도 라벨을 표시한다.
 * @param {HTMLCanvasElement} canvas
 * @param {number[][]} matrix
 * @param {{markExtremes?: boolean, mode?: "sequential"|"diverging", center?: number}} [options]
 */
function renderHeatmap(canvas, matrix, options = {}) {
  const rows = matrix.length;
  const cols = rows > 0 ? matrix[0].length : 0;
  if (rows === 0 || cols === 0) return;

  const ctx = canvas.getContext("2d");
  const cellW = canvas.width / cols;
  const cellH = canvas.height / rows;
  const stats = computeMatrixStats(matrix);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = valueToColor(matrix[row][col], stats.min, stats.max, options);
      ctx.fillRect(col * cellW, row * cellH, Math.ceil(cellW), Math.ceil(cellH));
    }
  }

  if (options.markExtremes) {
    drawMarker(ctx, stats.maxPos, cellW, cellH, `${stats.max.toFixed(1)}°C`, true);
    drawMarker(ctx, stats.minPos, cellW, cellH, `${stats.min.toFixed(1)}°C`, false);
  }
}

function drawMarker(ctx, pos, cellW, cellH, text, isMax) {
  const x = pos.col * cellW + cellW / 2;
  const y = pos.row * cellH + cellH / 2;
  const radius = Math.max(5, Math.min(cellW, cellH) * 0.8);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = isMax ? "#dc2626" : "#2563eb";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  const labelY = y - radius - 4 < 10 ? y + radius + 14 : y - radius - 4;
  ctx.fillText(text, x, labelY);
}
