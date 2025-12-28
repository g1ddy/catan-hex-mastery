// Game Configuration

export const BOARD_CONFIG = {
  // HexGrid dimensions (used for aspect ratio calculations, not hard pixels)
  BASE_WIDTH: 100,
  BASE_HEIGHT: 100,

  // Layout spacing
  HEX_SIZE: { x: 8, y: 8 },
  HEX_SPACING: 1.01,
  HEX_ORIGIN: { x: 0, y: 0 },

  // ViewBox padding
  VIEWBOX_PADDING: 2,

  // Magic numbers moved from Board.tsx
  VERTEX_RADIUS: 3,
  EDGE_RADIUS: 2.5,
  GHOST_VERTEX_RADIUS: 1,
};

export const COLORS = {
  GHOST_VERTEX: 'white',
  GHOST_OPACITY: 0.3,
  EDGE_HIGHLIGHT: 'white',
  EDGE_HIGHLIGHT_OPACITY: 0.5,
};

export const GAME_CONFIG = {
  mode: 'local' as const,
};

export const BUILD_COSTS = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, wheat: 1, sheep: 1 },
  city: { wheat: 2, ore: 3 },
};
