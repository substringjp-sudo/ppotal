import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import { DESIGN_TOKENS } from '@pplaner/shared';

interface MapComponentProps {
  currentLocation?: any;
  photoLocations?: { latitude: number, longitude: number, id?: string }[];
  path?: { latitude: number, longitude: number }[];
}

export default function MapComponent({ currentLocation, photoLocations = [], path = [] }: MapComponentProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
  }, [currentLocation]);

  useEffect(() => {
    if (photoLocations.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(photoLocations, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [photoLocations]);

  return (
    <MapView 
      ref={mapRef}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      style={StyleSheet.absoluteFillObject}
      initialRegion={{
        latitude: currentLocation?.coords.latitude || photoLocations[0]?.latitude || 37.5665,
        longitude: currentLocation?.coords.longitude || photoLocations[0]?.longitude || 126.9780,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation
      showsMyLocationButton
    >
      {photoLocations.map((loc, idx) => (
        <Marker
          key={loc.id || idx}
          coordinate={loc}
          pinColor={DESIGN_TOKENS.colors.primary.DEFAULT}
        />
      ))}

      {path.length > 1 && (
        <Polyline
          coordinates={path}
          strokeColor={DESIGN_TOKENS.colors.primary.DEFAULT}
          strokeWidth={3}
          lineDashPattern={[5, 5]}
        />
      )}
    </MapView>
  );
}
