import React from 'react';
import { View, StyleSheet, ViewProps, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { DESIGN_TOKENS } from '@pplaner/shared';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default', ...props }) => {
  if (variant === 'glass') {
    return (
      <View style={[styles.glassContainer, style]} {...props}>
        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.glassHighlight} />
        <View style={styles.content}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[100],
  },
  glassContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  glassHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
  },
  content: {
    padding: 20,
  },
});
