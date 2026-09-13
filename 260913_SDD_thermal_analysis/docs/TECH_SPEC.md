# TECH_SPEC: Wafer 열화상 온도 분석 대시보드

> PRD 참조: docs/PRD.md
> PRD 분석 결과: 기능 3개 확인 (① 원본 이미지 대시보드, ② Wafer 온도 분포 정량 분석, ③ Hot-plate ↔ Wafer 비교 분석)

## 1. 기술 스택

| 구분 | 기술 | 버전 | 선정 근거 |
|------|------|------|----------|
| 실행 방식 | 정적 단일 웹앱 (HTML/CSS/JS) | - | PRD 제약: "개발 환경 없이 html 파일을 더블클릭해서 브라우저로 바로 봄". Next.js 등 빌드 도구는 `npm run dev` 서버가 필요해 이 제약과 맞지 않음 |
| 언어 | Vanilla JavaScript (ES2020+) | - | 브라우저에서 트랜스파일/번들링 없이 바로 실행. TypeScript는 컴파일 단계가 필요해 "빌드 없이 실행" 제약과 충돌하므로 대신 JSDoc으로 타입을 명시 |
| 렌더링 | HTML5 Canvas 2D API | - | 온도 매트릭스를 컬러맵 히트맵으로 그리기 위함. 외부 차트 라이브러리 없이 구현 가능해 오프라인(인터넷 없이 파일 열기)에서도 100% 동작 |
| 데이터 저장 | JS 상수로 인라인 임베드 (`<script src="data/dataset.js">`) | - | `file://` 프로토콜에서는 `fetch`/`XHR`로 로컬 csv/이미지를 읽을 수 없음(CORS 차단). `<script>` 태그 로드는 제약 없이 동작하므로, 이미지는 base64 data URI로, 온도 데이터는 JS 배열 리터럴로 미리 변환해 파일에 내장 |
| 데이터 준비 | Python 3 표준 라이브러리 스크립트 (1회성) | 3.x | 원본 이미지 8장 + 온도 csv 8개를 위 `dataset.js` 형태로 변환하는 개발 시점 전용 스크립트. 외부 패키지 설치 없이 표준 라이브러리(`csv`, `base64`)만 사용 |

**중요 전제**: 실제 열화상 이미지 파일과 온도 csv 파일은 아직 프로젝트에 존재하지 않는다. `/sdd-build` 진행 전 또는 진행 중, 사용자가 `data-raw/` 폴더에 아래 명명 규칙대로 파일을 넣어야 실제 데이터로 동작한다. 파일이 없는 상태로 빌드할 경우, 개발자는 동일한 구조의 더미(가상) 데이터로 화면을 완성하고, 실제 파일이 준비되면 `data-raw/`에 넣고 변환 스크립트만 다시 실행하면 되도록 만든다.

---

## 2. 프로젝트 구조

```
data-raw/                        # 사용자가 넣는 원본 파일 (버전관리 대상 아님, 없으면 더미로 대체)
├── images/
│   ├── hotplate_top.jpg
│   ├── hotplate_bottom.jpg
│   ├── hotplate_left.jpg
│   ├── hotplate_right.jpg
│   ├── wafer_q1.jpg
│   ├── wafer_q2.jpg
│   ├── wafer_q3.jpg
│   └── wafer_q4.jpg
└── matrices/
    ├── hotplate_top.csv         # 2차원 격자 온도값 (행,열 = 이미지 픽셀 그리드에 대응, 헤더 없음)
    ├── hotplate_bottom.csv
    ├── hotplate_left.csv
    ├── hotplate_right.csv
    ├── wafer_q1.csv
    ├── wafer_q2.csv
    ├── wafer_q3.csv
    └── wafer_q4.csv

scripts/
└── build-dataset.py             # data-raw/ → src/data/dataset.js 변환 스크립트 (1회성, 개발 시점 전용)

src/
├── index.html                   # 대시보드 메인 페이지 (사용자가 더블클릭해서 여는 파일)
├── styles.css                   # 전체 스타일
├── data/
│   └── dataset.js                # 이미지(base64) + 온도 매트릭스를 담은 상수 (window.DATASET, window.POSITION_MAPPING)
└── js/
    ├── analysis.js                # 온도 통계/균일도/hot-cold spot 계산 함수
    ├── heatmap.js                 # canvas 기반 컬러맵 히트맵 렌더링
    ├── gallery.js                 # 기능 1: 원본 이미지 갤러리 + 확대 모달
    ├── wafer-analysis.js          # 기능 2: Wafer 온도 분포 정량 분석 화면
    ├── compare.js                 # 기능 3: Hot-plate ↔ Wafer 비교 화면
    └── main.js                    # 초기화 및 화면 조립 (entry point)
```

