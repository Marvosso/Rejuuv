import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { getProfileById, type ProfileId } from './intake-profiles';

export type IntakePayload = {
  body_area: string;
  specific_location: string;
  pain_type: string[];
  duration: string;
  trigger: string[];
  pain_level: number;
  movement_limitations: string[];
  notes?: string;
};

type ProfileContribution = {
  triggers: string[];
  movement_limitations: string[];
};

type State = {
  bodyArea: string | null;
  painLevel: number;
  profileId: ProfileId | null;
  aggravators: string[];
  movementLimitations: string[];
  profileContribution: ProfileContribution;
  specificLocation: string;
  painType: string[];
  duration: string;
  notes: string;
  /** Free-text line merged into API `trigger` on submit (e.g. step 4 "Other"). */
  customTriggerLine: string;
};

const emptyContribution = (): ProfileContribution => ({ triggers: [], movement_limitations: [] });

const initialState: State = {
  bodyArea: null,
  painLevel: 5,
  profileId: null,
  aggravators: [],
  movementLimitations: [],
  profileContribution: emptyContribution(),
  specificLocation: '',
  painType: [],
  duration: '',
  notes: '',
  customTriggerLine: '',
};

function stripContribution(
  contrib: ProfileContribution,
  triggers: string[],
  limitations: string[]
) {
  const tSet = new Set(contrib.triggers);
  const lSet = new Set(contrib.movement_limitations);
  return {
    triggers: triggers.filter((x) => !tSet.has(x)),
    limitations: limitations.filter((x) => !lSet.has(x)),
  };
}

type Action =
  | { type: 'reset' }
  | { type: 'setBodyArea'; bodyArea: string | null }
  | { type: 'setPainLevel'; painLevel: number }
  | { type: 'applyProfile'; profileId: ProfileId }
  | { type: 'toggleAggravator'; label: string }
  | { type: 'setNotes'; notes: string }
  | { type: 'setCustomTriggerLine'; line: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'reset':
      return { ...initialState };
    case 'setBodyArea':
      return { ...state, bodyArea: action.bodyArea };
    case 'setPainLevel':
      return { ...state, painLevel: action.painLevel };
    case 'setNotes':
      return { ...state, notes: action.notes };
    case 'setCustomTriggerLine':
      return { ...state, customTriggerLine: action.line };
    case 'toggleAggravator': {
      const has = state.aggravators.includes(action.label);
      return {
        ...state,
        aggravators: has
          ? state.aggravators.filter((x) => x !== action.label)
          : [...state.aggravators, action.label],
      };
    }
    case 'applyProfile': {
      const profile = getProfileById(action.profileId);
      const stripped = stripContribution(
        state.profileContribution,
        state.aggravators,
        state.movementLimitations
      );
      if (action.profileId === 'custom') {
        return {
          ...state,
          profileId: 'custom',
          aggravators: stripped.triggers,
          movementLimitations: stripped.limitations,
          profileContribution: emptyContribution(),
        };
      }
      const nextTriggers = new Set(stripped.triggers);
      profile.merge.trigger.forEach((t) => nextTriggers.add(t));
      const limSet = new Set(stripped.limitations);
      const nextLim = [...stripped.limitations];
      profile.merge.movement_limitations.forEach((l) => {
        if (!limSet.has(l)) {
          nextLim.push(l);
          limSet.add(l);
        }
      });
      return {
        ...state,
        profileId: action.profileId,
        aggravators: [...nextTriggers],
        movementLimitations: nextLim,
        profileContribution: {
          triggers: [...profile.merge.trigger],
          movement_limitations: [...profile.merge.movement_limitations],
        },
      };
    }
    default:
      return state;
  }
}

type IntakeWizardContextValue = {
  bodyArea: string | null;
  painLevel: number;
  profileId: ProfileId | null;
  aggravators: string[];
  movementLimitations: string[];
  specificLocation: string;
  painType: string[];
  duration: string;
  notes: string;
  customTriggerLine: string;
  setBodyArea: (v: string | null) => void;
  setPainLevel: (v: number) => void;
  applyProfile: (id: ProfileId) => void;
  toggleAggravator: (label: string) => void;
  setNotes: (v: string) => void;
  setCustomTriggerLine: (v: string) => void;
  resetWizard: () => void;
  buildIntakePayload: () => IntakePayload;
};

const IntakeWizardContext = createContext<IntakeWizardContextValue | null>(null);

export function IntakeWizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setBodyArea = useCallback((bodyArea: string | null) => {
    dispatch({ type: 'setBodyArea', bodyArea });
  }, []);

  const setPainLevel = useCallback((painLevel: number) => {
    dispatch({ type: 'setPainLevel', painLevel });
  }, []);

  const applyProfile = useCallback((profileId: ProfileId) => {
    dispatch({ type: 'applyProfile', profileId });
  }, []);

  const toggleAggravator = useCallback((label: string) => {
    dispatch({ type: 'toggleAggravator', label });
  }, []);

  const setNotes = useCallback((notes: string) => {
    dispatch({ type: 'setNotes', notes });
  }, []);

  const setCustomTriggerLine = useCallback((line: string) => {
    dispatch({ type: 'setCustomTriggerLine', line });
  }, []);

  const resetWizard = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  const buildIntakePayload = useCallback((): IntakePayload => {
    const extra = state.customTriggerLine.trim();
    const trigger = [...new Set([...state.aggravators, ...(extra ? [extra] : [])])];
    const movement_limitations = [...new Set([...state.movementLimitations])];
    const base: IntakePayload = {
      body_area: state.bodyArea ?? '',
      specific_location: state.specificLocation,
      pain_type: state.painType,
      duration: state.duration,
      trigger,
      pain_level: state.painLevel,
      movement_limitations,
    };
    if (state.notes.trim()) {
      base.notes = state.notes.trim();
    }
    return base;
  }, [state]);

  const value = useMemo<IntakeWizardContextValue>(
    () => ({
      bodyArea: state.bodyArea,
      painLevel: state.painLevel,
      profileId: state.profileId,
      aggravators: state.aggravators,
      movementLimitations: state.movementLimitations,
      specificLocation: state.specificLocation,
      painType: state.painType,
      duration: state.duration,
      notes: state.notes,
      customTriggerLine: state.customTriggerLine,
      setBodyArea,
      setPainLevel,
      applyProfile,
      toggleAggravator,
      setNotes,
      setCustomTriggerLine,
      resetWizard,
      buildIntakePayload,
    }),
    [
      state,
      setBodyArea,
      setPainLevel,
      applyProfile,
      toggleAggravator,
      setNotes,
      setCustomTriggerLine,
      resetWizard,
      buildIntakePayload,
    ]
  );

  return (
    <IntakeWizardContext.Provider value={value}>{children}</IntakeWizardContext.Provider>
  );
}

export function useIntakeWizard(): IntakeWizardContextValue {
  const ctx = useContext(IntakeWizardContext);
  if (!ctx) {
    throw new Error('useIntakeWizard must be used within IntakeWizardProvider');
  }
  return ctx;
}
