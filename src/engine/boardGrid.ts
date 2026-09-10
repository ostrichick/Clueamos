// Clueamos 13x13 Mansion Board Grid Definition
// Authentically models classic Clue board layout:
// 6 Rooms at edges/corners, Center Case File, Checkered Hallway Corridors, Secret Passages

export interface BoardCell {
  r: number;
  c: number;
  type: 'room' | 'corridor' | 'center' | 'wall';
  roomId?: string;
  isDoor?: boolean;
  doorToRoomId?: string;
  isSecretPassage?: boolean;
  secretTargetRoomId?: string;
  label?: string;
}

export const GRID_ROWS = 13;
export const GRID_COLS = 13;

export interface RoomLayoutConfig {
  id: string;
  nameKey: string;
  rowRange: [number, number]; // inclusive [min, max]
  colRange: [number, number];
  doors: Array<{ r: number; c: number; facing: 'north' | 'south' | 'east' | 'west' }>;
  secretPassage?: { r: number; c: number; targetRoomId: string };
  theme: {
    bgColor: string;
    borderColor: string;
    textColor: string;
    icon: string;
  };
}

export const BOARD_ROOMS: Record<string, RoomLayoutConfig> = {
  room_library: {
    id: 'room_library',
    nameKey: 'room_library',
    rowRange: [0, 3],
    colRange: [0, 4],
    doors: [
      { r: 1, c: 4, facing: 'east' },
      { r: 3, c: 2, facing: 'south' },
    ],
    secretPassage: { r: 0, c: 0, targetRoomId: 'room_kitchen' },
    theme: {
      bgColor: 'bg-amber-950/40',
      borderColor: 'border-amber-700/60',
      textColor: 'text-amber-300',
      icon: '📚',
    },
  },
  room_room304: {
    id: 'room_room304',
    nameKey: 'room_room304',
    rowRange: [0, 3],
    colRange: [8, 12],
    doors: [
      { r: 1, c: 8, facing: 'west' },
      { r: 3, c: 10, facing: 'south' },
    ],
    theme: {
      bgColor: 'bg-rose-950/40',
      borderColor: 'border-rose-700/60',
      textColor: 'text-rose-300',
      icon: '🛏️',
    },
  },
  room_ballroom: {
    id: 'room_ballroom',
    nameKey: 'room_ballroom',
    rowRange: [5, 7],
    colRange: [0, 4],
    doors: [
      { r: 5, c: 2, facing: 'north' },
      { r: 6, c: 4, facing: 'east' },
      { r: 7, c: 2, facing: 'south' },
    ],
    secretPassage: { r: 7, c: 0, targetRoomId: 'room_rooftop' },
    theme: {
      bgColor: 'bg-indigo-950/40',
      borderColor: 'border-indigo-700/60',
      textColor: 'text-indigo-300',
      icon: '💃',
    },
  },
  room_kitchen: {
    id: 'room_kitchen',
    nameKey: 'room_kitchen',
    rowRange: [5, 7],
    colRange: [8, 12],
    doors: [
      { r: 5, c: 10, facing: 'north' },
      { r: 6, c: 8, facing: 'west' },
      { r: 7, c: 10, facing: 'south' },
    ],
    secretPassage: { r: 5, c: 12, targetRoomId: 'room_library' },
    theme: {
      bgColor: 'bg-emerald-950/40',
      borderColor: 'border-emerald-700/60',
      textColor: 'text-emerald-300',
      icon: '🍳',
    },
  },
  room_wine_cellar: {
    id: 'room_wine_cellar',
    nameKey: 'room_wine_cellar',
    rowRange: [9, 12],
    colRange: [0, 4],
    doors: [
      { r: 9, c: 2, facing: 'north' },
      { r: 10, c: 4, facing: 'east' },
    ],
    theme: {
      bgColor: 'bg-purple-950/40',
      borderColor: 'border-purple-700/60',
      textColor: 'text-purple-300',
      icon: '🍷',
    },
  },
  room_rooftop: {
    id: 'room_rooftop',
    nameKey: 'room_rooftop',
    rowRange: [9, 12],
    colRange: [8, 12],
    doors: [
      { r: 9, c: 10, facing: 'north' },
      { r: 10, c: 8, facing: 'west' },
    ],
    secretPassage: { r: 12, c: 12, targetRoomId: 'room_ballroom' },
    theme: {
      bgColor: 'bg-teal-950/40',
      borderColor: 'border-teal-700/60',
      textColor: 'text-teal-300',
      icon: '🌿',
    },
  },
};

// Center Case File Zone
export const CENTER_ZONE = {
  rowRange: [5, 7] as [number, number],
  colRange: [5, 7] as [number, number],
};

/**
 * Generate 13x13 Board Matrix
 */
