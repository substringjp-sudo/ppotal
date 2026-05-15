export const ACCOMMODATION_TYPES: any[] = [
    { value: 'hotel', label: '호텔', icon: 'hotel' },
    { value: 'hostel', label: '호스텔', icon: 'apartment' },
    { value: 'guesthouse', label: '게스트하우스', icon: 'home' },
    { value: 'ryokan', label: '료칸', icon: 'night_shelter' },
    { value: 'motel', label: '모텔', icon: 'mode_night' },
    { value: 'resort', label: '리조트', icon: 'holiday_village' },
    { value: 'home', label: '가정집/Airbnb', icon: 'gite' },
    { value: 'pension', label: '민박/펜션', icon: 'villa' },
    { value: 'camping', label: '캠핑', icon: 'camping' },
    { value: 'other', label: '기타', icon: 'more_horiz' },
] as const;

export const BED_TYPES = [
    { value: 'single', label: '한개', icon: 'king_bed' },
    { value: 'double', label: '두개', icon: 'hotel' },
    { value: 'triple+', label: '세개 이상', icon: 'bedroom_parent' },
    { value: 'dormitory', label: '도미토리', icon: 'group' },
    { value: 'futon', label: '요이불', icon: 'chair_alt' },
    { value: 'tent', label: '텐트', icon: 'tent' },
    { value: 'other', label: '기타', icon: 'more_horiz' },
] as const;