---

## 3. 구현 명세

### 기능 1: 열화상 원본 이미지 대시보드 → 구현 명세

> PRD 매핑: 기능 1 - hot-plate 4장 + wafer 4장 원본 이미지를 라벨과 함께 정리된 형태로 확인, 확대 보기 가능

**파일**: `src/js/gallery.js`

**데이터 인터페이스** (JSDoc, `src/data/dataset.js`에서 제공):
```javascript
/**
 * @typedef {Object} ThermalImageSet
 * @property {string} id           - 예: "hotplate_top", "wafer_q1"
 * @property {string} label        - 화면 표시용 라벨. 예: "Top", "1사분면"
 * @property {"hotplate"|"wafer"} group
 * @property {string} imageDataUrl - base64 data URI (예: "data:image/jpeg;base64,...")
 * @property {number[][]} matrix   - 2차원 온도 격자 (row-major), 단위는 unit 필드 참조
 * @property {"C"} unit
 */

/**
 * @typedef {Object} Dataset
 * @property {Record<"top"|"bottom"|"left"|"right", ThermalImageSet>} hotplate
 * @property {Record<"q1"|"q2"|"q3"|"q4", ThermalImageSet>} wafer
 */
```

**핵심 함수**:
```javascript
/**
 * hot-plate 섹션 + wafer 섹션으로 나눈 원본 이미지 그리드를 container에 렌더링한다.
 * @param {HTMLElement} container
 * @param {Dataset} dataset
 */
function renderRawGallery(container, dataset) {}

/**
 * 이미지 1장을 원본 화질로 확대해서 보여주는 모달을 연다.
 * @param {string} imageDataUrl
 * @param {string} label
 */
function openImageModal(imageDataUrl, label) {}
```

**수용 기준 매핑**:
| PRD 수용 기준 | 구현 방법 |
|--------------|----------|
| hot-plate 4장/wafer 4장이 별도 섹션으로 구분 표시 | `renderRawGallery`가 `<section id="gallery-hotplate">`, `<section id="gallery-wafer">` 두 개로 분리 렌더링 |
| 각 이미지에 위치 라벨 표시 | 각 썸네일 하단에 `ThermalImageSet.label` 텍스트 출력 |
| 이미지 확대 보기 | 썸네일 클릭 시 `openImageModal` 호출 → 원본 해상도 `<img>`를 담은 모달(dialog) 표시 |

---

### 기능 2: Wafer 온도 분포 정량 분석 → 구현 명세

> PRD 매핑: 기능 2 - wafer 4사분면 온도 통계, 균일도, hot/cold spot 시각화

**파일**: `src/js/analysis.js`, `src/js/heatmap.js`, `src/js/wafer-analysis.js`

**핵심 함수**:
```javascript
/**
 * 단일 온도 격자의 최고/최저/평균과 그 위치를 계산한다.
 * @param {number[][]} matrix
 * @returns {{min:number, max:number, avg:number, minPos:{row:number,col:number}, maxPos:{row:number,col:number}}}
 */
function computeMatrixStats(matrix) {}

/**
 * wafer 4사분면 전체를 기준으로 균일도를 계산한다.
 * 사분면 중 matrix가 없거나 비어있는 항목은 건너뛰고 perQuadrant에 status:"unavailable"로 표시한다.
 * @param {{id:string, label:string, matrix:number[][]|null}[]} quadrants
 * @returns {{
 *   overallMin:number, overallMax:number, overallAvg:number,
 *   uniformityIndex:number,               // overallMax - overallMin
 *   perQuadrant: Array<{id:string, label:string, status:"ok"|"unavailable", min?:number, max?:number, avg?:number}>
 * }}
 */
function computeUniformity(quadrants) {}

/**
 * 온도 격자를 컬러맵(파랑=저온 → 빨강=고온) 히트맵으로 canvas에 그리고,
 * 옵션이 켜져 있으면 최고/최저 지점에 마커를 표시한다.
 * @param {HTMLCanvasElement} canvas
 * @param {number[][]} matrix
 * @param {{markExtremes?: boolean}} [options]
 */
function renderHeatmap(canvas, matrix, options) {}

/**
 * wafer 4사분면 통계 카드 + 히트맵 + 균일도 요약을 container에 렌더링한다.
 * @param {HTMLElement} container
 * @param {Dataset["wafer"]} waferSet
 */
function renderWaferAnalysis(container, waferSet) {}
```

