// Web Audio API를 활용한 자연스러운 아쿠스틱/피지컬 모델링 효과음 시스템
// 8비트 신디사이저 파형(Square, Sawtooth)을 전면 배제하고,
// 실물 목재, 펠트, 종이, 크리스털 차임 및 룸 리버브(Acoustic Room Impulse)를 모델링하여
// 실제 고급 보드게임을 플레이하는 듯한 자연스럽고 따뜻한 사운드를 제공합니다.

import { haptics } from './haptics';

class SoundController {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 고급 보드게임 룸의 자연스러운 잔향(Acoustic Room Impulse) 생성 및 오디오 그래프 설정
  private setupAudioGraph(ctx: AudioContext) {
    if (this.dryGain && this.wetGain) return;

    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(0.85, ctx.currentTime);
    this.dryGain.connect(ctx.destination);

    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(0.22, ctx.currentTime);
    this.wetGain.connect(ctx.destination);

    try {
      const revBuffer = this.createRoomImpulse(ctx, 0.38, 3.2);
      this.reverbNode = ctx.createConvolver();
      this.reverbNode.buffer = revBuffer;
      this.reverbNode.connect(this.wetGain);
    } catch {
      // Fallback if Convolver is unavailable in legacy environments
    }
  }

  private createRoomImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const buffer = ctx.createBuffer(2, length, rate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const factor = Math.exp((-i / length) * decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return buffer;
  }

  private getMasterOut(useReverb = false): AudioNode {
    const ctx = this.getContext();
    if (!ctx) throw new Error('No AudioContext');
    this.setupAudioGraph(ctx);

    if (useReverb && this.reverbNode && this.dryGain) {
      const splitter = ctx.createGain();
      splitter.connect(this.dryGain);
      splitter.connect(this.reverbNode);
      return splitter;
    }
    return this.dryGain || ctx.destination;
  }

  // 충격음 노이즈 트랜지언트 유틸리티 (목재 부딪힘, 종이 스냅, 연필 필기 등)
  private playNoiseTransient(
    time: number,
    duration: number,
    centerFreq: number,
    q: number,
    volume: number
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const bufferSize = Math.max(256, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(centerFreq, time);
      filter.Q.setValueAtTime(q, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.getMasterOut());

      source.start(time);
    } catch {}
  }

  // 아쿠스틱 배음(Harmonic Series) 톤 생성 유틸리티
  private playAcousticTone(
    time: number,
    freq: number,
    duration: number,
    volume: number,
    addChime = false
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const fundamental = ctx.createOscillator();
    const fGain = ctx.createGain();
    fundamental.type = 'sine';
    fundamental.frequency.setValueAtTime(freq, time);

    // 2차 온화한 바디 배음 (Warm body overtone)
    const h2 = ctx.createOscillator();
    const h2Gain = ctx.createGain();
    h2.type = 'sine';
    h2.frequency.setValueAtTime(freq * 2, time);

    fGain.gain.setValueAtTime(0.001, time);
    fGain.gain.linearRampToValueAtTime(volume, time + 0.015);
    fGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    h2Gain.gain.setValueAtTime(0.001, time);
    h2Gain.gain.linearRampToValueAtTime(volume * 0.35, time + 0.015);
    h2Gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.7);

    fundamental.connect(fGain);
    h2.connect(h2Gain);

    const out = this.getMasterOut(true);
    fGain.connect(out);
    h2Gain.connect(out);

    fundamental.start(time);
    h2.start(time);
    fundamental.stop(time + duration);
    h2.stop(time + duration);

    if (addChime) {
      const chime = ctx.createOscillator();
      const cGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(freq * 3.01, time);
      cGain.gain.setValueAtTime(volume * 0.15, time);
      cGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.4);
      chime.connect(cGain);
      cGain.connect(out);
      chime.start(time);
      chime.stop(time + duration);
    }
  }

  // 1. 주사위 굴리는 소리: 나무/아크릴 주사위가 펠트 매트 위에서 딸그락거리며 구르는 물리적 충격 시퀀스
  playDice() {
    haptics.diceRoll();
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const impacts = [
      { t: 0.000, vol: 0.28, pitch: 940 },
      { t: 0.042, vol: 0.22, pitch: 780 },
      { t: 0.088, vol: 0.18, pitch: 1120 },
      { t: 0.135, vol: 0.14, pitch: 660 },
      { t: 0.180, vol: 0.09, pitch: 880 },
      { t: 0.220, vol: 0.05, pitch: 720 },
    ];

    impacts.forEach(({ t, vol, pitch }) => {
      const impactTime = now + t;

      // 주사위 모서리 충격 트랜지언트 노이즈
      this.playNoiseTransient(impactTime, 0.008, 2400 + (Math.random() - 0.5) * 400, 3.5, vol * 0.75);

      // 주사위 목재 바디 공명음 (낮은 주파수 감쇠)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const randomizedPitch = pitch * (0.92 + Math.random() * 0.16);
      osc.frequency.setValueAtTime(randomizedPitch, impactTime);
      osc.frequency.exponentialRampToValueAtTime(randomizedPitch * 0.6, impactTime + 0.025);

      gain.gain.setValueAtTime(vol, impactTime);
      gain.gain.exponentialRampToValueAtTime(0.001, impactTime + 0.025);

      osc.connect(gain);
      gain.connect(this.getMasterOut());

      osc.start(impactTime);
      osc.stop(impactTime + 0.025);
    });
  }

  // 2. 발자국 / 방 이동 소리: 묵직하고 고급스러운 목재 보드게임 말(말/폰)을 '탁' 내려놓는 타격감
  playMove() {
    haptics.tick();
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 펠트 완충 접촉음
    this.playNoiseTransient(now, 0.012, 1100, 1.8, 0.18);

    // 원목 보드판 바디 '텅' 공명
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.getMasterOut());

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // 3. 질문 제시 / 가설 소리: 고풍스러운 서재의 신비로운 비브라폰/오르골 아쿠스틱 아르페지오
  playQuestion() {
    haptics.tick();
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 신비로운 서스펜스 화음: D4, A4, C5, F5 (누아르 탐정 분위기)
    const chord = [293.66, 440.0, 523.25, 698.46];

    chord.forEach((freq, idx) => {
      const noteTime = now + idx * 0.045;
      const duration = 0.85;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      // 온화한 LFO 비브라토
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(4.2, noteTime);
      lfoGain.gain.setValueAtTime(2.2, noteTime);
      lfo.connect(osc.frequency);
      lfo.start(noteTime);
      lfo.stop(noteTime + duration);

      // 금속 바(Vibraphone Bar)의 자연스러운 2.76배 배음
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2.76, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.12, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

      overtoneGain.gain.setValueAtTime(0.04, noteTime);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration * 0.4);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      gain.connect(this.getMasterOut(true));
      overtoneGain.connect(this.getMasterOut(true));

      osc.start(noteTime);
      overtone.start(noteTime);
      osc.stop(noteTime + duration);
      overtone.stop(noteTime + duration);
    });
  }

  // 4. 수첩 체크 / 반증 선택 소리: 탐정이 수첩에 사각사각 연필로 체크하는 자연스러운 아날로그 필기음
  playDisprove() {
    haptics.tick();
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 두 번 가볍게 사각거리는 아날로그 연필 필기음: "슥-슥"
    this.playNoiseTransient(now, 0.014, 2800, 2.5, 0.16);
    this.playNoiseTransient(now + 0.038, 0.018, 3300, 2.4, 0.14);
  }

  // 5. 카드 슬라이딩 소리: 고급 린넨 플레잉 카드가 펠트 매트 위를 부드럽게 스쳐 지나가는 마찰음
  playCardSlide() {
    haptics.cardFlip();
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const duration = 0.15;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // 카드가 미끄러지며 감속하는 밴드패스 필터 스윕
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2900, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + duration);
      filter.Q.setValueAtTime(1.8, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.getMasterOut());

      noise.start(ctx.currentTime);
    } catch {}
  }

  // 6. 카드 3D 뒤집기 스냅 소리: 손가락으로 카드를 착 뒤집어 테이블에 내려놓는 경쾌한 탭 사운드
  playCardFlip() {
    haptics.cardFlip();
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 카드 모서리 스냅 찰칵음
    this.playNoiseTransient(now, 0.007, 3300, 3.2, 0.22);

    // 카드 바디 안착음
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.045);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.getMasterOut());

    osc.start(now);
    osc.stop(now + 0.045);
  }

  // 7. 단서 획득 성공 차임벨 소리: 크리스털 글록켄슈필/오르골의 맑고 우아한 상승 4음
  playClue() {
    haptics.secretClue();
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 상승 크리스털 벨 음계: E5, G#5, B5, E6
    const notes = [659.25, 830.61, 987.77, 1318.51];

    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.055;
      const duration = 0.75;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      // 크리스털 맑은 차임 배음 (3배수)
      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(freq * 3.0, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.16, noteTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

      chimeGain.gain.setValueAtTime(0.035, noteTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration * 0.35);

      osc.connect(gain);
      chime.connect(chimeGain);
      gain.connect(this.getMasterOut(true));
      chimeGain.connect(this.getMasterOut(true));

      osc.start(noteTime);
      chime.start(noteTime);
      osc.stop(noteTime + duration);
      chime.stop(noteTime + duration);
    });
  }

  // 8. 사건 해결 승리 팡파레: 웅장하고 따뜻한 실내악 브라스 & 대성당 벨 승리 화음
  playWin() {
    haptics.victory();
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1단계: 브라스 팡파레 셋 (G4 -> C5 -> E5)
    const fanfare = [
      { freq: 392.0, t: 0.0, dur: 0.18 },
      { freq: 523.25, t: 0.16, dur: 0.18 },
      { freq: 659.25, t: 0.32, dur: 0.22 },
    ];

    fanfare.forEach(({ freq, t, dur }) => {
      const noteTime = now + t;
      this.playAcousticTone(noteTime, freq, dur, 0.18);
    });

    // 2단계: 승리의 풀 코드 화음 (C4, G4, C5, E5, G5, C6) + 대성당 벨 잔향
    const chordTime = now + 0.52;
    const grandChord = [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5];

    grandChord.forEach((freq, i) => {
      const duration = 1.35 - i * 0.08;
      this.playAcousticTone(chordTime, freq, duration, 0.12 - i * 0.012, true);
    });
  }

  // 9. 추리 실패 / 탈락 소리: 8비트 버저가 아닌 깊고 묵직한 오케스트라 베이스 드럼 & 고풍스러운 괘종시계 타종
  playFail() {
    haptics.warning();
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. 묵직한 오케스트라 킥/베이스 임팩트
    const kickOsc = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(85, now);
    kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.16);
    kickGain.gain.setValueAtTime(0.32, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    kickOsc.connect(kickGain);
    kickGain.connect(this.getMasterOut());
    kickOsc.start(now);
    kickOsc.stop(now + 0.16);

    // 2. 어둡고 장엄한 청동 벨 타종 (Low A2, D3, F3 단조 코드)
    const bellFrequencies = [110.0, 146.83, 174.61];
    bellFrequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2.15, now);

      const duration = 1.2 - i * 0.1;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      overtoneGain.gain.setValueAtTime(0.06, now);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      gain.connect(this.getMasterOut(true));
      overtoneGain.connect(this.getMasterOut(true));

      osc.start(now);
      overtone.start(now);
      osc.stop(now + duration);
      overtone.stop(now + duration);
    });
  }

  // 10. 말(Pawn) 복도 타일 보행 스텝 소리: 타일을 하나씩 통-통 딛는 경쾌한 목재 폰 걸음마 소리
  playPawnStep() {
    haptics.tick();
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 부드러운 완충 탭
    this.playNoiseTransient(now, 0.008, 1600, 2.0, 0.12);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const pitch = 260 + (Math.random() - 0.5) * 30;
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.7, now + 0.04);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.getMasterOut());

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // 11. 비밀 통로 이동 소리: 은밀한 회전 벽장을 통과하는 신비로운 스위시 사운드
  playSecretPassage() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    try {
      const duration = 0.45;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + duration);
      filter.Q.setValueAtTime(2.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.getMasterOut(true));

      noise.start(now);
    } catch {}

    // 신비로운 하강 차임 (659Hz -> 392Hz)
    [659.25, 493.88, 392.0].forEach((f, i) => {
      const t = now + 0.08 + i * 0.09;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g);
      g.connect(this.getMasterOut(true));
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  // ==========================================
  // 12. 웹 오디오 프로시저럴 미스터리 누아르 BGM 엔진
  // ==========================================
  public isBgmPlaying: boolean = false;
  private bgmGainNode: GainNode | null = null;
  private bgmIntervalId: ReturnType<typeof setInterval> | null = null;
  private bgmBarIndex: number = 0;
  public bgmVolume: number = 0.25;

  public toggleBgm() {
    if (this.isBgmPlaying) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.isBgmPlaying;
  }

  public setBgmVolume(val: number) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }
  }

  public startBgm() {
    if (this.isBgmPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.isBgmPlaying = true;

    if (!this.bgmGainNode) {
      this.bgmGainNode = ctx.createGain();
      this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, ctx.currentTime);
      this.bgmGainNode.connect(this.getMasterOut(true));
    }

    this.bgmBarIndex = 0;
    this.scheduleBgmBar();

    // 65 BPM 기준으로 1마디 = 약 3.69초마다 다음 마디 예약
    this.bgmIntervalId = setInterval(() => {
      if (this.isBgmPlaying) {
        this.scheduleBgmBar();
      }
    }, 3650);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      setTimeout(() => {
        if (this.bgmGainNode && this.ctx) {
          this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
        }
      }, 300);
    }
  }

  private scheduleBgmBar() {
    const ctx = this.getContext();
    if (!ctx || !this.bgmGainNode) return;

    const now = ctx.currentTime;
    const bar = this.bgmBarIndex % 4;
    this.bgmBarIndex++;

    // 4마디 재즈 하모니: Cm9 -> Fm9 -> G7(b9) -> Cm11
    const jazzChords = [
      { bass: 65.41, keys: [155.56, 196.0, 233.08, 293.66] }, // Cm9
      { bass: 87.31, keys: [207.65, 261.63, 311.13, 392.0] }, // Fm9
      { bass: 97.99, keys: [246.94, 293.66, 349.23, 415.3] }, // G7b9
      { bass: 65.41, keys: [174.61, 233.08, 293.66, 349.23] }, // Cm11
    ];

    const currentChord = jazzChords[bar];

    // 콘트라베이스 워킹 피치카토 (1박, 3박)
    [0, 1.84].forEach((offset, i) => {
      const t = now + offset;
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sine';
      // 3박에는 부드러운 5도 또는 경과음
      const freq = i === 0 ? currentChord.bass : currentChord.bass * 1.498;
      bassOsc.frequency.setValueAtTime(freq, t);

      bassGain.gain.setValueAtTime(0.001, t);
      bassGain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

      bassOsc.connect(bassGain);
      bassGain.connect(this.bgmGainNode!);
      bassOsc.start(t);
      bassOsc.stop(t + 1.4);
    });

    // 로즈 일렉트릭 피아노 코드 컴핑 (따뜻한 벨 하모닉스, 0.4초 및 2.2초에 리듬 연주)
    [0.35, 2.15].forEach((offset, beatIdx) => {
      const t = now + offset;
      const vel = beatIdx === 0 ? 0.06 : 0.045;

      currentChord.keys.forEach((f, kIdx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(vel, t + 0.03 + kIdx * 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

        osc.connect(gain);
        gain.connect(this.bgmGainNode!);
        osc.start(t);
        osc.stop(t + 1.3);
      });
    });
  }
}

export const sounds = new SoundController();
