import { Achievement, AchievementCategory } from '../types/achievement';

export const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, { label: string; icon: string }> = {
  firstSteps: { label: '첫걸음', icon: 'handshake' },
  milestones: { label: '통산 횟수', icon: 'military_tech' },
  cumulative: { label: '누적 일수', icon: 'calendar_month' },
  destinations: { label: '여행지 다양성', icon: 'public' },
  planning: { label: '계획 타이밍', icon: 'schedule' },
  intervals: { label: '여행 주기', icon: 'update' },
  duration: { label: '개별 기간', icon: 'timer' },
  social: { label: '함께하는 여행', icon: 'groups' },
  transport: { label: '교통수단', icon: 'directions_transit' },
  accommodation: { label: '숙박 유형', icon: 'bed' },
  density: { label: '일정 밀도', icon: 'density_large' },
  eventTypes: { label: '일정 테마', icon: 'category' },
  budget: { label: '예산 및 소비', icon: 'payments' },
  currency: { label: '통화 및 환율', icon: 'currency_exchange' },
  preparation: { label: '준비물', icon: 'inventory_2' },
  warnings: { label: '시스템 경고', icon: 'warning' },
  seasons: { label: '계절 사냥꾼', icon: 'nature' },
  records: { label: '기록 전문가', icon: 'edit_note' },
  legacy: { label: '여행의 유산', icon: 'history' },
  geography: { label: '지리 및 거리', icon: 'explore' },
  easterEggs: { label: '이스터에그', icon: 'rocket_launch' }
};

