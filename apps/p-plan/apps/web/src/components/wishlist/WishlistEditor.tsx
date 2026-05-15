'use client';

import { useState, useEffect, useRef } from 'react';
import { WishlistItem, MainCategory, SubCategory, CATEGORY_MAP } from '@pplaner/shared';
import { useWishlistStore } from '@pplaner/shared';
import {
    X, MapPin, Link2, DollarSign, Image as ImageIcon,
    Check, ChevronRight, Utensils, ShoppingBag,
    Compass, Users, Plane, Hotel, CalendarCheck,
    Search, Loader2, Camera
} from 'lucide-react';
import { GoogleMapsSearch } from '@/components/common/GoogleMapsSearch';
import { motion, AnimatePresence } from 'framer-motion';
import GoogleMapsProvider from '@/components/providers/GoogleMapsProvider';
import { Status } from '@googlemaps/react-wrapper';
import { reverseGeocodeNames, reverseGeocodeIds, getRegionNamesByIds, resolveRegionIdsFromPlace, extractLocationComponents } from '@pplaner/shared';

const CATEGORY_ICONS: Record<MainCategory, any> = {
    meal: Utensils,
    shopping: ShoppingBag,
    sightseeing: Compass,
    people: Users,
    transport: Plane,
    accommodation: Hotel,
    reservation: CalendarCheck,
    other: MapPin,
};

interface WishlistEditorProps {
    item?: WishlistItem;
    tripId?: string;
    onClose: () => void;
    onSave?: (item: any) => void;
}

