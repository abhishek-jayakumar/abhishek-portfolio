/**
 * 50 columns x 20 rows of dots: 50 seats, 20 enquiries for each, the real
 * ratio from the CSCP campaign. One <path> with round line caps, so a
 * thousand dots are one DOM node.
 */
export const DOT_COLS = 50;
export const DOT_ROWS = 20;

export function dotsPath(rows: number, startRow = 0): string {
  let d = "";
  for (let r = 0; r < rows; r++) {
    d += `M5 ${(startRow + r) * 10 + 5}`;
    for (let c = 0; c < DOT_COLS; c++) {
      d += "h0";
      if (c < DOT_COLS - 1) d += "m10 0";
    }
  }
  return d;
}
