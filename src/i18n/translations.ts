// 다국어 지원 번역 사전 (기본: 영어, 옵션: 스페인어, 한국어)

export type SupportedLocale = 'en' | 'es' | 'ko';

export interface TranslationStrings {
  // Common
  gameTitle: string;
  gameSubtitle: string;
  ruleTitle: string;
  rule1: string;
  rule2: string;
  rule3: string;
  enterScene: string;
  round: string;
  turn: string;
  player: string;
  detective: string;
  eliminated: string;
  cardsCount: string;
  viewNotes: string;
  viewMap: string;
  newGame: string;
  currentRoom: string;
  adjacentRoomsDesc: string;
  rollDiceBtn: string;
  rollingDice: string;
  rolledNumber: string;
  secretPassageBadge: string;
  cannotReachRoom: string;
  distanceSteps: string;
  clickToEnter: string;
  secretPassageTo: string;
  confidentialCaseFile: string;
  legendTiles: string;
  legendDoors: string;

  // Deduction Note
  notebookTitle: string;
  notebookDesc: string;
  suspectsHeader: string;
  locationsHeader: string;
  weaponsHeader: string;
  motivesHeader: string;
  markUnknown: string;
  markNo: string;
  markYes: string;

  // Hand
  secretHand: string;
  showHand: string;
  hideHand: string;

  // Suggestion
  askHypothesis: string;
  selectSuspect: string;
  selectWeapon: string;
  selectMotive: string;
  askQuestionBtn: string;

  // Accusation
  finalAccusationBtn: string;
  accuseTitle: string;
  accuseWarning: string;
  accuseSuspect: string;
  accuseLocation: string;
  accuseWeapon: string;
  accuseMotive: string;
  cancel: string;
  declareTruth: string;

  // Live Logs
  liveLogTitle: string;
  detectivesListTitle: string;

  // Game Over
  investigationEnd: string;
  truthRevealed: string;
  mysteryUnsolved: string;
  secretSolutionTitle: string;
  solutionCulprit: string;
  solutionLocation: string;
  solutionWeapon: string;
  solutionMotive: string;
  playAgain: string;

  // Cards & Rooms names
  cards: Record<string, { name: string; description: string }>;
  rooms: Record<string, { name: string; description: string }>;
  logMessages: {
    start: string;
    move: string;
    suggestion: string;
    disproved: string;
    noDisprove: string;
    win: string;
    fail: string;
  };
}

