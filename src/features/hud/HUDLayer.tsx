import { GameControls, GameControlsProps } from './components/GameControls';
import { GameStatusBanner, GameStatusBannerProps } from './components/GameStatusBanner';
import { PlayerPanel, PlayerPanelProps } from './components/PlayerPanel';
import { GameNotification, GameNotificationProps } from './components/GameNotification';

export const HUDLayer = {
    Controls: GameControls,
    Banner: GameStatusBanner,
    PlayerPanel: PlayerPanel,
    Notification: GameNotification
};

export type { GameControlsProps, GameStatusBannerProps, PlayerPanelProps, GameNotificationProps };
