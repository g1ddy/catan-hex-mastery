import React from 'react';
import { Resources } from '../game/types';
import { RESOURCE_META } from './uiConfig';

interface ResourceIconRowProps {
  resources: Partial<Resources> | Record<string, number>;
  size?: 'sm' | 'md';
  className?: string;
}

export const ResourceIconRow: React.FC<ResourceIconRowProps> = ({ resources, size = 'sm', className = '' }) => {
  const iconSize = size === 'sm' ? 12 : 16;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  const r = resources as Record<string, number>;

  return (
    <div className={`flex items-center gap-2 ${textSize} ${className}`}>
        {RESOURCE_META.map(({ name, label, Icon, color }) => (
            <span key={name} className="flex items-center gap-0.5" data-tooltip-id="resource-tooltip" data-tooltip-content={label}>
                <Icon size={iconSize} className={color} />
                {r[name] || 0}
            </span>
        ))}
    </div>
  );
};