**수용 기준 매핑**:
| PRD 수용 기준 | 구현 방법 |
|--------------|----------|
| 사분면별 최고/최저/평균 온도 표시 | `computeMatrixStats` 결과를 사분면별 카드(`<div class="quadrant-stat-card">`)에 출력 |
| 전체 균일도 수치 표시 | `computeUniformity().uniformityIndex`를 대시보드 상단 요약 배지에 표시 |
| hot spot/cold spot 시각적 표시 | `renderHeatmap(canvas, matrix, {markExtremes:true})`가 `maxPos`/`minPos`에 원형 마커 + 온도값 라벨을 그림 |
| 데이터 없는 사분면 "분석 불가" 처리 | `computeUniformity`가 `status:"unavailable"`을 반환하면 해당 카드에 "분석 불가" 배지 출력, 나머지 사분면은 정상 렌더링 계속 |

---

### 기능 3: Hot-plate ↔ Wafer 비교 분석 → 구현 명세

> PRD 매핑: 기능 3 - 같은 위치 기준 hot-plate 단독 온도 vs wafer 온도 비교, 편차 시각화

**파일**: `src/js/compare.js`

**위치 대응 설정** (`src/data/dataset.js`에 포함):
```javascript
/**
 * hot-plate 4방향(top/bottom/left/right)과 wafer 4사분면(q1~q4)의 대응은
 * 촬영 규칙이 확정되지 않아 "추정 매핑"이다. 실제 위치가 확인되면 이 배열만 수정하면 된다.
 * @type {Array<{hotplateId:"top"|"bottom"|"left"|"right", waferId:"q1"|"q2"|"q3"|"q4"}>}
 */
const POSITION_MAPPING = [
  { hotplateId: "top",    waferId: "q1" },
  { hotplateId: "right",  waferId: "q2" },
  { hotplateId: "bottom", waferId: "q3" },
  { hotplateId: "left",   waferId: "q4" },
];
```

**핵심 함수**:
```javascript
/**
 * 두 온도 격자의 크기가 같으면 원소별 차이(wafer - hotplate)를 계산하고,
 * 크기가 다르면 null을 반환해 "대응 불확실"을 신호한다.
 * @param {number[][]} hotplateMatrix
 * @param {number[][]} waferMatrix
 * @returns {number[][]|null}
 */
function computeDelta(hotplateMatrix, waferMatrix) {}

/**
 * POSITION_MAPPING을 기준으로 hot-plate/wafer 이미지를 나란히 배치하고,
 * computeDelta 결과를 편차 히트맵(또는 대응 불가 안내)으로 렌더링한다.
 * @param {HTMLElement} container
 * @param {Dataset["hotplate"]} hotplateSet
 * @param {Dataset["wafer"]} waferSet
 * @param {Array<{hotplateId:string, waferId:string}>} mapping
 */
function renderComparison(container, hotplateSet, waferSet, mapping) {}
```

**수용 기준 매핑**:
| PRD 수용 기준 | 구현 방법 |
|--------------|----------|
| hot-plate/wafer 온도가 같은 화면에 나란히 비교 | `renderComparison`이 mapping 항목마다 `<div class="compare-row">` 안에 hot-plate 히트맵 + wafer 히트맵을 좌우 배치 |
| 위치 기준 온도 편차를 수치/색상으로 표시 | `computeDelta` 결과를 `renderHeatmap`의 발산형(diverging) 컬러맵(음수=파랑, 양수=빨강)으로 표시 + 평균 편차 수치 출력 |
| 위치 대응 불확실 시 안내 문구 표시 | 화면 최상단에 "⚠ hot-plate ↔ wafer 위치 대응은 추정값입니다 (POSITION_MAPPING 참고)" 배너를 항상 고정 표시. 추가로 `computeDelta`가 null을 반환하면 해당 비교 행에 "이 위치는 두 데이터의 격자 크기가 달라 비교할 수 없습니다" 문구를 출력 |

