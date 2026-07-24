/**
 * 216개 여행자 시나리오(traveler-simulation.ts) 회귀 검증 프레임워크.
 *
 * validateTrip / generatePreparationItems가 산출하는 경고·준비물이 국가 데이터·
 * 여행 신호와 논리적으로 일치하는지 assertion으로 확인한다. 검증기 로직을 그대로
 * 베끼지 않고, 트립 데이터에서 동일한 판정 규칙을 독립적으로 재계산해 비교함으로써
 * 수기 계산 오류 없이 실제 회귀를 잡아낸다 (예: 국내여행 쇼핑 시나리오에 면세 준비물이
 * 새는 버그를 이 방식으로 발견·수정함 — preparation-service.ts 커밋 참고).
 *
 * 실행 (이 패키지엔 ts-node/tsx가 설치돼 있지 않으므로 임시 tsconfig로 컴파일 후 실행).
 * 출력 폴더는 반드시 이 패키지 디렉터리 "안쪽"이어야 한다 — node_modules(clsx 등)
 * 해석이 컴파일된 .js 파일의 실제 위치 기준으로 이뤄지기 때문에, /tmp 등 패키지
 * 바깥으로 emit하면 MODULE_NOT_FOUND가 난다.
 *   cd apps/p-plan/packages/shared
 *   npx tsc src/dev/verify-scenarios.ts --outDir ./.devrun --module commonjs \
 *     --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck \
 *     --resolveJsonModule --rootDir .
 *   node ./.devrun/src/dev/verify-scenarios.js
 *   rm -rf ./.devrun   # 실행 후 정리
 * (또는 pnpm에 tsx/ts-node를 추가했다면 `npx tsx src/dev/verify-scenarios.ts`)
 *
 * 새 도메인(예산·운전·대중교통 등)을 검증에 추가하려면 아래 *_CHECKS 배열에
 * Check 객체를 더하면 된다.
 */
import { ALL_SCENARIOS, buildScenarioTrip, scenarioLabel } from './traveler-simulation';
import { validateTrip } from '../lib/trip-validator';
import { generatePreparationItems, PrepItem } from '../lib/preparation-service';
import { resolveCountryProfile } from '../lib/data/country-profiles';
import { resolveEntryRequirement } from '../lib/data/entry-requirements';
import { TripWarning, FlightSegment } from '../types/trip';

function toMin(t?: string): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}
const isEarlyMorning = (m: number | null) => m !== null && m >= 0 && m <= 4 * 60;

interface Ctx {
  label: string;
  home: ReturnType<typeof resolveCountryProfile>;
  dest: ReturnType<typeof resolveCountryProfile>;
  isOverseas: boolean;
  hasDriving: boolean;
  personaFocus: string;
  personaActive: string;
  durationDays: number;
  prep: PrepItem[];
  warnings: TripWarning[];
  flights: FlightSegment[];
  accId: string;
  hasP: (id: string) => boolean;
  hasPrefixP: (prefix: string) => boolean;
  hasW: (id: string) => boolean;
  hasPrefixW: (prefix: string) => boolean;
}

interface Check {
  name: string;
  run: (c: Ctx) => { pass: boolean; detail?: string };
}

