import { Ctx } from 'boardgame.io';
import { GameState } from '../core/types';
import { Coach } from './coach';

export const CoachPlugin = {
    name: 'coach',
    api: ({ G }: { G: GameState, ctx: Ctx }) => {
        return new Coach(G);
    }
};
