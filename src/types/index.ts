// src/types/index.ts

export interface Station {
    id: string;
    name: string;
    name_en: string;
    lat: number;
    lon: number;
    platform_ids: string[];
    prefecture_id?: string;
    city_id?: string;
  }
  
  export interface Platform {
    code: string; 
    name: string;
    line: number; 
  }
  
  export interface Line {
    id: number;
    name: string;
    name_en: string;
    color: string;
    corp_id: number;
  }

  export interface Company {
    id: number;
    name: string;
    color: string;
  }
  
  export interface Section {
    id: number;
    line_id: number;
    start_station: string;
    end_station: string;
  }
  
  export interface RailData {
    stations: Record<string, Station>;
    platforms: Record<string, Platform>;
    lines: Record<string, Line>;
    companies: Record<string, Company>;
    sections: {
      sections: Section[];
    };
    railroadGraph: Record<string, Record<string, number[]>>;
  }
  