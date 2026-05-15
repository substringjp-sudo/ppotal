import React from 'react';
import { StyleSheet, View, Image } from 'react-native';

export default function MapComponent() {
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image 
        source={{ uri: 'file:///C:/Users/yhs07/.gemini/antigravity/brain/dec758a0-fe69-4f12-80e7-b33a932a5a29/travel_map_mockup_1777538329713.png' }} 
        style={styles.mapImage}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
});
