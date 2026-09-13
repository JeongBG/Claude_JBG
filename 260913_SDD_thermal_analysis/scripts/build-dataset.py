#!/usr/bin/env python3
"""
data-raw/ 의 원본 이미지(jpg/jpeg/png) + 온도 csv를
src/data/dataset.js (window.DATASET, window.POSITION_MAPPING)로 변환하는 1회성 빌드 스크립트.

사용법:
    python3 scripts/build-dataset.py

- data-raw/images/<id>.(jpg|jpeg|png)  가 있으면 base64로 인코딩해서 imageDataUrl로 사용한다.
- data-raw/matrices/<id>.csv           가 있으면 2차원 숫자 격자로 파싱해서 matrix로 사용한다.
- 둘 중 하나라도 없으면 동일한 구조의 더미 데이터로 대체하고 콘솔에 경고를 출력한다.
- 외부 패키지 설치가 필요 없도록 표준 라이브러리만 사용한다.
"""

import base64
import csv
import json
import math
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT_DIR / "data-raw" / "images"
MATRICES_DIR = ROOT_DIR / "data-raw" / "matrices"
OUTPUT_PATH = ROOT_DIR / "src" / "data" / "dataset.js"

IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"]

GROUPS = {
    "hotplate": [
        ("top", "Top"),
        ("bottom", "Bottom"),
        ("left", "Left"),
        ("right", "Right"),
    ],
    "wafer": [
        ("q1", "1사분면"),
        ("q2", "2사분면"),
        ("q3", "3사분면"),
        ("q4", "4사분면"),
    ],
}

POSITION_MAPPING = [
    {"hotplateId": "top", "waferId": "q1"},
    {"hotplateId": "right", "waferId": "q2"},
    {"hotplateId": "bottom", "waferId": "q3"},
    {"hotplateId": "left", "waferId": "q4"},
]


def find_image_path(item_id):
    for ext in IMAGE_EXTENSIONS:
        candidate = IMAGES_DIR / f"{item_id}{ext}"
        if candidate.exists():
            return candidate
    return None


def encode_image(path):
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{data}"


def make_placeholder_svg(item_id, label, group):
    color = "#475569" if group == "hotplate" else "#6d28d9"
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240">'
        f'<rect width="100%" height="100%" fill="{color}"/>'
        f'<text x="50%" y="45%" fill="white" font-size="18" font-family="sans-serif" '
        f'text-anchor="middle">NO IMAGE DATA</text>'
        f'<text x="50%" y="65%" fill="white" font-size="14" font-family="sans-serif" '
        f'text-anchor="middle">{label} ({item_id})</text>'
        f'</svg>'
    )
    data = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{data}"


def read_matrix_csv(path):
    matrix = []
    with path.open(newline="") as f:
        reader = csv.reader(f)
        for row in reader:
            cells = [cell.strip() for cell in row if cell.strip() != ""]
            if not cells:
                continue
            matrix.append([float(cell) for cell in cells])
    return matrix


def make_dummy_matrix(seed, base_temp, rows=30, cols=30, spread=3.0):
    matrix = []
    for r in range(rows):
        row = []
        for c in range(cols):
            value = base_temp + spread * math.sin((r + seed) / 5.0) * math.cos((c + seed) / 6.0)
            row.append(round(value, 2))
        matrix.append(row)

    # 데모용 hot spot / cold spot 삽입
    hot_r, hot_c = rows // 4, cols // 4
    cold_r, cold_c = (rows * 3) // 4, (cols * 3) // 4
    matrix[hot_r][hot_c] = round(base_temp + spread * 3, 2)
    matrix[cold_r][cold_c] = round(base_temp - spread * 3, 2)
    return matrix


def build_item(group, key, label, seed):
    item_id = f"{group}_{key}"

    image_path = find_image_path(item_id)
    if image_path is not None:
        image_data_url = encode_image(image_path)
    else:
        print(f"⚠ {item_id}: 원본 이미지 파일 없음, 더미로 대체")
        image_data_url = make_placeholder_svg(item_id, label, group)

    matrix_path = MATRICES_DIR / f"{item_id}.csv"
    if matrix_path.exists():
        matrix = read_matrix_csv(matrix_path)
    else:
        print(f"⚠ {item_id}: 원본 온도 데이터 없음, 더미로 대체")
        base_temp = 200.0 if group == "hotplate" else 190.0
        matrix = make_dummy_matrix(seed, base_temp)

    return {
        "id": item_id,
        "label": label,
        "group": group,
        "imageDataUrl": image_data_url,
        "matrix": matrix,
        "unit": "C",
    }


def main():
    dataset = {}
    seed = 0
    for group, keys in GROUPS.items():
        dataset[group] = {}
        for key, label in keys:
            dataset[group][key] = build_item(group, key, label, seed)
            seed += 7

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    lines = [
        "// 이 파일은 scripts/build-dataset.py 로 자동 생성됩니다. 직접 수정하지 마세요.",
        "// data-raw/images, data-raw/matrices 에 실제 파일을 넣고 스크립트를 다시 실행하면 갱신됩니다.",
        "",
        "window.DATASET = " + json.dumps(dataset, ensure_ascii=False, indent=2) + ";",
        "",
        "window.POSITION_MAPPING = " + json.dumps(POSITION_MAPPING, ensure_ascii=False, indent=2) + ";",
        "",
    ]
    OUTPUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"✅ {OUTPUT_PATH.relative_to(ROOT_DIR)} 생성 완료")


if __name__ == "__main__":
    main()
