import { normalizeLineName } from './lineUtils';

export type Language = 'ja' | 'en' | 'ko';

export const COMPANY_TRANSLATIONS: Record<string, Record<Language, string>> = {
    "JR北海道": { ja: "JR北海道", en: "JR Hokkaido", ko: "JR 홋카이도" },
    "北海道旅客鉄道": { ja: "北海道旅客鉄道", en: "JR Hokkaido", ko: "JR 홋카이도" },
    "JR東日本": { ja: "JR東日本", en: "JR East", ko: "JR 동일본" },
    "東日本旅客鉄道": { ja: "東日本旅客鉄道", en: "JR East", ko: "JR 동일본" },
    "JR東海": { ja: "JR東海", en: "JR Central", ko: "JR 도카이" },
    "東海旅客鉄道": { ja: "東海旅客鉄道", en: "JR Central", ko: "JR 도카이" },
    "JR西日本": { ja: "JR西日本", en: "JR West", ko: "JR 서일본" },
    "西日本旅客鉄道": { ja: "西日本旅客鉄道", en: "JR West", ko: "JR 서일본" },
    "JR四国": { ja: "JR四国", en: "JR Shikoku", ko: "JR 시코쿠" },
    "四国旅客鉄道": { ja: "四国旅客鉄道", en: "JR Shikoku", ko: "JR 시코쿠" },
    "JR九州": { ja: "JR九州", en: "JR Kyushu", ko: "JR 규슈" },
    "九州旅客鉄道": { ja: "九州旅客鉄道", en: "JR Kyushu", ko: "JR 규슈" },
    "JR貨物": { ja: "JR貨物", en: "JR Freight", ko: "JR 화물" },
    "日本貨物鉄道": { ja: "日本貨物鉄道", en: "JR Freight", ko: "JR 화물" },
    "東京メトロ": { ja: "東京メトロ", en: "Tokyo Metro", ko: "도쿄 메트로" },
    "東京都交通局": { ja: "東京都交通局", en: "Toei Subway", ko: "도에이 지하철" },
    "京王電鉄": { ja: "京王電鉄", en: "Keio Railway", ko: "게이오 전철" },
    "小田急電鉄": { ja: "小田急電鉄", en: "Odakyu Electric Railway", ko: "오다큐 전철" },
    "東急電鉄": { ja: "東急電鉄", en: "Tokyu Railways", ko: "도큐 전철" },
    "京成電鉄": { ja: "京成電鉄", en: "Keisei Electric Railway", ko: "게이세이 전철" },
    "京浜急行電鉄": { ja: "京浜急行電鉄", en: "Keikyu Electric Railway", ko: "게이큐 전철" },
    "西武鉄道": { ja: "西武鉄道", en: "Seibu Railway", ko: "세이부 철도" },
    "東武鉄道": { ja: "東武鉄道", en: "Tobu Railway", ko: "도부 철도" },
    "相模鉄道": { ja: "相模鉄道", en: "Sagami Railway (Sotetsu)", ko: "사가미 철도 (소테츠)" },
    "近畿日本鉄道": { ja: "近畿日本鉄道", en: "Kintetsu Railway", ko: "긴키 일본 철도" },
    "阪急電鉄": { ja: "阪急電鉄", en: "Hankyu Railway", ko: "한큐 전철" },
    "阪神電気鉄道": { ja: "阪神電気鉄道", en: "Hanshin Electric Railway", ko: "한신 전기철도" },
    "南海電気鉄道": { ja: "南海電気鉄道", en: "Nankai Electric Railway", ko: "난카이 전기철도" },
    "京阪電気鉄道": { ja: "京阪電気鉄道", en: "Keihan Electric Railway", ko: "게이한 전기철도" },
    "名古屋鉄道": { ja: "名古屋鉄道", en: "Nagoya Railroad (Meitetsu)", ko: "나고야 철도 (메이테츠)" },
    "西日本鉄道": { ja: "西日本鉄道", en: "Nishitetsu Railway", ko: "서일본 철도" },
    "横浜市交通局": { ja: "横浜市交通局", en: "Yokohama Municipal Subway", ko: "요코하마 시 교통국 (지하철)" },
    "大阪市高速電気軌道": { ja: "大阪市高速電気軌道", en: "Osaka Metro", ko: "오사카 메트로" },
    "名古屋市交通局": { ja: "名古屋市交通局", en: "Nagoya Municipal Subway", ko: "나고야 시 교통국 (지하철)" },
    "京都市交通局": { ja: "京都市交通局", en: "Kyoto Municipal Subway", ko: "교토 시 교통국 (지하철)" },
    "福岡市交通局": { ja: "福岡市交通局", en: "Fukuoka City Subway", ko: "후쿠오카 시 교통국 (지하철)" },
    "札幌市交通局": { ja: "札幌市交通局", en: "Sapporo Municipal Subway", ko: "삿포로 시 교통국 (지하철)" },
    "仙台市交通局": { ja: "仙台市交通局", en: "Sendai City Subway", ko: "센다이 시 교통국 (지하철)" },
    "神戸市交通局": { ja: "神戸市交通局", en: "Kobe Municipal Subway", ko: "고베 시 교통국 (지하철)" },
    "北九州高速鉄道": { ja: "北九州高速鉄道", en: "Kitakyushu Monorail", ko: "기타큐슈 모노레일" },
    "沖縄都市モノレール": { ja: "沖縄都市モノレール", en: "Okinawa Monorail (Yui Rail)", ko: "오키나와 도시 모노레일 (유이 레일)" },
};

