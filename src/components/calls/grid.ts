// videocall-rs bea64063, attendants.rs::compute_grid.
export function callGridDimensions(
    count: number,
    width: number,
    height: number,
    padding = { top: 16, right: 16, bottom: 16, left: 16 },
) {
    const availableWidth = Math.max(1, width - padding.left - padding.right);
    const availableHeight = Math.max(1, height - padding.top - padding.bottom);
    if (count < 2) return { columns: 1, rows: 1 };
    if (count === 2) {
        return availableWidth >= availableHeight
            ? { columns: 2, rows: 1 }
            : { columns: 1, rows: 2 };
    }
    if (count <= 4) return { columns: 2, rows: 2 };

    const scoringGap = 10;
    let best: { columns: number; rows: number } | undefined;
    let largestArea = 0;
    let fallback = { columns: 1, rows: count };
    let nearestSquare = Infinity;
    for (let columns = 1; columns <= count; columns++) {
        const rows = Math.ceil(count / columns);
        const cellWidth = (availableWidth - scoringGap * (columns - 1)) / columns;
        const cellHeight = (availableHeight - scoringGap * (rows - 1)) / rows;
        if (cellWidth <= 0 || cellHeight <= 0) continue;
        const aspect = cellWidth / cellHeight;
        const area = cellWidth * cellHeight;
        if (aspect >= 0.5 && aspect <= 2 && area > largestArea) {
            best = { columns, rows };
            largestArea = area;
        }
        const distance = Math.abs(aspect - 1);
        if (distance < nearestSquare) {
            fallback = { columns, rows };
            nearestSquare = distance;
        }
    }
    return best ?? fallback;
}
