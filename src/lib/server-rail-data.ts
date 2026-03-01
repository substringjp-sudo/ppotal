import fs from 'fs';
import path from 'path';
import { Company, Line, Station } from '../types/railData';

export interface HierarchyCompany {
    id: number;
    lines: Record<string, HierarchyLine>;
}

export interface HierarchyLine {
    id: number;
    corp_id: number;
    platforms: {
        platform_id: string;
        station_id: string;
    }[];
}

export interface SEOData {
    hierarchy: { companies: Record<string, HierarchyCompany> };
    companies: Record<string, Company>;
    lines: Record<string, Line>;
    stations: Record<string, Station>;
    companyCount: number;
    lineCount: number;
    stationCount: number;
}

export function getSEOData(): SEOData | null {
    try {
        const hierarchyPath = path.join(process.cwd(), 'public/rail/railroad_hierarchy.json');
        const companiesPath = path.join(process.cwd(), 'public/rail/companies.json');
        const linesPath = path.join(process.cwd(), 'public/rail/lines.json');
        const stationsPath = path.join(process.cwd(), 'public/rail/stations_master.json');

        if (fs.existsSync(hierarchyPath)) {
            const hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'));
            const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'));
            const lines = JSON.parse(fs.readFileSync(linesPath, 'utf-8'));
            const stations = JSON.parse(fs.readFileSync(stationsPath, 'utf-8'));

            return {
                hierarchy: hierarchy as { companies: Record<string, HierarchyCompany> },
                companies: companies as Record<string, Company>,
                lines: lines as Record<string, Line>,
                stations: stations as Record<string, Station>,
                companyCount: Object.keys(hierarchy.companies).length,
                lineCount: Object.keys(lines).length,
                stationCount: Object.keys(stations).length
            };
        }
    } catch (e) {
        console.error("Failed to load SEO directory data", e);
    }
    return null;
}
