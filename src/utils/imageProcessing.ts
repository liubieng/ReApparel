/**
 * Client-Side Background Removal & Image Processing Utility
 * Processes clothing item images to isolate garment silhouettes
 * onto transparent backgrounds prior to storage upload.
 */

export interface RemovalOptions {
  tolerance?: number; // 10 to 110 (default ~48)
  feather?: number; // 0 to 5 (default ~1.5)
  targetBgColor?: { r: number; g: number; b: number } | null; // sampled background
  removeShadows?: boolean; // aggressive cast shadow elimination
  protectCenter?: boolean; // ensure center garment subject remains intact
}

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Calculates human-eye weighted perceptual color distance (Redmean metric).
 * Returns a normalized value roughly between 0 (identical) and 255 (opposite).
 */
export function perceptualColorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  const rmean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const dist = Math.sqrt(
    (2 + rmean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rmean) / 256) * db * db
  );
  return dist / 3;
}

/**
 * Samples perimeter pixels around the outer borders of the image
 * and clusters them to find the dominant background colors and lighting variations.
 */
function extractBackgroundPalette(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  explicitTarget?: ColorRGB | null
): ColorRGB[] {
  const clusters: ColorRGB[] = [];

  if (explicitTarget) {
    clusters.push({ ...explicitTarget });
  }

  const samplePoints: ColorRGB[] = [];

  // 1. Sample along top and bottom edges (step every ~5%)
  const stepX = Math.max(1, Math.floor(width / 24));
  for (let x = 0; x < width; x += stepX) {
    // Top row
    const topIdx = x * 4;
    samplePoints.push({ r: data[topIdx], g: data[topIdx + 1], b: data[topIdx + 2] });

    // Bottom row
    const botIdx = ((height - 1) * width + x) * 4;
    samplePoints.push({ r: data[botIdx], g: data[botIdx + 1], b: data[botIdx + 2] });
  }

  // 2. Sample along left and right edges
  const stepY = Math.max(1, Math.floor(height / 24));
  for (let y = 0; y < height; y += stepY) {
    // Left edge
    const leftIdx = (y * width) * 4;
    samplePoints.push({ r: data[leftIdx], g: data[leftIdx + 1], b: data[leftIdx + 2] });

    // Right edge
    const rightIdx = (y * width + (width - 1)) * 4;
    samplePoints.push({ r: data[rightIdx], g: data[rightIdx + 1], b: data[rightIdx + 2] });
  }

  // 3. Cluster samples to find up to 5 dominant background shades
  for (const pt of samplePoints) {
    let matched = false;
    for (const c of clusters) {
      if (perceptualColorDistance(pt.r, pt.g, pt.b, c.r, c.g, c.b) < 18) {
        matched = true;
        break;
      }
    }
    if (!matched && clusters.length < 6) {
      clusters.push(pt);
    }
  }

  // Fallback if no clusters found
  if (clusters.length === 0) {
    clusters.push({ r: 255, g: 255, b: 255 });
  }

  return clusters;
}

/**
 * Automatically isolates clothing from backgrounds using:
 * 1. Perimeter flood-fill (BFS) to preserve inner buttons/patterns/garment graphics
 * 2. Perceptual color matching for accurate fabric contour separation
 * 3. Cast shadow elimination (attenuating floor & wall shadows)
 * 4. Anti-aliased boundary feathering
 */
