import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, useLocationStore } from '@pplaner/shared';
import Animated, { 
    useAnimatedStyle, 
    withSpring, 
    withRepeat, 
    withSequence, 
    withTiming,
    interpolateColor
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 48; // Floating style with margin

export const FloatingTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { activeSession } = useLocationStore();
  const isRecording = activeSession?.isActive === true;

  return (
    <View style={styles.container}>
      <View style={styles.floatingContainer}>
        <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.inner}>
          {state.routes.filter(route => {
            const { options } = descriptors[route.key];
            return (options as any).href !== null;
          }).map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.routes[state.index].key === route.key;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            let iconName = route.name === 'index' ? 'home' :
                           route.name === 'trips' ? 'calendar' : 
                           route.name === 'companion' ? (isRecording ? 'radio-button-on' : 'navigate') : 'settings-outline';
            
            let label = options.title;
            if (route.name === 'companion' && isRecording) {
                label = '기록중';
            }

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabItem}
              >
                <AnimatedIcon 
                    name={iconName as any} 
                    isFocused={isFocused} 
                    isActiveRecording={route.name === 'companion' && isRecording}
                />
                <Text style={[
                  styles.label,
                  { color: (route.name === 'companion' && isRecording) 
                           ? '#EF4444' 
                           : (isFocused ? DESIGN_TOKENS.colors.primary.DEFAULT : DESIGN_TOKENS.colors.slate[400]) 
                  }
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const AnimatedIcon = ({ name, isFocused, isActiveRecording }: { name: any, isFocused: boolean, isActiveRecording?: boolean }) => {
    const animatedStyle = useAnimatedStyle(() => {
        if (isActiveRecording) {
            return {
                transform: [
                    { scale: withRepeat(withSequence(withTiming(1.2, { duration: 800 }), withTiming(1, { duration: 800 })), -1, true) }
                ],
            };
        }
        return {
            transform: [
                { scale: withSpring(isFocused ? 1.2 : 1) },
                { translateY: withSpring(isFocused ? -2 : 0) }
            ],
        };
    });

    const iconColor = isActiveRecording 
        ? '#EF4444' 
        : (isFocused ? DESIGN_TOKENS.colors.primary.DEFAULT : DESIGN_TOKENS.colors.slate[400]);

    return (
        <Animated.View style={animatedStyle}>
            <Ionicons 
                name={name} 
                size={isActiveRecording ? 24 : 22} 
                color={iconColor} 
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  floatingContainer: {
    width: '100%',
    height: Platform.OS === 'ios' ? 88 : 70, // iOS handles safe area via padding
    backgroundColor: '#fff',
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, // Padding for safe area
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});
