import { Ctx } from 'boardgame.io';
import { UiMode, BuildMode } from '../../shared/types';
import { PHASES, STAGES } from '../../../game/core/constants';
import { LOSE_EMOJIS, getRandomEmoji } from '../components/constants/emojis';

export interface CustomMessage {
    text: string;
    type: 'success' | 'info' | 'error';
}

export interface StatusMessage {
    message: string;
    colorClass: string;
}

export const getCustomMessage = (customMessage: CustomMessage): StatusMessage => {
    let colorClass = "text-amber-400";
    switch (customMessage.type) {
        case 'success':
            colorClass = "text-green-400";
            break;
        case 'error':
            colorClass = "text-red-400";
            break;
        case 'info':
        default:
            colorClass = "text-amber-400";
            break;
    }
    return { message: customMessage.text, colorClass };
};

export const getGameOverMessage = (
    ctx: Ctx,
    playerID: string | null,
    emoji: string | null
): StatusMessage | null => {
    if (!ctx.gameover) return null;

    if (ctx.gameover.draw) {
        return {
            message: `Draw! ${emoji || ''}`,
            colorClass: "text-slate-200"
        };
    }
    if (ctx.gameover.winner) {
        if (ctx.gameover.winner === playerID) {
            return {
                message: `You Win!!! ${emoji || ''}`,
                colorClass: "text-amber-400 animate-pulse motion-reduce:animate-none"
            };
        } else {
            return {
                message: `You Lose ${emoji || ''}`,
                colorClass: "text-red-400"
            };
        }
    }
    return { message: "Game Over", colorClass: "text-slate-200" };
};

export const getSetupMessage = (
    ctx: Ctx,
    activeStage: string | undefined,
    uiMode: UiMode
): StatusMessage | null => {
     if (ctx.phase !== PHASES.SETUP) return null;

     const setupInstructions: Record<string, string> = {
        [STAGES.PLACE_SETTLEMENT]: "Place Settlement",
        [STAGES.PLACE_ROAD]: "Place Road",
    };

    if (activeStage && setupInstructions[activeStage]) {
        const message = uiMode === 'placing' ? setupInstructions[activeStage] : "Start Placement";
        return { message, colorClass: "text-amber-400" };
    }
    return { message: "Waiting...", colorClass: "text-amber-400" };
}

export const getGameplayMessage = (
    ctx: Ctx,
    activeStage: string | undefined,
    buildMode: BuildMode
): StatusMessage | null => {
    if (ctx.phase !== PHASES.GAMEPLAY) return null;

    if (activeStage === STAGES.ROLLING) {
        return { message: "Roll Dice", colorClass: "text-amber-400" };
    }

    if (activeStage === STAGES.ACTING) {
        const buildModeInstructions: Record<string, string> = {
            road: "Place Road",
            settlement: "Place Settlement",
            city: "Build City",
        };
        const message = (buildMode && buildModeInstructions[buildMode]) || "Your Turn";
        return { message, colorClass: "text-amber-400" };
    }

    if (activeStage === STAGES.ROBBER) {
        return {
            message: `Robber! ${getRandomEmoji(LOSE_EMOJIS)}`,
            colorClass: "text-red-400 font-bold animate-bounce"
        };
    }

    return { message: "Waiting...", colorClass: "text-amber-400" };
}
