import { BOARD_CONFIG } from '../game/config';

export function useResponsiveViewBox() {
  const { BASE_WIDTH, BASE_HEIGHT, VIEWBOX_PADDING } = BOARD_CONFIG;
  const width = BASE_WIDTH + (VIEWBOX_PADDING * 2);
  const height = BASE_HEIGHT + (VIEWBOX_PADDING * 2);
  const x = -width / 2;
  const y = -height / 2;
  return `${x} ${y} ${width} ${height}`;
}
