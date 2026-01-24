import React from 'react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
    onClick,
    className,
    label = "Begin Placement",
    disabled,
    ...props
}) => (
    <button
        onClick={onClick}
        className={className}
        disabled={disabled}
        {...props}
    >
        <span className={className?.includes('text-lg') ? "text-lg font-bold" : "text-base font-bold"}>{label}</span>
    </button>
);
