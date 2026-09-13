// src/js/analysis.js
// 기능 2: Wafer 온도 분포 정량 분석 - 통계/균일도 계산 유틸리티

/**
 * 단일 온도 격자의 최고/최저/평균과 그 위치를 계산한다.
 * @param {number[][]} matrix
 * @returns {{min:number, max:number, avg:number, minPos:{row:number,col:number}, maxPos:{row:number,col:number}}}
 */
function computeMatrixStats(matrix) {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  let minPos = { row: 0, col: 0 };
  let maxPos = { row: 0, col: 0 };

  for (let row = 0; row < matrix.length; row++) {
    const cols = matrix[row];
    for (let col = 0; col < cols.length; col++) {
      const value = cols[col];
      sum += value;
      count += 1;
      if (value < min) {
        min = value;
        minPos = { row, col };
      }
      if (value > max) {
        max = value;
        maxPos = { row, col };
      }
    }
  }

  return {
    min,
    max,
    avg: count > 0 ? sum / count : NaN,
    minPos,
    maxPos,
  };
}

/**
 * wafer 4사분면 전체를 기준으로 균일도를 계산한다.
 * matrix가 없거나 비어있는 사분면은 건너뛰고 perQuadrant에 status:"unavailable"로 표시한다.
 * @param {{id:string, label:string, matrix:number[][]|null}[]} quadrants
 * @returns {{
 *   overallMin:number, overallMax:number, overallAvg:number,
 *   uniformityIndex:number,
 *   perQuadrant: Array<{id:string, label:string, status:"ok"|"unavailable", min?:number, max?:number, avg?:number}>
 * }}
 */
function computeUniformity(quadrants) {
  const perQuadrant = [];
  let overallMin = Infinity;
  let overallMax = -Infinity;
  let sum = 0;
  let count = 0;

  for (const q of quadrants) {
    if (!q.matrix || q.matrix.length === 0) {
      perQuadrant.push({ id: q.id, label: q.label, status: "unavailable" });
      continue;
    }

    const stats = computeMatrixStats(q.matrix);
    perQuadrant.push({
      id: q.id,
      label: q.label,
      status: "ok",
      min: stats.min,
      max: stats.max,
      avg: stats.avg,
    });

    overallMin = Math.min(overallMin, stats.min);
    overallMax = Math.max(overallMax, stats.max);
    sum += stats.avg;
    count += 1;
  }

  const hasData = count > 0;
  return {
    overallMin: hasData ? overallMin : NaN,
    overallMax: hasData ? overallMax : NaN,
    overallAvg: hasData ? sum / count : NaN,
    uniformityIndex: hasData ? overallMax - overallMin : NaN,
    perQuadrant,
  };
}