// ── 기존 준비물(prep) 체크 16개 ──────────────────────────────────
const PREP_CHECKS: Check[] = [
  { name: 'passport-presence', run: (c) => ({ pass: c.isOverseas === c.hasP('prep-passport') }) },
  {
    name: 'entry-auth-presence',
    run: (c) => {
      if (!c.isOverseas || !c.dest || !c.home) return { pass: !c.hasPrefixP('prep-entry-') && !c.hasPrefixP('prep-visa-') };
      const bilateral = resolveEntryRequirement(c.home.key, c.dest.key);
      if (bilateral) {
        // 양자 데이터가 있으면: visa-free/eta-optional/eta-required는 prep-entry-*, visa-required는 prep-visa-*
        if (bilateral.tier === 'visa-required') {
          return { pass: c.hasP(`prep-visa-${c.dest.key}`) && !c.hasP(`prep-entry-${c.dest.key}`) };
        }
        return { pass: c.hasP(`prep-entry-${c.dest.key}`) && !c.hasP(`prep-visa-${c.dest.key}`) };
      }
      // 양자 데이터가 없는 거주국은 기존처럼 목적지 단독 entryAuth로 폴백
      return { pass: !!c.dest.entryAuth === c.hasP(`prep-entry-${c.dest.key}`) };
    },
  },
  {
    name: 'entry-tier-priority-matches',
    run: (c) => {
      if (!c.isOverseas || !c.dest || !c.home) return { pass: true };
      const bilateral = resolveEntryRequirement(c.home.key, c.dest.key);
      if (!bilateral) return { pass: true }; // 폴백 경로는 위 체크가 이미 검증
      const expectedPriority: Record<string, string> = {
        'visa-free': 'optional', 'eta-optional': 'recommended', 'eta-required': 'essential', 'visa-required': 'essential',
      };
      const id = bilateral.tier === 'visa-required' ? `prep-visa-${c.dest.key}` : `prep-entry-${c.dest.key}`;
      const item = c.prep.find(p => p.id === id);
      if (!item) return { pass: false, detail: `expected item ${id} missing` };
      return { pass: item.priority === expectedPriority[bilateral.tier], detail: `tier=${bilateral.tier} priority=${item.priority}` };
    },
  },
  { name: 'flight-booking-presence', run: (c) => ({ pass: c.isOverseas === c.hasP('prep-flight-booking') }) },
  {
    name: 'currency-presence',
    run: (c) => ({ pass: (c.isOverseas && !!c.dest && !!c.home && c.dest.currency !== c.home.currency) === c.hasP('prep-currency') }),
  },
  { name: 'credit-card-presence', run: (c) => ({ pass: c.isOverseas === c.hasP('prep-credit-card') }) },
  {
    name: 'connectivity-presence-and-wording',
    run: (c) => {
      const present = c.hasP('prep-connectivity');
      if (present !== c.isOverseas) return { pass: false };
      if (present && c.dest) {
        const item = c.prep.find(p => p.id === 'prep-connectivity')!;
        return { pass: item.title.includes('eSIM') === !!c.dest.esimSupported };
      }
      return { pass: true };
    },
  },
  {
    name: 'adapter-presence',
    run: (c) => {
      if (!c.isOverseas || !c.dest || !c.home) return { pass: !c.hasPrefixP('prep-adapter-') };
      const compatible = c.home.plugTypes.some(p => c.dest!.plugTypes.includes(p));
      return { pass: !compatible === c.hasP(`prep-adapter-${c.dest.key}`) };
    },
  },
  {
    name: 'voltage-presence',
    run: (c) => {
      if (!c.isOverseas || !c.dest || !c.home) return { pass: !c.hasPrefixP('prep-voltage-') };
      return { pass: (Math.abs(c.dest.voltage - c.home.voltage) >= 80) === c.hasP(`prep-voltage-${c.dest.key}`) };
    },
  },
  { name: 'license-presence', run: (c) => ({ pass: c.hasDriving === c.hasP('prep-license') }) },
  {
    name: 'idp-policy-wording',
    run: (c) => {
      const expectPresent = c.hasDriving && c.isOverseas && !!c.dest;
      if (!expectPresent) return { pass: !c.hasPrefixP('prep-idp-') };
      const item = c.prep.find(p => p.id === `prep-idp-${c.dest!.key}`);
      if (!item) return { pass: false };
      const ok = (c.dest!.idp === 'required' && item.title.includes('발급')) ||
        (c.dest!.idp === 'recommended' && item.title.includes('권장')) ||
        (c.dest!.idp === 'not-accepted' && item.title.includes('임시운전면허'));
      return { pass: ok };
    },
  },
  {
    name: 'driving-side-presence',
    run: (c) => {
      if (!c.hasDriving || !c.isOverseas || !c.dest || !c.home) return { pass: !c.hasPrefixP('prep-driving-side-') };
      return { pass: (c.dest.drivingSide !== c.home.drivingSide) === c.hasP(`prep-driving-side-${c.dest.key}`) };
    },
  },
  { name: 'insurance-presence', run: (c) => ({ pass: c.isOverseas === c.hasP('prep-insurance') }) },
  { name: 'medicine-presence', run: (c) => ({ pass: (c.isOverseas && c.durationDays >= 5) === c.hasP('prep-medicine') }) },
  { name: 'shopping-items-require-overseas', run: (c) => ({ pass: (c.personaFocus === 'shopping' && c.isOverseas) === c.hasP('prep-taxrefund') }) },
  { name: 'outdoor-items-presence', run: (c) => ({ pass: (c.personaFocus === 'outdoor') === c.hasP('prep-activity-booking') }) },
  {
    name: 'domestic-no-leakage',
    run: (c) => {
      if (c.isOverseas) return { pass: true };
      const leaked = c.prep.filter(p => /^prep-(passport|entry-|visa-|currency|credit-card|connectivity|adapter-|voltage-|idp-|driving-side-|insurance|medicine|taxrefund|dutyfree)/.test(p.id));
      return { pass: leaked.length === 0, detail: leaked.map(p => p.id).join(',') };
    },
  },
];

