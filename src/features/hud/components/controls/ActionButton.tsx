import React from 'react';

interface ActionButtonProps extends React.ComponentProps<'button'> {
    label?: string;
}

export function ActionButton({
    onClick,
    className,
    label = "Begin Placement",
    disabled,
    ...props
}: ActionButtonProps) {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled) {
            e.preventDefault();
            return;
        }
        if (onClick) {
            onClick(e);
        }
    };

    return (
        <button
            onClick={handleClick}
            className={className}
            aria-disabled={disabled ? "true" : undefined}
            {...props}
        >
            <span className="text-base font-bold">{label}</span>
        </button>
    );
}
