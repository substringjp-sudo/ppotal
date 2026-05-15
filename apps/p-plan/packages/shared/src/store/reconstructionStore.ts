import { create } from 'zustand';
import { RawDataPoint } from './reconstruction-utils';

interface ReconstructionState {
  sourceData: RawDataPoint[];
  title: string;
  startDate: string;
  endDate: string;
  
  setData: (data: { sourceData: RawDataPoint[], title: string, startDate: string, endDate: string }) => void;
  clear: () => void;
}

export const useReconstructionStore = create<ReconstructionState>((set) => ({
  sourceData: [],
  title: '',
  startDate: '',
  endDate: '',
  
  setData: (data) => set(data),
  clear: () => set({ sourceData: [], title: '', startDate: '', endDate: '' }),
}));