export function generateBoardGrid(): BoardCell[][] {
  const grid: BoardCell[][] = [];

  for (let r = 0; r < GRID_ROWS; r++) {
    const row: BoardCell[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      // 1. Check if cell is in a Room
      let cellRoomId: string | undefined;
      for (const room of Object.values(BOARD_ROOMS)) {
        if (
          r >= room.rowRange[0] &&
          r <= room.rowRange[1] &&
          c >= room.colRange[0] &&
          c <= room.colRange[1]
        ) {
          cellRoomId = room.id;
          break;
        }
      }

      // 2. Check if cell is in Center Zone
      const isCenter =
        r >= CENTER_ZONE.rowRange[0] &&
        r <= CENTER_ZONE.rowRange[1] &&
        c >= CENTER_ZONE.colRange[0] &&
        c <= CENTER_ZONE.colRange[1];

      if (cellRoomId) {
        const roomConfig = BOARD_ROOMS[cellRoomId];
        const isDoor = roomConfig.doors.some(d => d.r === r && d.c === c);
        const isSecret =
          roomConfig.secretPassage?.r === r && roomConfig.secretPassage?.c === c;

        row.push({
          r,
          c,
          type: 'room',
          roomId: cellRoomId,
          isDoor,
          doorToRoomId: isDoor ? cellRoomId : undefined,
          isSecretPassage: isSecret,
          secretTargetRoomId: isSecret ? roomConfig.secretPassage?.targetRoomId : undefined,
        });
      } else if (isCenter) {
        row.push({
          r,
          c,
          type: 'center',
          label: 'CASE FILE',
        });
      } else {
        // Hallway / corridor tile
        row.push({
          r,
          c,
          type: 'corridor',
        });
      }
    }
    grid.push(row);
  }

  return grid;
}

/**
 * BFS: Calculate reachable tiles & rooms from current room
 */
export interface PathfindingResult {
  reachableRoomIds: string[];
  roomDistances: Record<string, number>;
  reachableTileSteps: Map<string, number>; // key: `${r},${c}` -> step number
}