export const UI_TRANSLATIONS: Record<string, Record<Language, string>> = {
    "about": { ja: "サービス紹介", en: "About", ko: "서비스 소개" },
    "credits": { ja: "データ出典", en: "Data Sources", ko: "데이터 출처" },
    "about_credits": { ja: "サービス紹介・出典", en: "About & Credits", ko: "서비스 소개 및 출처" },
};

export const LINE_TRANSLATIONS: Record<string, Record<Language, string>> = {
    // JR East
    "山手線": { ja: "山手線", en: "Yamanote Line", ko: "야마노테선" },
    "京浜東北線": { ja: "京浜東北線", en: "Keihin-Tohoku Line", ko: "케이힌 토호쿠선" },
    "中央線": { ja: "中央線", en: "Chuo Line", ko: "주오선" },
    "中央本線": { ja: "中央本線", en: "Chuo Main Line", ko: "주오 본선" },
    "中央線快速": { ja: "中央線快速", en: "Chuo Line (Rapid)", ko: "주오선 쾌속" },
    "中央・総武線各駅停車": { ja: "中央・総武線各駅停車", en: "Chuo-Sobu Line (Local)", ko: "주오·소부선 각역정차" },
    "総武快速線": { ja: "総武快速線", en: "Sobu Line (Rapid)", ko: "소부 쾌속선" },
    "総武本선": { ja: "総武本線", en: "Sobu Main Line", ko: "소부 본선" },
    "埼京線": { ja: "埼京線", en: "Saikyo Line", ko: "사이쿄선" },
    "湘南新宿ライン": { ja: "湘南新宿ライン", en: "Shonan-Shinjuku Line", ko: "쇼난 신주쿠 라인" },
    "上野東京ライン": { ja: "上野東京ライン", en: "Ueno-Tokyo Line", ko: "우에노 도쿄 라인" },
    "常磐線": { ja: "常磐線", en: "Joban Line", ko: "조반선" },
    "常磐線快速": { ja: "常磐線快速", en: "Joban Line (Rapid)", ko: "조반선 쾌속" },
    "常磐緩行線": { ja: "常磐緩行線", en: "Joban Line (Local)", ko: "조반 완행선" },
    "京葉線": { ja: "京葉線", en: "Keiyo Line", ko: "케이요선" },
    "武蔵野선": { ja: "武蔵野線", en: "Musashino Line", ko: "무사시노선" },
    "南武線": { ja: "南武線", en: "Nambu Line", ko: "난부선" },
    "横浜線": { ja: "横浜線", en: "Yokohama Line", ko: "요코하마선" },
    "相模線": { ja: "相模線", en: "Sagami Line", ko: "사가미선" },
    "青梅線": { ja: "青梅線", en: "Ome Line", ko: "오우메선" },
    "五日市線": { ja: "五日市線", en: "Itsukaichi Line", ko: "이츠카이치선" },
    "八高線": { ja: "八高線", en: "Hachiko Line", ko: "하치코선" },
    "高崎線": { ja: "高崎線", en: "Takasaki Line", ko: "다카사키선" },
    "宇都宮線": { ja: "宇都宮線", en: "Utsunomiya Line", ko: "우츠노미야선" },
    "日光線": { ja: "日光線", en: "Nikko Line", ko: "닛코선" },
    "水戸線": { ja: "水戸線", en: "Mito Line", ko: "미토선" },
    "東海道本線": { ja: "東海道本線", en: "Tokaido Main Line", ko: "토카이도 본선" },
    "東海道線": { ja: "東海道線", en: "Tokaido Line", ko: "토카이도선" },
    "伊東線": { ja: "伊東線", en: "Ito Line", ko: "이토선" },
    "横須賀線": { ja: "横須賀線", en: "Yokosuka Line", ko: "요코스카선" },
    "鶴見線": { ja: "鶴見線", en: "Tsurumi Line", ko: "츠루미선" },

    // JR West
    "大阪環状線": { ja: "大阪環状線", en: "Osaka Loop Line", ko: "오사카 순환선" },
    "JR京都線": { ja: "JR京都線", en: "JR Kyoto Line", ko: "JR 교토선" },
    "JR神戸線": { ja: "JR神戸線", en: "JR Kobe Line", ko: "JR 고베선" },
    "JR宝塚線": { ja: "JR宝塚線", en: "JR Takarazuka Line", ko: "JR 다카라즈카선" },
    "学研都市線": { ja: "学研都市線", en: "Gakkentoshi Line", ko: "갓켄도시선" },
    "大和路線": { ja: "大和路線", en: "Yamatoji Line", ko: "야마토지선" },
    "阪和線": { ja: "阪和線", en: "Hanwa Line", ko: "한와선" },
    "湖西線": { ja: "湖西線", en: "Kosei Line", ko: "코세이선" },
    "奈良線": { ja: "奈良線", en: "Nara Line", ko: "나라선" },
    "嵯峨野線": { ja: "嵯峨野線", en: "Sagano Line", ko: "사가노선" },
    "おおさか東線": { ja: "おおさか東線", en: "Osaka Higashi Line", ko: "오사카 히가시선" },
    "関西空港線": { ja: "関西空港線", en: "Kansai Airport Line", ko: "간사이 공항선" },
    "和歌山線": { ja: "和歌山線", en: "Wakayama Line", ko: "와카야마선" },
    "万葉まほろば線": { ja: "万葉まほろば線", en: "Manyo-Mahoroba Line", ko: "만요 마호로바선" },
    "きのくに線": { ja: "きのくに線", en: "Kinokuni Line", ko: "키노쿠니선" },

    // Private Railways - Kanto
    "京王線": { ja: "京王선", en: "Keio Line", ko: "게이오선" },
    "京王新線": { ja: "京王新線", en: "Keio New Line", ko: "게이오 신선" },
    "京王相模原線": { ja: "京王相模原線", en: "Keio Sagamihara Line", ko: "게이오 사가미하라선" },
    "京王井の頭線": { ja: "京王井の頭線", en: "Keio Inokashira Line", ko: "게이오 이노카시라선" },
    "小田急小田原線": { ja: "小田急小田原線", en: "Odakyu Odawara Line", ko: "오다큐 오다와라선" },
    "小田急江ノ島線": { ja: "小田急江ノ島線", en: "Odakyu Enoshima Line", ko: "오다큐 에노시마선" },
    "小田急多摩線": { ja: "小田急多摩線", en: "Odakyu Tama Line", ko: "오다큐 타마선" },
    "東急東横線": { ja: "東急東横線", en: "Tokyu Toyoko Line", ko: "도큐 토요코선" },
    "東急目黒線": { ja: "東急目黒線", en: "Tokyu Meguro Line", ko: "도큐 메구로선" },
    "東急田園都市線": { ja: "東急田園都市線", en: "Tokyu Den-en-toshi Line", ko: "도큐 덴엔토시선" },
    "東急大井町線": { ja: "東急大井町線", en: "Tokyu Oimachi Line", ko: "도큐 오이마치선" },
    "東急池上線": { ja: "東急池上線", en: "Tokyu Ikegami Line", ko: "도큐 이케가미선" },
    "東急多摩川線": { ja: "東急多摩川線", en: "Tokyu Tamagawa Line", ko: "도큐 타마가와선" },
    "京成本線": { ja: "京成本線", en: "Keisei Main Line", ko: "게이세이 본선" },
    "成田スカイアクセス線": { ja: "成田スカイアクセス線", en: "Narita Sky Access Line", ko: "나리타 스카이 액세스선" },
    "京急本線": { ja: "京急本線", en: "Keikyu Main Line", ko: "게이큐 본선" },
    "京急空港線": { ja: "京急空港線", en: "Keikyu Airport Line", ko: "게이큐 공항선" },
    "西武池袋線": { ja: "西武池袋線", en: "Seibu Ikebukuro Line", ko: "세이부 이케부쿠로선" },
    "西武新宿線": { ja: "西武新宿線", en: "Seibu Shinjuku Line", ko: "세이부 신주쿠선" },
    "東武伊勢崎線": { ja: "東武伊勢崎線", en: "Tobu Isesaki Line", ko: "도부 이세사키선" },
    "東武日光線": { ja: "東武日光線", en: "Tobu Nikko Line", ko: "도부 닛코선" },
    "東武東上線": { ja: "東武東上線", en: "Tobu Tojo Line", ko: "도부 토죠선" },

    // Private Railways - Kansai
    "近鉄大阪線": { ja: "近鉄大阪線", en: "Kintetsu Osaka Line", ko: "긴테츠 오사카선" },
    "近鉄奈良線": { ja: "近鉄奈良線", en: "Kintetsu Nara Line", ko: "긴테츠 나라선" },
    "近鉄京都線": { ja: "近鉄京都線", en: "Kintetsu Kyoto Line", ko: "긴테츠 교토선" },
    "阪急神戸本線": { ja: "阪急神戸本線", en: "Hankyu Kobe Main Line", ko: "한큐 고베 본선" },
    "阪急宝塚本線": { ja: "阪急宝塚本線", en: "Hankyu Takarazuka Main Line", ko: "한큐 다카라즈카 본선" },
    "阪急京都本線": { ja: "阪急京都本線", en: "Hankyu Kyoto Main Line", ko: "한큐 교토 본선" },
    "阪神本線": { ja: "阪神本線", en: "Hanshin Main Line", ko: "한신 본선" },
    "南海本線": { ja: "南海本선", en: "Nankai Main Line", ko: "난카이 본선" },
    "南海高野線": { ja: "南海高野線", en: "Nankai Koya Line", ko: "난카이 고야선" },
    "京阪本線": { ja: "京阪本線", en: "Keihan Main Line", ko: "게이한 본선" },

    // Tokyo Metro
    "銀座線": { ja: "銀座線", en: "Ginza Line", ko: "긴자선" },
    "丸ノ内線": { ja: "丸ノ内線", en: "Marunouchi Line", ko: "마루노우치선" },
    "日比谷線": { ja: "日比谷線", en: "Hibiya Line", ko: "히비야선" },
    "東西線": { ja: "東西線", en: "Tozai Line", ko: "토자이선" },
    "千代田線": { ja: "千代田線", en: "Chiyoda Line", ko: "치요다선" },
    "有楽町線": { ja: "有楽町線", en: "Yurakucho Line", ko: "유라쿠초선" },
    "半蔵門線": { ja: "半蔵門線", en: "Hanzomon Line", ko: "한조몬선" },
    "南北線": { ja: "南北線", en: "Namboku Line", ko: "난보쿠선" },
    "副都心線": { ja: "副都心線", en: "Fukutoshin Line", ko: "후쿠도심선" },

    // Toei Subway
    "浅草線": { ja: "浅草線", en: "Asakusa Line", ko: "아사쿠사선" },
    "三田線": { ja: "三田線", en: "Mita Line", ko: "미타선" },
    "新宿線": { ja: "新宿線", en: "Shinjuku Line", ko: "신주쿠선" },
    "大江戸線": { ja: "大江戸線", en: "Oedo Line", ko: "오에도선" },

    // Osaka Metro
    "御堂筋線": { ja: "御堂筋線", en: "Midosuji Line", ko: "미도스지선" },
    "谷町線": { ja: "谷町線", en: "Tanimachi Line", ko: "타니마치선" },
    "四つ橋線": { ja: "四つ橋線", en: "Yotsubashi Line", ko: "요츠바시선" },
    "千日前線": { ja: "千日前線", en: "Sennichimae Line", ko: "센니치마에선" },
    "堺筋線": { ja: "堺筋線", en: "Sakaisuji Line", ko: "사카이스지선" },
    "長堀鶴見緑地線": { ja: "長堀鶴見緑地線", en: "Nagahori Tsurumi-ryokuchi Line", ko: "나가호리츠루미료쿠치선" },
    "今里筋線": { ja: "今里筋線", en: "Imazatosuji Line", ko: "이마자토스지선" },
    "南港ポートタウン線": { ja: "南港ポートタウン線", en: "Nanko Port Town Line", ko: "난코 포트타운선" },

    // Shinkansen
    "東海道新幹線": { ja: "東海道新幹線", en: "Tokaido Shinkansen", ko: "토카이도 신칸센" },
    "山陽新幹線": { ja: "山陽新幹線", en: "Sanyo Shinkansen", ko: "산요 신칸센" },
    "東北新幹線": { ja: "東北新幹線", en: "Tohoku Shinkansen", ko: "토호쿠 신칸센" },
    "上越新幹線": { ja: "上越新幹線", en: "Joetsu Shinkansen", ko: "조에츠 신칸센" },
    "北陸新幹線": { ja: "北陸新幹線", en: "Hokuriku Shinkansen", ko: "호쿠리쿠 신칸센" },
    "北海道新幹線": { ja: "北海道新幹線", en: "Hokkaido Shinkansen", ko: "홋카이도 신칸센" },
    "九州新幹線": { ja: "九州新幹線", en: "Kyushu Shinkansen", ko: "규슈 신칸센" },
    "西九州新幹線": { ja: "西九州新幹線", en: "Nishi Kyushu Shinkansen", ko: "니시규슈 신칸센" },
};