export const ACHIEVEMENTS: Achievement[] = [
  // 1. 첫걸음
  { id: 'first_trip', title: '시작이 반이다', description: '첫 여행 계획 생성하기', icon: 'celebration', category: 'firstSteps' },
  { id: 'first_event', title: '첫 단추', description: '첫 번째 일정 등록하기', icon: 'event', category: 'firstSteps' },
  { id: 'first_flight', title: '하늘을 날다', description: '첫 번째 항공편 추가', icon: 'flight', category: 'firstSteps' },
  { id: 'first_stay', title: '포근한 잠자리', description: '첫 번째 숙소 추가', icon: 'hotel', category: 'firstSteps' },
  { id: 'first_friend', title: '혼자가 아니야', description: '첫 번째 동행자 초대', icon: 'person_add', category: 'firstSteps' },
  
  // 2. 통산 횟수
  { id: 'trips_1', title: '여행 초보', description: '여행 1회 완료', icon: 'hiking', category: 'milestones', maxProgress: 1 },
  { id: 'trips_5', title: '아는 맛', description: '여행 5회 완료', icon: 'map', category: 'milestones', maxProgress: 5 },
  { id: 'trips_10', title: '프로 방랑자', description: '여행 10회 완료', icon: 'luggage', category: 'milestones', maxProgress: 10 },
  { id: 'trips_30', title: '공항 단골', description: '여행 30회 완료', icon: 'airplane_ticket', category: 'milestones', maxProgress: 30 },
  { id: 'trips_50', title: '하늘의 지배자', description: '여행 50회 완료', icon: 'flight_takeoff', category: 'milestones', maxProgress: 50 },
  
  // 3. 누적 일수
  { id: 'days_7', title: '1주일의 여유', description: '누적 여행 7일 돌파', icon: 'calendar_view_week', category: 'cumulative', maxProgress: 7 },
  { id: 'days_30', title: '한 달의 기억', description: '누적 여행 30일 돌파', icon: 'calendar_month', category: 'cumulative', maxProgress: 30 },
  { id: 'days_100', title: '100일 기념', description: '누적 여행 100일 돌파', icon: '100k', category: 'cumulative', maxProgress: 100 },
  { id: 'days_365', title: '지구가 집', description: '누적 여행 365일 돌파', icon: 'home_pin', category: 'cumulative', maxProgress: 365 },
  
  // 4. 여행지 다양성
  { id: 'first_intl', title: '드디어 해외로!', description: '첫 해외여행 계획', icon: 'public', category: 'destinations' },
  { id: 'countries_3', title: '이웃나라 탑승객', description: '3개국 방문', icon: 'travel_explore', category: 'destinations', maxProgress: 3 },
  { id: 'countries_10', title: '지구본 수집가', description: '10개국 방문', icon: 'language', category: 'destinations', maxProgress: 10 },
  { id: 'continents_5', title: '대륙 훑기', description: '5개 대륙 방문', icon: 'terrain', category: 'destinations', maxProgress: 5 },
  
  // 5. 계획 타이밍
  { id: 'plan_immediate', title: '무계획의 극의', description: '생성 당일 출발하는 여행', icon: 'bolt', category: 'planning' },
  { id: 'plan_early_bird', title: '얼리버드', description: '6개월 전 미리 계획 수립', icon: 'nest_cam_wired_stand', category: 'planning' },
  { id: 'plan_1year', title: '선구자 (1년)', description: '1년 뒤 여행 계획 생성', icon: 'history_toggle_off', category: 'planning' },
  { id: 'plan_10year', title: '은퇴 계획(10년)', description: '10년 뒤 여행 계획 생성', icon: 'hourglass_empty', category: 'planning' },
  
  // 6. 여행 주기
  { id: 'interval_3days', title: '집은 세탁소일 뿐', description: '귀국 3일 내 재출국', icon: 'cyclone', category: 'intervals' },
  { id: 'interval_next_day', title: '환승입니다', description: '귀국 다음 날 바로 출국', icon: 'keyboard_tab', category: 'intervals' },
  { id: 'interval_monthly', title: '보름달의 법칙', description: '1년간 매달 여행 출발', icon: 'brightness_4', category: 'intervals' },
  
  // 7. 개별 기간
  { id: 'dur_daytrip', title: '가출', description: '0박 1일 당일치기 여행', icon: 'run_circle', category: 'duration' },
  { id: 'dur_1month', title: '한 달 살기', description: '30일 이상 장기 여행', icon: 'holiday_village', category: 'duration' },
  { id: 'dur_1year', title: '유목민', description: '1년 이상 지속되는 여행', icon: 'house_siding', category: 'duration' },
  
  // 8. 동행 및 소셜
  { id: 'social_solo', title: '고독한 미식가', description: '나 홀로 여행 3회', icon: 'person', category: 'social', maxProgress: 3 },
  { id: 'social_family', title: '가족 오락관', description: '4인 이상 단체 여행', icon: 'family_restroom', category: 'social' },
  { id: 'social_leader', title: '총무님!', description: '10인 이상 단체 여행 호스트', icon: 'leaderboard', category: 'social' },
  
  // 9. 교통수단
  { id: 'trans_flight_10', title: '구름 위를 걷는 자', description: '항공권 기록 10회', icon: 'flight_class', category: 'transport', maxProgress: 10 },
  { id: 'trans_train_10', title: '기차 여행 매니아', description: '기차 이동 10회', icon: 'train', category: 'transport', maxProgress: 10 },
  { id: 'trans_all', title: '육해공 마스터', description: '비행기, 차량, 배 모두 포함된 여행', icon: 'speed', category: 'transport' },
  
  // 10. 숙소 유형
  { id: 'stay_hotel_10', title: '호텔 바캉스', description: '호텔 10박 달성', icon: 'apartment', category: 'accommodation', maxProgress: 10 },
  { id: 'stay_nomad', title: '체크인 지옥', description: '매일 숙소가 바뀌는 5박+ 여행', icon: 'moving', category: 'accommodation' },
  
  // 11. 일정 밀도
  { id: 'dens_relaxed', title: '여백의 미', description: '하루 평균 일정 2개 이하', icon: 'spa', category: 'density' },
  { id: 'dens_power_j', title: '파워 J의 엑셀', description: '하루 15개 이상 일정 편성', icon: 'fact_check', category: 'density' },
  { id: 'dens_minimalist', title: '무계획의 정수', description: '일정 없는 3일+ 여행', icon: 'strikethrough_s', category: 'density' },
  
  // 12. 일정 카테고리
  { id: 'theme_gourmet', title: '먹다가 죽으리라', description: '하루 5끼 이상 식도락', icon: 'restaurant_menu', category: 'eventTypes' },
  { id: 'theme_shopping', title: '쇼핑 중독', description: '쇼핑 위주 여행', icon: 'shopping_bag', category: 'eventTypes' },
  { id: 'theme_adrenaline', title: '아드레날린', description: '액티비티 연속 3일', icon: 'kayaking', category: 'eventTypes' },
  
  // 13. 예산 및 소비
  { id: 'budg_budget', title: '천 원의 행복', description: '총 예산 5만 원 이하 여행', icon: 'savings', category: 'budget' },
  { id: 'budg_flex', title: '석유 부호', description: '총 예산 1,000만 원 이상', icon: 'diamond', category: 'budget' },
  { id: 'budg_exact', title: '오차율 0%', description: '계획 예산과 실제 지출 5% 내 일치', icon: 'ads_click', category: 'budget' },
  
  // 14. 통화 및 환율
  { id: 'curr_foreign', title: '달러의 맛', description: '첫 외화 예산 등록', icon: 'attach_money', category: 'currency' },
  { id: 'curr_multi', title: '글로벌 환전소', description: '5개국 이상 복합 통화 사용', icon: 'currency_exchange', category: 'currency' },
  
  // 15. 준비 및 체크리스트
  { id: 'prep_obsessive', title: '이삿짐센터', description: '체크리스트 100개 이상 등록', icon: 'inventory', category: 'preparation' },
  { id: 'prep_perfect', title: '완벽주의자', description: '출발 1주 전 모든 준비 완료', icon: 'task_alt', category: 'preparation' },
  
  // 16. 시스템 경고
  { id: 'warn_listener', title: '경청하는 자', description: '시스템 경고 수정 완료', icon: 'hearing', category: 'warnings' },
  { id: 'warn_rebel', title: '내 갈 길 간다', description: '치명적 경고를 무시하고 출발', icon: 'directions_run', category: 'warnings' },
  
  // 17. 계절별 사냥꾼
  { id: 'seas_winter', title: '겨울 왕국', description: '겨울 여행 3회', icon: 'ac_unit', category: 'seasons', maxProgress: 3 },
  { id: 'seas_all', title: '사계절 마스터', description: '사계절 모두 여행 완료', icon: 'eco', category: 'seasons' },
  
  // 18. 스크랩 및 기록
  { id: 'rec_scribble', title: '메모장 끄적끄적', description: '일정 메모 10회', icon: 'edit_square', category: 'records', maxProgress: 10 },
  { id: 'rec_visual', title: '시각 자료 필수', description: '이미지 첨부 5개 이상', icon: 'image', category: 'records' },
  
  // 19. 여행의 유산
  { id: 'leg_nostalgia', title: '추억 팔이', description: '1년 전 여행 다시 열기', icon: 'auto_stories', category: 'legacy' },
  { id: 'leg_unstoppable', title: '여행은 계속된다', description: '귀국 당일 다음 여행 계획 생성', icon: 'restart_alt', category: 'legacy' },
  
  // 20. 지리 및 거리
  { id: 'geo_opposite', title: '지구 반대편으로', description: '10,000km 이상 비행', icon: 'explore', category: 'geography' },
  { id: 'geo_around_world', title: '지구 한 바퀴', description: '총 비행 거리 4만km 달성', icon: 'rocket', category: 'geography', maxProgress: 40075 },
  
  // 21. 이스터에그 (Hidden)
  { id: 'hidden_vampire', title: '잠은 죽어서 자는 것', description: '3일 연속 심야 일정 소화', icon: 'dark_mode', category: 'easterEggs', hidden: true },
  { id: 'hidden_homeless', title: '공항 노숙자', description: '공항 내 12시간 이상 대기', icon: 'night_shelter', category: 'easterEggs', hidden: true },
  { id: 'hidden_one_meal', title: '삼시일끼', description: '하루 단 한 번의 식사 일정', icon: 'lunch_dining', category: 'easterEggs', hidden: true }
];
