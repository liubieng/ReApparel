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
 * and clusters them to find dominant background colors and lighting variations.
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

  // 1. Sample along top and bottom edges (step every ~3%, depth 3 pixels)
  const stepX = Math.max(1, Math.floor(width / 32));
  for (let x = 0; x < width; x += stepX) {
    for (let b = 0; b < 3; b++) {
      const topIdx = (b * width + x) * 4;
      samplePoints.push({ r: data[topIdx], g: data[topIdx + 1], b: data[topIdx + 2] });

      const botIdx = ((height - 1 - b) * width + x) * 4;
      samplePoints.push({ r: data[botIdx], g: data[botIdx + 1], b: data[botIdx + 2] });
    }
  }

  // 2. Sample along left and right edges (step every ~3%, depth 3 pixels)
  const stepY = Math.max(1, Math.floor(height / 32));
  for (let y = 0; y < height; y += stepY) {
    for (let b = 0; b < 3; b++) {
      const leftIdx = (y * width + b) * 4;
      samplePoints.push({ r: data[leftIdx], g: data[leftIdx + 1], b: data[leftIdx + 2] });

      const rightIdx = (y * width + (width - 1 - b)) * 4;
      samplePoints.push({ r: data[rightIdx], g: data[rightIdx + 1], b: data[rightIdx + 2] });
    }
  }

  // 3. Cluster samples to find up to 24 dominant background shades
  for (const pt of samplePoints) {
    let matched = false;
    for (const c of clusters) {
      if (perceptualColorDistance(pt.r, pt.g, pt.b, c.r, c.g, c.b) < 14) {
        matched = true;
        break;
      }
    }
    if (!matched && clusters.length < 24) {
      clusters.push(pt);
    }
  }

  if (clusters.length === 0) {
    clusters.push({ r: 255, g: 255, b: 255 });
  }

  return clusters;
}

/**
 * Samples central garment region to protect clothing patterns from being eaten away.
 */
function extractGarmentPalette(
  data: Uint8ClampedArray,
  width: number,
  height: number
): ColorRGB[] {
  const garmentClusters: ColorRGB[] = [];
  const startX = Math.floor(width * 0.25);
  const endX = Math.floor(width * 0.75);
  const startY = Math.floor(height * 0.25);
  const endY = Math.floor(height * 0.75);
  const step = Math.max(2, Math.floor((endX - startX) / 14));

  for (let y = startY; y < endY; y += step) {
    for (let x = startX; x < endX; x += step) {
      const idx = (y * width + x) * 4;
      const pt = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
      let matched = false;
      for (const c of garmentClusters) {
        if (perceptualColorDistance(pt.r, pt.g, pt.b, c.r, c.g, c.b) < 16) {
          matched = true;
          break;
        }
      }
      if (!matched && garmentClusters.length < 12) {
        garmentClusters.push(pt);
      }
    }
  }
  return garmentClusters;
}

/**
 * Automatically isolates clothing from backgrounds using:
 * 1. Perimeter flood-fill (BFS) with garment center protection
 * 2. Adaptive perceptual color matching for accurate fabric contour separation
 * 3. Cast shadow elimination and surface texture isolation
 * 4. Anti-aliased boundary feathering
 */
export async function removeBackgroundClientSide(
  imageSource: string | HTMLImageElement,
  options: RemovalOptions = {}
): Promise<{ dataUrl: string; blob: Blob; sampledBg?: ColorRGB }> {
  return new Promise((resolve, reject) => {
    const processImg = (img: HTMLImageElement) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        // Target standard crisp garment silhouette dimensions (max 480px for speed & efficiency)
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
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

        // Map slider value (10 to 90) to progressive background tolerance:
        // 10% = subtle (only exact border matches, background stays intact)
        // 90% = max isolation (high tolerance, surface shadows and textures removed)
        const level = Math.max(5, Math.min(95, options.tolerance ?? 50));
        const effectiveTolerance = Math.round(4 + ((level - 10) / 80) * 68);
        const feather = options.feather ?? 1.5;
        const removeShadows = options.removeShadows ?? (level >= 30);
        const maxStepDist = level <= 20 ? 0 : Math.round(4 + ((level - 20) / 70) * 18);
        const garmentProtectThreshold = 12;

        // 1. Comprehensive perimeter and edge band sampling
        const bgClusters = extractBackgroundPalette(data, width, height, options.targetBgColor);
        const primaryBg = bgClusters[0];

        // 2. Sample inner subject to protect garment patterns
        const garmentPalette = extractGarmentPalette(data, width, height);

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

            // Protect center garment: if pixel strongly matches garment center and isn't identical to border
            let matchesGarment = false;
            if (options.protectCenter !== false && garmentPalette.length > 0) {
              for (let g = 0; g < garmentPalette.length; g++) {
                const gp = garmentPalette[g];
                if (perceptualColorDistance(nR, nG, nB, gp.r, gp.g, gp.b) < garmentProtectThreshold) {
                  matchesGarment = true;
                  break;
                }
              }
            }

            let isBg = false;
            if (!matchesGarment) {
              // 1. Direct cluster match
              for (let c = 0; c < bgClusters.length; c++) {
                const cluster = bgClusters[c];
                const dist = perceptualColorDistance(nR, nG, nB, cluster.r, cluster.g, cluster.b);
                if (dist <= effectiveTolerance) {
                  isBg = true;
                  break;
                }

                // 2. Cast shadow detection (similar chromaticity ratio, darker luminance)
                if (removeShadows && nR <= cluster.r + 28 && nG <= cluster.g + 28 && nB <= cluster.b + 28) {
                  const sumN = nR + nG + nB;
                  const sumC = cluster.r + cluster.g + cluster.b;
                  if (sumN > 24 && sumC > 24) {
                    const chrDist =
                      Math.abs(nR / sumN - cluster.r / sumC) +
                      Math.abs(nG / sumN - cluster.g / sumC) +
                      Math.abs(nB / sumN - cluster.b / sumC);
                    if (chrDist < 0.16 && dist <= effectiveTolerance * 1.6) {
                      isBg = true;
                      break;
                    }
                  }
                }
              }

              // 3. Continuity check across surface texture gradients
              if (!isBg && maxStepDist > 0) {
                const stepDist = perceptualColorDistance(nR, nG, nB, curR, curG, curB);
                if (stepDist <= maxStepDist) {
                  let minDistToBg = 999;
                  for (let c = 0; c < bgClusters.length; c++) {
                    const d = perceptualColorDistance(nR, nG, nB, bgClusters[c].r, bgClusters[c].g, bgClusters[c].b);
                    if (d < minDistToBg) minDistToBg = d;
                  }
                  if (minDistToBg <= effectiveTolerance * 1.4) {
                    isBg = true;
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
        // Critical safeguard: if background removal erased entire subject (< 3% visible pixels),
        // abort transparency and preserve original uploaded image!
        if (visibleRatio < 0.03) {
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
            const dataUrl = canvas.toDataURL('image/png');
            return resolve({ dataUrl, blob: new Blob(), sampledBg: primaryBg });
          }
          const dataUrl = canvas.toDataURL('image/png');
          resolve({ dataUrl, blob, sampledBg: primaryBg });
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    };

    if (imageSource instanceof HTMLImageElement && imageSource.complete && imageSource.naturalWidth > 0) {
      processImg(imageSource);
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processImg(img);
      img.onerror = (err) => reject(err);
      img.src = typeof imageSource === 'string' ? imageSource : imageSource.src;
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

