'use client';
import { useState } from 'react';
import { useTripStore } from '@pplaner/shared';
import { CustomCheckbox } from '@/components/common/FormComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';
import { Trip } from '@pplaner/shared';

const PRESETS = [
    {
        id: 'domestic',
        name: '국내여행',
        icon: 'map',
        items: [
            { title: '보조배터리', tag: '필수' },
            { title: '신분증', tag: '필수' },
            { title: '상비약', tag: '건강' },
            { title: '세면도구', tag: '개인' },
            { title: '편한 신발', tag: '의류' }
        ]
    },
    {
        id: 'international',
        name: '해외여행',
        icon: 'public',
        items: [
            { title: '여권 (만료일 확인)', tag: '필수' },
            { title: '유심/포켓와이파이', tag: '통신' },
            { title: '환전(현지통화)', tag: '금융' },
            { title: '트래블로그/월렛 카드', tag: '금융' },
            { title: '여행자보험 가입', tag: '필수' },
            { title: '어댑터(돼지코)', tag: '전자기기' }
        ]
    },
    {
        id: 'rental',
        name: '렌터카이용',
        icon: 'directions_car',
        items: [
            { title: '운전면허증', tag: '렌터카' },
            { title: '국제면허증', tag: '렌터카' },
            { title: '차량용 충전기', tag: '전자기기' },
            { title: '블랙박스 확인용 케이블', tag: '렌터카' }
        ]
    },
    {
        id: 'package',
        name: '패키지여행',
        icon: 'groups',
        items: [
            { title: '가이드 연락처 저장', tag: '확인' },
            { title: '집결 장소/시간 확인', tag: '확인' },
            { title: '일정표 출력/저장', tag: '확인' }
        ]
    },
    {
        id: 'concert',
        name: '콘서트',
        icon: 'confirmation_number',
        items: [
            { title: '티켓 (모바일/지류)', tag: '필수' },
            { title: '응원봉', tag: '팬심' },
            { title: '보조배터리', tag: '필수' },
            { title: '작은 가방', tag: '소지품' }
        ]
    },
    {
        id: 'family',
        name: '가족여행',
        icon: 'family_restroom',
        items: [
            { title: '비상 상비약 세트', tag: '가족' },
            { title: '물티슈 대용량', tag: '가족' },
            { title: '가족 여벌 옷', tag: '의류' },
            { title: '아이들을 위한 간식', tag: '식품' }
        ]
    }
];

interface ChecklistFormProps {
    initialTitle?: string;
    initialTags?: string;
    onSubmit: (title: string, tags: string) => void;
    onCancel?: () => void;
    submitLabel: string;
    autoFocus?: boolean;
}

// ─── 추천 엔진 로직 ──────────────────────────────────────────────

interface RecommendationItem {
    title: string;
    tags: string[];
    reason: string;
}

