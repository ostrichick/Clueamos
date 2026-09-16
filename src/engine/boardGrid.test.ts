import { describe, it, expect } from 'vitest';
import { generateBoardGrid, calculateReachablePaths, findShortestCorridorPath, BOARD_ROOMS, GRID_ROWS, GRID_COLS } from './boardGrid';
import { LOCATION_CARDS } from './data';

describe('보드 그리드 (13x13 맨션)', () => {
  it('그리드는 13x13 크기를 가지며 6개 방이 모두 배치되어야 한다', () => {
    const grid = generateBoardGrid();
    expect(grid).toHaveLength(GRID_ROWS);
    for (const row of grid) {
      expect(row).toHaveLength(GRID_COLS);
    }

    const roomIdsInGrid = new Set<string>();
    for (const row of grid) {
      for (const cell of row) {
        if (cell.roomId) roomIdsInGrid.add(cell.roomId);
      }
    }
    expect(roomIdsInGrid.size).toBe(6);
    for (const roomId of Object.keys(BOARD_ROOMS)) {
      expect(roomIdsInGrid.has(roomId)).toBe(true);
    }
  });

  it('각 방의 셸 범위와 문/비밀 통로 셀이 정확히 그리드에 반영되어야 한다', () => {
    const grid = generateBoardGrid();
    for (const room of Object.values(BOARD_ROOMS)) {
      const cells: { r: number; c: number }[] = [];
      for (let r = room.rowRange[0]; r <= room.rowRange[1]; r++) {
        for (let c = room.colRange[0]; c <= room.colRange[1]; c++) {
          cells.push({ r, c });
        }
      }
      // 방 범위의 모든 셀이 해당 방 ID로 마킹
      for (const cell of cells) {
        expect(grid[cell.r][cell.c].roomId).toBe(room.id);
      }
      // 문 셀 커버리지
      for (const door of room.doors) {
        expect(grid[door.r][door.c].isDoor).toBe(true);
        expect(grid[door.r][door.c].doorToRoomId).toBe(room.id);
      }
      // 비밀 통로 셀 커버리지
      if (room.secretPassage) {
        const sp = room.secretPassage;
        expect(grid[sp.r][sp.c].isSecretPassage).toBe(true);
        expect(grid[sp.r][sp.c].secretTargetRoomId).toBe(sp.targetRoomId);
      }
    }
  });

  it('발코니 좌측 하단(ballroom) 비밀 통로는 옥상(rooftop)으로 연결된다', () => {
    expect(BOARD_ROOMS.room_ballroom.secretPassage?.targetRoomId).toBe('room_rooftop');
    expect(BOARD_ROOMS.room_rooftop.secretPassage?.targetRoomId).toBe('room_ballroom');
  });

  it('중앙(Case File) 구역은 방도 복도도 아닌 center 타입이어야 한다', () => {
    const grid = generateBoardGrid();
    expect(grid[6][6].type).toBe('center');
    expect(grid[5][5].type).toBe('center');
    expect(grid[7][7].type).toBe('center');
  });
});

describe('경로 탐색 (calculateReachablePaths)', () => {
  it('현재 방은 항상 거리 0으로 포함되고, 비밀 통로 대상 방도 거리 0으로 추가된다', () => {
    const result = calculateReachablePaths('room_library', 6);

    expect(result.roomDistances['room_library']).toBe(0);
    expect(result.reachableRoomIds).toContain('room_library');

    // 도서관 -> 주방 비밀 통로
    expect(result.roomDistances['room_kitchen']).toBe(0);
    expect(result.reachableRoomIds).toContain('room_kitchen');
  });

  it('도달 가능한 모든 방의 거리는 주사위 눈금 이하이며, 복도 스텝도 범위를 벗어나지 않아야 한다', () => {
    const result = calculateReachablePaths('room_ballroom', 5);

    for (const roomId of result.reachableRoomIds) {
      expect(result.roomDistances[roomId]).toBeLessThanOrEqual(5);
      expect(result.roomDistances[roomId]).toBeGreaterThanOrEqual(0);
    }

    // 복도 스텝은 격자 범위 내
    for (const key of result.reachableTileSteps.keys()) {
      const [r, c] = key.split(',').map(Number);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(GRID_ROWS - 1);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(GRID_COLS - 1);
    }
  });

  it('유효하지 않은 방 ID는 자기 자신만 포함된 결과를 반환한다', () => {
    const result = calculateReachablePaths('room_nonexistent', 6);
    expect(result.reachableRoomIds).toEqual(['room_nonexistent']);
    expect(result.roomDistances).toEqual({ room_nonexistent: 0 });
  });
});

describe('복도 최단 경로 (findShortestCorridorPath)', () => {
  it('같은 방은 빈 경로를 반환한다', () => {
    expect(findShortestCorridorPath('room_library', 'room_library')).toEqual([]);
  });

  it('비밀 통로가 있는 두 방 사이 경로는 포털 양끝점 2개를 반환한다', () => {
    const path = findShortestCorridorPath('room_library', 'room_kitchen');
    expect(path).toHaveLength(2);
    // 첫 포인트는 도서관 비밀 통로 셀
    expect(path[0].r).toBe(BOARD_ROOMS.room_library.secretPassage!.r);
    expect(path[0].c).toBe(BOARD_ROOMS.room_library.secretPassage!.c);
  });

  it('복도로 연결된 두 방 사이 경로는 마지막 지점이 목적지 방 문이어야 한다', () => {
    const path = findShortestCorridorPath('room_library', 'room_ballroom');
    expect(path.length).toBeGreaterThan(0);

    const last = path[path.length - 1];
    const targetDoors = BOARD_ROOMS.room_ballroom.doors.map(d => `${d.r},${d.c}`);
    expect(targetDoors).toContain(`${last.r},${last.c}`);

    // 양 끝은 방 경계에 있는 문 셀이므로 예외로 허용하고,
    // 나머지 중간 지점은 어떤 방 내부에도 있어서는 안 된다.
    const allowedDoorCells = new Set<string>([
      ...BOARD_ROOMS.room_library.doors.map(d => `${d.r},${d.c}`),
      ...targetDoors,
    ]);
    const midPoints = path.slice(1, -1);
    for (const cell of midPoints) {
      const key = `${cell.r},${cell.c}`;
      if (allowedDoorCells.has(key)) continue;
      let inAnyRoom = false;
      for (const room of Object.values(BOARD_ROOMS)) {
        if (
          cell.r >= room.rowRange[0] && cell.r <= room.rowRange[1] &&
          cell.c >= room.colRange[0] && cell.c <= room.colRange[1]
        ) {
          inAnyRoom = true;
          break;
        }
      }
      expect(inAnyRoom).toBe(false);
    }
  });

  it('모든 지도상 방에는 LOCATION_CARDS의 6개 id가 그대로 매핑된다', () => {
    const roomIds = Object.keys(BOARD_ROOMS);
    const locationIds = LOCATION_CARDS.map(l => l.id);
    expect(roomIds.sort()).toEqual(locationIds.sort());
  });
});