// ── 신규: 숙박 관련 체크 9개 ─────────────────────────────────────
const ACCOMMODATION_CHECKS: Check[] = [
  { name: 'acc-no-accommodation-absent', run: (c) => ({ pass: !c.hasW('no-accommodation') }) },
  { name: 'acc-gap-absent', run: (c) => ({ pass: !c.hasPrefixW('acc-gap-') }) },
  { name: 'acc-overlap-duplicate-absent', run: (c) => ({ pass: !c.hasPrefixW('acc-overlap-') && !c.hasPrefixW('acc-duplicate-') }) },
  { name: 'acc-capacity-absent', run: (c) => ({ pass: !c.hasPrefixW('acc-rooms-too-many-') && !c.hasPrefixW('acc-beds-short-') }) },
  { name: 'acc-expected-times-absent', run: (c) => ({ pass: !c.hasPrefixW('acc-checkin-early-') && !c.hasPrefixW('acc-checkout-late-') }) },
  {
    name: 'acc-flight-late-arrival',
    run: (c) => {
      const outbound = c.flights.find(f => f.type === 'outbound');
      if (!outbound) return { pass: !c.hasPrefixW('acc-flight-late-arr-') };
      const expect = (toMin(outbound.arrivalTime) ?? -1) > 22 * 60;
      return { pass: expect === c.hasW(`acc-flight-late-arr-${c.accId}-${outbound.id}`) };
    },
  },
  {
    name: 'acc-flight-early-departure',
    run: (c) => {
      const inbound = c.flights.find(f => f.type === 'inbound');
      if (!inbound) return { pass: !c.hasPrefixW('acc-flight-early-dep-') };
      const expect = (toMin(inbound.departureTime) ?? 9999) < 660 - 60; // default checkout 11:00 - 60min
      return { pass: expect === c.hasW(`acc-flight-early-dep-${c.accId}-${inbound.id}`) };
    },
  },
  { name: 'acc-flight-mid-stay-absent', run: (c) => ({ pass: !c.hasPrefixW('acc-flight-during-stay-') }) },
  {
    name: 'checkout-day-schedule',
    run: (c) => ({ pass: (c.personaActive === 'energetic') === c.hasW(`checkout-schedule-${c.accId}`) }),
  },
];

// ── 신규: 항공 관련 체크 6개 ─────────────────────────────────────
const FLIGHT_CHECKS: Check[] = [
  { name: 'flight-missing-legs-absent', run: (c) => ({ pass: !c.hasW('missing-outbound-flight') && !c.hasW('missing-inbound-flight') }) },
  { name: 'flight-unbooked-international', run: (c) => ({ pass: c.isOverseas === c.hasW('unbooked-international-trip') }) },
  { name: 'flight-date-reversal-absent', run: (c) => ({ pass: !c.hasW('flight-date-reversal') }) },
  {
    name: 'flight-time-warning-per-flight',
    run: (c) => {
      for (const f of c.flights) {
        const expect = isEarlyMorning(toMin(f.departureTime)) || isEarlyMorning(toMin(f.arrivalTime));
        if (expect !== c.hasW(`flight-time-warning-${f.id}`)) {
          return { pass: false, detail: `flight=${f.id} dep=${f.departureTime} arr=${f.arrivalTime} expect=${expect}` };
        }
      }
      return { pass: true };
    },
  },
  {
    name: 'flight-layover-short-per-layover',
    run: (c) => {
      for (const f of c.flights) {
        for (const lay of f.layovers || []) {
          const expect = (lay.durationMinutes ?? 999) < 90;
          if (expect !== c.hasW(`layover-short-${f.id}-${(f.layovers || []).indexOf(lay)}`)) {
            return { pass: false, detail: `flight=${f.id} layover=${lay.durationMinutes}min expect=${expect}` };
          }
        }
      }
      return { pass: true };
    },
  },
  { name: 'flight-speed-absent-given-no-coords', run: (c) => ({ pass: !c.hasPrefixW('flight-speed-') }) },
];

