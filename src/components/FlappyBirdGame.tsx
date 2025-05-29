import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import soundManager from '@/utils/gameSounds';
import { Volume2, VolumeX } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import GameCustomizationPanel from '@/components/GameCustomizationPanel';
import backgroundImg from '@/assets/background.png';
import birdImg from '@/assets/bird.png';
import birdUpImg from '@/assets/birdUp.png';
import birdDeadImg from '@/assets/birdDead.png';
import pipeTopImg from '@/assets/pipeTop.png';
import pipeBottomImg from '@/assets/pipeBottom.png';
import { useBedrockPassport, LoginPanel } from '@bedrock_org/passport';

interface GameProps {
  onExit: () => void;
}

const getInitialBird = () => ({
  x: 50,
  y: 150,
  width: 34,
  height: 24,
  velocity: 0,
  gravity: 0.4,
  flapStrength: 4.5,
});

const FlappyBirdGame: React.FC<GameProps> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();

  // Game assets
  const [backgroundImage, setBackgroundImage] = useState(backgroundImg);
  const [birdImageSrc, setBirdImageSrc] = useState(birdImg);

  // Preload flags
  const [bgImageLoaded, setBgImageLoaded] = useState(false);
  const [birdImageLoaded, setBirdImageLoaded] = useState(false);

  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const birdImageRef = useRef<HTMLImageElement>(new Image());

  const [birdState, setBirdState] = useState<'normal' | 'up' | 'dead'>('normal');
  const birdStateTimeoutRef = useRef<number | null>(null);

  // References for game objects
  const pipesRef = useRef<Array<{ x: number; topHeight: number; passed: boolean; width: number; gradient?: CanvasGradient; speed: number;}>>([]);
  const difficultyRef = useRef(1);

  // Device detection & constants
  const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
  const PIPE = {
    minWidth: isMobile ? 60 : 80,
    maxWidth: isMobile ? 80 : 110,
    gap: isMobile ? 180 : 260,
    minPipeHeight: 60,
  };
  const basePipeSpeed = 3.0;
  const speedIncrement = isMobile ? 0.5 : 1.0;
  const PIPE_SPACING = 200; // fixed distance between leading edges

  // Utility: create or cache gradient
  const pipeGradientCache = useRef<Record<number, CanvasGradient>>({});
  const createPipeGradient = useCallback((ctx: CanvasRenderingContext2D, width: number) => {
    if (!pipeGradientCache.current[width]) {
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, '#3AA53A');
      grad.addColorStop(0.5, '#4EC94E');
      grad.addColorStop(1, '#3AA53A');
      pipeGradientCache.current[width] = grad;
    }
    return pipeGradientCache.current[width];
  }, []);

  // Spawn a single pipe at the right edge
  const spawnPipe = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const groundHeight = 20;
    const gap = PIPE.gap;
    const minH = PIPE.minPipeHeight;
    const maxH = canvas.height - groundHeight - gap - minH;
    const topH = Math.floor(Math.random() * (maxH - minH)) + minH;
    const width = Math.floor(Math.random() * (PIPE.maxWidth - PIPE.minWidth)) + PIPE.minWidth;
    const gradient = !isMobile ? createPipeGradient(ctx, width) : undefined;
    const speed = basePipeSpeed + (difficultyRef.current - 1) * speedIncrement;

    pipesRef.current.push({ x: canvas.width, topHeight: topH, passed: false, width, gradient, speed });
  }, [createPipeGradient, isMobile]);

  // Load images
  useEffect(() => {
    // background
    bgImageRef.current = new Image();
    bgImageRef.current.crossOrigin = 'anonymous';
    bgImageRef.current.src = backgroundImage;
    bgImageRef.current.onload = () => setBgImageLoaded(true);
    bgImageRef.current.onerror = () => setBgImageLoaded(false);
    // bird
    const img = new Image();
    img.src = birdImageSrc;
    img.onload = () => { birdImageRef.current = img; setBirdImageLoaded(true); };
    img.onerror = () => setBirdImageLoaded(false);
    setIsMuted(soundManager.getMuteState());
  }, [backgroundImage, birdImageSrc]);

  // Initialize high score
  useEffect(() => {
    const saved = localStorage.getItem('flappyBirdHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Start a new game
  const startGame = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    soundManager.stopBackgroundMusic();
    soundManager.play('start');
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    pipesRef.current = [];
    difficultyRef.current = 1;

    // spawn first pipe
    spawnPipe(ctx, canvas);
  }, [spawnPipe]);

  // Game over handler
  const handleGameOver = useCallback(() => {
    if (!gameOver) {
      soundManager.play('hit');
      setTimeout(() => soundManager.play('die'), 500);
      setGameOver(true);
      const currentHigh = parseInt(localStorage.getItem('flappyBirdHighScore') || '0', 10);
      if (score > currentHigh) {
        localStorage.setItem('flappyBirdHighScore', score.toString());
        setHighScore(score);
      }
    }
  }, [gameOver, score]);

  // Jump/flap
  const jump = useCallback(() => {
    if (!gameStarted || gameOver) return;
    birdRef.current.velocity = birdRef.current.flapStrength;
    soundManager.play('jump');
    setBirdState('up');
    if (birdStateTimeoutRef.current) clearTimeout(birdStateTimeoutRef.current);
    birdStateTimeoutRef.current = window.setTimeout(() => setBirdState('normal'), 150);
  }, [gameStarted, gameOver]);

  // Main update logic (called each frame)
  const updateGameLogic = useCallback((dt: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // move bird
    const b = birdRef.current;
    b.velocity += b.gravity * dt * 60;
    b.y += b.velocity * dt * 60;

    // move pipes
    pipesRef.current.forEach(pipe => {
      pipe.x -= pipe.speed * dt * 60;
    });

    // spawn based on distance
    const last = pipesRef.current[pipesRef.current.length - 1];
    if (!last || last.x < canvas.width - PIPE_SPACING) {
      spawnPipe(ctx, canvas);
    }

    // score & collision
    pipesRef.current = pipesRef.current.filter(pipe => {
      if (!pipe.passed && pipe.x + pipe.width < b.x) {
        pipe.passed = true;
        setScore(s => s + 1);
        soundManager.play('score');
      }
      const hit = b.x + b.width > pipe.x && b.x < pipe.x + pipe.width &&
                  (b.y < pipe.topHeight || b.y + b.height > pipe.topHeight + PIPE.gap);
      if (hit) handleGameOver();
      return pipe.x > -pipe.width;
    });

    // ground/bounds collision
    if (b.y + b.height > canvas.height - 20 || b.y < 0) handleGameOver();
  }, [spawnPipe, handleGameOver]);

  // Game loop effect
  useEffect(() => {
    if (!bgImageLoaded || !birdImageLoaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let lastTime: number | null = null;
    const resize = () => {
      if (isMobile) {
        canvas.width = 320; canvas.height = 480;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    const loop = (time?: number) => {
      if (!time) time = performance.now();
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 1 / 30) : 1 / 60;
      lastTime = time;

      if (gameStarted && !gameOver) updateGameLogic(dt, ctx, canvas);

      // render
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // ... draw background, pipes, bird, score, etc (unchanged)

      if (!gameOver) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => window.removeEventListener('resize', resize);
  }, [bgImageLoaded, birdImageLoaded, gameStarted, gameOver, updateGameLogic, isMobile]);

  // ... rest of component (input handlers, UI rendering) unchanged

  const birdRef = useRef(getInitialBird());

  return (
    <div>/* JSX UI here */</div>
  );
};

export default FlappyBirdGame;
