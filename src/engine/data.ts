import { Card, Room } from './types';

// 1. 용의자 6명 (색깔에서 이름을 따오고, 이름 옆에 해당 색깔 이모지 부여)
export const SUSPECTS: Card[] = [
  { 
    id: 'suspect_scarlett', 
    category: 'suspect', 
    name: '🔴 미스 스칼렛 (Miss Scarlett)', 
    description: '매혹적인 붉은 드레스를 입은 유명 배우. 호텔 곳곳의 비밀을 알고 있다.' 
  },
  { 
    id: 'suspect_mustard', 
    category: 'suspect', 
    name: '🟡 커널 머스타드 (Colonel Mustard)', 
    description: '빛바랜 황색 정복을 차려입은 예비역 대령. 무기와 전술에 능통하다.' 
  },
  { 
    id: 'suspect_white', 
    category: 'suspect', 
    name: '⚪ 미세스 화이트 (Mrs. White)', 
    description: '결벽증이 있는 호텔 수석 지배인. 흰색 유니폼에 항상 마스터키를 소지한다.' 
  },
  { 
    id: 'suspect_green', 
    category: 'suspect', 
    name: '🟢 미스터 그린 (Mr. Green)', 
    description: '초록색 핀스트라이프 양복의 수상한 사업가. 거액의 채무를 쥐고 있다.' 
  },
  { 
    id: 'suspect_peacock', 
    category: 'suspect', 
    name: '🔵 미세스 피콕 (Mrs. Peacock)', 
    description: '푸른 공작 깃털 브로치를 단 상류층 미망인. 유산 상속을 노린다.' 
  },
  { 
    id: 'suspect_plum', 
    category: 'suspect', 
    name: '🟣 프로페서 플럼 (Professor Plum)', 
    description: '보랏빛 벨벳 조끼를 입은 괴짜 고고학 교수. 피해자와 심한 언쟁을 벌였다.' 
  },
];

export interface CharacterProfile {
  id: string;
  avatar: string;
  color: string;
  defaultRoomId: string;
}

export const CHARACTER_PROFILES: Record<string, CharacterProfile> = {
  suspect_scarlett: {
    id: 'suspect_scarlett',
    avatar: '🔴',
    color: '#ef4444',
    defaultRoomId: 'room_ballroom',
  },
  suspect_mustard: {
    id: 'suspect_mustard',
    avatar: '🟡',
    color: '#eab308',
    defaultRoomId: 'room_kitchen',
  },
  suspect_white: {
    id: 'suspect_white',
    avatar: '⚪',
    color: '#cbd5e1',
    defaultRoomId: 'room_library',
  },
  suspect_green: {
    id: 'suspect_green',
    avatar: '🟢',
    color: '#22c55e',
    defaultRoomId: 'room_wine_cellar',
  },
  suspect_peacock: {
    id: 'suspect_peacock',
    avatar: '🔵',
    color: '#3b82f6',
    defaultRoomId: 'room_room304',
  },
  suspect_plum: {
    id: 'suspect_plum',
    avatar: '🟣',
    color: '#a855f7',
    defaultRoomId: 'room_rooftop',
  },
};

// 2. 살인이 일어난 현장 장소 6곳 (살인 장소 이모지 부여)
export const LOCATIONS: Room[] = [
  { 
    id: 'room_ballroom', 
    name: '💃 연회장 (Grand Ballroom)', 
    description: '샹들리에가 희미하게 흔들리는 1층 대연회장.', 
    adjacentRoomIds: ['room_kitchen', 'room_library'], 
    gridCoord: { x: 0, y: 0 } 
  },
  { 
    id: 'room_kitchen', 
    name: '🍳 메인 주방 (Main Kitchen)', 
    description: '각종 조리도구와 칼들이 널려 있는 주방.', 
    adjacentRoomIds: ['room_ballroom', 'room_wine_cellar'], 
    gridCoord: { x: 1, y: 0 } 
  },
  { 
    id: 'room_library', 
    name: '📚 서재 & 라운지 (Library)', 
    description: '벽난로 불씨가 남아 있는 고풍스러운 서재.', 
    adjacentRoomIds: ['room_ballroom', 'room_room304'], 
    gridCoord: { x: 0, y: 1 } 
  },
  { 
    id: 'room_wine_cellar', 
    name: '🍷 지하 와인창고 (Wine Cellar)', 
    description: '서늘하고 어두컴컴한 지하 와인 저장고.', 
    adjacentRoomIds: ['room_kitchen', 'room_rooftop'], 
    gridCoord: { x: 1, y: 1 } 
  },
  { 
    id: 'room_room304', 
    name: '🛏️ 객실 304호 (Suite Room 304)', 
    description: '피해자가 머물렀던 고급 스위트룸.', 
    adjacentRoomIds: ['room_library', 'room_rooftop'], 
    gridCoord: { x: 0, y: 2 } 
  },
  { 
    id: 'room_rooftop', 
    name: '🌿 옥상 온실정원 (Greenhouse)', 
    description: '비바람이 들이치는 옥상의 유리 온실.', 
    adjacentRoomIds: ['room_room304', 'room_wine_cellar'], 
    gridCoord: { x: 1, y: 2 } 
  },
];

export const LOCATION_CARDS: Card[] = LOCATIONS.map(r => ({
  id: r.id,
  category: 'location',
  name: r.name,
  description: r.description,
}));

// 3. 흉기 도구 6개 (존재하는 실제 유니코드 이모지만 적용)
export const WEAPONS: Card[] = [
  { 
    id: 'weapon_candlestick', 
    category: 'weapon', 
    name: '🕯️ 은제 촛대 (Candlestick)', 
    description: '연회장 벽면에 장식되어 있던 묵직한 순은 촛대.' 
  },
  { 
    id: 'weapon_knife', 
    category: 'weapon', 
    name: '🔪 단검 (Knife)', 
    description: '주방에서 사라진 날카로운 조리용 칼.' 
  },
  { 
    id: 'weapon_revolver', 
    category: 'weapon', 
    name: '🔫 리볼버 (Revolver)', 
    description: '대령의 군용 가죽 홀스터에서 없어진 6연발 권총.' 
  },
  { 
    id: 'weapon_rope', 
    category: 'weapon', 
    name: '🪢 밧줄 (Rope)', 
    description: '스위트룸 테라스 커튼을 묶어두었던 금색 매듭 밧줄.' 
  },
  { 
    id: 'weapon_wrench', 
    category: 'weapon', 
    name: '🔧 렌치 (Wrench)', 
    description: '지하 보일러 배관 점검에 사용된 묵직한 강철 렌치.' 
  },
  { 
    id: 'weapon_poison', 
    category: 'weapon', 
    name: '🧪 독약병 (Poison)', 
    description: '라벨이 뜯겨나간 치명적인 청산가리 유리병.' 
  },
];

// 정통 Clue 18장 카드 (용의자 6 + 살인 장소 6 + 흉기 6)
export const ALL_CARDS: Card[] = [
  ...SUSPECTS,
  ...LOCATION_CARDS,
  ...WEAPONS,
];
