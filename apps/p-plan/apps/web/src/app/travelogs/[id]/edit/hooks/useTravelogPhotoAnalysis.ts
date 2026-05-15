'use client';

import { useCallback } from 'react';
import ExifReader from 'exifreader';
import loadImage from 'blueimp-load-image';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

interface UseTravelogPhotoAnalysisProps {
  setAnalyzedPhotos: (updater: any) => void;
  setSuggestedActivities: (updater: any) => void;
  setWizardMapCenter: (center: any) => void;
}

export function useTravelogPhotoAnalysis({
  setAnalyzedPhotos,
  setSuggestedActivities,
  setWizardMapCenter,
}: UseTravelogPhotoAnalysisProps) {
  
  const processPhotos = useCallback(async (files: FileList) => {
    const newPhotos: any[] = [];
    const loadingToast = toast.loading('Memories are being processed...', {
      description: 'Analyzing time and location data...'
    });

    try {
      for (const file of Array.from(files)) {
        const url = URL.createObjectURL(file);
        const tags = await ExifReader.load(file);
        
        let lat, lng, timestamp;
        
        if (tags['GPSLatitude'] && tags['GPSLongitude']) {
          lat = (tags['GPSLatitude'].description as any);
          lng = (tags['GPSLongitude'].description as any);
          
          if (typeof lat === 'number' && typeof lng === 'number') {
            // OK
          } else {
            const latRef = (tags['GPSLatitudeRef'] as any)?.value?.[0];
            const lngRef = (tags['GPSLongitudeRef'] as any)?.value?.[0];
            lat = parseGPS(tags['GPSLatitude'].value as any, latRef);
            lng = parseGPS(tags['GPSLongitude'].value as any, lngRef);
          }
        }

        if (tags['DateTimeOriginal']) {
          const dateStr = tags['DateTimeOriginal'].description as string;
          const [datePart, timePart] = dateStr.split(' ');
          timestamp = new Date(`${datePart.replace(/:/g, '-')}T${timePart}`).toISOString();
        }

        newPhotos.push({
          id: uuidv4(),
          url,
          file,
          lat,
          lng,
          timestamp: timestamp || new Date().toISOString(),
          isUsed: false,
          isSkipped: false
        });
      }

      newPhotos.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setAnalyzedPhotos((prev: any[]) => [...prev, ...newPhotos]);

      // 활동 제안 로직 (단순화: 2시간 이상 간격이나 장소 변화 기준)
      const suggestions: any[] = [];
      let currentActivityPhotos: any[] = [];
      
      newPhotos.forEach((photo, idx) => {
        if (idx === 0) {
          currentActivityPhotos.push(photo);
          return;
        }

        const prevPhoto = newPhotos[idx - 1];
        const timeDiff = new Date(photo.timestamp).getTime() - new Date(prevPhoto.timestamp).getTime();
        const distDiff = (photo.lat && prevPhoto.lat) ? Math.sqrt(Math.pow(photo.lat - prevPhoto.lat, 2) + Math.pow(photo.lng - prevPhoto.lng, 2)) : 0;

        if (timeDiff > 2 * 60 * 60 * 1000 || distDiff > 0.005) {
          if (currentActivityPhotos.length > 0) {
            suggestions.push(createActivityFromPhotos(currentActivityPhotos));
          }
          currentActivityPhotos = [photo];
        } else {
          currentActivityPhotos.push(photo);
        }
      });

      if (currentActivityPhotos.length > 0) {
        suggestions.push(createActivityFromPhotos(currentActivityPhotos));
      }

      setSuggestedActivities((prev: any[]) => [...prev, ...suggestions]);
      
      if (newPhotos[0]?.lat) {
        setWizardMapCenter({ lat: newPhotos[0].lat, lng: newPhotos[0].lng });
      }

      toast.success(`${newPhotos.length}개의 사진이 분석되었습니다.`, { id: loadingToast });
    } catch (error) {
      console.error('Photo process error:', error);
      toast.error('사진 분석 중 오류가 발생했습니다.', { id: loadingToast });
    }
  }, [setAnalyzedPhotos, setSuggestedActivities, setWizardMapCenter]);

  const onPhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processPhotos(e.target.files);
    }
  }, [processPhotos]);

  return { onPhotoUpload, processPhotos };
}

// Helper functions
function parseGPS(values: any[], ref: string) {
  if (!values || values.length < 3) return null;
  let res = values[0] + values[1] / 60 + values[2] / 3600;
  if (ref === 'S' || ref === 'W') res = -res;
  return res;
}

function createActivityFromPhotos(photos: any[]) {
  const first = photos[0];
  const last = photos[photos.length - 1];
  return {
    id: uuidv4(),
    title: '새로운 활동',
    startTime: format(new Date(first.timestamp), 'HH:mm'),
    endTime: format(new Date(last.timestamp), 'HH:mm'),
    lat: first.lat,
    lng: first.lng,
    photos: photos.map(p => ({ id: p.id, url: p.url }))
  };
}
