import AnalystPanel, { AnalystPanelProps } from './components/AnalystPanel';
import { CoachPanel, CoachPanelProps } from './components/CoachPanel';

export const CoachLayer = {
    Analyst: AnalystPanel,
    Coach: CoachPanel
};

export type { AnalystPanelProps, CoachPanelProps };