function getRecommendations(trip: Trip): RecommendationItem[] {
    const recs: RecommendationItem[] = [];
    const regions = trip.locations?.regions || [];
    const isOverseas = trip.isOverseas;
    const theme = trip.theme || '';
    const startDate = trip.dates?.startDate;

    // 1. 해외 여행 필수품
    if (isOverseas) {
        recs.push(
            { title: '여권 (만료일 6개월 확인)', tags: ['필수', '해외'], reason: '해외 여행시 가장 중요한 필수품' },
            { title: '유심 / 포켓와이파이 예약', tags: ['통신', '해외', '예약'], reason: '현지 인터넷 사용을 위해 필요' },
            { title: '여행자 보험 가입', tags: ['필수', '보험'], reason: '만일의 상황을 대비한 안전장치' },
            { title: '출입국 신고서 작성(비자 포함)', tags: ['확인', '해외'], reason: '빠른 입국 수속을 위해 미리 확인' }
        );
    }

    // 2. 국가/지역별 특화 (ID 기반)
    const hasJapan = regions.some(r => r.countryId === '101' || (r.type === 'country' && r.id === '101'));
    const hasSEAsia = regions.some(r => ['171', '181', '136', '085'].includes(r.countryId || (r.type === 'country' ? r.id : ''))); // 태국, 베트남, 필리핀, 인도네시아
    const hasEurope = regions.some(r => ['028', '099', '001', '157'].includes(r.countryId || (r.type === 'country' ? r.id : ''))); // 프랑스, 이탈리아, 영국, 스페인

    if (hasJapan) {
        recs.push(
            { title: '110V 어댑터 (돼지코)', tags: ['전자기기', '일본'], reason: '일본은 110V 전압을 사용합니다' },
            { title: 'Visit Japan Web 등록', tags: ['확인', '일본'], reason: '일본 입국 수속 간소화 서비스' },
            { title: '동전 지갑', tags: ['개인', '일본'], reason: '현금 사용이 많은 일본 여행의 필수템' },
            { title: '교통카드 (스이카/파스모)', tags: ['교통', '일본'], reason: '지하철, 편의점 결제에 유용' }
        );
    } 
    
    if (hasSEAsia) {
        recs.push(
            { title: '모기 기피제', tags: ['건강', '동남아'], reason: '열대 지역 해충 방지' },
            { title: '샤워기 필터', tags: ['청결', '동남아'], reason: '수질에 민감한 분들을 위한 필수템' },
            { title: '우산 / 우비', tags: ['생활', '동남아'], reason: '갑작스러운 스콜(비) 대비' },
            { title: '그랩(Grab) 앱 설치', tags: ['교통', '동남아'], reason: '현지 택시 호출 및 배달 서비스' }
        );
    } 
    
    if (hasEurope) {
        recs.push(
            { title: '도난 방지 스프링', tags: ['보안', '유럽'], reason: '휴대폰, 지갑 등을 가방에 연결' },
            { title: '개인용 자물쇠', tags: ['보안', '유럽'], reason: '호스텔이나 기차 보관함용' },
            { title: '유로화 환전', tags: ['금융', '유럽'], reason: '현지 결제를 위한 준비' },
            { title: '구글 맵 오프라인 다운로드', tags: ['지도', '유럽'], reason: '인터넷이 불안정한 지역 대비' }
        );
    }

    // 3. 계절별 (월 기준)
    if (startDate) {
        const month = new Date(startDate).getMonth() + 1; // 1~12
        if (month >= 6 && month <= 8) { // 여름
            recs.push(
                { title: '선크림', tags: ['뷰티', '여름'], reason: '강한 자외선 차단' },
                { title: '선글라스', tags: ['의류', '여름'], reason: '눈 보호 및 패션 아이템' },
                { title: '휴대용 선풍기', tags: ['생활', '여름'], reason: '무더위 대비' }
            );
        } else if (month === 12 || month <= 2) { // 겨울
            recs.push(
                { title: '핫팩', tags: ['생활', '겨울'], reason: '추운 날씨 보온 유지' },
                { title: '목도리 / 장갑', tags: ['의류', '겨울'], reason: '체온 유지를 위한 방한 용품' },
                { title: '보습 크림', tags: ['뷰티', '겨울'], reason: '건조한 대기 대비 피용 보호' }
            );
        }
    }

    // 4. 테마별
    if (theme.includes('캠핑')) {
        recs.push(
            { title: '랜턴', tags: ['장비', '캠핑'], reason: '밤길 및 텐트 안 조명' },
            { title: '멀티탭', tags: ['전자기기', '캠핑'], reason: '여러 기기 동시 충전' },
            { title: '물티슈 대용량', tags: ['위생', '캠핑'], reason: '캠핑장 필수 청결 도구' }
        );
    } else if (theme.includes('수영') || theme.includes('해변') || theme.includes('휴양')) {
        recs.push(
            { title: '수영복', tags: ['의류', '물놀이'], reason: '즐거운 물놀이를 위한 필수템' },
            { title: '방수팩', tags: ['전자기기', '물놀이'], reason: '스마트폰 침수 방지' },
            { title: '아쿠아 슈즈', tags: ['의류', '물놀이'], reason: '해변이나 워터파크 발 보호' }
        );
    }

    return recs;
}

function ChecklistForm({ initialTitle = '', initialTags = '', onSubmit, onCancel, submitLabel, autoFocus }: ChecklistFormProps) {
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialTags.includes('|') ? initialTags.split('|')[1].trim() : '');
    const [tags, setTags] = useState(initialTags.includes('|') ? initialTags.split('|')[0].trim() : initialTags);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        const combinedTags = description ? `${tags} | ${description}` : tags;
        onSubmit(title, combinedTags);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">준비물 이름</label>
                    <input
                        autoFocus={autoFocus}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="어댑터, 비상약 등..."
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">태그 (쉼표 구분)</label>
                    <input
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="필수, 전자기기 등..."
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm"
                    />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">메모 / 상세 설명 (선택)</label>
                    <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="만료일 확인, 예약 번호 등..."
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-sm"
                    />
                </div>
            </div>
            <div className="flex justify-end gap-3">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-xs"
                    >
                        취소
                    </button>
                )}
                <button
                    type="submit"
                    className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {submitLabel}
                </button>
            </div>
        </form>
    );
}

