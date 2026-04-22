import { Resources } from '../../../game/core/types';
import { RESOURCE_META } from '../config/uiConfig';

export interface ResourceIconRowProps {
  resources: Partial<Resources> | Record<string, number>;
  size?: 'sm' | 'md';
  className?: string;
}

export function ResourceIconRow({ resources, size = 'sm', className = '' }: ResourceIconRowProps) {
  const iconSize = size === 'sm' ? 12 : 16;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  const r = resources as Record<string, number>;

  return (
    <div className={`flex items-center gap-2 ${textSize} ${className}`}>
        {RESOURCE_META.map(({ name, label, Icon, color }) => {
            // eslint-disable-next-line security/detect-object-injection -- 'name' is sourced from the static RESOURCE_META config
            const count = r[name] || 0;
            return (
                <span
                    key={name}
                    className="flex items-center gap-0.5"
                    data-tooltip-id="resource-tooltip"
                    data-tooltip-content={label}
                    aria-label={`${count} ${label}`}
                >
                    <Icon size={iconSize} className={color} aria-hidden="true" />
                    {count}
                </span>
            );
        })}
    </div>
  );
}
