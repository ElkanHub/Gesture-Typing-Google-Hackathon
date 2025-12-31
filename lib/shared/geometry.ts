
export interface Point {
    x: number;
    y: number;
    time: number;
    key: string;
}

export const analyzeTrajectory = (path: Point[]) => {
    if (!path.length) return { sequence: "", anchors: [] as string[] };

    const grouped: { key: string; startTime: number; endTime: number; count: number; x: number; y: number }[] = [];

    let currentGroup = {
        key: path[0].key || '',
        startTime: path[0].time,
        endTime: path[0].time,
        count: 1,
        x: path[0].x,
        y: path[0].y
    };

    for (let i = 1; i < path.length; i++) {
        const p = path[i];
        const key = p.key || '';
        if (key === currentGroup.key) {
            currentGroup.endTime = p.time;
            currentGroup.count++;
            currentGroup.x = p.x;
            currentGroup.y = p.y;
        } else {
            grouped.push(currentGroup);
            currentGroup = { key, startTime: p.time, endTime: p.time, count: 1, x: p.x, y: p.y };
        }
    }
    grouped.push(currentGroup);

    const durations = grouped.map(g => g.endTime - g.startTime);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / (durations.length || 1);

    const dwellAnchors = grouped.filter((g, i) => {
        const duration = durations[i];
        return duration > (avgDuration * 1.3);
    }).map(g => g.key);

    const inflectionAnchors: string[] = [];
    if (grouped.length > 2) {
        for (let i = 1; i < grouped.length - 1; i++) {
            const prev = grouped[i - 1];
            const curr = grouped[i];
            const next = grouped[i + 1];

            const dx1 = curr.x - prev.x;
            const dy1 = curr.y - prev.y;
            const dx2 = next.x - curr.x;
            const dy2 = next.y - curr.y;

            const angle1 = Math.atan2(dy1, dx1);
            const angle2 = Math.atan2(dy2, dx2);
            let diff = Math.abs(angle1 - angle2);
            if (diff > Math.PI) diff = 2 * Math.PI - diff;

            const degrees = diff * (180 / Math.PI);
            if (degrees > 45) {
                inflectionAnchors.push(curr.key);
            }
        }
    }

    const startKey = grouped[0].key;
    const endKey = grouped[grouped.length - 1].key;

    const anchors = Array.from(new Set([
        startKey,
        ...dwellAnchors,
        ...inflectionAnchors,
        endKey
    ]));

    const cleanAnchors = anchors.filter(k => k);
    const sequence = grouped.map(g => g.key).filter(k => k).join('');

    return { sequence, anchors: cleanAnchors };
};
