/**
 * Clueamos Tactile Haptics Engine
 * Provides subtle, physical-feeling haptic vibrations on supported mobile devices (Android/Chrome/PWA).
 * Fails silently on browsers or desktop operating systems without vibration motor hardware.
 */

class HapticsEngine {
  public enabled: boolean = true;

  private vibrate(pattern: number | number[]): void {
    if (!this.enabled || typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe ignore
      }
    }
  }

  /**
   * Subtle tick: pawn hopping onto a tile, button clicks, notebook cell toggles
   */
  public tick(): void {
    this.vibrate(12);
  }

  /**
   * Dice tumbling bounce rhythm
   */
  public diceRoll(): void {
    this.vibrate([18, 25, 20, 30, 25, 40]);
  }

  /**
   * Card sliding over felt baize / 3D flip flick
   */
  public cardFlip(): void {
    this.vibrate([15, 20, 25]);
  }

  /**
   * Secret clue discovered / private card received
   */
  public secretClue(): void {
    this.vibrate([35, 30, 50]);
  }

  /**
   * Victory / Case Solved celebration rhythm
   */
  public victory(): void {
    this.vibrate([70, 40, 70, 40, 140]);
  }

  /**
   * Warning / Elimination / False Accusation
   */
  public warning(): void {
    this.vibrate([90, 50, 90]);
  }
}

export const haptics = new HapticsEngine();
