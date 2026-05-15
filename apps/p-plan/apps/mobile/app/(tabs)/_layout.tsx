import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@pplaner/shared';

import { FloatingTabBar } from '../../src/components/common/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false, // LiquidHeader를 직접 사용하기 위해 기본 헤더 숨김
        tabBarActiveTintColor: DESIGN_TOKENS.colors.primary.DEFAULT,
        tabBarInactiveTintColor: DESIGN_TOKENS.colors.slate[400],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
        }}
      />
      <Tabs.Screen
        name="companion"
        options={{
          title: '기록',
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: '계획',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
        }}
      />
      <Tabs.Screen
        name="trip/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="trip/new"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="trip/[id]/map"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
