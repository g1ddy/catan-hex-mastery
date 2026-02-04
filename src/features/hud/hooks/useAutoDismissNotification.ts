import { useState, useEffect } from 'react';
import { GameEvent } from '../../../game/core/types';

export function useAutoDismissNotification(notification: GameEvent | null, isRolling: boolean) {
    const [visible, setVisible] = useState(false);
    const [displayNotification, setDisplayNotification] = useState<GameEvent | null>(notification);

    useEffect(() => {
        if (isRolling) {
            setVisible(true);
            return;
        }

        if (notification) {
            setDisplayNotification(notification);
            setVisible(true);

            // Auto-hide notification after 5s
            const timer = setTimeout(() => setVisible(false), 5000);
            return () => clearTimeout(timer);
        } else {
            // If no notification and not rolling, hide.
            setVisible(false);
        }
    }, [notification, isRolling]);

    return { visible, displayNotification };
}
