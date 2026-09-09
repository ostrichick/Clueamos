import { Card, Room } from './types';

export const SUSPECTS: Card[] = [
  { id: 'suspect_manager', category: 'suspect', name: '지배인 바우어', description: '호텔의 모든 비밀과 열쇠를 쥐고 있는 완고한 지배인.' },
  { id: 'suspect_colonel', category: 'suspect', name: '예비역 대령 헤이스팅스', description: '언제나 정복을 입고 다니며 밤마다 복도를 서성이는 군인 출신.' },
  { id: 'suspect_chef', category: 'suspect', name: '수셰프 피에르', description: '칼을 능숙하게 다루며 최근 주방 재고 문제로 다툰 적이 있음.' },
  { id: 'suspect_actress', category: 'suspect', name: '여배우 베로니카', description: '화려한 모습 뒤에 파산 직전의 경제적 위기를 감추고 있는 배우.' },
  { id: 'suspect_doctor', category: 'suspect', name: '신경외과의 닥터 클라인', description: '항상 가죽 가방을 지니고 다니며 표정을 읽을 수 없는 의사.' },
  { id: 'suspect_guard', category: 'suspect', name: '야간 경비원 잭', description: '호텔의 후문과 환풍구 구조를 누구보다 훤히 꿰뚫고 있는 인물.' },
];

export const LOCATIONS: Room[] = [
  { id: 'room_ballroom', name: '연회장', description: '샹들리에가 희미하게 흔들리는 1층 대연회장', adjacentRoomIds: ['room_kitchen', 'room_library'], gridCoord: { x: 0, y: 0 } },
  { id: 'room_kitchen', name: '메인 주방', description: '식기들이 어지럽게 널려 있는 주방', adjacentRoomIds: ['room_ballroom', 'room_wine_cellar'], gridCoord: { x: 1, y: 0 } },
  { id: 'room_library', name: '서재 & 라운지', description: '벽난로 불씨가 남아 있는 고풍스러운 서재', adjacentRoomIds: ['room_ballroom', 'room_room304'], gridCoord: { x: 0, y: 1 } },
  { id: 'room_wine_cellar', name: '지하 와인창고', description: '서늘하고 어두컴컴한 지하 와인 저장고', adjacentRoomIds: ['room_kitchen', 'room_rooftop'], gridCoord: { x: 1, y: 1 } },
  { id: 'room_room304', name: '객실 304호', description: '피해자가 머물렀던 테라스가 딸린 고급 스위트룸', adjacentRoomIds: ['room_library', 'room_rooftop'], gridCoord: { x: 0, y: 2 } },
  { id: 'room_rooftop', name: '옥상 온실정원', description: '비바람이 들이치는 옥상의 유리 온실', adjacentRoomIds: ['room_room304', 'room_wine_cellar'], gridCoord: { x: 1, y: 2 } },
];

export const LOCATION_CARDS: Card[] = LOCATIONS.map(r => ({
  id: r.id,
  category: 'location',
  name: r.name,
  description: r.description,
}));

export const WEAPONS: Card[] = [
  { id: 'weapon_candlestick', category: 'weapon', name: '묵직한 은제 촛대', description: '연회장 벽면에 장식되어 있던 고풍스러운 촛대.' },
  { id: 'weapon_poison', category: 'weapon', name: '비소 독약병', description: '라벨이 뜯겨나간 푸른색 작은 유리병.' },
  { id: 'weapon_masterkey', category: 'weapon', name: '황동 마스터키', description: '호텔의 모든 룸을 열 수 있는 마스터키.' },
  { id: 'weapon_rope', category: 'weapon', name: '질긴 커튼 밧줄', description: '연회장 커튼을 묶어두었던 금색 매듭 밧줄.' },
  { id: 'weapon_fountainpen', category: 'weapon', name: '날카로운 만년필', description: '서재 데스크에 놓여 있던 무겁고 날카로운 금촉 만년필.' },
  { id: 'weapon_trophy', category: 'weapon', name: '청동 사냥 트로피', description: '서재 선반에 있던 묵직한 청동 트로피.' },
];

export const MOTIVES: Card[] = [
  { id: 'motive_inheritance', category: 'motive', name: '막대한 유산 상속', description: '호텔 소유권을 둘러싼 유언장 위조와 상속 다툼.' },
  { id: 'motive_blackmail', category: 'motive', name: '치명적 비밀 폭로', description: '과거의 치명적인 스캔들이 담긴 편지와 협박.' },
  { id: 'motive_revenge', category: 'motive', name: '오랜 원한과 복수', description: '10년 전 사건에 대한 피의 복수극.' },
  { id: 'motive_theft', category: 'motive', name: '희귀 다이아몬드 절도', description: '금고에 보관 중이던 블루 사파이어 강탈.' },
];

export const ALL_CARDS: Card[] = [
  ...SUSPECTS,
  ...LOCATION_CARDS,
  ...WEAPONS,
  ...MOTIVES,
];
