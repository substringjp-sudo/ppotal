# OSM 운행계통 내보내기

`scripts/build_services.mjs` 의 입력입니다. OpenStreetMap 의 `route=train` 릴레이션을
여기에 두면 `public/rail/services.json` 이 만들어집니다.

## 받는 법

[overpass-turbo.eu](https://overpass-turbo.eu) 에서 쿼리를 돌리고 GeoJSON 으로 내보냅니다.

노선 하나만:

```
[out:json][timeout:120];
rel["type"="route"]["route"="train"]["name"~"山手線"];
out body; >; out skel qt;
```

전국(무겁습니다, 몇 분):

```
[out:json][timeout:900];
area["ISO3166-1"="JP"][admin_level=2]->.jp;
rel(area.jp)["type"="route"]["route"~"^(train|subway|light_rail)$"];
out geom;
```

범위를 좁히고 싶으면 `scripts/migrate_colors.mjs` 의 색상표가 그대로 조회 목록이
됩니다. 거기 적힌 이름 중 112개가 `lines.json` 에 없는데, 대부분이 운행계통입니다.

## 정차역 순서는 신경 쓰지 않아도 됩니다

GeoJSON 으로 변환되면 릴레이션 멤버 순서가 사라집니다. 생성기는 그걸 읽지 않고
**릴레이션의 선로 모양 위에 정차역을 투영해** 순서를 만듭니다. 그래서 내보내기
형식이 무엇이든 상관없습니다.

## 큰 파일은 커밋하지 마세요

전국 내보내기는 수십 MB 가 됩니다. `.gitignore` 가 `yamanote.geojson` 을 뺀
나머지를 무시하도록 해 두었습니다. 야마노테선 것만 파이프라인이 도는지 보여 주는
표본으로 남겨 둡니다.

내보낸 파일을 손보지 마세요. 고칠 것이 있으면 OSM 원본을 고치고 다시 받는 편이
낫습니다. 그래야 다음 사람도 같은 결과를 얻습니다.

## 라이선스

© OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright

여기서 만든 `services.json` 을 배포에 실으면 출처 표기와 동일조건이 따라붙습니다.
