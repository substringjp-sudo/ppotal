import React from 'react';
import Script from 'next/script';
import { firebaseConfig } from '../config';

interface GoogleMapsScriptProps {
  apiKey?: string;
  libraries?: string;
}

export const GoogleMapsScript: React.FC<GoogleMapsScriptProps> = ({ 
  apiKey = firebaseConfig.googleCloudApiKey, 
  libraries = 'places,drawing,geometry' 
}) => {
  if (!apiKey) return null;

  return (
    <Script
      src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries}&v=beta&loading=async`}
      strategy="afterInteractive"
    />
  );
};
