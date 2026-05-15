'use client';

import { useState } from 'react';
import { Travelog } from '@pplaner/shared';

export type EditorStep = 'info' | 'photos' | 'editor';

export function useTravelogEditorState() {
  const [travelog, setTravelog] = useState<Travelog | null>(null);
  const [currentStep, setCurrentStep] = useState<EditorStep>('photos');
  
  // UI States
  const [isLeftPaneOpen, setIsLeftPaneOpen] = useState(true);
  const [isSimpleMode, setIsSimpleMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Wizard States
  const [analyzedPhotos, setAnalyzedPhotos] = useState<any[]>([]);
  const [suggestedActivities, setSuggestedActivities] = useState<any[]>([]);
  const [wizardMapCenter, setWizardMapCenter] = useState<any>(null);
  const [wizardMapZoom, setWizardMapZoom] = useState(13);
  const [isAutoAddToEditor, setIsAutoAddToEditor] = useState(true);
  
  // Interaction States
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [usedTimelineIds, setUsedTimelineIds] = useState<string[]>([]);

  return {
    travelog,
    setTravelog,
    currentStep,
    setCurrentStep,
    isLeftPaneOpen,
    setIsLeftPaneOpen,
    isSimpleMode,
    setIsSimpleMode,
    isSaving,
    setIsSaving,
    isLoading,
    setIsLoading,
    analyzedPhotos,
    setAnalyzedPhotos,
    suggestedActivities,
    setSuggestedActivities,
    wizardMapCenter,
    setWizardMapCenter,
    wizardMapZoom,
    setWizardMapZoom,
    isAutoAddToEditor,
    setIsAutoAddToEditor,
    activeDayIndex,
    setActiveDayIndex,
    highlightedEventId,
    setHighlightedEventId,
    usedTimelineIds,
    setUsedTimelineIds,
  };
}