const ALL_CHECKS = [...PREP_CHECKS, ...ACCOMMODATION_CHECKS, ...FLIGHT_CHECKS];

let totalChecks = 0;
const failuresByCheck: Record<string, { count: number; examples: string[] }> = {};
let scenariosWithAnyFailure = 0;

for (const combo of ALL_SCENARIOS) {
  const trip = buildScenarioTrip(combo);
  const prep = generatePreparationItems(trip, { homeCountryName: combo.home.countryName });
  const warnings = validateTrip(trip, undefined, combo.persona.style);
  const home = resolveCountryProfile(combo.home.countryName);
  const dest = resolveCountryProfile(combo.destination.countryName);
  const isOverseas = !home || !dest || home.key !== dest.key;

  const ctx: Ctx = {
    label: scenarioLabel(combo),
    home, dest, isOverseas,
    hasDriving: combo.destination.hasDriving,
    personaFocus: combo.persona.focus,
    personaActive: combo.persona.style.active,
    durationDays: trip.dates.durationDays || 0,
    prep, warnings,
    flights: trip.flights,
    accId: trip.accommodation[0]?.id || '',
    hasP: (id) => prep.some(p => p.id === id),
    hasPrefixP: (prefix) => prep.some(p => p.id.startsWith(prefix)),
    hasW: (id) => warnings.some(w => w.id === id),
    hasPrefixW: (prefix) => warnings.some(w => w.id.startsWith(prefix)),
  };

  let scenarioFailed = false;
  for (const check of ALL_CHECKS) {
    totalChecks++;
    const result = check.run(ctx);
    if (!result.pass) {
      scenarioFailed = true;
      const bucket = (failuresByCheck[check.name] ||= { count: 0, examples: [] });
      bucket.count++;
      if (bucket.examples.length < 5) bucket.examples.push(`${ctx.label}${result.detail ? ` :: ${result.detail}` : ''}`);
    }
  }
  if (scenarioFailed) scenariosWithAnyFailure++;
}

console.log(`\n================ 확장 검증 결과 (준비물 + 숙박 + 항공) ================`);
console.log(`시나리오: ${ALL_SCENARIOS.length}개 / 체크 항목: ${ALL_CHECKS.length}개 (기존 ${PREP_CHECKS.length} + 숙박 ${ACCOMMODATION_CHECKS.length} + 항공 ${FLIGHT_CHECKS.length}) / 총 검증: ${totalChecks}건`);
console.log(`실패가 있었던 시나리오: ${scenariosWithAnyFailure}개\n`);

let allPass = true;
const printGroup = (title: string, checks: Check[]) => {
  console.log(`\n--- ${title} ---`);
  for (const check of checks) {
    const bucket = failuresByCheck[check.name];
    if (!bucket) {
      console.log(`✅ ${check.name}: 216/216 통과`);
    } else {
      allPass = false;
      console.log(`❌ ${check.name}: ${216 - bucket.count}/216 통과 (실패 ${bucket.count}건)`);
      bucket.examples.forEach(ex => console.log(`     - ${ex}`));
    }
  }
};
printGroup('준비물 (documents/money/power/transport/health/shopping/outdoor)', PREP_CHECKS);
printGroup('숙박 (신규 9개)', ACCOMMODATION_CHECKS);
printGroup('항공 (신규 6개)', FLIGHT_CHECKS);

console.log(`\n전체 결과: ${allPass ? '✅ 모든 체크 통과' : '❌ 일부 체크 실패'}`);
