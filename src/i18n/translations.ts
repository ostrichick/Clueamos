// 다국어 지원 번역 사전 (기본: 영어, 옵션: 스페인어, 한국어)
// 정통 Clue 3요소: 용의자(색상 이모지), 살인 장소(이모지), 흉기 도구(유니코드 이모지)

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
  aiLabel: string;
  selectCharacterTitle: string;
  selectCharacterSubtitle: string;
  player1Choice: string;
  player2Choice: string;
  aiDetectivesPreview: string;
  characterAlreadyChosen: string;
  startGame: string;
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
  askQuestionBtn: string;

  // Accusation
  finalAccusationBtn: string;
  accuseTitle: string;
  accuseWarning: string;
  accuseSuspect: string;
  accuseLocation: string;
  accuseWeapon: string;
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
    rule3: 'Deduce the 3 elements of the crime: Suspect, Murder Location, and Weapon.',
    enterScene: 'Enter Crime Scene',
    round: 'Round',
    turn: "'s Turn",
    player: 'Player',
    detective: 'AI Detective',
    aiLabel: 'AI',
    selectCharacterTitle: 'Choose Your Detectives',
    selectCharacterSubtitle: 'Player 1 and Player 2 select their characters. 2 AI detectives will join from the remaining pool.',
    player1Choice: 'Player 1 Character',
    player2Choice: 'Player 2 Character',
    aiDetectivesPreview: 'AI Detectives (Randomly Assigned)',
    characterAlreadyChosen: 'Chosen by Player 1',
    startGame: 'Start Investigation',
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
    locationsHeader: 'Murder Locations (6)',
    weaponsHeader: 'Murder Weapons (6)',
    markUnknown: '?',
    markNo: '✕',
    markYes: '◯',

    secretHand: "'s Private Hand",
    showHand: 'Show',
    hideHand: 'Hide',

    askHypothesis: 'Propose Hypothesis (Suggestion)',
    selectSuspect: 'Suspect',
    selectWeapon: 'Weapon',
    askQuestionBtn: 'Question Other Detectives',

    finalAccusationBtn: 'Final Accusation!',
    accuseTitle: 'Final Accusation',
    accuseWarning: 'Caution: You only get ONE shot. If you are wrong, you are eliminated from the investigation!',
    accuseSuspect: 'Culprit (Suspect)',
    accuseLocation: 'Murder Location (Crime Scene)',
    accuseWeapon: 'Murder Weapon',
    cancel: 'Cancel',
    declareTruth: 'Declare the Truth',

    liveLogTitle: 'Case Activity Log',
    detectivesListTitle: 'Detectives Roster',

    investigationEnd: 'Investigation Closed',
    truthRevealed: 'solved the mystery and brought justice!',
    mysteryUnsolved: 'The culprit escaped and the case remains cold.',
    secretSolutionTitle: 'The Truth of the Case',
    solutionCulprit: 'Culprit',
    solutionLocation: 'Murder Location',
    solutionWeapon: 'Murder Weapon',
    playAgain: 'Investigate New Case',

    cards: {
      suspect_scarlett: { name: '🔴 Miss Scarlett', description: 'Glamorous actress in a striking crimson gown with many secrets.' },
      suspect_mustard: { name: '🟡 Colonel Mustard', description: 'Decorated military veteran in his mustard uniform, skilled with weaponry.' },
      suspect_white: { name: '⚪ Mrs. White', description: 'Meticulous head housekeeper dressed in immaculate white with master keys.' },
      suspect_green: { name: '🟢 Mr. Green', description: 'Shrewd businessman in a green pinstripe suit, holding massive debts.' },
      suspect_peacock: { name: '🔵 Mrs. Peacock', description: 'High-society widow adorned in elegant blue peacock feathers and jewelry.' },
      suspect_plum: { name: '🟣 Professor Plum', description: 'Eccentric archaeology professor in a plum velvet vest, prone to outbursts.' },

      room_ballroom: { name: '💃 Grand Ballroom', description: 'Opulent first floor ballroom with crystal chandeliers.' },
      room_kitchen: { name: '🍳 Main Kitchen', description: 'Cluttered kitchen with culinary blades and industrial cookware.' },
      room_library: { name: '📚 Library & Lounge', description: 'Antique library with a crackling fireplace and rare tomes.' },
      room_wine_cellar: { name: '🍷 Wine Cellar', description: 'Cold, shadowy basement vault filled with vintage barrels.' },
      room_room304: { name: '🛏️ Suite Room 304', description: 'Luxurious private terrace suite where the body was discovered.' },
      room_rooftop: { name: '🌿 Rooftop Greenhouse', description: 'Glass conservatory battered by the raging midnight storm.' },

      weapon_candlestick: { name: '🕯️ Candlestick', description: 'Heavy solid silver candlestick taken from the ballroom.' },
      weapon_knife: { name: '🔪 Knife', description: 'Razor-sharp chef carving knife missing from the kitchen.' },
      weapon_revolver: { name: '🔫 Revolver', description: 'Six-shot service handgun removed from the colonel holster.' },
      weapon_rope: { name: '🪢 Rope', description: 'Strong golden braided curtain cord from the terrace suite.' },
      weapon_wrench: { name: '🔧 Wrench', description: 'Heavy steel pipe wrench from the basement utility room.' },
      weapon_poison: { name: '🧪 Poison', description: 'Lethal bottle of cyanide with a scratched prescription label.' },
    },
    rooms: {
      room_ballroom: { name: '💃 Grand Ballroom', description: 'Opulent first floor ballroom with crystal chandeliers.' },
      room_kitchen: { name: '🍳 Main Kitchen', description: 'Cluttered kitchen with culinary blades and industrial cookware.' },
      room_library: { name: '📚 Library & Lounge', description: 'Antique library with a crackling fireplace and rare tomes.' },
      room_wine_cellar: { name: '🍷 Wine Cellar', description: 'Cold, shadowy basement vault filled with vintage barrels.' },
      room_room304: { name: '🛏️ Suite Room 304', description: 'Luxurious private terrace suite where the body was discovered.' },
      room_rooftop: { name: '🌿 Rooftop Greenhouse', description: 'Glass conservatory battered by the raging midnight storm.' },
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
    rule3: 'Descubre los 3 elementos del crimen: Sospechoso, Lugar del Crimen y Arma Homicida.',
    enterScene: 'Entrar a la Escena del Crimen',
    round: 'Ronda',
    turn: ' - Turno de',
    player: 'Jugador',
    detective: 'Detective IA',
    aiLabel: 'IA',
    selectCharacterTitle: 'Elige tus Detectives',
    selectCharacterSubtitle: 'El Jugador 1 y el Jugador 2 eligen a sus personajes. 2 detectives de IA se unirán del grupo restante.',
    player1Choice: 'Personaje del Jugador 1',
    player2Choice: 'Personaje del Jugador 2',
    aiDetectivesPreview: 'Detectives de IA (Asignados al azar)',
    characterAlreadyChosen: 'Elegido por Jugador 1',
    startGame: 'Iniciar Investigación',
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
    locationsHeader: 'Lugares del Crimen (6)',
    weaponsHeader: 'Armas Homicidas (6)',
    markUnknown: '?',
    markNo: '✕',
    markYes: '◯',

    secretHand: 'Mano Privada de',
    showHand: 'Mostrar',
    hideHand: 'Ocultar',

    askHypothesis: 'Proponer Hipótesis (Pregunta)',
    selectSuspect: 'Sospechoso',
    selectWeapon: 'Arma',
    askQuestionBtn: 'Interrogar a los Detectives',

    finalAccusationBtn: '¡Acusación Final!',
    accuseTitle: 'Acusación Definitiva',
    accuseWarning: 'Atención: Solo tienes UNA oportunidad. ¡Si fallas, quedas fuera del caso!',
    accuseSuspect: 'Culpable (Sospechoso)',
    accuseLocation: 'Lugar del Crimen',
    accuseWeapon: 'Arma Homicida',
    cancel: 'Cancelar',
    declareTruth: 'Declarar la Verdad',

    liveLogTitle: 'Registro de Actividad',
    detectivesListTitle: 'Detectives del Caso',

    investigationEnd: 'Investigación Concluida',
    truthRevealed: '¡resolvió el misterio y triunfó!',
    mysteryUnsolved: 'El culpable escapó y el caso quedó sin resolver.',
    secretSolutionTitle: 'La Verdad del Caso',
    solutionCulprit: 'Culpable',
    solutionLocation: 'Lugar del Crimen',
    solutionWeapon: 'Arma Homicida',
    playAgain: 'Investigar Nuevo Caso',

    cards: {
      suspect_scarlett: { name: '🔴 Señorita Escarlata', description: 'Glamurosa actriz vestida de rojo carmesí llena de secretos.' },
      suspect_mustard: { name: '🟡 Coronel Mostaza', description: 'Veterano militar con uniforme mostaza, experto en tácticas y armas.' },
      suspect_white: { name: '⚪ Señora Blanco', description: 'Gobernanta jefa vestida de blanco impecable con llave maestra.' },
      suspect_green: { name: '🟢 Señor Verde', description: 'Astuto negociante con traje de rayas verdes que oculta grandes deudas.' },
      suspect_peacock: { name: '🔵 Señora Pavo Real', description: 'Viuda de alta sociedad con elegante broche de plumas azules.' },
      suspect_plum: { name: '🟣 Profesor Mora', description: 'Excéntrico arqueólogo con chaleco de terciopelo morado.' },

      room_ballroom: { name: '💃 Gran Salón', description: 'Lujoso salón de baile con candelabros de cristal titilantes.' },
      room_kitchen: { name: '🍳 Cocina Principal', description: 'Cocina desordenada con cuchillos e ingredientes de cocina.' },
      room_library: { name: '📚 Biblioteca y Sala', description: 'Biblioteca clásica con chimenea y libros centenarios.' },
      room_wine_cellar: { name: '🍷 Bodega de Vinos', description: 'Sótano frío y oscuro lleno de barricas añejas.' },
      room_room304: { name: '🛏️ Habitación Suite 304', description: 'Exclusiva suite con terraza donde se encontró el cuerpo.' },
      room_rooftop: { name: '🌿 Invernadero en Azotea', description: 'Invernadero de cristal azotado por la tormenta nocturna.' },

      weapon_candlestick: { name: '🕯️ Candelabro', description: 'Pesado candelabro de plata maciza del gran salón.' },
      weapon_knife: { name: '🔪 Cuchillo', description: 'Afilado cuchillo de chef que desapareció de la cocina.' },
      weapon_revolver: { name: '🔫 Revólver', description: 'Arma de seis tiros sustraída de la cartuchera militar.' },
      weapon_rope: { name: '🪢 Cuerda', description: 'Fuerte cordón dorado de las cortinas de la suite.' },
      weapon_wrench: { name: '🔧 Llave Inglesa', description: 'Pesada llave de acero del cuarto de calderas del sótano.' },
      weapon_poison: { name: '🧪 Veneno', description: 'Letal frasco de cianuro con la etiqueta arrancada.' },
    },
    rooms: {
      room_ballroom: { name: '💃 Gran Salón', description: 'Lujoso salón de baile con candelabros de cristal titilantes.' },
      room_kitchen: { name: '🍳 Cocina Principal', description: 'Cocina desordenada con cuchillos e ingredientes de cocina.' },
      room_library: { name: '📚 Biblioteca y Sala', description: 'Biblioteca clásica con chimenea y libros centenarios.' },
      room_wine_cellar: { name: '🍷 Bodega de Vinos', description: 'Sótano frío y oscuro lleno de barricas añejas.' },
      room_room304: { name: '🛏️ Habitación Suite 304', description: 'Exclusiva suite con terraza donde se encontró el cuerpo.' },
      room_rooftop: { name: '🌿 Invernadero en Azotea', description: 'Invernadero de cristal azotado por la tormenta nocturna.' },
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
    rule3: '용의자 6명, 살인 장소 6곳, 범행 도구 6개의 조합을 먼저 밝혀내세요.',
    enterScene: '사건 현장 입장하기',
    round: '라운드',
    turn: '의 차례',
    player: '플레이어',
    detective: 'AI 탐정',
    aiLabel: 'AI',
    selectCharacterTitle: '사건을 맡을 탐정 캐릭터 선택',
    selectCharacterSubtitle: '플레이어 1과 2가 각자의 용의자 캐릭터를 선택합니다. 남은 캐릭터 중 2명은 AI 탐정으로 자동 합류합니다.',
    player1Choice: '플레이어 1 캐릭터',
    player2Choice: '플레이어 2 캐릭터',
    aiDetectivesPreview: 'AI 탐정 (남은 캐릭터 중 자동 배정)',
    characterAlreadyChosen: '플레이어 1 선택 완료',
    startGame: '사건 수사 시작',
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
    locationsHeader: '살인이 일어난 장소 (6)',
    weaponsHeader: '범행 도구 (6)',
    markUnknown: '?',
    markNo: '✕',
    markYes: '◯',

    secretHand: '의 비공개 손패',
    showHand: '확인하기',
    hideHand: '가리기',

    askHypothesis: '가설 질문 던지기',
    selectSuspect: '용의자 선택',
    selectWeapon: '도구 선택',
    askQuestionBtn: '탐정들에게 이 가설 질문하기',

    finalAccusationBtn: '최종 고발!',
    accuseTitle: '최종 사건 고발 (Accusation)',
    accuseWarning: '주의: 단 한 번의 기회입니다. 하나라도 틀릴 경우 당신은 수사에서 즉시 배제(탈락)됩니다!',
    accuseSuspect: '범인 (용의자)',
    accuseLocation: '살인이 일어난 장소',
    accuseWeapon: '흉기 / 도구',
    cancel: '취소',
    declareTruth: '진실 선언하기',

    liveLogTitle: '실시간 사건 수사 일지',
    detectivesListTitle: '탐정 수사관 현황',

    investigationEnd: '수사 종료',
    truthRevealed: '님이 진실을 밝혀냈습니다!',
    mysteryUnsolved: '범인을 잡지 못하고 사건이 미궁에 빠졌습니다.',
    secretSolutionTitle: '사건의 진실 (Secret Solution)',
    solutionCulprit: '범인',
    solutionLocation: '살인 장소',
    solutionWeapon: '흉기',
    playAgain: '새로운 사건 수사하기',

    cards: {
      suspect_scarlett: { name: '🔴 미스 스칼렛', description: '매혹적인 붉은 드레스를 입은 유명 배우. 호텔 곳곳의 비밀을 알고 있다.' },
      suspect_mustard: { name: '🟡 커널 머스타드', description: '빛바랜 황색 정복을 차려입은 예비역 대령. 무기와 전술에 능통하다.' },
      suspect_white: { name: '⚪ 미세스 화이트', description: '결벽증이 있는 호텔 수석 지배인. 흰색 유니폼에 마스터키를 소지한다.' },
      suspect_green: { name: '🟢 미스터 그린', description: '초록색 핀스트라이프 양복의 수상한 사업가. 거액의 채무를 쥐고 있다.' },
      suspect_peacock: { name: '🔵 미세스 피콕', description: '푸른 공작 깃털 브로치를 단 상류층 미망인. 유산 상속을 노린다.' },
      suspect_plum: { name: '🟣 프로페서 플럼', description: '보랏빛 벨벳 조끼를 입은 괴짜 고고학 교수. 피해자와 심한 언쟁을 벌였다.' },

      room_ballroom: { name: '💃 연회장', description: '샹들리에가 희미하게 흔들리는 1층 대연회장.' },
      room_kitchen: { name: '🍳 메인 주방', description: '각종 조리도구와 날카로운 칼들이 널려 있는 주방.' },
      room_library: { name: '📚 서재 & 라운지', description: '벽난로 불씨가 남아 있는 고풍스러운 서재.' },
      room_wine_cellar: { name: '🍷 지하 와인창고', description: '서늘하고 어두컴컴한 지하 와인 저장고.' },
      room_room304: { name: '🛏️ 객실 304호', description: '피해자가 머물렀던 테라스가 딸린 고급 스위트룸.' },
      room_rooftop: { name: '🌿 옥상 온실정원', description: '비바람이 들이치는 옥상의 유리 온실.' },

      weapon_candlestick: { name: '🕯️ 은제 촛대', description: '연회장 벽면에 장식되어 있던 묵직한 순은 촛대.' },
      weapon_knife: { name: '🔪 단검', description: '주방에서 사라진 날카로운 조리용 칼.' },
      weapon_revolver: { name: '🔫 리볼버', description: '대령의 군용 가죽 홀스터에서 없어진 6연발 권총.' },
      weapon_rope: { name: '🪢 밧줄', description: '스위트룸 테라스 커튼을 묶어두었던 금색 매듭 밧줄.' },
      weapon_wrench: { name: '🔧 렌치', description: '지하 보일러 배관 점검에 사용된 묵직한 강철 렌치.' },
      weapon_poison: { name: '🧪 독약병', description: '라벨이 뜯겨나간 치명적인 청산가리 유리병.' },
    },
    rooms: {
      room_ballroom: { name: '💃 연회장', description: '샹들리에가 희미하게 흔들리는 1층 대연회장.' },
      room_kitchen: { name: '🍳 메인 주방', description: '각종 조리도구와 날카로운 칼들이 널려 있는 주방.' },
      room_library: { name: '📚 서재 & 라운지', description: '벽난로 불씨가 남아 있는 고풍스러운 서재.' },
      room_wine_cellar: { name: '🍷 지하 와인창고', description: '서늘하고 어두컴컴한 지하 와인 저장고.' },
      room_room304: { name: '🛏️ 객실 304호', description: '피해자가 머물렀던 테라스가 딸린 고급 스위트룸.' },
      room_rooftop: { name: '🌿 옥상 온실정원', description: '비바람이 들이치는 옥상의 유리 온실.' },
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
