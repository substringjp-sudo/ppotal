import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';
import { ScheduleItemNodeView } from './ScheduleItemNodeView';
import { TimeMarkerNodeView } from './TimeMarkerNodeView';
import { DaySeparatorNodeView } from './DaySeparatorNodeView';
import { BlockBodyNodeView } from './BlockBodyNodeView';
import { BlockTitleNodeView } from './BlockTitleNodeView';
import { EmotionDiagramNodeView } from './EmotionDiagramNodeView';
import { PhotoGalleryNodeView } from './PhotoGalleryNodeView';
import { WeatherObjectNodeView } from './WeatherObjectNodeView';
import { PremiumDividerNodeView } from './PremiumDividerNodeView';

/**
 * 모든 객체(Block)가 공유하는 공통 디자인 속성
 */
export const commonBlockAttributes = {
  borderStyle: { default: 'none' }, // none, solid, dashed, dotted
  borderWidth: { default: 1 },
  borderColor: { default: 'slate-200' },
  bgFill: { default: 'transparent' }, // transparent, light, accent, glass
  bgOpacity: { default: 100 },
  borderRadius: { default: 24 }, // px
  shadowType: { default: 'none' }, // none, soft, sharp, glow
  padding: { default: 20 }, // px
  fontFamily: { default: 'Pretendard' },
  fontSize: { default: 16 }, // px
  fontWeight: { default: '500' },
  textAlign: { default: 'left' },
};

// 1. BlockBody (본문 객체)
export const BlockBody = Node.create({
  name: 'blockBody',
  group: 'block',
  content: 'inline*',
  draggable: true,
  addAttributes() {
    return {
      ...commonBlockAttributes,
      placeholder: { default: '내용을 입력하세요...' }
    };
  },
  addNodeView() { return ReactNodeViewRenderer(BlockBodyNodeView); },
  parseHTML() { return [{ tag: 'div[data-type="block-body"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'block-body', class: 'block-object block-body' }), 0];
  },
});

// 2. BlockTitle (제목 객체)
export const BlockTitle = Node.create({
  name: 'blockTitle',
  group: 'block',
  content: 'inline*',
  draggable: true,
  addAttributes() {
    return {
      ...commonBlockAttributes,
      fontSize: { default: 28 },
      fontWeight: { default: '900' },
    };
  },
  addNodeView() { return ReactNodeViewRenderer(BlockTitleNodeView); },
  parseHTML() { return [{ tag: 'div[data-type="block-title"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'block-title', class: 'block-object block-title' }), 0];
  },
});

// 3. EmotionDiagram (감정 다이어그램)
export const EmotionDiagram = Node.create({
  name: 'emotionDiagram',
  group: 'block',
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      ...commonBlockAttributes,
      emotion: { default: { joy: 0.33, sadness: 0.33, anger: 0.33 } },
      size: { default: 200 }
    };
  },
  addNodeView() { return ReactNodeViewRenderer(EmotionDiagramNodeView); },
  parseHTML() { return [{ tag: 'div[data-type="emotion-diagram"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'emotion-diagram' })];
  },
});

// 4. PhotoGallery (사진 갤러리 묶음)
export const PhotoGallery = Node.create({
  name: 'photoGallery',
  group: 'block',
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      ...commonBlockAttributes,
      images: { default: [] }, // Array of { url, caption }
      layout: { default: 'grid' }, // grid, masonry, slider
      columns: { default: 3 },
    };
  },
  addNodeView() { return ReactNodeViewRenderer(PhotoGalleryNodeView); },
  parseHTML() { return [{ tag: 'div[data-type="photo-gallery"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'photo-gallery' })];
  },
});

// 5. WeatherObject (지능형 날씨)
export const WeatherObject = Node.create({
  name: 'weatherObject',
  group: 'block',
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      ...commonBlockAttributes,
      date: { default: '' },
      location: { default: '' },
      weather: { default: 'sunny' }, // sunny, rainy, cloudy, snowy
      temp: { default: 22 },
      isAuto: { default: true },
    };
  },
  addNodeView() { return ReactNodeViewRenderer(WeatherObjectNodeView); },
  parseHTML() { return [{ tag: 'div[data-type="weather-object"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'weather-object' })];
  },
});

// 기존 Callout (말풍선/상자) Extension 수정
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'blockBody+',
  draggable: true,
  isolating: true,
  defining: true,
  addAttributes() {
    return {
      ...commonBlockAttributes,
      type: { default: 'info' },
      emoji: { default: '💡' },
      borderStyle: { default: 'solid' },
      bgFill: { default: 'light' },
    };
  },
  parseHTML() { return [{ tag: 'div[data-type="callout"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout', class: 'callout-node' }), 0];
  },
});

// Existing Divider
export const PremiumDivider = Node.create({
  name: 'premiumDivider',
  group: 'block',
  selectable: true,
  addAttributes() { return { style: { default: 'dashed' } }; },
  addNodeView() { return ReactNodeViewRenderer(PremiumDividerNodeView); },
  parseHTML() { return [{ tag: 'hr[data-premium="true"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, { 'data-premium': 'true', class: `premium-divider ${HTMLAttributes.style}` })];
  },
});

// Existing TimeMarker
export const TimeMarker = Node.create({
  name: 'timeMarker',
  group: 'inline',
  inline: true,
  selectable: true,
  draggable: true,
  addAttributes() { return { time: { default: '12:00' } }; },
  addNodeView() { return ReactNodeViewRenderer(TimeMarkerNodeView); },
  parseHTML() { return [{ tag: 'span[data-type="time-marker"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'time-marker' }), `[${HTMLAttributes.time}]`];
  },
});

// Existing DaySeparator
export const DaySeparator = Node.create({
  name: 'daySeparator',
  group: 'block',
  selectable: true,
  draggable: true,
  addAttributes() { return { day: { default: 1 }, date: { default: '' } }; },
  addNodeView() { return ReactNodeViewRenderer(DaySeparatorNodeView); },
  parseHTML() { return [{ tag: 'div[data-type="day-separator"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'day-separator' })];
  },
});

// 기존 Schedule Item 수정
export const ScheduleItem = Node.create({
  name: 'scheduleItem',
  group: 'block',
  content: 'blockBody+', 
  draggable: true,
  selectable: true,
  isolating: true,
  defining: true,
  addAttributes() {
    return {
      ...commonBlockAttributes,
      type: { default: 'event' },
      time: { default: '12:00' },
      startTime: { default: '12:00' },
      endTime: { default: '13:00' },
      title: { default: '' },
      location: { default: '장소를 입력하세요' },
      mainCategory: { default: '기타' },
      subCategory: { default: '' },
      isSetup: { default: false },
      setupStep: { default: 0 },
      id: { default: `item-${Math.random().toString(36).substr(2, 9)}` },
      emotion: { default: { joy: 0.33, sadness: 0.33, anger: 0.33 } },
      memo: { default: '' },
      details: { default: {} },
      borderStyle: { default: 'solid' },
    };
  },
  addNodeView() { return ReactNodeViewRenderer(ScheduleItemNodeView); },
  parseHTML() { return [{ tag: 'div[data-type="schedule-item"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'schedule-item', class: 'schedule-item-node' }), 0];
  },
});
