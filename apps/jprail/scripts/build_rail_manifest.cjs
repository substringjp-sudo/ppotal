/**
 * 철도 데이터 목록표(manifest) 생성기.
 *
 * 앱은 오프라인 우선이라 `assets/rail` 에 데이터를 통째로 안고 다닌다(32MB).
 * 그 사본은 스토어에 새 빌드를 올려야만 갱신되므로, 웹이 먼저 고쳐지면 둘이
 * 어긋난 채로 지낸다. 그렇다고 켤 때마다 32MB 를 받을 수는 없다.
 *
 * 그래서 파일마다 sha256 을 적은 목록표를 함께 배포한다. 앱은 켜질 때 이 작은
 * 파일만 받아(수 KB) 자기 사본과 대조하고, **해시가 다른 파일만** 내려받는다.
 * 네트워크가 없으면 아무 일도 일어나지 않고 안고 있던 사본으로 그대로 돈다.
 *
 *   npm run build:rail-manifest
 *
 * 같은 내용이면 같은 파일이 나온다(시각을 적지 않는다). 그래야 다시 돌렸다는
 * 이유만으로 diff 가 생기지 않는다.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIL = path.join(__dirname, '..', 'public', 'rail');
const OUT = path.join(RAIL, 'manifest.json');

/** 목록표 자신과 문서는 뺀다. */
const SKIP = new Set(['manifest.json']);

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function collect() {
    return fs
        .readdirSync(RAIL)
        .filter((name) => name.endsWith('.json') && !SKIP.has(name))
        .sort()
        .map((name) => {
            const buffer = fs.readFileSync(path.join(RAIL, name));
            return { path: name, sha256: sha256(buffer), bytes: buffer.length };
        });
}

function build() {
    const files = collect();
    // 내용이 같으면 같은 값이 나오는 판본. 앱이 "받아 둔 것과 같은가"를 이걸로 본다.
    const version = sha256(Buffer.from(files.map((f) => `${f.path}:${f.sha256}`).join('\n'))).slice(0, 12);
    return {
        _source: 'scripts/build_rail_manifest.cjs — public/rail 의 파일 목록과 sha256.',
        _note:
            '앱이 켜질 때 이것만 받아 자기 사본과 대조하고 해시가 다른 파일만 내려받는다. ' +
            'version 은 목록 전체의 해시라, 같으면 받을 것이 없다는 뜻이다.',
        version,
        files
    };
}

if (require.main === module) {
    const manifest = build();
    fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
    const total = manifest.files.reduce((sum, f) => sum + f.bytes, 0);
    console.log(OUT);
    console.log(`  판본 ${manifest.version} · 파일 ${manifest.files.length}개 · ${(total / 1048576).toFixed(1)}MB`);
}

module.exports = { build, collect, sha256 };
