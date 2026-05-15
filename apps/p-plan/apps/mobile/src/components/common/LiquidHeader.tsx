import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { DESIGN_TOKENS } from '@pplaner/shared';

interface LiquidHeaderProps {
  title: string;
  headerStyle: any;
  titleStyle: any;
  glassOpacity: any;
  rightComponent?: React.ReactNode;
}

export const LiquidHeader: React.FC<LiquidHeaderProps> = ({
  title,
  headerStyle,
  titleStyle,
  glassOpacity,
  rightComponent,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View style={[styles.header, headerStyle]}>
      {/* Glass Layer */}
      <Animated.View style={[StyleSheet.absoluteFill, glassOpacity]}>
        <BlurView
          intensity={80}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.glassBorder} />
      </Animated.View>

      <View style={[styles.content, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topRow}>
          <Animated.Text style={[styles.title, titleStyle]}>
            {title}
          </Animated.Text>
          {rightComponent && (
            <View style={styles.rightAction}>
              {rightComponent}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  glassBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  content: {
    paddingHorizontal: 24,
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.slate[900],
    letterSpacing: -1,
  },
  rightAction: {
    marginBottom: 4,
  },
});