export async function removeBackgroundClientSide(
  imageSource: string | HTMLImageElement,
  options: RemovalOptions = {}
): Promise<{ dataUrl: string; blob: Blob; sampledBg?: ColorRGB }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        // Target standard crisp garment silhouette dimensions (max 480px for memory & quota efficiency)
        let width = img.width;
        let height = img.height;
        const maxDim = 480;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const totalPixels = width * height;

        const tolerance = options.tolerance ?? 48;
        const feather = options.feather ?? 1.5;
        const removeShadows = options.removeShadows ?? true;

        // Extract background palette from perimeter samples
        const bgClusters = extractBackgroundPalette(data, width, height, options.targetBgColor);
        const primaryBg = bgClusters[0];

        // 0 = unvisited, 1 = background (transparent), 2 = garment contour
        const visited = new Uint8Array(totalPixels);
        const queue = new Int32Array(totalPixels);
        let head = 0;
        let tail = 0;

        // Seed boundary pixels along all 4 outer borders
        for (let x = 0; x < width; x++) {
          const topIdx = x;
          const botIdx = (height - 1) * width + x;
          if (visited[topIdx] === 0) {
            visited[topIdx] = 1;
            queue[tail++] = topIdx;
          }
          if (visited[botIdx] === 0) {
            visited[botIdx] = 1;
            queue[tail++] = botIdx;
          }
        }

        for (let y = 1; y < height - 1; y++) {
          const leftIdx = y * width;
          const rightIdx = y * width + (width - 1);
          if (visited[leftIdx] === 0) {
            visited[leftIdx] = 1;
            queue[tail++] = leftIdx;
          }
          if (visited[rightIdx] === 0) {
            visited[rightIdx] = 1;
            queue[tail++] = rightIdx;
          }
        }

        // Breadth-First-Search flood-fill from border inward
        while (head < tail) {
          const idx = queue[head++];
          const px = idx % width;
          const py = (idx / width) | 0;

          const curR = data[idx * 4];
          const curG = data[idx * 4 + 1];
          const curB = data[idx * 4 + 2];

          // 4-connected neighbors
          const up = py > 0 ? idx - width : -1;
          const down = py < height - 1 ? idx + width : -1;
          const left = px > 0 ? idx - 1 : -1;
          const right = px < width - 1 ? idx + 1 : -1;

          const neighbors = [up, down, left, right];

          for (let n = 0; n < 4; n++) {
            const nIdx = neighbors[n];
            if (nIdx === -1 || visited[nIdx] !== 0) continue;

            const nR = data[nIdx * 4];
            const nG = data[nIdx * 4 + 1];
            const nB = data[nIdx * 4 + 2];

            let isBg = false;

            // 1. Direct cluster match
            for (let c = 0; c < bgClusters.length; c++) {
              const cluster = bgClusters[c];
              const dist = perceptualColorDistance(nR, nG, nB, cluster.r, cluster.g, cluster.b);
              if (dist <= tolerance) {
                isBg = true;
                break;
              }

              // 2. Cast shadow detection (similar chromaticity ratio, darker luminance)
              if (removeShadows && nR <= cluster.r + 20 && nG <= cluster.g + 20 && nB <= cluster.b + 20) {
                const sumN = nR + nG + nB;
                const sumC = cluster.r + cluster.g + cluster.b;
                if (sumN > 30 && sumC > 30) {
                  const chrDist =
                    Math.abs(nR / sumN - cluster.r / sumC) +
                    Math.abs(nG / sumN - cluster.g / sumC) +
                    Math.abs(nB / sumN - cluster.b / sumC);
                  if (chrDist < 0.12 && dist <= tolerance * 1.55) {
                    isBg = true;
                    break;
                  }
                }
              }
            }

            if (isBg) {
              visited[nIdx] = 1;
              queue[tail++] = nIdx;
            } else {
              visited[nIdx] = 2; // Garment contour boundary reached
            }
          }
        }

        // Apply Transparency to confirmed background pixels
        for (let i = 0; i < totalPixels; i++) {
          if (visited[i] === 1) {
            data[i * 4 + 3] = 0;
          }
        }

        // Verify how many visible pixels remain
        let visiblePixels = 0;
        for (let i = 0; i < totalPixels; i++) {
          if (data[i * 4 + 3] > 30) {
            visiblePixels++;
          }
        }

        const visibleRatio = visiblePixels / totalPixels;
        // Critical safeguard: if background removal erased the subject (< 10% visible pixels),
        // abort transparency and preserve the original uploaded image!
        if (visibleRatio < 0.10) {
          const rawUrl = typeof imageSource === 'string' ? imageSource : img.src;
          return resolve({ dataUrl: rawUrl, blob: new Blob(), sampledBg: primaryBg });
        }

        // Anti-aliased Edge Feathering to eliminate jagged fringes
        if (feather > 0) {
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const idx = y * width + x;
              if (visited[idx] === 2) {
                let bgCount = 0;
                if (visited[idx - 1] === 1) bgCount++;
                if (visited[idx + 1] === 1) bgCount++;
                if (visited[idx - width] === 1) bgCount++;
                if (visited[idx + width] === 1) bgCount++;

                if (bgCount > 0) {
                  // Blend edge pixel smoothly
                  const alphaFactor = 1 - (bgCount / 4) * (0.35 * Math.min(feather, 2.5));
                  data[idx * 4 + 3] = Math.max(10, Math.round(data[idx * 4 + 3] * alphaFactor));
                }
              }
            }
          }
        }

        // Frame perimeter despeckle: clear any tiny residual outer border pixels
        const borderBand = 2;
        for (let x = 0; x < width; x++) {
          for (let b = 0; b < borderBand; b++) {
            data[(b * width + x) * 4 + 3] = 0;
            data[((height - 1 - b) * width + x) * 4 + 3] = 0;
          }
        }
        for (let y = 0; y < height; y++) {
          for (let b = 0; b < borderBand; b++) {
            data[(y * width + b) * 4 + 3] = 0;
            data[(y * width + (width - 1 - b)) * 4 + 3] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);

        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Failed to create Blob from canvas'));
          }
          const dataUrl = canvas.toDataURL('image/png');
          resolve({ dataUrl, blob, sampledBg: primaryBg });
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => reject(err);

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = imageSource.src;
    }
  });
}

/**
 * Helper to convert a File to DataURL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

