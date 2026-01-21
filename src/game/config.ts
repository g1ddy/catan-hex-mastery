// Game Configuration

export const BOARD_CONFIG = {
  // HexGrid dimensions (used for aspect ratio calculations, not hard pixels)
  BASE_WIDTH: 74,
  BASE_HEIGHT: 68,

  // Layout spacing
  HEX_SIZE: { x: 8, y: 8 },
  HEX_SPACING: 1.01,
  HEX_ORIGIN: { x: 0, y: 0 },

  // ViewBox padding
  VIEWBOX_PADDING: 2,

  // Magic numbers moved from Board.tsx
  VERTEX_RADIUS: 3,
  EDGE_RADIUS: 2.5,
  GHOST_VERTEX_RADIUS: 2,
};

// Calculate static viewBox centered on the board
const totalWidth = BOARD_CONFIG.BASE_WIDTH + (BOARD_CONFIG.VIEWBOX_PADDING * 2);
const totalHeight = BOARD_CONFIG.BASE_HEIGHT + (BOARD_CONFIG.VIEWBOX_PADDING * 2);
export const BOARD_VIEWBOX = `${-totalWidth / 2} ${-totalHeight / 2} ${totalWidth} ${totalHeight}`;

export const COLORS = {
  GHOST_VERTEX: 'white',
  GHOST_OPACITY: 0.3,
  EDGE_HIGHLIGHT: 'white',
  EDGE_HIGHLIGHT_OPACITY: 0.5,
};

export const GAME_CONFIG = {
  mode: 'local' as const,
};