export function calculateReachablePaths(
  currentRoomId: string,
  diceRoll: number
): PathfindingResult {
  const currentRoom = BOARD_ROOMS[currentRoomId];
  const roomDistances: Record<string, number> = { [currentRoomId]: 0 };
  const reachableRoomIds: string[] = [currentRoomId];
  const reachableTileSteps = new Map<string, number>();

  if (!currentRoom) {
    return { reachableRoomIds, roomDistances, reachableTileSteps };
  }

  // 1. Check Secret Passage
  if (currentRoom.secretPassage) {
    const target = currentRoom.secretPassage.targetRoomId;
    reachableRoomIds.push(target);
    roomDistances[target] = 0; // Free secret move!
  }

  // 2. BFS from room doorways outwards through corridor tiles
  // Queue: { r, c, dist }
  const queue: Array<{ r: number; c: number; dist: number }> = [];
  const visited = new Set<string>();

  // Doorway cells of the current room
  for (const door of currentRoom.doors) {
    // Find adjacent corridor step outside the door
    const dr = door.facing === 'south' ? 1 : door.facing === 'north' ? -1 : 0;
    const dc = door.facing === 'east' ? 1 : door.facing === 'west' ? -1 : 0;
    const outR = door.r + dr;
    const outC = door.c + dc;

    if (outR >= 0 && outR < GRID_ROWS && outC >= 0 && outC < GRID_COLS) {
      queue.push({ r: outR, c: outC, dist: 1 });
      visited.add(`${outR},${outC}`);
    }
  }

  const directions = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  // Map of all doors of other rooms
  const otherRoomDoors = new Map<string, string>(); // `${r},${c}` -> roomId
  for (const [roomId, room] of Object.entries(BOARD_ROOMS)) {
    if (roomId === currentRoomId) continue;
    for (const d of room.doors) {
      otherRoomDoors.set(`${d.r},${d.c}`, roomId);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    reachableTileSteps.set(`${current.r},${current.c}`, current.dist);

    // Check if current tile is adjacent to any other room door
    for (const [dr, dc] of directions) {
      const nr = current.r + dr;
      const nc = current.c + dc;
      const doorKey = `${nr},${nc}`;
      if (otherRoomDoors.has(doorKey)) {
        const destRoomId = otherRoomDoors.get(doorKey)!;
        const totalSteps = current.dist; // Reaching the doorstep
        if (
          roomDistances[destRoomId] === undefined ||
          totalSteps < roomDistances[destRoomId]
        ) {
          roomDistances[destRoomId] = totalSteps;
        }
        if (totalSteps <= diceRoll && !reachableRoomIds.includes(destRoomId)) {
          reachableRoomIds.push(destRoomId);
        }
      }
    }

    // Expand to neighboring corridors if within diceRoll
    if (current.dist < diceRoll) {
      for (const [dr, dc] of directions) {
        const nr = current.r + dr;
        const nc = current.c + dc;
        const key = `${nr},${nc}`;

        if (
          nr >= 0 &&
          nr < GRID_ROWS &&
          nc >= 0 &&
          nc < GRID_COLS &&
          !visited.has(key)
        ) {
          // Can only walk on corridor tiles
          // (Not in rooms, not in center)
          let inAnyRoom = false;
          for (const room of Object.values(BOARD_ROOMS)) {
            if (
              nr >= room.rowRange[0] &&
              nr <= room.rowRange[1] &&
              nc >= room.colRange[0] &&
              nc <= room.colRange[1]
            ) {
              inAnyRoom = true;
              break;
            }
          }
          const inCenter =
            nr >= CENTER_ZONE.rowRange[0] &&
            nr <= CENTER_ZONE.rowRange[1] &&
            nc >= CENTER_ZONE.colRange[0] &&
            nc <= CENTER_ZONE.colRange[1];

          if (!inAnyRoom && !inCenter) {
            visited.add(key);
            queue.push({ r: nr, c: nc, dist: current.dist + 1 });
          }
        }
      }
    }
  }

  return { reachableRoomIds, roomDistances, reachableTileSteps };
}

/**
 * BFS to find the exact corridor tile path from startRoom to targetRoom
 * Used for step-by-step pawn walking animation
 */
export function findShortestCorridorPath(
  startRoomId: string,
  targetRoomId: string
): Array<{ r: number; c: number }> {
  if (startRoomId === targetRoomId) return [];

  const startRoom = BOARD_ROOMS[startRoomId];
  const targetRoom = BOARD_ROOMS[targetRoomId];
  if (!startRoom || !targetRoom) return [];

  // If secret passage between rooms, return the portal endpoints
  if (startRoom.secretPassage?.targetRoomId === targetRoomId) {
    const spStart = startRoom.secretPassage;
    const spEnd = targetRoom.secretPassage || { r: targetRoom.doors[0].r, c: targetRoom.doors[0].c };
    return [{ r: spStart.r, c: spStart.c }, { r: spEnd.r, c: spEnd.c }];
  }

  const queue: Array<{ r: number; c: number }> = [];
  const parentMap = new Map<string, { r: number; c: number } | null>();

  // Doorway steps of start room
  for (const door of startRoom.doors) {
    const dr = door.facing === 'south' ? 1 : door.facing === 'north' ? -1 : 0;
    const dc = door.facing === 'east' ? 1 : door.facing === 'west' ? -1 : 0;
    const outR = door.r + dr;
    const outC = door.c + dc;
    if (outR >= 0 && outR < GRID_ROWS && outC >= 0 && outC < GRID_COLS) {
      const key = `${outR},${outC}`;
      parentMap.set(key, { r: door.r, c: door.c });
      queue.push({ r: outR, c: outC });
    }
  }

  // Target room doors set
  const targetDoors = new Set<string>();
  for (const d of targetRoom.doors) {
    targetDoors.add(`${d.r},${d.c}`);
  }

  const directions = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  let endTile: { r: number; c: number } | null = null;
  let targetDoorCell: { r: number; c: number } | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Check if current is adjacent to any door of targetRoom
    for (const [dr, dc] of directions) {
      const nr = current.r + dr;
      const nc = current.c + dc;
      if (targetDoors.has(`${nr},${nc}`)) {
        endTile = current;
        targetDoorCell = { r: nr, c: nc };
        break;
      }
    }
    if (endTile) break;

    // Expand
    for (const [dr, dc] of directions) {
      const nr = current.r + dr;
      const nc = current.c + dc;
      const key = `${nr},${nc}`;

      if (
        nr >= 0 &&
        nr < GRID_ROWS &&
        nc >= 0 &&
        nc < GRID_COLS &&
        !parentMap.has(key)
      ) {
        // Validate corridor
        let inAnyRoom = false;
        for (const room of Object.values(BOARD_ROOMS)) {
          if (
            nr >= room.rowRange[0] &&
            nr <= room.rowRange[1] &&
            nc >= room.colRange[0] &&
            nc <= room.colRange[1]
          ) {
            inAnyRoom = true;
            break;
          }
        }
        const inCenter =
          nr >= CENTER_ZONE.rowRange[0] &&
          nr <= CENTER_ZONE.rowRange[1] &&
          nc >= CENTER_ZONE.colRange[0] &&
          nc <= CENTER_ZONE.colRange[1];

        if (!inAnyRoom && !inCenter) {
          parentMap.set(key, current);
          queue.push({ r: nr, c: nc });
        }
      }
    }
  }

  if (!endTile) return [];

  // Reconstruct path
  const path: Array<{ r: number; c: number }> = [];
  if (targetDoorCell) {
    path.push(targetDoorCell);
  }

  let curr: { r: number; c: number } | null = endTile;
  while (curr) {
    path.unshift(curr);
    curr = parentMap.get(`${curr.r},${curr.c}`) || null;
  }

  return path;
}