export default function WishlistEditor({ item, tripId, onClose, onSave }: WishlistEditorProps) {
    const { addItem, updateItem } = useWishlistStore();
    const titleInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<{
        title: string;
        description: string;
        sourceLink: string;
        price: string;
        mainCategory: MainCategory | '';
        subCategory: SubCategory | '';
        imageUrls: string[];
        place: WishlistItem['place'] | undefined;
    }>({
        title: item?.title || '',
        description: item?.description || '',
        sourceLink: item?.sourceLink || '',
        price: item?.price?.toString() || '',
        mainCategory: item?.mainCategory || '',
        subCategory: item?.subCategory || '',
        imageUrls: item?.imageUrls || [],
        place: item?.place || undefined,
    });

    useEffect(() => {
        titleInputRef.current?.focus();
    }, []);

    // 좌표가 존재하나 국가/지역/도시 정보가 없는 경우 자동 완성
    useEffect(() => {
        if (form.place?.lat && form.place?.lng && (!form.place.country || !form.place.city)) {
            const autofill = async () => {
                const names = await reverseGeocodeNames(form.place!.lat!, form.place!.lng!);
                if (names.country) {
                    setForm(prev => ({
                        ...prev,
                        place: {
                            ...prev.place!,
                            ...names
                        }
                    }));
                }
            };
            autofill();
        }
    }, [form.place?.lat, form.place?.lng]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                setForm(prev => ({
                    ...prev,
                    imageUrls: [...prev.imageUrls, base64]
                }));
            };
            reader.readAsDataURL(file);
        });
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const clipboardItems = e.clipboardData.items;
        for (let i = 0; i < clipboardItems.length; i++) {
            if (clipboardItems[i].type.indexOf('image') !== -1) {
                const blob = clipboardItems[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        setForm(prev => ({
                            ...prev,
                            imageUrls: [...prev.imageUrls, base64]
                        }));
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }

        if (e.currentTarget.getAttribute('name') === 'title') {
            const pastedText = e.clipboardData.getData('text');
            const mapUrlRegex = /(https?:\/\/(www\.)?google\.[a-z.]+\/maps\/[^\s?]+|https?:\/\/goo\.gl\/maps\/[^\s?]+)/;
            const match = pastedText.match(mapUrlRegex);

            if (match) {
                const url = match[0];
                
                // URL에서 좌표 추출 시도 (@lat,lng 형식)
                const coordsRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
                const coordsMatch = url.match(coordsRegex);
                let lat: number | undefined, lng: number | undefined;
                if (coordsMatch) {
                    lat = parseFloat(coordsMatch[1]);
                    lng = parseFloat(coordsMatch[2]);
                }

                setForm(prev => ({
                    ...prev,
                    sourceLink: url,
                    place: {
                        ...prev.place,
                        name: prev.place?.name || '지도에서 추가됨',
                        googleMapsUrl: url,
                        lat: lat || prev.place?.lat,
                        lng: lng || prev.place?.lng,
                    }
                }));
            }
        }
    };

    const onPlaceSelect = async (place: google.maps.places.PlaceResult) => {
        if (!place) return;
        
        const { country, prefecture, city } = extractLocationComponents(place.address_components || []);
        
        // [OPTIMIZED] 공용 식별 함수를 사용하여 즉시 ID 산출
        const finalIds = await resolveRegionIdsFromPlace(place);
            
        setForm(prev => ({
            ...prev,
            title: prev.title || place.name || '',
            place: {
                name: place.name || '',
                address: place.formatted_address || '',
                lat: place.geometry?.location?.lat(),
                lng: place.geometry?.location?.lng(),
                googleMapsUrl: place.url || '',
                placeId: place.place_id,
                city,
                prefecture,
                country,
                countryId: finalIds.countryId,
                prefectureId: finalIds.prefectureId,
                cityId: finalIds.cityId,
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return;

        // 최종 ID 검증 및 보정 (ID가 누락된 경우 마지막 시도)
        let finalPlace = form.place;
        if (finalPlace?.lat && finalPlace?.lng && !finalPlace.countryId) {
            // [MIGRATED] 좌표 기반 공간 분석으로 행정구역 ID 산출
            const ids = await reverseGeocodeIds(finalPlace.lat, finalPlace.lng);
            const names = await getRegionNamesByIds(ids);
            finalPlace = {
                ...finalPlace,
                country: finalPlace.country || names.country,
                prefecture: finalPlace.prefecture || names.prefecture,
                city: finalPlace.city || names.city,
                countryId: ids.countryId,
                prefectureId: ids.prefectureId,
                cityId: ids.cityId,
            };
        }

        const itemData = {
            tripId: tripId || item?.tripId,
            title: form.title,
            description: form.description,
            sourceLink: form.sourceLink,
            price: form.price ? parseFloat(form.price) : undefined,
            currency: 'KRW',
            mainCategory: form.mainCategory || undefined,
            subCategory: form.subCategory || undefined,
            imageUrls: form.imageUrls,
            place: finalPlace,
        };

        if (onSave) {
            onSave(itemData);
        } else if (item) {
            updateItem(item.id, itemData);
        } else {
            addItem(itemData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden border border-white/20 dark:border-slate-800"
                role="dialog"
                aria-modal="true"
                aria-labelledby="editor-title"
                style={{ maxHeight: '90vh' }}
            >
                {/* Header */}
                <div className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-20">
                    <div>
                        <h2 id="editor-title" className="text-lg font-bold text-slate-900 dark:text-white">
                            {item ? '항목 수정' : '새 항목 추가'}
                        </h2>
                        <p id="editor-description" className="text-xs text-slate-500 font-medium mt-1">사고 싶은 아이템, 맛집, 가고 싶은 장소 등을 자유롭게 기록하세요.</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
 
                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10">
                    {/* 1. 제목 (Title) */}
                    <div className="space-y-4">
                        <div className="relative">
                            <label htmlFor="title-input" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Title (필수)</label>
                            <input
                                id="title-input"
                                ref={titleInputRef}
                                type="text"
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                onPaste={handlePaste}
                                placeholder="무엇을 기록할까요? (예: 도쿄 바나나, 시부야 스카이...)"
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none text-xl font-bold transition-all shadow-sm"
                                required
                            />
                            <div className="mt-2 flex items-center gap-3 px-1">
                                <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> 클립보드 이미지 지원
                                </span>
                                <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> 구글맵 링크 자동인식
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 2. 카테고리 (Category) - 1줄 4개 */}
                    <div className="space-y-4 px-1">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Category (필수)</label>
                        <div className="grid grid-cols-8 gap-1.5">
                            {(Object.entries(CATEGORY_MAP) as [MainCategory, any][]).map(([key, info]) => {
                                const Icon = CATEGORY_ICONS[key];
                                const isActive = form.mainCategory === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, mainCategory: key, subCategory: '' }))}
                                        className={`group relative py-3 px-1 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${isActive
                                            ? 'bg-white border-slate-900 dark:border-white shadow-lg -translate-y-0.5'
                                            : 'bg-slate-50 dark:bg-slate-800/20 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                            }`}
                                    >
                                        <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-400 group-hover:text-slate-600'}`}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className={`text-[8px] font-black leading-none text-center ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{info.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <AnimatePresence>
                            {form.mainCategory && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 tracking-widest mb-2 uppercase">Detail Type</p>
                                        <div className="flex flex-wrap gap-2">
                                            {CATEGORY_MAP[form.mainCategory as MainCategory].subCategories.map((sub: any) => (
                                                <button
                                                    key={sub.value}
                                                    type="button"
                                                    onClick={() => setForm(prev => ({ ...prev, subCategory: sub.value }))}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${form.subCategory === sub.value
                                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md transform scale-105'
                                                        : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                                        }`}
                                                >
                                                    {sub.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 3. 구글지도검색 (Google Place Search) */}
                    <div className="space-y-4 px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">위치 정보 (Location)</label>
                        <div className="space-y-2">
                            <GoogleMapsSearch onPlaceSelect={onPlaceSelect} initialValue={form.place?.name} />
                            {form.place?.address && (
                                <p className="text-xs text-slate-500 font-medium px-2 flex items-start gap-1">
                                    <span className="material-symbols-rounded text-[14px] shrink-0 mt-0.5 text-indigo-500">location_on</span>
                                    {form.place.address}
                                </p>
                            )}
                            {form.place && (form.place.country || form.place.prefecture || form.place.city) && (
                                <div className="flex flex-wrap gap-1.5 px-2 mt-2">
                                    <AnimatePresence mode="popLayout">
                                        {form.place.country && (
                                            <motion.span
                                                key="country"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-lg flex items-center gap-1"
                                            >
                                                <span className="w-1 h-1 bg-slate-400 rounded-full" />
                                                {form.place.country}
                                            </motion.span>
                                        )}
                                        {form.place.prefecture && (
                                            <motion.span
                                                key="prefecture"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center gap-1 border border-indigo-100/50 dark:border-indigo-900/30"
                                            >
                                                <span className="w-1 h-1 bg-indigo-400 rounded-full" />
                                                {form.place.prefecture}
                                            </motion.span>
                                        )}
                                        {form.place.city && (
                                            <motion.span
                                                key="city"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-[10px] font-bold text-blue-600 dark:text-blue-400 rounded-lg flex items-center gap-1 border border-blue-100/50 dark:border-blue-900/30"
                                            >
                                                <span className="w-1 h-1 bg-blue-400 rounded-full" />
                                                {form.place.city}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. 메모 (Memo/Description) */}
                    <div className="space-y-4 px-1">
                        <label htmlFor="memo-input" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Memo</label>
                        <textarea
                            id="memo-input"
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="메모할 내용이 있나요? URL을 입력하면 자동으로 링크로 연결됩니다."
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none text-sm font-bold transition-all resize-none shadow-sm"
                        />
                    </div>

                    {/* 5. 사진추가 (Images) */}
                    <div className="space-y-4 px-1 pb-10">
                        <div className="flex items-center justify-between ml-1">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Photos</label>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 underline underline-offset-2"
                            >
                                <Camera className="w-3 h-3" /> 사진 찾아보기
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>

                        {form.imageUrls.length > 0 ? (
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                {form.imageUrls.map((url, idx) => (
                                    <div key={idx} className="relative group shrink-0 w-32 aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <img src={url} alt="preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => setForm(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== idx) }))}
                                                className="p-2 bg-white text-red-500 rounded-full shadow-lg"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-slate-300 transition-colors"
                            >
                                <ImageIcon className="w-8 h-8 text-slate-300" />
                                <p className="text-[11px] text-slate-400 font-medium">붙여넣거나 클릭해서 사진 추가</p>
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] flex gap-3 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] z-20">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black tracking-widest uppercase text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!form.title.trim() || !form.mainCategory}
                        className="flex-[2] px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black tracking-widest uppercase text-[10px] shadow-xl disabled:bg-slate-200 dark:disabled:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {item ? 'Save Changes' : 'Create Item'}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

