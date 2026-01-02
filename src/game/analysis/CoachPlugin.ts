import { Ctx } from 'boardgame.io';
import { GameState } from '../types';
import { Coach } from './coach';

export const CoachPlugin = {
    name: 'coach',
    api: ({ G, ctx }: { G: GameState, ctx: Ctx }) => {
        return new Coach(G, ctx);
    }
};
