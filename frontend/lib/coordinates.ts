export type Box = { x: number; y: number; width: number; height: number };

export function screenToPdfCoords(box: Box, scale: number): Box {
  return {
    x: box.x / scale,
    y: box.y / scale,
    width: box.width / scale,
    height: box.height / scale
  };
}

export function pdfToScreenCoords(box: Box, scale: number): Box {
  return {
    x: box.x * scale,
    y: box.y * scale,
    width: box.width * scale,
    height: box.height * scale
  };
}
