import { Trees, BrickWall, Cloud, Wheat, Mountain, MapPin, Home, Castle, LucideIcon } from 'lucide-react';
import { TerrainType } from '../../../game/core/types';

export interface ResourceMeta {
  name: 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';
  label: string;
  Icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const RESOURCE_META: ResourceMeta[] = [
  { name: 'wood', label: 'Wood', Icon: Trees, color: 'text-green-500', bgColor: 'bg-green-500' },
  { name: 'brick', label: 'Brick', Icon: BrickWall, color: 'text-orange-500', bgColor: 'bg-orange-500' },
  { name: 'sheep', label: 'Sheep', Icon: Cloud, color: 'text-slate-300', bgColor: 'bg-slate-300' },
  { name: 'wheat', label: 'Wheat', Icon: Wheat, color: 'text-yellow-500', bgColor: 'bg-yellow-500' },
  { name: 'ore', label: 'Ore', Icon: Mountain, color: 'text-gray-400', bgColor: 'bg-gray-400' },
];

export interface BuildButtonConfig {
  type: 'road' | 'settlement' | 'city';
  label: string;
  Icon: LucideIcon;
  ariaPrefix: string;
}

export const BUILD_BUTTON_CONFIG: BuildButtonConfig[] = [
  { type: 'road', label: 'Road', Icon: MapPin, ariaPrefix: 'Build Road' },
  { type: 'settlement', label: 'Settlement', Icon: Home, ariaPrefix: 'Build Settlement' },
  { type: 'city', label: 'City', Icon: Castle, ariaPrefix: 'Build City' },
];

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.Forest]: '#228B22',
  [TerrainType.Hills]: '#CD5C5C',
  [TerrainType.Pasture]: '#90EE90',
  [TerrainType.Fields]: '#FFD700',
  [TerrainType.Mountains]: '#A9A9A9',
  [TerrainType.Desert]: '#F4A460',
  [TerrainType.Sea]: '#87CEEB'
};

// Port Highlight Configuration
export const PORT_HIGHLIGHT_RADIUS = 3.5;
export const PORT_HIGHLIGHT_COLOR = "#FBBF24"; // Amber-400
export const PORT_HIGHLIGHT_WIDTH = 0.8;