---

## 4. 데이터 모델

```javascript
// src/data/dataset.js 가 최종적으로 내보내는 전역 상수 형태

/** @type {Dataset} */
window.DATASET = {
  hotplate: {
    top:    { id: "hotplate_top",    label: "Top",    group: "hotplate", imageDataUrl: "data:image/jpeg;base64,...", matrix: [[...]], unit: "C" },
    bottom: { id: "hotplate_bottom", label: "Bottom", group: "hotplate", imageDataUrl: "data:image/jpeg;base64,...", matrix: [[...]], unit: "C" },
    left:   { id: "hotplate_left",   label: "Left",   group: "hotplate", imageDataUrl: "data:image/jpeg;base64,...", matrix: [[...]], unit: "C" },
    right:  { id: "hotplate_right",  label: "Right",  group: "hotplate", imageDataUrl: "data:image/jpeg;base64,...", matrix: [[...]], unit: "C" }
  },
  wafer: {
    q1: { id: "wafer_q1", label: "1사분면", group: "wafer", imageDataUrl: "data:image/jpeg;base64,...", matrix: [[...]], unit: "C" },
    q2: { id: "wafer_q2", label: "2사분면", group: "wafer", imageDataUrl: "data:image/jpeg;base64,...", matrix: [[...]], unit: "C" },
    q3: { id: "wafer_q3", label: "3사분면", group: "wafer", imageDataUrl: "data:image/jpeg;base64,...", matrix: [[...]], unit: "C" },
    q4: { id: "wafer_q4", label: "4사분면", group: "wafer", imageDataUrl: "data:image/jpeg;base64,...", matrix: [[...]], unit: "C" }
  }
};

/** @type {Array<{hotplateId:string, waferId:string}>} */
window.POSITION_MAPPING = [ /* 위 3절 참고 */ ];
```

**`scripts/build-dataset.py` 처리 규칙**:
- `data-raw/images/*.jpg` → base64 인코딩 → 대응하는 `imageDataUrl`
- `data-raw/matrices/*.csv` → 쉼표 구분 숫자 행렬로 파싱 → 대응하는 `matrix`
- 파일명은 `id`와 그대로 일치해야 매칭됨 (예: `hotplate_top.jpg` + `hotplate_top.csv` → `hotplate.top`)
- `data-raw/` 에 파일이 없는 항목은 동일 구조의 더미 데이터(단색 placeholder 이미지 + 균일값 매트릭스)로 채우고, 콘솔에 "⚠ hotplate_top: 원본 파일 없음, 더미로 대체" 경고 출력

---

## 5. API 명세

해당 없음 — 서버/백엔드 없이 정적 파일만으로 동작하는 구조이며, 데이터는 빌드 시점에 `dataset.js`에 내장되어 런타임 네트워크 요청이 발생하지 않는다.

---

## 6. 검증 매트릭스

| PRD 기능 | TECH_SPEC 구현 | 파일 | 테스트 기준 |
|----------|---------------|------|-----------|
| 기능 1: 열화상 원본 이미지 대시보드 | `renderRawGallery`, `openImageModal` | `src/js/gallery.js` | `index.html`을 더블클릭으로 열었을 때 hot-plate 4장/wafer 4장이 라벨과 함께 보이고, 클릭 시 확대 모달이 뜨는지 확인 |
| 기능 2: Wafer 온도 분포 정량 분석 | `computeMatrixStats`, `computeUniformity`, `renderHeatmap`, `renderWaferAnalysis` | `src/js/analysis.js`, `src/js/heatmap.js`, `src/js/wafer-analysis.js` | 4사분면 통계 카드, 균일도 배지, hot/cold 마커가 표시되고, 임의 사분면 데이터를 비워도 "분석 불가"만 뜨고 나머지는 정상인지 확인 |
| 기능 3: Hot-plate ↔ Wafer 비교 분석 | `computeDelta`, `renderComparison`, `POSITION_MAPPING` | `src/js/compare.js`, `src/data/dataset.js` | 4개 위치 쌍이 나란히 비교되고 편차 히트맵/수치가 보이는지, 상단 추정 매핑 안내 배너가 항상 보이는지 확인 |
