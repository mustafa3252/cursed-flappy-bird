import jumpSound from '@/assets/fly.mp3';
import scoreSound from '@/assets/point.mp3';
import hitSound from '@/assets/crash.mp3';
import dieSound from '@/assets/die-101soundboards.mp3';
import startSound from '@/assets/fly2.mp3';
import bgMusicSound from '@/assets/bgMusic.mp3';

class SoundManager {
  private sounds: Record<string, HTMLAudioElement> = {};
  private bgMusic: HTMLAudioElement;
  private isMuted: boolean = false;
  private isPlaying: boolean = false;
  private hasUserInteracted: boolean = false;

  constructor() {
    console.log('Initializing SoundManager');
    this.loadSounds();
    this.initBackgroundMusic();
  }

  private initBackgroundMusic() {
    console.log('Initializing background music');
    this.bgMusic = new Audio(bgMusicSound);
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.3;
    
    // Add event listeners for debugging
    this.bgMusic.addEventListener('play', () => {
      console.log('Background music started playing');
      this.isPlaying = true;
    });
    
    this.bgMusic.addEventListener('pause', () => {
      console.log('Background music paused');
      this.isPlaying = false;
    });
    
    this.bgMusic.addEventListener('ended', () => {
      console.log('Background music ended');
      this.isPlaying = false;
    });
    
    this.bgMusic.addEventListener('error', (e) => {
      console.error('Background music error:', e);
      this.isPlaying = false;
    });
    
    // Preload the audio
    this.bgMusic.load();
  }

  private loadSounds() {
    this.sounds = {
      jump: new Audio(jumpSound),
      score: new Audio(scoreSound),
      hit: new Audio(hitSound),
      die: new Audio(dieSound),
      start: new Audio(startSound),
    };
  }

  public async startBackgroundMusic() {
    if (this.isPlaying || this.isMuted) {
      console.log('Background music already playing or muted:', {
        isPlaying: this.isPlaying,
        isMuted: this.isMuted
      });
      return;
    }

    console.log('Attempting to start background music');
    try {
      // Create a new Audio instance if the current one failed
      if (this.bgMusic.error) {
        console.log('Recreating audio instance due to previous error');
        this.bgMusic = new Audio(bgMusicSound);
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.3;
      }

      const playPromise = this.bgMusic.play();
      if (playPromise !== undefined) {
        await playPromise;
        console.log('Background music started successfully');
      }
    } catch (err) {
      console.error('Failed to play background music:', err);
    }
  }

  public stopBackgroundMusic() {
    if (!this.isPlaying) return;
    
    console.log('Stopping background music');
    this.bgMusic.pause();
    this.bgMusic.currentTime = 0;
    this.isPlaying = false;
  }

  public play(sound: 'jump' | 'score' | 'hit' | 'die' | 'start') {
    if (this.isMuted) return;
    
    // Stop and reset the sound before playing
    this.sounds[sound].currentTime = 0;
    this.sounds[sound].play().catch(err => console.log('Audio playback failed:', err));
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    console.log('Mute toggled:', this.isMuted);
    if (this.isMuted) {
      this.stopBackgroundMusic();
    }
    return this.isMuted;
  }

  public getMuteState() {
    return this.isMuted;
  }
}

// Singleton instance
const soundManager = new SoundManager();
export default soundManager;