export const STATION_TRANSLATIONS: Record<string, Record<Language, string>> = {
    // Yamanote / Central Tokyo
    "東京": { ja: "東京", en: "Tokyo", ko: "도쿄" },
    "神田": { ja: "神田", en: "Kanda", ko: "칸다" },
    "秋葉原": { ja: "秋葉原", en: "Akihabara", ko: "아키하바라" },
    "御徒町": { ja: "御徒町", en: "Okachimachi", ko: "오카치마치" },
    "上野": { ja: "上野", en: "Ueno", ko: "우에노" },
    "鶯谷": { ja: "鶯谷", en: "Uguisudani", ko: "우구이스다니" },
    "日暮里": { ja: "日暮里", en: "Nippori", ko: "닛포리" },
    "西日暮里": { ja: "西日暮里", en: "Nishi-Nippori", ko: "니시닛포리" },
    "田端": { ja: "田端", en: "Tabata", ko: "다바타" },
    "駒込": { ja: "駒込", en: "Komagome", ko: "고마고메" },
    "巣鴨": { ja: "巣鴨", en: "Sugamo", ko: "스가모" },
    "大塚": { ja: "大塚", en: "Otsuka", ko: "오오츠카" },
    "池袋": { ja: "池袋", en: "Ikebukuro", ko: "이케부쿠로" },
    "目白": { ja: "目白", en: "Mejiro", ko: "메지로" },
    "高田馬場": { ja: "高田馬場", en: "Takadanobaba", ko: "다카다노바바" },
    "新大久保": { ja: "新大久保", en: "Shin-Okubo", ko: "신오쿠보" },
    "新宿": { ja: "新宿", en: "Shinjuku", ko: "신주쿠" },
    "代々木": { ja: "代々木", en: "Yoyogi", ko: "요요기" },
    "原宿": { ja: "原宿", en: "Harajuku", ko: "하라주쿠" },
    "渋谷": { ja: "渋谷", en: "Shibuya", ko: "시부야" },
    "恵比寿": { ja: "恵比寿", en: "Ebisu", ko: "에비스" },
    "五反田": { ja: "五反田", en: "Gotanda", ko: "고탄다" },
    "大崎": { ja: "大崎", en: "Osaki", ko: "오사키" },
    "品川": { ja: "品川", en: "Shinagawa", ko: "시나가와" },
    "高輪ゲートウェイ": { ja: "高輪ゲートウェイ", en: "Takanawa Gateway", ko: "타카나와 게이트웨이" },
    "田町": { ja: "田町", en: "Tamachi", ko: "타마치" },
    "浜松町": { ja: "浜松町", en: "Hamamatsucho", ko: "하마마츠초" },
    "新橋": { ja: "新橋", en: "Shimbashi", ko: "신바시" },
    "有楽町": { ja: "有楽町", en: "Yurakucho", ko: "유라쿠초" },
    "三田": { ja: "三田", en: "Mita", ko: "미타" },
    "飯田橋": { ja: "飯田橋", en: "Iidabashi", ko: "이이다바시" },
    "市ケ谷": { ja: "市ケ谷", en: "Ichigaya", ko: "이치가야" },
    "四ツ谷": { ja: "四ツ谷", en: "Yotsuya", ko: "요츠야" },
    "信濃町": { ja: "信濃町", en: "Shinanomachi", ko: "시나노마치" },
    "千駄ケ谷": { ja: "千駄ケ谷", en: "Sendagaya", ko: "센다가야" },
    "御茶ノ水": { ja: "御茶ノ水", en: "Ochanomizu", ko: "오차노미즈" },
    "水道橋": { ja: "水道橋", en: "Suidobashi", ko: "스이도바시" },
    "浅草": { ja: "浅草", en: "Asakusa", ko: "아사쿠사" },
    "押上": { ja: "押上", en: "Oshiage", ko: "오시아게" },
    "銀座": { ja: "銀座", en: "Ginza", ko: "긴자" },
    "日本橋": { ja: "日本橋", en: "Nihombashi", ko: "니혼바시" },
    "大手町": { ja: "大手町", en: "Otemachi", ko: "오테마치" },
    "霞ケ関": { ja: "霞ケ関", en: "Kasumigaseki", ko: "카스미가세키" },
    "国会議事堂前": { ja: "国会議事堂前", en: "Kokkai-gijidomae", ko: "고카이기지도마에" },
    "赤坂見附": { ja: "赤坂見附", en: "Akasaka-mitsuke", ko: "아카사카미츠케" },
    "表参道": { ja: "表参道", en: "Omotesando", ko: "오모테산도" },

    // Terminal Hubs
    "横浜": { ja: "横浜", en: "Yokohama", ko: "요코하마" },
    "川崎": { ja: "川崎", en: "Kawasaki", ko: "가와사키" },
    "大宮": { ja: "大宮", en: "Omiya", ko: "오미야" },
    "千葉": { ja: "千葉", en: "Chiba", ko: "치바" },
    "八王子": { ja: "八王子", en: "Hachioji", ko: "하치오지" },
    "立川": { ja: "立川", en: "Tachikawa", ko: "타치카와" },
    "町田": { ja: "町田", en: "Machida", ko: "마치다" },

    // Osaka
    "大阪": { ja: "大阪", en: "Osaka", ko: "오사카" },
    "新大阪": { ja: "新大阪", en: "Shin-Osaka", ko: "신오사카" },
    "難波": { ja: "難波", en: "Namba", ko: "난바" },
    "なんば": { ja: "なんば", en: "Namba", ko: "난바" },
    "心斎橋": { ja: "心斎橋", en: "Shinsaibashi", ko: "신사이바시" },
    "本町": { ja: "本町", en: "Hommachi", ko: "혼마치" },
    "梅田": { ja: "梅田", en: "Umeda", ko: "우메다" },
    "東梅田": { ja: "東梅田", en: "Higashi-Umeda", ko: "히가시우메다" },
    "西梅田": { ja: "西梅田", en: "Nishi-Umeda", ko: "니시우메다" },
    "淀屋橋": { ja: "淀屋橋", en: "Yodoyabashi", ko: "요도야바시" },
    "天王寺": { ja: "天王寺", en: "Tennoji", ko: "텐노지" },
    "鶴橋": { ja: "鶴橋", en: "Tsuruhashi", ko: "츠루하시" },
    "京橋": { ja: "京橋", en: "Kyobashi", ko: "교바시" },
    "弁天町": { ja: "弁天町", en: "Bentencho", ko: "벤텐초" },
    "福島": { ja: "福島", en: "Fukushima", ko: "후쿠시마" },
    "野田": { ja: "野田", en: "Noda", ko: "노다" },
    "西九条": { ja: "西九条", en: "Nishikujo", ko: "니시쿠조" },
    "ユニ버설시티": { ja: "ユニバーサルシティ", en: "Universal City", ko: "유니버설 시티" },
    "天満": { ja: "天満", en: "Temma", ko: "텐마" },
    "桜ノ宮": { ja: "桜ノ宮", en: "Sakuranomiya", ko: "사쿠라노미야" },
    "森ノ宮": { ja: "森ノ宮", en: "Morinomiya", ko: "모리노미야" },
    "玉造": { ja: "玉造", en: "Tamatsukuri", ko: "타마츠쿠리" },
    "桃谷": { ja: "桃谷", en: "Momodani", ko: "모모다니" },
    "寺田町": { ja: "寺田町", en: "Teradacho", ko: "테라다초" },
    "今宮": { ja: "今宮", en: "Imamiya", ko: "이마미야" },
    "芦原橋": { ja: "芦原橋", en: "Ashiharabashi", ko: "아시하라바시" },
    "大正": { ja: "大正", en: "Taisho", ko: "타이쇼" },

    // Kyoto
    "京都": { ja: "京都", en: "Kyoto", ko: "교토" },
    "二条": { ja: "二条", en: "Nijo", ko: "니조" },
    "嵯峨嵐山": { ja: "嵯峨嵐山", en: "Saga-Arashiyama", ko: "사가아라시야마" },
    "稲荷": { ja: "稲荷", en: "Inari", ko: "이나리" },
    "宇治": { ja: "宇治", en: "Uji", ko: "우지" },
};

