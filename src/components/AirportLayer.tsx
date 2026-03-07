import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { GeoJSON, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { FeatureCollection, Feature } from 'geojson';
import { airportCanvas } from './Map';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedAddress, RegionNames } from '../lib/i18n-utils';

interface AirportLayerProps {
    data: FeatureCollection;
    zoom: number;
    pane?: string;
    onTooltipUpdate?: (content: string | null, x: number, y: number, priority: 'low' | 'high') => void;
}

interface AirportMetadata {
    name: string;
    name_en: string;
    name_kr: string;
    location: [number, number];
    type: string;
    adm1: string;
    adm2: string;
}

const AirportLayer: React.FC<AirportLayerProps> = ({ data, zoom, pane, onTooltipUpdate }) => {
    const { language } = useI18n();
    const [regionNames, setRegionNames] = useState<RegionNames | null>(null);
    const [airportsMeta, setAirportsMeta] = useState<AirportMetadata[]>([]);

    useEffect(() => {
        Promise.all([
            fetch('/data/region_names.json').then(res => res.json()),
            fetch('/data/airports.json').then(res => res.json())
        ]).then(([regions, airports]) => {
            setRegionNames(regions);
            setAirportsMeta(airports);
        }).catch(err => console.error("Failed to load airport metadata:", err));
    }, []);

    const style = useCallback(() => {
        return {
            fillColor: '#3a86ff',
            fillOpacity: zoom > 12 ? 0.35 : 0.15,
            weight: zoom > 10 ? 1.5 : 1,
            opacity: zoom > 10 ? 0.6 : 0.3,
            color: '#023e8a',
            smoothFactor: 1.0,
        };
    }, [zoom]);

    // Use SVG for polygons by not specifying a renderer
    const pathOptions = useMemo(() => ({
        interactive: true
    }), []);

    const airportIcon = useMemo(() => L.divIcon({
        html: '<span class="material-symbols-outlined" style="font-size: 6px; font-weight: 950; display: block;">local_airport</span>',
        className: 'airport-marker-container',
        iconSize: [10, 10], // Slightly larger than 8 but still small
        iconAnchor: [5, 5]
    }), []);

    const centroids = useMemo(() => {
        if (!data) return [];
        return data.features.map(feature => {
            const dummy = L.geoJSON(feature as any);
            const center = dummy.getBounds().getCenter();
            return { feature, center };
        });
    }, [data]);

    const getAirportTooltip = useCallback((feature: Feature) => {
        if (!feature.properties) return null;
        const jaName = feature.properties.C28_005 || '';

        // Find in metadata
        const meta = airportsMeta.find(a => a.name === jaName);
        if (!meta) return null;

        const localizedName = language === 'ko' ? meta.name_kr : (language === 'en' ? meta.name_en : meta.name);

        let addressHtml = '';
        if (regionNames) {
            const pref = regionNames.adm1[meta.adm1];
            const city = regionNames.adm2[meta.adm2];

            const prefPrimary = language === 'ko' ? pref?.name_kr : (language === 'en' ? pref?.name_en : pref?.name);
            const cityPrimary = language === 'ko' ? city?.name_kr : (language === 'en' ? city?.name_en : city?.name);

            const prefSub = language !== 'ja' ? pref?.name : '';
            const citySub = language !== 'ja' ? city?.name : '';

            addressHtml = `
                <div class="station-address-row" style="margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(0,0,0,0.05); font-size: 11px; opacity: 0.9; display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px;">
                    <span class="material-symbols-outlined" style="font-size: 12px; align-self: center;">location_on</span>
                    <span style="font-weight: 500;">${prefPrimary}</span>
                    ${prefSub ? `<span style="font-size: 9px; opacity: 0.6;">${prefSub}</span>` : ''}
                    <span style="margin: 0 1px; opacity: 0.3;">•</span>
                    <span style="font-weight: 500;">${cityPrimary}</span>
                    ${citySub ? `<span style="font-size: 9px; opacity: 0.6;">${citySub}</span>` : ''}
                </div>
            `;
        }

        return `
            <div class="station-tooltip-container" style="padding: 12px 16px; min-width: 180px; font-family: Pretendard, sans-serif;">
                <div class="station-name-row" style="display: flex; align-items: baseline; gap: 8px; border-bottom: 2px solid #1c74e9; padding-bottom: 8px; margin-bottom: 8px;">
                    <span class="material-symbols-outlined" style="font-size: 20px; color: #1c74e9; align-self: center;">local_airport</span>
                    <div style="display: flex; flex-direction: column;">
                        <span class="station-name-main" style="font-size: 16px; font-weight: 800; color: #1a202c;">${localizedName}</span>
                        ${language !== 'ja' ? `<span class="station-name-sub" style="font-size: 11px; opacity: 0.6; font-weight: 500; color: #4a5568;">${jaName}</span>` : ''}
                    </div>
                </div>
                ${addressHtml}
            </div>
        `;
    }, [regionNames, airportsMeta, language]);

    const handleMouseOver = useCallback((e: L.LeafletMouseEvent, feature: Feature) => {
        const tooltip = getAirportTooltip(feature);
        if (!tooltip) return;
        const { clientX, clientY } = (e.originalEvent as MouseEvent) || {};
        if (clientX !== undefined && clientY !== undefined) {
            onTooltipUpdate?.(tooltip, clientX, clientY, 'low');
        }
    }, [onTooltipUpdate, getAirportTooltip]);

    const handleMouseMove = useCallback((e: L.LeafletMouseEvent, feature: Feature) => {
        const tooltip = getAirportTooltip(feature);
        if (!tooltip) return;
        const { clientX, clientY } = (e.originalEvent as MouseEvent) || {};
        if (clientX !== undefined && clientY !== undefined) {
            onTooltipUpdate?.(tooltip, clientX, clientY, 'low');
        }
    }, [onTooltipUpdate, getAirportTooltip]);

    if (!data || zoom < 7) return null;

    return (
        <>
            <GeoJSON
                data={data}
                style={style}
                pathOptions={pathOptions}
                pane={pane} // "airports" pane (zIndex 450)
                onEachFeature={(feature: Feature, layer: L.Layer) => {
                    layer.on({
                        mouseover: (e: L.LeafletMouseEvent) => handleMouseOver(e, feature),
                        mousemove: (e: L.LeafletMouseEvent) => handleMouseMove(e, feature),
                        mouseout: () => {
                            onTooltipUpdate?.(null, 0, 0, 'low');
                        }
                    });
                }}
            />
            {/* Markers for airport icons */}
            {centroids.map(({ feature, center }, idx) => {
                const name = feature.properties?.C28_005;
                // Icons show from zoom 7
                return (
                    <Marker
                        key={`${name}-${idx}`}
                        position={center}
                        icon={airportIcon}
                        pane="airportIcons" // High zIndex pane (870)
                        eventHandlers={{
                            mouseover: (e) => handleMouseOver(e as any, feature),
                            mousemove: (e) => handleMouseMove(e as any, feature),
                            mouseout: () => onTooltipUpdate?.(null, 0, 0, 'low')
                        }}
                    >
                        {zoom > 12 && name && (
                            <Tooltip
                                permanent
                                direction="top"
                                offset={[0, -10]}
                                className="airport-label"
                            >
                                {name}
                            </Tooltip>
                        )}
                    </Marker>
                );
            })}
        </>
    );
};

export default React.memo(AirportLayer);
