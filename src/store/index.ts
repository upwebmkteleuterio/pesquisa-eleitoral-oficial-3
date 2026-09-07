import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  lastScrollPosition: Record<string, number>;
  setScrollPosition: (path: string, pos: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      lastScrollPosition: {},
      setScrollPosition: (path, pos) => 
        set((state) => ({ 
          lastScrollPosition: { ...state.lastScrollPosition, [path]: pos } 
        })),
    }),
    {
      name: 'electoral-ui-storage',
    }
  )
);

interface CollectionProgress {
  surveyId: string;
  step: number;
  respondentData: {
    nome: string;
    bairro: string;
    telefone: string;
    sexo: string;
    faixa_etaria: string;
    renda: string;
    escolaridade: string;
    religiao: string;
    estado_civil: string;
    observacoes: string;
  };
  dynamicAnswers: Record<string, any>;
}

interface CollectionState {
  currentCollection: CollectionProgress | null;
  startCollection: (surveyId: string) => void;
  updateRespondentData: (data: Partial<CollectionProgress['respondentData']>) => void;
  updateDynamicAnswer: (questionId: string, answer: any) => void;
  clearCollection: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const initialRespondentData = {
  nome: '',
  bairro: '',
  telefone: '',
  sexo: '',
  faixa_etaria: '',
  renda: '',
  escolaridade: '',
  religiao: '',
  estado_civil: '',
  observacoes: '',
};

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set) => ({
      currentCollection: null,
      startCollection: (surveyId) => set({ 
        currentCollection: { 
          surveyId, 
          step: 1, 
          respondentData: { ...initialRespondentData },
          dynamicAnswers: {} 
        } 
      }),
      updateRespondentData: (data) => set((state) => ({
        currentCollection: state.currentCollection 
          ? { ...state.currentCollection, respondentData: { ...state.currentCollection.respondentData, ...data } }
          : null
      })),
      updateDynamicAnswer: (id, val) => set((state) => ({
        currentCollection: state.currentCollection 
          ? { ...state.currentCollection, dynamicAnswers: { ...state.currentCollection.dynamicAnswers, [id]: val } }
          : null
      })),
      clearCollection: () => set({ currentCollection: null }),
      nextStep: () => set((state) => ({
        currentCollection: state.currentCollection 
          ? { ...state.currentCollection, step: state.currentCollection.step + 1 }
          : null
      })),
      prevStep: () => set((state) => ({
        currentCollection: state.currentCollection 
          ? { ...state.currentCollection, step: Math.max(1, state.currentCollection.step - 1) }
          : null
      })),
    }),
    {
      name: 'electoral-collection-progress',
    }
  )
);
