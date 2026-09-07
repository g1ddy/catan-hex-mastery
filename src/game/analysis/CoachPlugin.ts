import { GameContext } from '../../game/core/types';
import { GameState } from '../core/types';
import { Coach } from './coach';

export const CoachPlugin = {
    name: 'coach',
    api: ({ G }: { G: GameState, ctx: GameContext }) => {
        return new Coach(G);
    }
};
