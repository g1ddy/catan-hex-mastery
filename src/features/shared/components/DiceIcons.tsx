import React from 'react';
import {
    Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Dices, LucideIcon
} from 'lucide-react';

interface DiceIconsProps {
    d1: number;
    d2: number;
    size?: number;
    className?: string;
    ariaLabel?: string;
}

const DICE_ICONS: Record<number, LucideIcon> = {
    1: Dice1,
    2: Dice2,
    3: Dice3,
    4: Dice4,
    5: Dice5,
    6: Dice6
};

export const DiceIcons: React.FC<DiceIconsProps> = ({
    d1,
    d2,
    size = 20,
    className = '',
    ariaLabel
}) => {
    // eslint-disable-next-line security/detect-object-injection
    const Die1Icon = DICE_ICONS[d1] || Dices;
    // eslint-disable-next-line security/detect-object-injection
    const Die2Icon = DICE_ICONS[d2] || Dices;

    return (
        <div
            className="flex gap-1"
            role="img"
            aria-label={ariaLabel || `Dice roll: ${d1} and ${d2}`}
        >
            <Die1Icon size={size} className={className} aria-hidden="true" />
            <Die2Icon size={size} className={className} aria-hidden="true" />
        </div>
    );
};
