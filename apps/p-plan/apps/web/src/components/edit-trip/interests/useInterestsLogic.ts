import { useState, useMemo } from 'react';
import { BucketListItem, CATEGORY_MAP, MainCategory } from '@pplaner/shared';
import { PackageOpen, MapPin, Camera, Info, Tag as TagIcon, Layers } from 'lucide-react';

export type GroupBy = 'none' | 'category' | 'type';

export const useInterestsLogic = (bucketList: BucketListItem[]) => {
    const [groupBy, setGroupBy] = useState<GroupBy>('none');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<MainCategory | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<string | 'all'>('all');
    const [selectedRegion, setSelectedRegion] = useState<string | 'all'>('all');
    const [selectedCity, setSelectedCity] = useState<string | 'all'>('all');

    const placeOptions = useMemo(() => {
        const countries = new Map<string, string>(); 
        const regionsMap = new Map<string, Map<string, string>>();
        const citiesMap = new Map<string, Map<string, string>>();

        bucketList.forEach(item => {
            if (item.place) {
                const { country, countryId, prefecture: region, prefectureId, city, cityId } = item.place as any;
                if (country || countryId) {
                    const cKey = countryId || country || '';
                    countries.set(cKey, country || countryId || '');
                    if (region || prefectureId) {
                        const rKey = prefectureId || region || '';
                        if (!regionsMap.has(cKey)) regionsMap.set(cKey, new Map());
                        regionsMap.get(cKey)!.set(rKey, region || prefectureId || '');
                        if (city || cityId) {
                            const ctKey = cityId || city || '';
                            if (!citiesMap.has(rKey)) citiesMap.set(rKey, new Map());
                            citiesMap.get(rKey)!.set(ctKey, city || cityId || '');
                        }
                    }
                }
            }
        });

        const sortMap = (m: Map<string, string>) => 
            Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

        return {
            countries: sortMap(countries),
            regionsMap: Object.fromEntries(Array.from(regionsMap.entries()).map(([k, v]) => [k, sortMap(v)])),
            citiesMap: Object.fromEntries(Array.from(citiesMap.entries()).map(([k, v]) => [k, sortMap(v)]))
        };
    }, [bucketList]);

    const filteredBucketList = useMemo(() => {
        return bucketList.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                (item.place?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = !filterCategory || item.mainCategory === filterCategory;
            const p = item.place as any;
            const matchesCountry = selectedCountry === 'all' || (p?.countryId === selectedCountry) || (!p?.countryId && p?.country === selectedCountry);
            const matchesRegion = selectedRegion === 'all' || (p?.prefectureId === selectedRegion) || (!p?.prefectureId && p?.prefecture === selectedRegion);
            const matchesCity = selectedCity === 'all' || (p?.cityId === selectedCity) || (!p?.cityId && p?.city === selectedCity);
            return matchesSearch && matchesCategory && matchesCountry && matchesRegion && matchesCity;
        });
    }, [bucketList, searchQuery, filterCategory, selectedCountry, selectedRegion, selectedCity]);

    const groupedItems = useMemo(() => {
        if (groupBy === 'none') return null;
        const groups: Record<string, { label: string, icon: any, items: BucketListItem[] }> = {};

        if (groupBy === 'category') {
            Object.entries(CATEGORY_MAP).forEach(([key, info]) => {
                groups[key] = { label: info.label, icon: TagIcon, items: [] };
            });
            groups['uncategorized'] = { label: '미분류', icon: PackageOpen, items: [] };
            filteredBucketList.forEach(item => {
                const key = item.mainCategory || 'uncategorized';
                if (groups[key]) groups[key].items.push(item);
                else groups['uncategorized'].items.push(item);
            });
        } else if (groupBy === 'type') {
            groups['place'] = { label: '장소 기록', icon: MapPin, items: [] };
            groups['photo'] = { label: '사진 기록', icon: Camera, items: [] };
            groups['simple'] = { label: '기본 메모', icon: Info, items: [] };
            filteredBucketList.forEach(item => {
                if (item.place) groups['place'].items.push(item);
                else if (item.imageUrl) groups['photo'].items.push(item);
                else groups['simple'].items.push(item);
            });
        }
        return groups;
    }, [filteredBucketList, groupBy]);

    return {
        groupBy, setGroupBy,
        searchQuery, setSearchQuery,
        filterCategory, setFilterCategory,
        selectedCountry, setSelectedCountry,
        selectedRegion, setSelectedRegion,
        selectedCity, setSelectedCity,
        placeOptions,
        filteredBucketList,
        groupedItems
    };
};
