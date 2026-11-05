// AOMG 3D 공연장 (원본 AOMG-Crowd v48, id만 crowd- 접두어로)
(() => {
  const cell = document.createElement('canvas');
  cell.width = cell.height = 42;
  const context = cell.getContext('2d');
  if (!context) return;

  // A centered dot and four shared corner dots form a 45-degree screen.
  // Distance becomes the threshold against which the scene luminance is printed.
  const texture = context.createImageData(cell.width, cell.height);
  for (let y = 0; y < cell.height; y++) {
    for (let x = 0; x < cell.width; x++) {
      const u = (x + .5) / cell.width;
      const v = (y + .5) / cell.height;
      const center = (u - .5) ** 2 + (v - .5) ** 2;
      const corner = Math.min(u, 1 - u) ** 2 + Math.min(v, 1 - v) ** 2;
      const threshold = .07 + 2.64 * Math.min(center, corner);
      texture.data[(y * cell.width + x) * 4 + 3] = Math.round(threshold * 255);
    }
  }
  context.putImageData(texture, 0, 0);
  const threshold = cell.toDataURL();
  document.getElementById('crowd-print-cell').setAttribute('href', threshold);
  document.getElementById('crowd-face-print-cell').setAttribute('href', threshold);
  document.getElementById('crowd-picture').classList.add('printed');
})();
