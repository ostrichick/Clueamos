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
  aiCountTitle: string;
  aiCountSubtitle: string;
  aiCount0: string;
  aiCount1: string;
  aiCount2: string;
  aiCount3: string;
  aiCount4: string;
  aiCountGuestNote: string;
  characterAlreadyChosen: string;
  startGame: string;
  playModeLocal: string;
  playModeMulti: string;
  playModeSolo: string;
  playModeSoloDesc: string;
  aiRolling: string;
  aiMoving: string;
  aiSuggesting: string;
  rolledResultOnBoard: string;
  passDeviceToPlayer2: string;
  exitToLobby: string;
  confirmExitToLobby: string;
  hostRoomTitle: string;
  joinRoomTitle: string;
  hostRoomBtn: string;
  joinRoomBtn: string;
  roomCodeLabel: string;
  enterRoomCodePlaceholder: string;
  copyInviteLink: string;
  inviteLinkCopied: string;
  waitingForPlayer2: string;
  player2Connected: string;
  connectedToRoom: string;
  connectingToRoom: string;
  waitingForOtherPlayer: string;
  disprovePromptTitle: string;
  disprovePromptDesc: string;
  submitDisproveBtn: string;
  secretClueReceived: string;
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

  // Hand & Physical Cards
  secretHand: string;
  showHand: string;
  hideHand: string;
  cardHandTitle: string;
  suspectCard: string;
  locationCard: string;
  weaponCard: string;
  cardPassingTo: string;
  cardPassedFrom: string;
  tapToFlip: string;
  markInNotesAndClose: string;
  inspectCard: string;
  disproveCardSelectionPrompt: string;

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

  // New Features
  waitInHallway: string;
  waitInHallwayDesc: string;
  summonedForQuestioning: string;
  bgmMusic: string;
  notebookSimpleMode: string;
  notebookMatrixMode: string;
  investigationTimeline: string;
  online: string;
  offline: string;

  // Turn Stepper & Table Immersion
  stepRollDice: string;
  stepMoveRoom: string;
  stepSuggest: string;
  stepEndTurn: string;
  stepWaiting: string;
  actionDoneTitle: string;
  actionDoneDesc: string;
  endTurnBtn: string;
  makeAccusationBtn: string;
  aiActionDone: string;
  smartAssistTitle: string;
  smartAssistDesc: string;
  smartClueDisprovedTag: string;
  handBadge: string;
  resetNotes: string;
  caseFileTitle: string;
  caseFileDesc: string;
  caseFileSealWarning: string;
  close: string;
  emoteObserve: string;
  emotePonder: string;
  emoteEureka: string;
  emoteTea: string;
  shakeToRoll: string;
  sortByCategory: string;
  quickNotes: string;
  secretPassagePrompt: string;
  backToBoard: string;

  // AFK & Auto-Play
  afkWarningTitle: string;
  afkWarningDesc: string;
  afkSecondsRemaining: string;
  afkImHere: string;
  autoPlayingBanner: string;
  autoPlayingDesc: string;
  autoPlayingResume: string;

  // Turn Review & Deduction Time
  turnReviewTitle: string;
  turnReviewSubtitle: string;
  turnReviewConfirmBtn: string;
  turnReviewWaitingPeer: string;
  turnReviewP1Ready: string;
  turnReviewP2Ready: string;
  turnReviewP1Writing: string;
  turnReviewP2Writing: string;
  inHandBadge: string;
  inHandTag: string;

  // Game Over
  investigationEnd: string;
  truthRevealed: string;
  mysteryUnsolved: string;
  secretSolutionTitle: string;
  solutionCulprit: string;
  solutionLocation: string;
  solutionWeapon: string;
  playAgain: string;

  // Hypothesis Visualizer
  hypothesisTitle: string;
  hypothesisSubtitle: string;
  checkingDisprovers: string;
  disprovedBy: string;
  cardShownNotice: string;
  cardShownToYou: string;
  youShowedCard: string;
  nobodyDisproved: string;
  nobodyDisprovedSub: string;
  continueBtn: string;
  markNotebookAndClose: string;
  presentedClue: string;
  secretClueExchange: string;

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
  aiDialogue: {
    arthur: {
      move: string[];
      suggest: string[];
      disprove: string[];
      cannotDisprove: string[];
      summoned: string[];
    };
    blake: {
      move: string[];
      suggest: string[];
      disprove: string[];
      cannotDisprove: string[];
      summoned: string[];
    };
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
    aiCountTitle: 'Additional AI Detectives',
    aiCountSubtitle: 'Choose how many AI detectives to include alongside the 2 human players (Total: 2 to 6 players)',
    aiCount0: '0 AIs (1v1 Duel)',
    aiCount1: '1 AI (3 Players)',
    aiCount2: '2 AIs (4 Players - Default)',
    aiCount3: '3 AIs (5 Players)',
    aiCount4: '4 AIs (6 Players - Full Party)',
    aiCountGuestNote: 'Set by Host',
    characterAlreadyChosen: 'Chosen by Player 1',
    startGame: 'Start Investigation',
    playModeLocal: 'Single Screen (Pass & Play)',
    playModeMulti: '1. Multiplayer (Host / Join)',
    playModeSolo: '2. Solo Play (vs 3 AIs)',
    playModeSoloDesc: 'Test your deductive wits against 3 intelligent AI detectives.',
    aiRolling: 'Rolling the dice...',
    aiMoving: 'Moving across the mansion...',
    aiSuggesting: 'Proposing a deduction hypothesis...',
    rolledResultOnBoard: 'Rolled',
    passDeviceToPlayer2: "Player 2's turn! Please pass the device.",
    exitToLobby: 'Exit to Setup',
    confirmExitToLobby: 'Are you sure you want to exit the current investigation and return to the main setup screen?',
    hostRoomTitle: 'Create Room (Player 1)',
    joinRoomTitle: 'Join Room (Player 2)',
    hostRoomBtn: 'Create Room',
    joinRoomBtn: 'Join Room',
    roomCodeLabel: 'Room Code',
    enterRoomCodePlaceholder: 'Enter 2-digit code (e.g. 42)',
    copyInviteLink: 'Copy Invite Link',
    inviteLinkCopied: 'Invite link copied to clipboard!',
    waitingForPlayer2: 'Waiting for Player 2 to join...',
    player2Connected: 'Player 2 connected!',
    connectedToRoom: 'Connected to room',
    connectingToRoom: 'Connecting to room...',
    waitingForOtherPlayer: 'is investigating... please wait',
    disprovePromptTitle: 'Secret Disprove Required',
    disprovePromptDesc: 'Select 1 card from your hand to secretly reveal:',
    submitDisproveBtn: 'Reveal Clue',
    secretClueReceived: 'secretly showed you this clue',
    eliminated: 'Eliminated',
    cardsCount: 'cards',
    viewNotes: 'Deduction Sheet',
    viewMap: 'Hotel Map',
    newGame: 'New Game',
    currentRoom: 'Current Room',
    adjacentRoomsDesc: 'Roll 2 dice to move to an accessible room',
    rollDiceBtn: 'Roll 2 Dice 🎲',
    rollingDice: 'Rolling...',
    rolledNumber: 'Dice Rolled',
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
    cardHandTitle: 'My Detective Cards',
    suspectCard: 'SUSPECT',
    locationCard: 'LOCATION',
    weaponCard: 'WEAPON',
    cardPassingTo: 'Passing card to',
    cardPassedFrom: 'passed you a secret clue!',
    tapToFlip: 'Tap card to reveal',
    markInNotesAndClose: '📝 Mark in Notebook & Got It',
    inspectCard: 'Inspect Card',
    disproveCardSelectionPrompt: 'Select 1 card from your hand to slide across:',

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

    waitInHallway: 'Wait in Hallway',
    waitInHallwayDesc: 'Cannot reach any room with this roll. Wait in the corridor and pass turn.',
    summonedForQuestioning: 'was summoned for questioning!',
    bgmMusic: 'Noir BGM',
    notebookSimpleMode: 'Quick Checklist',
    notebookMatrixMode: 'Detective Matrix',
    investigationTimeline: 'Investigation Timeline & Debrief',
    online: 'Online',
    offline: 'Reconnecting...',

    stepRollDice: 'Roll Die',
    stepMoveRoom: 'Move to Room',
    stepSuggest: 'Investigate',
    stepEndTurn: 'End Turn / Accuse',
    stepWaiting: 'Waiting...',
    actionDoneTitle: 'Action Completed',
    actionDoneDesc: 'You can now pass your turn to the next detective, or make a bold Final Accusation if you know the truth!',
    endTurnBtn: 'Pass Turn ⏭️',
    makeAccusationBtn: 'Final Accusation 🔍',
    aiActionDone: 'Wrapping up turn...',
    smartAssistTitle: 'Smart Clue Assist',
    smartAssistDesc: 'Auto-marks your hand and flags clues disproved by other detectives',
    smartClueDisprovedTag: 'Disproved',
    handBadge: 'HAND',
    resetNotes: 'Clear Notes',
    caseFileTitle: 'Confidential Murder Case File',
    caseFileDesc: 'Sealed with red wax. Contains the true culprit, murder location, and murder weapon. Can only be opened during the Final Accusation.',
    caseFileSealWarning: 'Wax seal unbroken. Final accusation required to unseal.',
    close: 'Close',
    emoteObserve: '🧐 Observe',
    emotePonder: '🤔 Ponder',
    emoteEureka: '💡 Eureka!',
    emoteTea: '☕ Tea Break',
    shakeToRoll: 'Shake phone or tap to roll!',
    sortByCategory: 'Sort Hand',
    quickNotes: 'Notebook',
    secretPassagePrompt: 'Take Secret Passage to',
    backToBoard: 'Back to Board',

    afkWarningTitle: 'Inactivity Warning',
    afkWarningDesc: 'No action for 1 minute. AI will take over your turn in 30 seconds.',
    afkSecondsRemaining: 'seconds left',
    afkImHere: "I'm Here! (OK)",
    autoPlayingBanner: 'AI Auto-Play Active (AFK)',
    autoPlayingDesc: 'AI is automatically making moves on your behalf while you are away.',
    autoPlayingResume: 'Resume Control (OK)',

    turnReviewTitle: 'Turn Review & Deduction Time',
    turnReviewSubtitle: 'Review clues and update your detective notebook. The next turn will begin when all players are ready.',
    turnReviewConfirmBtn: 'Notes Ready / Next Turn (OK)',
    turnReviewWaitingPeer: 'Waiting for other detective to finish notes...',
    turnReviewP1Ready: 'P1 Ready ✓',
    turnReviewP2Ready: 'P2 Ready ✓',
    turnReviewP1Writing: 'P1 Reviewing ⏳',
    turnReviewP2Writing: 'P2 Reviewing ⏳',
    inHandBadge: 'IN HAND',
    inHandTag: ' [✕ In Hand]',

    investigationEnd: 'Investigation Closed',
    truthRevealed: 'solved the mystery and brought justice!',
    mysteryUnsolved: 'The culprit escaped and the case remains cold.',
    secretSolutionTitle: 'The Truth of the Case',
    solutionCulprit: 'Culprit',
    solutionLocation: 'Murder Location',
    solutionWeapon: 'Murder Weapon',
    playAgain: 'Investigate New Case',

    hypothesisTitle: "'s Hypothesis",
    hypothesisSubtitle: "Investigating the incident in the",
    checkingDisprovers: "Questioning other detectives for evidence...",
    disprovedBy: "disproved the hypothesis!",
    cardShownNotice: "revealed a clue to",
    cardShownToYou: "secretly showed you this clue:",
    youShowedCard: "You showed this clue to",
    nobodyDisproved: "Nobody could disprove this hypothesis!",
    nobodyDisprovedSub: "These 3 clues are highly likely inside the confidential case file!",
    continueBtn: "Continue",
    markNotebookAndClose: "Mark in Notebook & Close",
    presentedClue: "Presented Clue",
    secretClueExchange: "Secret AI Exchange",

    cards: {
      suspect_scarlett: { name: '🔴 Miss Scarlett', description: 'Glamorous actress in a striking crimson gown with many secrets.' },
      suspect_mustard: { name: '🟡 Colonel Mustard', description: 'Decorated military veteran in his mustard uniform, skilled with weaponry.' },
      suspect_white: { name: '⚪ Mrs. White', description: 'Meticulous head housekeeper dressed in immaculate white with master keys.' },
      suspect_green: { name: '🟢 Mr. Green', description: 'Shrewd businessman in a green pinstripe suit, holding massive debts.' },
      suspect_peacock: { name: '🔵 Mrs. Peacock', description: 'High-society widow adorned in elegant blue peacock feathers and jewelry.' },
      suspect_plum: { name: '🟣 Professor Plum', description: 'Eccentric archaeology professor in a plum velvet vest, prone to outbursts.' },

      room_ballroom: { name: '💃 Grand Ballroom', description: 'Opulent first floor ballroom with crystal chandeliers.' },
      room_kitchen: { name: '🍳 Main Kitchen', description: 'Cluttered kitchen with culinary blades and industrial cookware.' },
      room_library: { name: '📚 Library', description: 'Antique library with a crackling fireplace and rare tomes.' },
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
      room_library: { name: '📚 Library', description: 'Antique library with a crackling fireplace and rare tomes.' },
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
    },
    aiDialogue: {
      arthur: {
        move: [
          'Deductive probability indicates the crime originated here.',
          'Systematically eliminating variables in this room.',
          'A meticulous mind overlooks no detail in this location.'
        ],
        suggest: [
          'Logically, this scenario presents the fewest contradictions. Can anyone refute it?',
          'My working hypothesis is formulated. What say the evidence?',
          'Testing the hypothesis: suspect, location, and weapon.'
        ],
        disprove: [
          'I hold documentary evidence contrary to your supposition.',
          'Logic dictates this card disproves your scenario.'
        ],
        cannotDisprove: [
          'I possess no records to contradict that claim.',
          'Fascinating... that scenario remains plausible.'
        ],
        summoned: [
          'Pardon me, summoned for questioning. What is your hypothesis?',
          'Called to the crime scene! Let us cross-examine the facts.'
        ]
      },
      blake: {
        move: [
          'My gut never lies. The truth is hiding in this room!',
          'Following the scent of a criminal... I sense foul play here!',
          'Let’s kick down this door and see what rattles loose!'
        ],
        suggest: [
          'Don’t try to play poker with me—here’s what really went down!',
          'I can smell the deceit in this room! Refute this if you can!',
          'Who has the guts to challenge my detective instincts?'
        ],
        disprove: [
          'Hold your horses! I’ve got the card right here!',
          'Not on my watch! This card proves you got it wrong!'
        ],
        cannotDisprove: [
          'Tch... got nothing in my hand to call your bluff.',
          'Can’t help you there, partner. My hands are clean.'
        ],
        summoned: [
          'Who dragged me into this room?! What’s the accusation?',
          'Questioning me? Ha! You better have solid proof!'
        ]
      }
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
    aiCountTitle: 'Detectives de IA Adicionales',
    aiCountSubtitle: 'Elige cuántos detectives de IA agregar junto a los 2 jugadores humanos (Total: 2 a 6 jugadores)',
    aiCount0: '0 IA (Duelo 1v1)',
    aiCount1: '1 IA (3 Jugadores)',
    aiCount2: '2 IA (4 Jugadores - Por defecto)',
    aiCount3: '3 IA (5 Jugadores)',
    aiCount4: '4 IA (6 Jugadores - Mansión Completa)',
    aiCountGuestNote: 'Configurado por el Anfitrión',
    characterAlreadyChosen: 'Elegido por Jugador 1',
    startGame: 'Iniciar Investigación',
    playModeLocal: 'Una Pantalla (Pass & Play)',
    playModeMulti: '1. Multijugador (Crear / Unirse)',
    playModeSolo: '2. En Solitario (vs 3 IA)',
    playModeSoloDesc: 'Pon a prueba tus habilidades de deducción contra 3 detectives de IA.',
    aiRolling: 'Lanzando los dados...',
    aiMoving: 'Moviéndose por la mansión...',
    aiSuggesting: 'Proponiendo una hipótesis deductiva...',
    rolledResultOnBoard: 'Resultado',
    passDeviceToPlayer2: '¡Turno del Jugador 2! Por favor, pasa el dispositivo.',
    exitToLobby: 'Menú Principal',
    confirmExitToLobby: '¿Estás seguro de que deseas salir de la investigación actual y volver a la configuración principal?',
    hostRoomTitle: 'Crear Sala (Jugador 1)',
    joinRoomTitle: 'Unirse a Sala (Jugador 2)',
    hostRoomBtn: 'Crear Sala',
    joinRoomBtn: 'Unirse a Sala',
    roomCodeLabel: 'Código de Sala',
    enterRoomCodePlaceholder: 'Ingresa código de 2 dígitos (ej. 42)',
    copyInviteLink: 'Copiar Enlace de Invitación',
    inviteLinkCopied: '¡Enlace de invitación copiado!',
    waitingForPlayer2: 'Esperando a que se una el Jugador 2...',
    player2Connected: '¡Jugador 2 conectado!',
    connectedToRoom: 'Conectado a la sala',
    connectingToRoom: 'Conectando a la sala...',
    waitingForOtherPlayer: 'está investigando... por favor espera',
    disprovePromptTitle: 'Refutación Secreta Requerida',
    disprovePromptDesc: 'Elige 1 carta de tu mano para mostrar en secreto:',
    submitDisproveBtn: 'Mostrar Pista',
    secretClueReceived: 'te mostró esta pista en secreto',
    eliminated: 'Eliminado',
    cardsCount: 'cartas',
    viewNotes: 'Cuaderno de Deducción',
    viewMap: 'Mapa del Hotel',
    newGame: 'Nueva Partida',
    currentRoom: 'Habitación Actual',
    adjacentRoomsDesc: 'Lanza 2 dados para moverte a una habitación accesible',
    rollDiceBtn: 'Lanzar 2 Dados 🎲',
    rollingDice: 'Lanzando...',
    rolledNumber: 'Dados Lanzados',
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
    cardHandTitle: 'Mis Cartas de Detective',
    suspectCard: 'SOSPECHOSO',
    locationCard: 'LUGAR',
    weaponCard: 'ARMA',
    cardPassingTo: 'Entregando carta a',
    cardPassedFrom: '¡te pasó una pista secreta!',
    tapToFlip: 'Toca la carta para revelar',
    markInNotesAndClose: '📝 Marcar en Cuaderno y Confirmar',
    inspectCard: 'Inspeccionar Carta',
    disproveCardSelectionPrompt: 'Elige 1 carta de tu mano para pasar:',

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

    waitInHallway: 'Esperar en el Pasillo',
    waitInHallwayDesc: 'No alcanzas ninguna habitación con esta tirada. Espera en el pasillo.',
    summonedForQuestioning: '¡fue convocado para interrogatorio!',
    bgmMusic: 'Música Noir',
    notebookSimpleMode: 'Lista Rápida',
    notebookMatrixMode: 'Matriz Detective',
    investigationTimeline: 'Línea de Tiempo del Caso',
    online: 'En línea',
    offline: 'Reconectando...',

    stepRollDice: 'Lanzar Dado',
    stepMoveRoom: 'Mover a Habitación',
    stepSuggest: 'Investigar',
    stepEndTurn: 'Terminar / Acusar',
    stepWaiting: 'Esperando...',
    actionDoneTitle: 'Acción Completada',
    actionDoneDesc: 'Puedes pasar el turno al siguiente detective, o hacer una Acusación Final si conoces la verdad.',
    endTurnBtn: 'Pasar Turno ⏭️',
    makeAccusationBtn: 'Acusación Final 🔍',
    aiActionDone: 'Finalizando turno...',
    smartAssistTitle: 'Asistente de Pistas',
    smartAssistDesc: 'Marca automáticamente tu mano y resalta pistas desmentidas por otros detectives',
    smartClueDisprovedTag: 'Desmentido',
    handBadge: 'MANO',
    resetNotes: 'Borrar Notas',
    caseFileTitle: 'Expediente Confidencial del Asesinato',
    caseFileDesc: 'Sellado con cera roja. Contiene al verdadero culpable, lugar y arma homicida. Solo puede abrirse durante la Acusación Final.',
    caseFileSealWarning: 'Sello de cera intacto. Se requiere acusación formal para desellar.',
    close: 'Cerrar',
    emoteObserve: '🧐 Observar',
    emotePonder: '🤔 Pensar',
    emoteEureka: '💡 ¡Eureka!',
    emoteTea: '☕ Tomar Té',
    shakeToRoll: '¡Agita el móvil o pulsa para lanzar!',
    sortByCategory: 'Ordenar Mano',
    quickNotes: 'Cuaderno',
    secretPassagePrompt: 'Usar Pasaje Secreto a',
    backToBoard: 'Volver al Tablero',

    afkWarningTitle: 'Aviso de Inactividad',
    afkWarningDesc: 'Sin acción durante 1 minuto. La IA jugará tu turno en 30 segundos.',
    afkSecondsRemaining: 'segundos restantes',
    afkImHere: '¡Sigo aquí! (OK)',
    autoPlayingBanner: 'IA en Juego Automático (Ausente)',
    autoPlayingDesc: 'La IA está jugando por ti mientras estás ausente.',
    autoPlayingResume: 'Retomar Control (OK)',

    turnReviewTitle: 'Revisión de Turno y Cuaderno',
    turnReviewSubtitle: 'Revisa las pistas y anota en tu cuaderno. El próximo turno comenzará cuando todos estén listos.',
    turnReviewConfirmBtn: 'Notas Listas / Siguiente Turno (OK)',
    turnReviewWaitingPeer: 'Esperando a que el otro detective termine de anotar...',
    turnReviewP1Ready: 'P1 Listo ✓',
    turnReviewP2Ready: 'P2 Listo ✓',
    turnReviewP1Writing: 'P1 Anotando ⏳',
    turnReviewP2Writing: 'P2 Anotando ⏳',
    inHandBadge: 'EN MANO',
    inHandTag: ' [✕ En Mano]',

    investigationEnd: 'Investigación Concluida',
    truthRevealed: '¡resolvió el misterio y triunfó!',
    mysteryUnsolved: 'El culpable escapó y el caso quedó sin resolver.',
    secretSolutionTitle: 'La Verdad del Caso',
    solutionCulprit: 'Culpable',
    solutionLocation: 'Lugar del Crimen',
    solutionWeapon: 'Arma Homicida',
    playAgain: 'Investigar Nuevo Caso',

    hypothesisTitle: " - Hipótesis",
    hypothesisSubtitle: "Investigando el incidente en",
    checkingDisprovers: "Interrogando a otros detectives por pistas...",
    disprovedBy: "¡ha refutado la hipótesis!",
    cardShownNotice: "mostró una pista a",
    cardShownToYou: "te mostró secretamente esta pista:",
    youShowedCard: "Mostraste esta pista a",
    nobodyDisproved: "¡Nadie pudo refutar esta hipótesis!",
    nobodyDisprovedSub: "¡Estas 3 pistas probablemente estén dentro del sobre confidencial!",
    continueBtn: "Continuar",
    markNotebookAndClose: "Anotar en Cuaderno y Cerrar",
    presentedClue: "Pista Presentada",
    secretClueExchange: "Intercambio Secreto de IA",

    cards: {
      suspect_scarlett: { name: '🔴 Señorita Escarlata', description: 'Glamurosa actriz vestida de rojo carmesí llena de secretos.' },
      suspect_mustard: { name: '🟡 Coronel Mostaza', description: 'Veterano militar con uniforme mostaza, experto en tácticas y armas.' },
      suspect_white: { name: '⚪ Señora Blanco', description: 'Gobernanta jefa vestida de blanco impecable con llave maestra.' },
      suspect_green: { name: '🟢 Señor Verde', description: 'Astuto negociante con traje de rayas verdes que oculta grandes deudas.' },
      suspect_peacock: { name: '🔵 Señora Pavo Real', description: 'Viuda de alta sociedad con elegante broche de plumas azules.' },
      suspect_plum: { name: '🟣 Profesor Mora', description: 'Excéntrico arqueólogo con chaleco de terciopelo morado.' },

      room_ballroom: { name: '💃 Gran Salón', description: 'Lujoso salón de baile con candelabros de cristal titilantes.' },
      room_kitchen: { name: '🍳 Cocina Principal', description: 'Cocina desordenada con cuchillos e ingredientes de cocina.' },
      room_library: { name: '📚 Biblioteca', description: 'Biblioteca clásica con chimenea y libros centenarios.' },
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
      room_library: { name: '📚 Biblioteca', description: 'Biblioteca clásica con chimenea y libros centenarios.' },
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
    },
    aiDialogue: {
      arthur: {
        move: [
          'La probabilidad deductiva indica que el crimen se originó aquí.',
          'Eliminando variables sistemáticamente en esta habitación.',
          'Una mente meticulosa no pasa por alto ningún detalle aquí.'
        ],
        suggest: [
          'Lógicamente, este escenario presenta menos contradicciones. ¿Alguien puede refutarlo?',
          'Mi hipótesis de trabajo está lista. ¿Qué dicen las pruebas?',
          'Poniendo a prueba la hipótesis: sospechoso, lugar y arma.'
        ],
        disprove: [
          'Tengo pruebas documentales que contradicen tu suposición.',
          'La lógica dicta que esta carta refuta tu teoría.'
        ],
        cannotDisprove: [
          'No poseo registros para contradecir esa afirmación.',
          'Fascinante... ese escenario sigue siendo plausible.'
        ],
        summoned: [
          'Disculpen, ¡he sido llamado a declarar! ¿Cuál es su sospecha?',
          '¡Llamado a la escena del crimen! Aclaremos los hechos.'
        ]
      },
      blake: {
        move: [
          'Mi instinto nunca falla. ¡La verdad se oculta en esta habitación!',
          'Siguiendo el rastro del criminal... ¡aquí huele a juego sucio!',
          '¡Derribemos esta puerta y veamos qué encontramos!'
        ],
        suggest: [
          '¡No intenten engañarme, esto es exactamente lo que ocurrió!',
          '¡Puedo oler el engaño en este cuarto! ¡A ver quién lo refuta!',
          '¿Quién se atreve a desafiar mi instinto de detective?'
        ],
        disprove: [
          '¡Alto ahí! ¡Tengo la carta justo aquí!',
          '¡Ni lo sueñes! ¡Esta carta demuestra que te equivocas!'
        ],
        cannotDisprove: [
          'Tch... no tengo nada en mi mano para desmentirte.',
          'No puedo ayudarte, colega. Mis manos están limpias.'
        ],
        summoned: [
          '¿Quién me arrastró a esta habitación? ¿De qué se me acusa?',
          '¿Sospechan de mí? ¡Más vale que tengan pruebas sólidas!'
        ]
      }
    }
  },

  ko: {
    gameTitle: 'Clueamos',
    gameSubtitle: '폭풍우 치는 밤의 그랜드 벨벳 호텔 4인 미스터리 추리극',
    ruleTitle: '2인 플레이어 맞춤 4인 추리 룰',
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
    aiCountTitle: 'AI 탐정 인원 설정',
    aiCountSubtitle: '두 명의 사람 플레이어 외에 참가할 AI 탐정 수를 설정하세요 (총 2~6인 플레이)',
    aiCount0: '0명 (1:1 결투)',
    aiCount1: '1명 (총 3인)',
    aiCount2: '2명 (총 4인 - 기본)',
    aiCount3: '3명 (총 5인)',
    aiCount4: '4명 (총 6인 풀파티)',
    aiCountGuestNote: '방장이 설정 중',
    characterAlreadyChosen: '플레이어 1 선택 완료',
    startGame: '사건 수사 시작',
    playModeLocal: '한 화면에서 플레이 (Pass & Play)',
    playModeMulti: '1. 멀티 플레이 (방 만들기 / 참여)',
    playModeSolo: '2. 싱글 플레이 (Solo vs AI)',
    playModeSoloDesc: '3명의 지능형 AI 탐정을 상대로 혼자서 두뇌 대결을 펼칩니다.',
    aiRolling: '주사위를 굴리는 중...',
    aiMoving: '호텔 방으로 이동 중...',
    aiSuggesting: '사건 현장 가설을 제시하는 중...',
    rolledResultOnBoard: '나온 눈금',
    passDeviceToPlayer2: '플레이어 2의 차례입니다! 기기를 건네주세요.',
    exitToLobby: '메인 화면으로',
    confirmExitToLobby: '현재 진행 중인 수사를 중단하고 메인 설정 화면으로 돌아가시겠습니까?',
    hostRoomTitle: '방 만들기 (플레이어 1)',
    joinRoomTitle: '방 참여하기 (플레이어 2)',
    hostRoomBtn: '방 만들기',
    joinRoomBtn: '방 참여하기',
    roomCodeLabel: '방 코드',
    enterRoomCodePlaceholder: '2자리 코드 입력 (예: 42)',
    copyInviteLink: '초대 링크 복사',
    inviteLinkCopied: '초대 링크가 복사되었습니다! 상대방에게 전달해주세요.',
    waitingForPlayer2: '플레이어 2의 접속을 기다리는 중...',
    player2Connected: '플레이어 2가 접속했습니다!',
    connectedToRoom: '방에 연결되었습니다',
    connectingToRoom: '방에 연결하는 중...',
    waitingForOtherPlayer: '님이 수사 중입니다... 잠시 기다려주세요',
    disprovePromptTitle: '은밀한 반증 요청',
    disprovePromptDesc: '내 손패 중 제시할 반증 카드를 1장 선택하세요:',
    submitDisproveBtn: '카드 비밀 제시하기',
    secretClueReceived: '님이 이 단서를 은밀히 보여주었습니다',
    eliminated: '탈락됨',
    cardsCount: '장',
    viewNotes: '추리 수첩 보기',
    viewMap: '호텔 맵 보기',
    newGame: '새 게임',
    currentRoom: '현재 방',
    adjacentRoomsDesc: '주사위 2개를 굴려 나온 눈금 이하의 방으로 이동하세요',
    rollDiceBtn: '주사위 2개 굴리기 🎲',
    rollingDice: '굴리는 중...',
    rolledNumber: '주사위 결과',
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
    cardHandTitle: '내 수사 카드 보관함',
    suspectCard: '용의자',
    locationCard: '살인 장소',
    weaponCard: '범행 도구',
    cardPassingTo: '님에게 카드를 은밀히 건네는 중...',
    cardPassedFrom: '님이 비밀 단서 카드를 건넸습니다!',
    tapToFlip: '카드를 터치하여 앞면 확인',
    markInNotesAndClose: '📝 추리 수첩에 자동 체크하고 닫기',
    inspectCard: '카드 자세히 보기',
    disproveCardSelectionPrompt: '상대방에게 은밀히 건넬 반증 카드를 1장 선택하세요:',

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

    waitInHallway: '복도에서 대기 (턴 넘기기)',
    waitInHallwayDesc: '주사위 눈금이 부족하여 들어갈 수 있는 방이 없습니다. 복도에서 대기하고 턴을 넘기세요.',
    summonedForQuestioning: '님이 알리바이 심문을 위해 해당 방으로 소환되었습니다!',
    bgmMusic: '미스터리 BGM',
    notebookSimpleMode: '간편 체크리스트',
    notebookMatrixMode: '정통 탐정 시트',
    investigationTimeline: '사건 수사 타임라인 복기',
    online: '온라인',
    offline: '재연결 대기...',

    stepRollDice: '주사위 굴리기',
    stepMoveRoom: '방으로 이동',
    stepSuggest: '가설 추리',
    stepEndTurn: '턴 종료 / 고발',
    stepWaiting: '대기 중...',
    actionDoneTitle: '이번 턴의 행동 완료',
    actionDoneDesc: '다음 탐정에게 턴을 넘기거나, 진실을 확신한다면 최종 고발을 단행할 수 있습니다.',
    endTurnBtn: '턴 넘기기 ⏭️',
    makeAccusationBtn: '최종 추측하기 🔍',
    aiActionDone: '턴 마무리 중...',
    smartAssistTitle: '스마트 단서 어시스트',
    smartAssistDesc: '내 손패를 자동 표시하고 다른 탐정들의 반증 기록을 단서 태그로 각인합니다',
    smartClueDisprovedTag: '반증됨',
    handBadge: '내 손패',
    resetNotes: '메모 초기화',
    caseFileTitle: '극비 살인 사건 봉투 (CONFIDENTIAL)',
    caseFileDesc: '붉은 밀랍 인장으로 봉인된 서류. 진범, 살인 장소, 흉기 카드가 들어있으며 최종 지목 시에만 개봉할 수 있습니다.',
    caseFileSealWarning: '밀랍 인장이 봉인되어 있습니다. 최종 고발 시 개봉됩니다.',
    close: '닫기',
    emoteObserve: '🧐 관찰',
    emotePonder: '🤔 고뇌',
    emoteEureka: '💡 영감',
    emoteTea: '☕ 티타임',
    shakeToRoll: '폰을 가볍게 흔들거나 탭하여 주사위를 굴리세요!',
    sortByCategory: '손패 정렬',
    quickNotes: '수첩 보기',
    secretPassagePrompt: '비밀통로를 통해 이동:',
    backToBoard: '보드판으로 돌아가기',

    afkWarningTitle: '자리 비움 감지',
    afkWarningDesc: '1분 동안 조작이 없습니다. 30초 후 AI가 대신 턴을 진행합니다.',
    afkSecondsRemaining: '초 남음',
    afkImHere: '🙋 저 여기 있어요! (OK)',
    autoPlayingBanner: '🤖 AI 대리 플레이 중 (자리 비움)',
    autoPlayingDesc: '자리를 비우셔서 AI가 대신 행동을 진행하고 있습니다.',
    autoPlayingResume: '🎮 제어권 되찾기 (OK)',

    turnReviewTitle: '턴 수사 정리 및 추리 시간',
    turnReviewSubtitle: '상황과 단서를 확인하고 수첩을 작성하세요. 모든 플레이어가 확인하면 다음 턴이 시작됩니다.',
    turnReviewConfirmBtn: '수첩 작성 완료 / 다음 턴 시작 (OK)',
    turnReviewWaitingPeer: '상대 탐정이 수첩을 정리하는 중입니다...',
    turnReviewP1Ready: 'P1 준비 완료 ✓',
    turnReviewP2Ready: 'P2 준비 완료 ✓',
    turnReviewP1Writing: 'P1 수첩 작성 중 ⏳',
    turnReviewP2Writing: 'P2 수첩 작성 중 ⏳',
    inHandBadge: '내 손패',
    inHandTag: ' [✕ 내 손패]',

    investigationEnd: '수사 종료',
    truthRevealed: '님이 진실을 밝혀냈습니다!',
    mysteryUnsolved: '범인을 잡지 못하고 사건이 미궁에 빠졌습니다.',
    secretSolutionTitle: '사건의 진실 (Secret Solution)',
    solutionCulprit: '범인',
    solutionLocation: '살인 장소',
    solutionWeapon: '흉기',
    playAgain: '새로운 사건 수사하기',

    hypothesisTitle: "님의 가설 제기",
    hypothesisSubtitle: "에서 발생한 사건의 가설을 제기했습니다:",
    checkingDisprovers: "다른 탐정들의 반증 단서를 확인하는 중...",
    disprovedBy: "님이 가설을 반증했습니다!",
    cardShownNotice: "님이 다음 단서를 제시했습니다:",
    cardShownToYou: "님이 당신에게 다음 단서를 은밀히 보여주었습니다:",
    youShowedCard: "님에게 다음 단서를 보여주었습니다:",
    nobodyDisproved: "아무도 이 가설을 반증하지 못했습니다!",
    nobodyDisprovedSub: "이 3가지 단서는 기밀 사건 봉투 속 진실일 가능성이 매우 높습니다!",
    continueBtn: "계속 진행",
    markNotebookAndClose: "수첩에 표시하고 닫기",
    presentedClue: "제시된 단서",
    secretClueExchange: "AI 간 비밀 제시",

    cards: {
      suspect_scarlett: { name: '🔴 미스 스칼렛', description: '매혹적인 붉은 드레스를 입은 유명 배우. 호텔 곳곳의 비밀을 알고 있다.' },
      suspect_mustard: { name: '🟡 커널 머스타드', description: '빛바랜 황색 정복을 차려입은 예비역 대령. 무기와 전술에 능통하다.' },
      suspect_white: { name: '⚪ 미세스 화이트', description: '결벽증이 있는 호텔 수석 지배인. 흰색 유니폼에 마스터키를 소지한다.' },
      suspect_green: { name: '🟢 미스터 그린', description: '초록색 핀스트라이프 양복의 수상한 사업가. 거액의 채무를 쥐고 있다.' },
      suspect_peacock: { name: '🔵 미세스 피콕', description: '푸른 공작 깃털 브로치를 단 상류층 미망인. 유산 상속을 노린다.' },
      suspect_plum: { name: '🟣 프로페서 플럼', description: '보랏빛 벨벳 조끼를 입은 괴짜 고고학 교수. 피해자와 심한 언쟁을 벌였다.' },

      room_ballroom: { name: '💃 연회장', description: '샹들리에가 희미하게 흔들리는 1층 대연회장.' },
      room_kitchen: { name: '🍳 메인 주방', description: '각종 조리도구와 날카로운 칼들이 널려 있는 주방.' },
      room_library: { name: '📚 서재', description: '벽난로 불씨가 남아 있는 고풍스러운 서재.' },
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
      room_library: { name: '📚 서재', description: '벽난로 불씨가 남아 있는 고풍스러운 서재.' },
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
    },
    aiDialogue: {
      arthur: {
        move: [
          '논리적 확률에 따르면 범행의 핵심 단서는 이 방에 있습니다.',
          '이 방의 모든 변수를 체계적으로 검증하겠습니다.',
          '치밀한 탐정은 그 어떤 사소한 흔적도 놓치지 않는 법이죠.'
        ],
        suggest: [
          '논리적으로 모순이 가장 적은 가설입니다. 반증할 수 있습니까?',
          '수집된 정황을 조합한 결과입니다. 증거를 제시해 보시죠.',
          '용의자, 범행 장소, 흉기의 가설을 엄밀히 검증합니다.'
        ],
        disprove: [
          '귀하의 가설과 상충되는 결정적 단서를 제가 소지하고 있습니다.',
          '논리적 귀결에 따라, 이 카드로 당신의 가설을 반증합니다.'
        ],
        cannotDisprove: [
          '제 기록에는 해당 가설을 반증할 증거가 없군요.',
          '흥미롭습니다... 이 가설은 여전히 유효합니다.'
        ],
        summoned: [
          '심문을 위해 소환되었군요. 어떤 가설을 묻고자 하십니까?',
          '사건 현장으로 불려왔습니다. 진실을 명백히 밝혀보죠.'
        ]
      },
      blake: {
        move: [
          '내 동물적 직감은 틀린 적이 없지. 진실은 바로 이 방에 있어!',
          '범인의 냄새가 진동하는군... 여기 뭔가 숨겨져 있어!',
          '문을 박차고 들어가서 샅샅이 뒤져보자고!'
        ],
        suggest: [
          '포커페이스는 그쯤 해두지! 내 감이 말해주는 사건의 진상이야!',
          '여기서 냄새나는 짓을 벌인 자가 누구인지 가려내주마!',
          '내 날카로운 직감에 반박할 수 있는 사람 나와봐!'
        ],
        disprove: [
          '어림없는 소리! 그 단서는 내가 쥐고 있거든!',
          '잠깐, 그 추리는 완전히 빗나갔어! 이 카드를 봐라!'
        ],
        cannotDisprove: [
          '칫... 내 손엔 네 블러핑을 깰 카드가 없군.',
          '난 도와줄 수 없겠는데? 이번엔 네 말이 맞을지도 모르지.'
        ],
        summoned: [
          '날 이 방으로 끌고 온 게 누구야?! 무슨 혐의지?',
          '나를 의심하는 건가? 증거도 없이 덤볐다간 큰코다칠걸!'
        ]
      }
    }
  }
};
