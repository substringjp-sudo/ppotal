'use client';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import React from 'react';

const LIBRARIES: ("places" | "drawing" | "geometry")[] = ['drawing', 'places', 'geometry'];

export default function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
    const render = (status: Status) => {
        if (status === Status.FAILURE) return <div className="p-10 text-center text-red-500 font-bold uppercase tracking-widest">Maps API Error. Check your connection or API key.</div>;
        return <></>;
    };

    return (
        <Wrapper
            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
            libraries={LIBRARIES}
            render={render}
        >
            {children}
        </Wrapper>
    );
}
