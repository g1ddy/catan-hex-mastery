import { Trees, BrickWall, Cloud, Wheat, Mountain, MapPin, Home, Castle, LucideIcon } from 'lucide-react';

export interface ResourceMeta {
  name: 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';
  label: string;
  Icon: LucideIcon;
  color: string;
}

export const RESOURCE_META: ResourceMeta[] = [
  { name: 'wood', label: 'Wood', Icon: Trees, color: 'text-green-500' },
  { name: 'brick', label: 'Brick', Icon: BrickWall, color: 'text-orange-500' },
  { name: 'sheep', label: 'Sheep', Icon: Cloud, color: 'text-slate-300' },
  { name: 'wheat', label: 'Wheat', Icon: Wheat, color: 'text-yellow-500' },
  { name: 'ore', label: 'Ore', Icon: Mountain, color: 'text-gray-400' },
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

export const PLAYER_COLORS = [
  '#E53935', // Red
  '#1E88E5', // Blue
  '#FB8C00', // Orange
  '#FDD835', // White/Yellow
  '#8E24AA', // Purple
  '#43A047', // Green
];
