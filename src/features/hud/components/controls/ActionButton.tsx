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
    return (
        <button
            onClick={onClick}
            className={className}
            disabled={disabled}
            {...props}
        >
            <span className="text-base font-bold">{label}</span>
        </button>
    );
}
