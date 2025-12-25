import { Point, ShapeType } from './types';

// Helper to calculate distance
const dist = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

export function analyzeShape(path: Point[]): { type: ShapeType; width: number; height: number; centerX: number; centerY: number } | null {
    if (path.length < 2) return null;

    // 1. Calculate Bounding Box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    path.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    const w = Math.max(width, 1);
    const h = Math.max(height, 1);
    const aspectRatio = w / h;

    // 2. Identify "Line"
    // Heuristic: Check if points lie close to the line connecting start and end
    // Or simply check aspect ratio if it's horizontal/vertical.
    // Better: Standard Deviation of distance from regression line.

    // Simple verification for now:
    // If aspect ratio is extreme, it's a line.
    if (aspectRatio > 5 || aspectRatio < 0.2) {
        return { type: 'line', width, height, centerX, centerY };
    }

    // Check linearity by comparing path length to distance between start/end
    const start = path[0];
    const end = path[path.length - 1];
    const distanceStartEnd = dist(start, end);
    let pathLength = 0;
    for (let i = 1; i < path.length; i++) {
        pathLength += dist(path[i - 1], path[i]);
    }

    // Linearity ratio: Closer to 1 means straight line
    const linearity = distanceStartEnd / pathLength;
    if (linearity > 0.9) {
        return { type: 'line', width, height, centerX, centerY };
    }


    // 3. Identify Closed Shapes (Circle, Square, Triangle)
    // Check if start and end are close relative to the total bounding box size
    const diagonal = Math.sqrt(w * w + h * h);
    const closureDist = dist(start, end);
    const isClosed = closureDist < (diagonal * 0.4); // Allow some gap

    // If it's not closed and not a straight line, it might be a poor attempt at a shape or a curve line
    if (!isClosed) {
        // If linearity is somewhat high, fallback to line
        if (linearity > 0.8) {
            return { type: 'line', width, height, centerX, centerY };
        }
        // Else, let's treat it as a line for now to avoid dropping gestures, or maybe a curve?
        return { type: 'line', width, height, centerX, centerY };
    }

    // 4. Distinguish Square vs Circle vs Triangle using Convex Hull / Area ratios

    // Calculate Polygon Area (Shoelace Formula)
    let area = 0;
    for (let i = 0; i < path.length; i++) {
        const j = (i + 1) % path.length;
        area += (path[i].x * path[j].y);
        area -= (path[j].x * path[i].y);
    }
    area = Math.abs(area) / 2;

    const boundingArea = w * h;
    const fillRatio = area / boundingArea;

    // console.log(`Analyze: Linearity=${linearity.toFixed(2)} Fill=${fillRatio.toFixed(2)} Aspect=${aspectRatio.toFixed(2)} Closed=${isClosed}`);

    // Triangle: Fill ratio ~ 0.5
    // Circle: Fill ratio ~ 0.78 (Pi/4)
    // Square: Fill ratio ~ 1.0

    // Heuristics
    if (fillRatio > 0.85) {
        return { type: 'square', width, height, centerX, centerY };
    } else if (fillRatio > 0.65) {
        return { type: 'circle', width, height, centerX, centerY };
    } else {
        return { type: 'triangle', width, height, centerX, centerY };
    }
}
