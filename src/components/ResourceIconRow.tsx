import React from 'react';
import { Trees, BrickWall, Wheat, Mountain, Cloud } from 'lucide-react';
import { Resources } from '../game/types';

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
        <span className="flex items-center gap-0.5" data-tooltip-id="resource-tooltip" data-tooltip-content="Wood"><Trees size={iconSize} className="text-green-500" />{r.wood || 0}</span>
        <span className="flex items-center gap-0.5" data-tooltip-id="resource-tooltip" data-tooltip-content="Brick"><BrickWall size={iconSize} className="text-orange-700" />{r.brick || 0}</span>
        <span className="flex items-center gap-0.5" data-tooltip-id="resource-tooltip" data-tooltip-content="Sheep"><Cloud size={iconSize} className="text-slate-300" />{r.sheep || 0}</span>
        <span className="flex items-center gap-0.5" data-tooltip-id="resource-tooltip" data-tooltip-content="Wheat"><Wheat size={iconSize} className="text-yellow-500" />{r.wheat || 0}</span>
        <span className="flex items-center gap-0.5" data-tooltip-id="resource-tooltip" data-tooltip-content="Ore"><Mountain size={iconSize} className="text-gray-400" />{r.ore || 0}</span>
    </div>
  );
};
