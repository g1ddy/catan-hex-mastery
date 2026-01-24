/**
 * Z-index values for the application.
 *
 * This file centralizes all z-index values to ensure consistency and prevent stacking context issues.
 * Higher values are placed on top of lower values.
 */

// The highest z-index, reserved for tooltips to ensure they appear above all other content.
export const Z_INDEX_TOOLTIP = 9999;

// Z-index for overlay panels (like mobile drawers) to ensure they appear above the board.
export const Z_INDEX_OVERLAY_PANEL = 200;

// Z-index for floating UI elements like buttons and panels that sit above the main content.
export const Z_INDEX_FLOATING_UI = 100;

// Z-index for the container of the main game controls on desktop.
export const Z_INDEX_GAME_CONTROLS_CONTAINER = 20;

// Z-index for the container of the player panel on mobile.
export const Z_INDEX_PLAYER_PANEL_CONTAINER_MOBILE = 10;

// The base z-index for the game board, which sits behind all UI elements.
export const Z_INDEX_BOARD = 0;
