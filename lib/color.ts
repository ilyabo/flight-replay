import * as d3color from 'd3-color';

const FALLBACK_COLOR_RGB: [number, number, number] = [0, 0, 0];

export function colorAsRgb(color: string): [number, number, number] {
  const col = d3color.color(color);
  if (!col) {
    console.warn('Invalid color: ', color);
    return FALLBACK_COLOR_RGB;
  }
  const rgbColor = col.rgb();
  return [Math.floor(rgbColor.r), Math.floor(rgbColor.g), Math.floor(rgbColor.b)];
}
