import { useState, useEffect } from 'react';
import { BOARD_CONFIG } from '../game/config';

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useResponsiveViewBox() {
  const [viewBox, setViewBox] = useState<string>('-50 -50 100 100');

  useEffect(() => {
    const calculateViewBox = () => {
      const { BASE_WIDTH, BASE_HEIGHT, VIEWBOX_PADDING } = BOARD_CONFIG;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const screenAspectRatio = windowWidth / windowHeight;
      const boardAspectRatio = BASE_WIDTH / BASE_HEIGHT;

      let newViewBox: ViewBox;

      // Logic: Ensure the entire board fits within the viewport.
      // If the screen is taller (lower AR) than the board, we are width-constrained.
      // If the screen is wider (higher AR) than the board, we are height-constrained.

      if (screenAspectRatio < boardAspectRatio) {
        // Width constrained (Portrait mobile, etc)
        // We need to match the board width to the screen width.
        // The viewBox width is fixed to BASE_WIDTH (+ padding).
        // The viewBox height needs to expand to maintain aspect ratio.
        // height = width / screenAR
        const width = BASE_WIDTH + (VIEWBOX_PADDING * 2);
        const height = width / screenAspectRatio;

        newViewBox = {
            x: -50 - VIEWBOX_PADDING, // Centered X
            y: -50 - ((height - BASE_HEIGHT) / 2), // Centered Y based on new height
            width: width,
            height: height
        };
      } else {
        // Height constrained (Landscape desktop, etc)
        // We need to match the board height to the screen height.
        // height = BASE_HEIGHT (+ padding)
        // width = height * screenAR
        const height = BASE_HEIGHT + (VIEWBOX_PADDING * 2);
        const width = height * screenAspectRatio;

        newViewBox = {
            x: -50 - ((width - BASE_WIDTH) / 2),
            y: -50 - VIEWBOX_PADDING,
            width: width,
            height: height
        };
      }

      setViewBox(`${newViewBox.x} ${newViewBox.y} ${newViewBox.width} ${newViewBox.height}`);
    };

    calculateViewBox();
    window.addEventListener('resize', calculateViewBox);
    return () => window.removeEventListener('resize', calculateViewBox);
  }, []);

  return viewBox;
}
