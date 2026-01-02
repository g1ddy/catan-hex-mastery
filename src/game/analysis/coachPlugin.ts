import { Ctx } from 'boardgame.io';
import { GameState } from '../types';
import { Coach, CoachRecommendation } from './coach';

export const CoachPlugin = {
  name: 'coach',

  // No setup property -> Stateless Plugin

  api: ({ G }: { ctx: Ctx; G: GameState; playerID?: string }) => {
    // Instantiate transiently
    const coach = new Coach(G);

    return {
      getAdvice: (playerID: string): CoachRecommendation[] => {
        return coach.getAdvice(playerID);
      },

      evaluate: (playerID: string, vertexId?: string): CoachRecommendation | undefined => {
          // If vertexId is provided, find its specific score
          // Note: This is slightly inefficient as it recalculates all, but fine for now.
          // Optimization can be added to Coach class later.
          if (vertexId) {
              const all = coach.getAllSettlementScores(playerID);
              return all.find(r => r.vertexId === vertexId);
          }
          return undefined;
      }
    };
  },
};