export default function ChecklistEditor() {
    const trip = useTripStore((state) => state.currentTrip);
    const updateChecklistItem = useTripStore((state) => state.updateChecklistItem);
    const addChecklistItem = useTripStore((state) => state.addChecklistItem);
    const removeChecklistItem = useTripStore((state) => state.removeChecklistItem);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    if (!trip) return null;

    const recommendations = getRecommendations(trip).filter(rec => 
        !trip.checklist.some(item => item.title === rec.title)
    );

    const applyPreset = (preset: typeof PRESETS[0]) => {
        preset.items.forEach(item => {
            if (!trip.checklist.some(c => c.title === item.title)) {
                const tags = item.tag ? [item.tag, preset.name] : [preset.name];
                addChecklistItem({ title: item.title, tags });
            }
        });
    };

    const addRecommended = (item: RecommendationItem) => {
        addChecklistItem({ title: item.title, tags: item.tags });
    };

    const addAllRecommended = () => {
        recommendations.forEach(addRecommended);
    };

    const handleAdd = (title: string, tagsStr: string) => {
        const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
        addChecklistItem({ title, tags });
        setIsAdding(false);
    };

    const handleUpdate = (id: string, title: string, tagsStr: string) => {
        const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
        updateChecklistItem(id, { title, tags });
        setEditingId(null);
    };

    return (
        <div className="space-y-12">
            {/* Recommendations Section */}
            {recommendations.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-2">
                                <span className="material-symbols-rounded text-[16px]">magic_button</span>
                                사용자님을 위한 추천 준비물
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">여행지, 기간, 테마를 분석하여 꼭 필요한 아이템을 골랐어요.</p>
                        </div>
                        <button
                            onClick={addAllRecommended}
                            className="text-[10px] font-black text-primary px-3 py-1 bg-primary/5 rounded-full border border-primary/10 hover:bg-primary/10 transition-all uppercase"
                        >
                            전체 추가하기
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {recommendations.map((rec, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className="group p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between gap-3 hover:border-primary/30 transition-all hover:shadow-md"
                            >
                                <div className="space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 leading-tight">
                                            {rec.title}
                                        </h4>
                                        <button
                                            onClick={() => addRecommended(rec)}
                                            className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm"
                                        >
                                            <span className="material-symbols-rounded text-[18px]">add</span>
                                        </button>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 line-clamp-2">
                                        {rec.reason}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {rec.tags.map((tag, j) => (
                                        <span key={j} className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 text-[8px] font-black text-slate-400 rounded-md uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Presets Section */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">기본 태그별 프리셋</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">카테고리별 필수 짐들을 한 번에 추가해보세요.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => applyPreset(preset)}
                            className="flex flex-col items-center gap-2 p-4 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-3xl hover:border-primary hover:bg-white dark:hover:bg-slate-900 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all shadow-sm">
                                <span className="material-symbols-rounded text-2xl">{preset.icon}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{preset.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Checklist */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">체크리스트 ({trip.checklist.length})</h3>
                    <button
                        onClick={() => {
                            setIsAdding(!isAdding);
                            setEditingId(null);
                        }}
                        className="text-xs font-black text-primary px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10 hover:bg-primary/10 transition-all flex items-center gap-1"
                    >
                        <span className="material-symbols-rounded text-[14px]">{isAdding ? 'close' : 'add'}</span>
                        {isAdding ? '취소' : '항목 추가'}
                    </button>
                </div>

                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-6"
                        >
                            <ChecklistForm
                                onSubmit={handleAdd}
                                submitLabel="추가하기"
                                autoFocus
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-3">
                    {trip.checklist.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <span className="material-symbols-rounded text-4xl mb-4 block opacity-20">fact_check</span>
                            <p className="text-sm font-bold uppercase tracking-widest">등록된 항목이 없습니다.</p>
                        </div>
                    ) : (
                        trip.checklist.map((item) => (
                            <div key={item.id} className="relative">
                                <AnimatePresence mode="wait">
                                    {editingId === item.id ? (
                                        <motion.div
                                            key="edit-form"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mb-3 overflow-hidden"
                                        >
                                            <ChecklistForm
                                                initialTitle={item.title}
                                                initialTags={item.tags?.join(', ') || ''}
                                                onSubmit={(title, tags) => handleUpdate(item.id, title, tags)}
                                                onCancel={() => setEditingId(null)}
                                                submitLabel="수정 완료"
                                                autoFocus
                                            />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="item-view"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="group p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary/20 transition-all shadow-sm flex items-center gap-4"
                                        >
                                            <CustomCheckbox
                                                checked={!!item.isDone}
                                                onChange={(checked: boolean) => updateChecklistItem(item.id, { isDone: checked })}
                                                className="flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-bold truncate ${item.isDone ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {item.title}
                                                </h4>
                                                {item.tags && item.tags.length > 0 && (
                                                    <div className="flex flex-col gap-1.5 mt-2">
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.tags.filter(t => !t.startsWith('|')).map((t, i) => (
                                                                <span key={i} className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md px-1.5 py-0.5 font-black uppercase tracking-widest inline-block">
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        {item.tags.some(t => t.startsWith('|')) && (
                                                            <p className="text-[10px] font-bold text-slate-400 italic">
                                                                {item.tags.find(t => t.startsWith('|'))?.replace('|', '').trim()}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(item.id);
                                                        setIsAdding(false);
                                                    }}
                                                    className="material-symbols-rounded text-slate-300 hover:text-primary transition-all text-xl p-1"
                                                >
                                                    edit
                                                </button>
                                                <button
                                                    onClick={() => removeChecklistItem(item.id)}
                                                    className="material-symbols-rounded text-slate-300 hover:text-red-500 transition-all text-xl p-1"
                                                >
                                                    delete
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}


