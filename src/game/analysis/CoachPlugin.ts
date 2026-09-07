import { GameState } from '../core/types';
import { Coach } from './coach';

export const CoachPlugin = {
    name: 'coach',
    api: ({ G }: { G: GameState }) => {
        return new Coach(G);
    }
};
