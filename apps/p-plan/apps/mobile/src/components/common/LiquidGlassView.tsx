import React from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { DESIGN_TOKENS } from '@pplaner/shared';

interface LiquidGlassViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const LiquidGlassView: React.FC<LiquidGlassViewProps> = ({
  intensity = 50,
  tint = 'light',
  style,
  children,
}) => {
  return (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFill}
      />
      <View style={[
        styles.overlay,
        {
          backgroundColor: tint === 'dark' 
            ? 'rgba(15, 23, 42, 0.7)' 
            : 'rgba(255, 255, 255, 0.7)',
        }
      ]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  overlay: {
    flex: 1,
  },
});