export const translations: Record<SupportedLocale, TranslationStrings> = {
  en: {
    gameTitle: 'Clueamos',
    gameSubtitle: 'A 4-Player Murder Mystery at Grand Velvet Hotel',
    ruleTitle: 'Custom 4-Player Rules',
    rule1: 'Play together with 2 AI detectives (Arthur & Blake) for non-stop deduction excitement.',
    rule2: 'AI plays completely fair without cheating or peeking at secret answers.',
    rule3: 'Solve the 4 crime elements: Suspect, Location, Weapon, and the Motive.',
    enterScene: 'Enter Crime Scene',
    round: 'Round',
    turn: "'s Turn",
    player: 'Player',
    detective: 'AI Detective',
    eliminated: 'Eliminated',
    cardsCount: 'cards',
    viewNotes: 'Deduction Sheet',
    viewMap: 'Hotel Map',
    newGame: 'New Game',
    currentRoom: 'Current Room',
    adjacentRoomsDesc: 'Roll the die to move to an accessible room',
    rollDiceBtn: 'Roll Die 🎲',
    rollingDice: 'Rolling...',
    rolledNumber: 'Rolled',
    secretPassageBadge: 'Secret Passage!',
    cannotReachRoom: 'Too far (Need higher roll)',
    distanceSteps: 'steps',
    clickToEnter: 'Click to Enter',
    secretPassageTo: 'Secret Passage to',
    confidentialCaseFile: 'CONFIDENTIAL CASE FILE',
    legendTiles: 'Hallway Tile (1 Step)',
    legendDoors: 'Room Doorway',

    notebookTitle: 'Detective Investigation Notebook',
    notebookDesc: 'Click items to toggle ? / ✕ / ◯ (Your hand cards are automatically ✕)',
    suspectsHeader: 'Suspects (6)',
    locationsHeader: 'Locations (6)',
    weaponsHeader: 'Weapons (6)',
    motivesHeader: 'Motives (4)',
    markUnknown: '?',
    markNo: '✕',
    markYes: '◯',

    secretHand: "'s Private Hand",
    showHand: 'Show',
    hideHand: 'Hide',

    askHypothesis: 'Propose Hypothesis (Suggestion)',
    selectSuspect: 'Suspect',
    selectWeapon: 'Weapon',
    selectMotive: 'Motive',
    askQuestionBtn: 'Question Other Detectives',

    finalAccusationBtn: 'Final Accusation!',
    accuseTitle: 'Final Accusation',
    accuseWarning: 'Caution: You only get ONE shot. If you are wrong, you are eliminated from investigation!',
    accuseSuspect: 'Culprit (Suspect)',
    accuseLocation: 'Crime Location',
    accuseWeapon: 'Murder Weapon',
    accuseMotive: 'Motive',
    cancel: 'Cancel',
    declareTruth: 'Declare the Truth',

    liveLogTitle: 'Case Activity Log',
    detectivesListTitle: 'Detectives Roster',

    investigationEnd: 'Investigation Closed',
    truthRevealed: 'solved the mystery and brought justice!',
    mysteryUnsolved: 'The culprit escaped and the case remains cold.',
    secretSolutionTitle: 'The Truth of the Case',
    solutionCulprit: 'Culprit',
    solutionLocation: 'Location',
    solutionWeapon: 'Weapon',
    solutionMotive: 'Motive',
    playAgain: 'Investigate New Case',

    cards: {
      suspect_manager: { name: 'Manager Bauer', description: 'The stubborn hotel manager with master keys and dirty secrets.' },
      suspect_colonel: { name: 'Colonel Hastings', description: 'Retired military veteran seen pacing hallways late at night.' },
      suspect_chef: { name: 'Chef Pierre', description: 'Master with knives, recently argued violently over kitchen inventories.' },
      suspect_actress: { name: 'Actress Veronica', description: 'Glamorous diva hiding near-bankruptcy behind her smile.' },
      suspect_doctor: { name: 'Dr. Klein', description: 'Unreadable neurosurgeon who always carries a locked leather bag.' },
      suspect_guard: { name: 'Night Guard Jack', description: 'Knows every secret backdoor and ventilation shaft in the hotel.' },

      room_ballroom: { name: 'Grand Ballroom', description: 'First floor ballroom with flickering crystal chandeliers.' },
      room_kitchen: { name: 'Main Kitchen', description: 'Cluttered kitchen with culinary blades and scattered ingredients.' },
      room_library: { name: 'Library & Lounge', description: 'Antique library with a dying fireplace and confidential documents.' },
      room_wine_cellar: { name: 'Wine Cellar', description: 'Cold, dark basement vault filled with vintage barrels.' },
      room_room304: { name: 'Suite Room 304', description: 'Victim luxurious terrace suite where the body was found.' },
      room_rooftop: { name: 'Rooftop Greenhouse', description: 'Glass conservatory battered by the raging storm outside.' },

      weapon_candlestick: { name: 'Silver Candlestick', description: 'Heavy antique silver candlestick from the ballroom mantle.' },
      weapon_poison: { name: 'Arsenic Vial', description: 'A small blue bottle with a torn prescription label.' },
      weapon_masterkey: { name: 'Brass Master Key', description: 'A master key capable of unlocking all hotel doors.' },
      weapon_rope: { name: 'Curtain Cord', description: 'Strong golden braided cord taken from the velvet drapes.' },
      weapon_fountainpen: { name: 'Sharp Fountain Pen', description: 'Heavy gold-nibbed pen sharp enough to pierce flesh.' },
      weapon_trophy: { name: 'Bronze Trophy', description: 'Solid bronze hunting trophy found on the library bookshelf.' },

      motive_inheritance: { name: 'Inheritance Fortune', description: 'Fierce dispute over the victim forged last will.' },
      motive_blackmail: { name: 'Fatal Blackmail', description: 'Letters exposing an unforgivable past scandal.' },
      motive_revenge: { name: 'Blood Revenge', description: 'Payback for a tragedy that happened 10 years ago.' },
      motive_theft: { name: 'Diamond Theft', description: 'Looting the rare Blue Sapphire kept in the private safe.' },
    },
    rooms: {
      room_ballroom: { name: 'Grand Ballroom', description: 'First floor ballroom with flickering crystal chandeliers.' },
      room_kitchen: { name: 'Main Kitchen', description: 'Cluttered kitchen with culinary blades and scattered ingredients.' },
      room_library: { name: 'Library & Lounge', description: 'Antique library with a dying fireplace and confidential documents.' },
      room_wine_cellar: { name: 'Wine Cellar', description: 'Cold, dark basement vault filled with vintage barrels.' },
      room_room304: { name: 'Suite Room 304', description: 'Victim luxurious terrace suite where the body was found.' },
      room_rooftop: { name: 'Rooftop Greenhouse', description: 'Glass conservatory battered by the raging storm outside.' },
    },
    logMessages: {
      start: 'The murder has taken place. The investigation at Grand Velvet Hotel begins.',
      move: 'moved to',
      suggestion: 'asks:',
      disproved: 'secretly showed 1 card to disprove the claim.',
      noDisprove: 'Nobody could disprove this hypothesis! (Very close to truth)',
      win: '🎉 [Case Solved!] discovered the truth and won!',
      fail: '❌ accusation was wrong! Eliminated from investigation.',
    }
  },

  es: {
    gameTitle: 'Clueamos',
    gameSubtitle: 'Misterio de Asesinato para 4 en el Hotel Grand Velvet',
    ruleTitle: 'Reglas para 4 Jugadores',
    rule1: 'Juega en pareja junto a 2 detectives de IA (Arthur y Blake) para máxima emoción.',
    rule2: 'La IA juega de forma justa sin trampas ni mirar las respuestas secretas.',
    rule3: 'Descubre los 4 elementos del crimen: Sospechoso, Lugar, Arma y el Móvil.',
    enterScene: 'Entrar a la Escena del Crimen',
    round: 'Ronda',
    turn: ' - Turno de',
    player: 'Jugador',
    detective: 'Detective IA',
    eliminated: 'Eliminado',
    cardsCount: 'cartas',
    viewNotes: 'Cuaderno de Deducción',
    viewMap: 'Mapa del Hotel',
    newGame: 'Nueva Partida',
    currentRoom: 'Habitación Actual',
    adjacentRoomsDesc: 'Lanza el dado para moverte a una habitación accesible',
    rollDiceBtn: 'Lanzar Dado 🎲',
    rollingDice: 'Lanzando...',
    rolledNumber: 'Sacaste',
    secretPassageBadge: '¡Pasaje Secreto!',
    cannotReachRoom: 'Muy lejos (Necesitas más dado)',
    distanceSteps: 'pasos',
    clickToEnter: 'Clic para entrar',
    secretPassageTo: 'Pasaje Secreto hacia',
    confidentialCaseFile: 'EXPEDIENTE CONFIDENCIAL',
    legendTiles: 'Casilla de Pasillo (1 Paso)',
    legendDoors: 'Puerta de Habitación',

    notebookTitle: 'Cuaderno de Investigación',
    notebookDesc: 'Haz clic para alternar ? / ✕ / ◯ (Tus cartas se marcan ✕ automáticamente)',
    suspectsHeader: 'Sospechosos (6)',
    locationsHeader: 'Lugares (6)',
    weaponsHeader: 'Armas (6)',
    motivesHeader: 'Móviles (4)',
    markUnknown: '?',
    markNo: '✕',
    markYes: '◯',

    secretHand: 'Mano Privada de',
    showHand: 'Mostrar',
    hideHand: 'Ocultar',

    askHypothesis: 'Proponer Hipótesis (Pregunta)',
    selectSuspect: 'Sospechoso',
    selectWeapon: 'Arma',
    selectMotive: 'Móvil',
    askQuestionBtn: 'Interrogar a los Detectives',

    finalAccusationBtn: '¡Acusación Final!',
    accuseTitle: 'Acusación Definitiva',
    accuseWarning: 'Atención: Solo tienes UNA oportunidad. ¡Si fallas, quedas eliminado!',
    accuseSuspect: 'Culpable (Sospechoso)',
    accuseLocation: 'Lugar del Crimen',
    accuseWeapon: 'Arma Homicida',
    accuseMotive: 'Móvil del Crimen',
    cancel: 'Cancelar',
    declareTruth: 'Declarar la Verdad',

    liveLogTitle: 'Registro de Actividad',
    detectivesListTitle: 'Detectives del Caso',

    investigationEnd: 'Investigación Concluida',
    truthRevealed: '¡resolvió el misterio y triunfó!',
    mysteryUnsolved: 'El culpable escapó y el caso quedó sin resolver.',
    secretSolutionTitle: 'La Verdad del Caso',
    solutionCulprit: 'Culpable',
    solutionLocation: 'Lugar',
    solutionWeapon: 'Arma',
    solutionMotive: 'Móvil',
    playAgain: 'Investigar Nuevo Caso',

    cards: {
      suspect_manager: { name: 'Gerente Bauer', description: 'El obstinado gerente del hotel que oculta oscuros secretos.' },
      suspect_colonel: { name: 'Coronel Hastings', description: 'Veterano militar visto merodeando por los pasillos de noche.' },
      suspect_chef: { name: 'Chef Pierre', description: 'Experto con cuchillos, discutió recientemente por inventarios.' },
      suspect_actress: { name: 'Actriz Verónica', description: 'Glamurosa diva que esconde una inminente bancarrota.' },
      suspect_doctor: { name: 'Dr. Klein', description: 'Neurocirujano inexpresivo que siempre lleva un maletín cerrado.' },
      suspect_guard: { name: 'Guardia Jack', description: 'Conoce cada puerta secreta y conducto de ventilación.' },

      room_ballroom: { name: 'Gran Salón', description: 'Salón de baile con candelabros de cristal titilantes.' },
      room_kitchen: { name: 'Cocina Principal', description: 'Cocina desordenada con cuchillos e ingredientes.' },
      room_library: { name: 'Biblioteca y Sala', description: 'Biblioteca antigua con chimenea y documentos confidenciales.' },
      room_wine_cellar: { name: 'Bodega de Vinos', description: 'Sótano frío y oscuro lleno de barricas añejas.' },
      room_room304: { name: 'Habitación Suite 304', description: 'Lujosa suite donde se encontró el cuerpo.' },
      room_rooftop: { name: 'Invernadero en Azotea', description: 'Invernadero de cristal azotado por la feroz tormenta.' },

      weapon_candlestick: { name: 'Candelabro de Plata', description: 'Pesado candelabro de plata antigua del salón.' },
      weapon_poison: { name: 'Frasco de Arsénico', description: 'Pequeño frasco azul con etiqueta rasgada.' },
      weapon_masterkey: { name: 'Llave Maestra', description: 'Llave de latón capaz de abrir cualquier puerta.' },
      weapon_rope: { name: 'Cuerda de Cortina', description: 'Fuerte cordón dorado tomado de los cortinajes.' },
      weapon_fountainpen: { name: 'Pluma Afilada', description: 'Pluma dorada lo bastante afilada para perforar.' },
      weapon_trophy: { name: 'Trofeo de Bronce', description: 'Pesado trofeo de caza de bronce de la biblioteca.' },

      motive_inheritance: { name: 'Herencia Millonaria', description: 'Disputa por un testamento falsificado.' },
      motive_blackmail: { name: 'Chantaje Letal', description: 'Cartas que revelan un escándalo imperdonable.' },
      motive_revenge: { name: 'Venganza de Sangre', description: 'Represalia por una tragedia de hace 10 años.' },
      motive_theft: { name: 'Robo de Diamante', description: 'Saqueo del raro Zafiro Azul de la caja fuerte.' },
    },
    rooms: {
      room_ballroom: { name: 'Gran Salón', description: 'Salón de baile con candelabros de cristal titilantes.' },
      room_kitchen: { name: 'Cocina Principal', description: 'Cocina desordenada con cuchillos e ingredientes.' },
      room_library: { name: 'Biblioteca y Sala', description: 'Biblioteca antigua con chimenea y documentos confidenciales.' },
      room_wine_cellar: { name: 'Bodega de Vinos', description: 'Sótano frío y oscuro lleno de barricas añejas.' },
      room_room304: { name: 'Habitación Suite 304', description: 'Lujosa suite donde se encontró el cuerpo.' },
      room_rooftop: { name: 'Invernadero en Azotea', description: 'Invernadero de cristal azotado por la feroz tormenta.' },
    },
    logMessages: {
      start: 'El crimen ha ocurrido. Comienza la investigación en el Hotel Grand Velvet.',
      move: 'se movió a',
      suggestion: 'pregunta:',
      disproved: 'mostró secretamente 1 carta para refutar la hipótesis.',
      noDisprove: '¡Nadie pudo refutar esta hipótesis! (Muy cerca de la verdad)',
      win: '🎉 [¡Caso Resuelto!] descubrió la verdad y ganó.',
      fail: '❌ falló en su acusación. ¡Queda fuera del caso!',
    }
  },

  ko: {
    gameTitle: 'Clueamos',
    gameSubtitle: '폭풍우 치는 밤의 그랜드 벨벳 호텔 4인 미스터리 추리극',
    ruleTitle: '부부 맞춤형 4인 플레이 룰',
    rule1: '둘이서도 지루하지 않게 컴퓨터 탐정 2명(아서, 블레이크)이 함께 추리합니다.',
    rule2: 'AI는 정답을 훔쳐보지 않으며, 여러분과 똑같은 단서만을 바탕으로 공정하게 행동합니다.',
    rule3: '용의자 6명, 장소 6곳, 도구 6개, 그리고 범행 동기 4개의 조합을 먼저 밝혀내세요.',
    enterScene: '사건 현장 입장하기',
    round: '라운드',
    turn: '의 차례',
    player: '플레이어',
    detective: 'AI 탐정',
    eliminated: '탈락됨',
    cardsCount: '장',
    viewNotes: '추리 수첩 보기',
    viewMap: '호텔 맵 보기',
    newGame: '새 게임',
    currentRoom: '현재 방',
    adjacentRoomsDesc: '주사위를 굴려 나온 눈금 이하의 방으로 이동하세요',
    rollDiceBtn: '주사위 굴리기 🎲',
    rollingDice: '굴리는 중...',
    rolledNumber: '주사위 눈금',
    secretPassageBadge: '비밀 통로!',
    cannotReachRoom: '거리 부족 (더 높은 주사위 필요)',
    distanceSteps: '칸',
    clickToEnter: '클릭하여 이동',
    secretPassageTo: '비밀 통로: ',
    confidentialCaseFile: '기밀 사건 수사 봉투',
    legendTiles: '복도 타일 (1칸)',
    legendDoors: '방 출입구',

    notebookTitle: '나만의 사건 추리 수첩',
    notebookDesc: '항목을 클릭해 ? / ✕ / ◯ 토글 (내 손패는 자동으로 ✕ 표기)',
    suspectsHeader: '용의자 (6)',
    locationsHeader: '현장 장소 (6)',
    weaponsHeader: '범행 도구 (6)',
    motivesHeader: '범행 동기 (4)',
    markUnknown: '?',
    markNo: '✕',
    markYes: '◯',

    secretHand: '의 비공개 손패',
    showHand: '확인하기',
    hideHand: '가리기',

    askHypothesis: '가설 질문 던지기',
    selectSuspect: '용의자 선택',
    selectWeapon: '도구 선택',
    selectMotive: '범행 동기 선택',
    askQuestionBtn: '탐정들에게 이 가설 질문하기',

    finalAccusationBtn: '최종 고발!',
    accuseTitle: '최종 사건 고발 (Accusation)',
    accuseWarning: '주의: 단 한 번의 기회입니다. 하나라도 틀릴 경우 당신은 수사에서 즉시 배제(탈락)됩니다!',
    accuseSuspect: '범인 (용의자)',
    accuseLocation: '사건 장소',
    accuseWeapon: '흉기 / 도구',
    accuseMotive: '범행 동기',
    cancel: '취소',
    declareTruth: '진실 선언하기',

    liveLogTitle: '실시간 사건 수사 일지',
    detectivesListTitle: '탐정 수사관 현황',

    investigationEnd: '수사 종료',
    truthRevealed: '님이 진실을 밝혀냈습니다!',
    mysteryUnsolved: '범인을 잡지 못하고 사건이 미궁에 빠졌습니다.',
    secretSolutionTitle: '사건의 진실 (Secret Solution)',
    solutionCulprit: '범인',
    solutionLocation: '장소',
    solutionWeapon: '도구',
    solutionMotive: '동기',
    playAgain: '새로운 사건 수사하기',

    cards: {
      suspect_manager: { name: '지배인 바우어', description: '호텔의 모든 비밀과 열쇠를 쥐고 있는 완고한 지배인.' },
      suspect_colonel: { name: '예비역 대령 헤이스팅스', description: '언제나 정복을 입고 다니며 밤마다 복도를 서성이는 군인 출신.' },
      suspect_chef: { name: '수셰프 피에르', description: '칼을 능숙하게 다루며 최근 주방 재고 문제로 다툰 적이 있음.' },
      suspect_actress: { name: '여배우 베로니카', description: '화려한 모습 뒤에 파산 직전의 경제적 위기를 감추고 있는 배우.' },
      suspect_doctor: { name: '신경외과의 닥터 클라인', description: '항상 가죽 가방을 지니고 다니며 표정을 읽을 수 없는 의사.' },
      suspect_guard: { name: '야간 경비원 잭', description: '호텔의 후문과 환풍구 구조를 누구보다 훤히 꿰뚫고 있는 인물.' },

      room_ballroom: { name: '연회장', description: '샹들리에가 희미하게 흔들리는 1층 대연회장.' },
      room_kitchen: { name: '메인 주방', description: '식기들이 어지럽게 널려 있는 주방.' },
      room_library: { name: '서재 & 라운지', description: '벽난로 불씨가 남아 있는 고풍스러운 서재.' },
      room_wine_cellar: { name: '지하 와인창고', description: '서늘하고 어두컴컴한 지하 와인 저장고.' },
      room_room304: { name: '객실 304호', description: '피해자가 머물렀던 테라스가 딸린 고급 스위트룸.' },
      room_rooftop: { name: '옥상 온실정원', description: '비바람이 들이치는 옥상의 유리 온실.' },

      weapon_candlestick: { name: '은제 촛대', description: '연회장 벽면에 장식되어 있던 고풍스러운 촛대.' },
      weapon_poison: { name: '비소 독약병', description: '라벨이 뜯겨나간 푸른색 작은 유리병.' },
      weapon_masterkey: { name: '황동 마스터키', description: '호텔의 모든 룸을 열 수 있는 마스터키.' },
      weapon_rope: { name: '커튼 밧줄', description: '연회장 커튼을 묶어두었던 금색 매듭 밧줄.' },
      weapon_fountainpen: { name: '날카로운 만년필', description: '서재 데스크에 놓여 있던 날카로운 금촉 만년필.' },
      weapon_trophy: { name: '청동 트로피', description: '서재 선반에 있던 묵직한 청동 트로피.' },

      motive_inheritance: { name: '막대한 유산 상속', description: '호텔 소유권을 둘러싼 유언장 위조와 상속 다툼.' },
      motive_blackmail: { name: '치명적 비밀 폭로', description: '과거의 치명적인 스캔들이 담긴 편지와 협박.' },
      motive_revenge: { name: '오랜 원한과 복수', description: '10년 전 사건에 대한 피의 복수극.' },
      motive_theft: { name: '희귀 다이아몬드 절도', description: '금고에 보관 중이던 블루 사파이어 강탈.' },
    },
    rooms: {
      room_ballroom: { name: '연회장', description: '샹들리에가 희미하게 흔들리는 1층 대연회장.' },
      room_kitchen: { name: '메인 주방', description: '식기들이 어지럽게 널려 있는 주방.' },
      room_library: { name: '서재 & 라운지', description: '벽난로 불씨가 남아 있는 고풍스러운 서재.' },
      room_wine_cellar: { name: '지하 와인창고', description: '서늘하고 어두컴컴한 지하 와인 저장고.' },
      room_room304: { name: '객실 304호', description: '피해자가 머물렀던 테라스가 딸린 고급 스위트룸.' },
      room_rooftop: { name: '옥상 온실정원', description: '비바람이 들이치는 옥상의 유리 온실.' },
    },
    logMessages: {
      start: '사건이 발생했습니다. 그랜드 벨벳 호텔의 조사가 시작됩니다.',
      move: '님이 다음 장소로 이동했습니다:',
      suggestion: '님의 질문:',
      disproved: '님이 증거 1장을 은밀히 제시하여 반증했습니다.',
      noDisprove: '아무도 이 가설을 반증하지 못했습니다! (정답에 매우 근접)',
      win: '🎉 [사건 해결!] 진실을 밝혀내어 승리했습니다!',
      fail: '❌ 최종 고발이 빗나갔습니다! 현장에서 배제됩니다.',
    }
  }
};