export const translate = (name: string, lang: Language, type: 'company' | 'line' | 'station' = 'station'): string => {
    if (lang === 'ja' || type === 'line' || type === 'company') return name;

    let targetMap: Record<string, Record<Language, string>>;
    // Since we return early for 'line' and 'company', targetMap will always be STATION_TRANSLATIONS here
    // But we keep the structure for future expansion if needed.
    targetMap = STATION_TRANSLATIONS;

    if (targetMap[name] && targetMap[name][lang]) {
        return targetMap[name][lang];
    }

    if (type === 'station') {
        // Handle "New" prefix (新)
        if (name.startsWith('新') && name.length > 1) {
            const core = name.slice(1);
            const coreTrans = STATION_TRANSLATIONS[core]?.[lang];
            if (coreTrans) {
                return (lang === 'en' ? 'Shin-' : '신') + coreTrans;
            }
        }
        // Handle "North/South/East/West" prefixes
        const prefixes: Record<string, Record<Language, string>> = {
            '北': { ja: '北', en: 'Kita-', ko: '기타' },
            '南': { ja: '南', en: 'Minami-', ko: '미나미' },
            '東': { ja: '東', en: 'Higashi-', ko: '히가시' },
            '西': { ja: '西', en: 'Nishi-', ko: '니시' },
        };
        for (const [pref, trans] of Object.entries(prefixes)) {
            if (name.startsWith(pref) && name.length > 1) {
                const core = name.slice(1);
                const coreTrans = STATION_TRANSLATIONS[core]?.[lang];
                if (coreTrans) return trans[lang] + coreTrans;
            }
        }
        // Handle "-mae" (前) suffix
        if (name.endsWith('前') && name.length > 1) {
            const core = name.slice(0, -1);
            const coreTrans = (STATION_TRANSLATIONS[core]?.[lang]) || (COMPANY_TRANSLATIONS[core]?.[lang]);
            if (coreTrans) {
                return coreTrans + (lang === 'en' ? '-mae' : ' 앞');
            }
        }
    }

    return name; // Fallback to original
};
