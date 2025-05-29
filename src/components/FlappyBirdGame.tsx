  import React, { useEffect, useRef, useState, useCallback } from 'react';
  import { Button } from '@/components/ui/button';
  import { useToast } from '@/components/ui/use-toast';
  import soundManager from '@/utils/gameSounds';
  import { Volume2, VolumeX, Menu } from 'lucide-react';
  import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
  import GameCustomizationPanel from '@/components/GameCustomizationPanel';
  import backgroundImg from '@/assets/background.png';
  import birdImg from '@/assets/bird.png';
  import birdUpImg from '@/assets/birdUp.png';
  import birdDeadImg from '@/assets/birdDead.png';
  import pipeTopImg from '@/assets/pipeTop.png';
  import pipeBottomImg from '@/assets/pipeBottom.png';
  import { useBedrockPassport, LoginPanel } from "@bedrock_org/passport";

  // Debug log imports
  console.log('Bird image imports:', {
    normal: birdImg,
    up: birdUpImg,
    dead: birdDeadImg
  });

  interface GameProps {
    onExit: () => void;
  }

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
    const [pipeTopImage, setPipeTopImage] = useState(pipeTopImg);
    const [pipeBottomImage, setPipeBottomImage] = useState(pipeBottomImg);
    
    // Remove parallax refs
    
    const gameLoopRef = useRef<number | null>(null);
    
    // Define pipeGap constant here so it's available throughout the component
    const pipeGapRef = useRef(160);
    
    const [bgImageLoaded, setBgImageLoaded] = useState(false);
    const [birdImageLoaded, setBirdImageLoaded] = useState(false);
    
    const bgImageRef = useRef<HTMLImageElement | null>(null);
    const birdImageRef = useRef<HTMLImageElement>(new Image());
    
    const [birdState, setBirdState] = useState<'normal' | 'up' | 'dead'>('normal');
    const birdStateTimeoutRef = useRef<number | null>(null);
    
    // Load all bird images
    const birdImagesRef = useRef({
      normal: new Image(),
      up: new Image(),
      dead: new Image()
    });
    
    // Update bird image based on state
    const currentBirdImage = useCallback(() => {
      return birdImageSrc;
    }, [birdImageSrc]);
    
    // Update loadImages function to use current bird state
    const loadImages = useCallback(() => {
      console.log('Starting to load images...');
      setBgImageLoaded(false);
      setBirdImageLoaded(false);
      
      // Load background texture
      bgImageRef.current = new Image();
      bgImageRef.current.crossOrigin = "anonymous";
      bgImageRef.current.src = backgroundImage;
      bgImageRef.current.onload = () => {
        setBgImageLoaded(true);
        console.log('Background image loaded successfully:', bgImageRef.current?.src);
      };
      bgImageRef.current.onerror = (error) => {
        setBgImageLoaded(false);
        console.error('Failed to load background image:', backgroundImage, error);
        // Fallback to default background image
        bgImageRef.current.src = backgroundImg;
        // Try to load the default image
        bgImageRef.current.onload = () => setBgImageLoaded(true);
        bgImageRef.current.onerror = () => setBgImageLoaded(false);
      };
      
      // Load bird image based on state
      const birdImage = currentBirdImage();
      console.log('Loading bird image:', birdImage);
      
      birdImageRef.current = new Image();
      birdImageRef.current.src = birdImage;
      
      birdImageRef.current.onload = () => {
        console.log('Bird image loaded successfully:', {
          width: birdImageRef.current.width,
          height: birdImageRef.current.height,
          src: birdImageRef.current.src,
          state: birdState
        });
        setBirdImageLoaded(true);
      };
      
      birdImageRef.current.onerror = (error) => {
        console.error('Failed to load bird image:', {
          error,
          src: birdImage,
          state: birdState
        });
        setBirdImageLoaded(false);
      };
    }, [backgroundImage, currentBirdImage]);
    
    // Image preloading and initial setup
    useEffect(() => {
      loadImages();
      console.log('Loading images:', {
        bird: birdImg,
        birdUp: birdUpImg,
        birdDead: birdDeadImg
      });
      
      // Initialize mute state
      setIsMuted(soundManager.getMuteState());
    }, [backgroundImage, birdImageSrc]);
    
    const pipesRef = useRef<Array<{
      x: number, 
      topHeight: number, 
      passed: boolean, 
      width: number,
      gradient?: CanvasGradient,  // Add gradient property
      speed?: number
    }>>([]);
    
    // Add particle system
    const particlesRef = useRef<Array<{
      x: number,
      y: number,
      vx: number,
      vy: number,
      life: number,
      color: string,
      size: number
    }>>([]);
    
    // Cache for pipe gradients
    const pipeGradientCacheRef = useRef<Record<number, CanvasGradient>>({});
    
    // Create cached gradient
    const createPipeGradient = useCallback((ctx: CanvasRenderingContext2D, width: number) => {
      if (!pipeGradientCacheRef.current[width]) {
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#3AA53A');    // Darker green on the left
        gradient.addColorStop(0.5, '#4EC94E');  // Main green in the middle
        gradient.addColorStop(1, '#3AA53A');    // Darker green on the right
        pipeGradientCacheRef.current[width] = gradient;
      }
      return pipeGradientCacheRef.current[width];
    }, []);
    
    // Add particles
    const addParticles = useCallback((x: number, y: number, count: number, type: 'score' | 'collision' | 'flap') => {
      for (let i = 0; i < count; i++) {
        const particle = {
          x,
          y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          life: 1,
          color: type === 'score' ? '#FFD700' : type === 'collision' ? '#FF0000' : '#FFFFFF',
          size: type === 'score' ? 4 : type === 'collision' ? 3 : 2
        };
        particlesRef.current.push(particle);
      }
    }, []);
    
    // Add cloud puffs system
    const cloudPuffsRef = useRef<Array<{
      x: number,
      y: number,
      size: number,
      opacity: number,
      expandSpeed: number,
      fadeSpeed: number
    }>>([]);

    // Add cloud puff effect
    const addCloudPuff = useCallback((x: number, y: number) => {
      cloudPuffsRef.current.push({
        x,
        y,
        size: 8,
        opacity: 0.7,
        expandSpeed: 0.8,
        fadeSpeed: 0.025
      });
    }, []);
    
    const frameCountRef = useRef(0);
    
    // Utility: Detect mobile device
    const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
    
    // Mobile scaling and physics adjustments
    // Lower the mobile canvas resolution for performance
    const MOBILE_CANVAS_WIDTH = 320;
    const MOBILE_CANVAS_HEIGHT = 480;
    const MOBILE_SCALE = isMobile ? 0.56 : 1; // 360/570 ≈ 0.63
    const MOBILE_BIRD = {
      width: 60 * MOBILE_SCALE,
      height: 45 * MOBILE_SCALE,
      gravity: isMobile ? 0.30 : 0.30,
      flapStrength: isMobile ? -9.5 : -7.5,
      x: 50 * MOBILE_SCALE,
      y: 150 * MOBILE_SCALE
    };
    const PIPE = {
      minWidth: isMobile ? 60 : 80,
      maxWidth: isMobile ? 80 : 110,
      gap: isMobile ? 180 : 260,
      minPipeHeight: 60
    };
    
    // At the top of the component, after isMobile:
    const PIPE_INTERVAL_BASE = isMobile ? 0.7 : 0.9;
    const PIPE_INTERVAL_MIN  = isMobile ? 0.5 : 0.6;
    const basePipeSpeed      = 3.0;
    const speedIncrement     = isMobile ? 0.5 : 1.0;
    
    // Centralized function for initial bird state
    function getInitialBird() {
      return {
        x: 50,
        y: 150,
        velocity: 0,
        gravity: isMobile ? 0.28 : 0.30,
        flapStrength: isMobile ? -6.0 : -7.5,
        width: isMobile ? 36 : 60,
        height: isMobile ? 28 : 45,
        frame: 0,
        frameCount: 0,
      };
    }

    const birdRef = useRef(getInitialBird());
    
    // Add a ref to track the game start time for floaty start
    const startTimeRef = useRef<number | null>(null);
    
    const startGame = useCallback(() => {
      soundManager.stopBackgroundMusic(); // Stop background music when game starts
      soundManager.play('start');
      setGameStarted(true);
      setGameOver(false);
      setScore(0);
      birdRef.current = getInitialBird();
      pipesRef.current = [];
      setIsMenuOpen(false); // Ensure menu is closed when game starts
      frameCountRef.current = 0; // Reset frame count
      startTimeRef.current = performance.now(); // Track when the game started
      console.log('Game started!');
      // Immediately spawn a pipe at game start
      const canvas = canvasRef.current;
      if (canvas) {
        const groundHeight = 20;
        const pipeGap = Math.max(PIPE.gap * 0.75, pipeGapRef.current);
        const minPipeHeight = PIPE.minPipeHeight;
        const maxPipeHeight = canvas.height - groundHeight - pipeGap - minPipeHeight;
        const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight)) + minPipeHeight;
        const width = Math.floor(Math.random() * (PIPE.maxWidth - PIPE.minWidth)) + PIPE.minWidth;
        const ctx = canvas.getContext('2d');
        const gradient = ctx && !isMobile ? createPipeGradient(ctx, width) : undefined;
        pipesRef.current.push({
          x: isMobile ? canvas.width : canvas.width - 150,
          topHeight,
          passed: false,
          width,
          gradient,
          speed: basePipeSpeed
        });
      }
    }, [isMobile]);
    
    // Separate function to handle game over
    const handleGameOver = useCallback(() => {
      if (!gameOver) {
        soundManager.play('hit');
        setTimeout(() => soundManager.play('die'), 500);
        setGameOver(true);
        
        // Check and update high score immediately
        const currentHighScore = parseInt(localStorage.getItem('flappyBirdHighScore') || '0', 10);
        if (score > currentHighScore) {
          localStorage.setItem('flappyBirdHighScore', score.toString());
          setHighScore(score);
        }
      }
    }, [gameOver, score]);
    
    // Update jump function to add cloud puff
    const jump = useCallback(() => {
      if (!gameStarted || gameOver || isMenuOpen) return;
      
      birdRef.current.velocity = birdRef.current.flapStrength;
      soundManager.play('jump');
      
      // Add cloud puff behind the bird
      addCloudPuff(
        birdRef.current.x - 10,
        birdRef.current.y + birdRef.current.height / 2
      );
      
      // Set bird to "up" state
      setBirdState('up');
      
      // Clear any existing timeout
      if (birdStateTimeoutRef.current) {
        window.clearTimeout(birdStateTimeoutRef.current);
      }
      
      // Reset to normal state after 150ms
      birdStateTimeoutRef.current = window.setTimeout(() => {
        setBirdState('normal');
      }, 150);
    }, [gameStarted, gameOver, isMenuOpen, addCloudPuff]);
    
    const handleInteraction = useCallback(() => {
      if (isMenuOpen) return;
      
      if (!gameStarted || gameOver) {
        startGame();
      } else {
        jump();
      }
    }, [gameStarted, gameOver, isMenuOpen, startGame, jump]);

    // Handle touch events
    const handleTouchStart = useCallback((e: TouchEvent) => {
      if (isMenuOpen) return;
      
      e.preventDefault(); // Prevent double-firing on some devices
      handleInteraction();
    }, [isMenuOpen, handleInteraction]);
    
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (e.code === 'Space' && !isMenuOpen) {
        e.preventDefault();
        if (!gameStarted || gameOver) {
          startGame();
        } else {
          jump();
        }
      }
    }, [gameStarted, gameOver, isMenuOpen, startGame, jump]);
    
    const toggleMute = useCallback(() => {
      const newState = soundManager.toggleMute();
      setIsMuted(newState);
    }, []);
    
    // Update event listeners
    useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('touchstart', handleTouchStart, { passive: false });
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('touchstart', handleTouchStart);
      };
    }, [handleKeyDown, handleTouchStart]);
    
    // Add refs for delta time and pipe spawn timer
    const lastTimestampRef = useRef<number | null>(null);
    
    // Add refs for gameStarted, gameOver, isMenuOpen
    const gameStartedRef = useRef(gameStarted);
    const gameOverRef = useRef(gameOver);
    const isMenuOpenRef = useRef(isMenuOpen);

    // Sync refs with state
    useEffect(() => { gameStartedRef.current = gameStarted; }, [gameStarted]);
    useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
    useEffect(() => { isMenuOpenRef.current = isMenuOpen; }, [isMenuOpen]);

    // Set pipe spawn distance: more distant on desktop
    const PIPE_SPAWN_DISTANCE = isMobile ? 300 : 380; // px, distance between pipes

    // Move all game logic into this function
    const updateGameLogic = useCallback((dt: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, groundHeight: number) => {
      // Bird movement
      let gravity = birdRef.current.gravity;
      birdRef.current.velocity += gravity * dt * 60;
      birdRef.current.y += birdRef.current.velocity * dt * 60;

      // Pipe spawning based on distance (pixel-based)
      const spawnX = isMobile ? canvas.width : canvas.width - 150;
      const pipes = pipesRef.current;
      let shouldSpawn = false;
      if (pipes.length === 0) {
        shouldSpawn = true;
      } else {
        const lastPipe = pipes[pipes.length - 1];
        if (spawnX - (lastPipe.x) >= PIPE_SPAWN_DISTANCE) {
          shouldSpawn = true;
        }
      }
      if (shouldSpawn) {
        const pipeGap = Math.max(PIPE.gap * 0.75, pipeGapRef.current);
        const minPipeHeight = PIPE.minPipeHeight;
        const maxPipeHeight = canvas.height - groundHeight - pipeGap - minPipeHeight;
        const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight)) + minPipeHeight;
        const width = Math.floor(Math.random() * (PIPE.maxWidth - PIPE.minWidth)) + PIPE.minWidth;
        const gradient = isMobile ? undefined : createPipeGradient(ctx, width);
        pipes.push({
          x: spawnX,
          topHeight,
          passed: false,
          width,
          gradient,
          speed: basePipeSpeed
        });
      }

      // Update particles (skip on mobile)
      if (!isMobile) {
        particlesRef.current = particlesRef.current.filter(particle => {
          particle.x += particle.vx * dt * 60;
          particle.y += particle.vy * dt * 60;
          particle.life -= 0.02 * dt * 60;
          return particle.life > 0;
        });
      }

      // Update pipes
      pipesRef.current = pipesRef.current.filter(pipe => {
        if (gameStartedRef.current && !gameOverRef.current) {
          pipe.x -= (pipe.speed || basePipeSpeed) * dt * 60;
        }
        // Scoring
        if (!pipe.passed && pipe.x + pipe.width < birdRef.current.x) {
          pipe.passed = true;
          setScore(prevScore => prevScore + 1);
          soundManager.play('score');
        }
        // Collision
        if (
          birdRef.current.x + birdRef.current.width > pipe.x &&
          birdRef.current.x < pipe.x + pipe.width &&
          (birdRef.current.y < pipe.topHeight || 
            birdRef.current.y + birdRef.current.height > pipe.topHeight + PIPE.gap)
        ) {
          handleGameOver();
        }
        return pipe.x > -pipe.width;
      });

      // Update cloud puffs (skip on mobile)
      if (!isMobile) {
        cloudPuffsRef.current = cloudPuffsRef.current.filter(puff => {
          puff.size += puff.expandSpeed * dt * 60;
          puff.opacity -= puff.fadeSpeed * dt * 60;
          return puff.opacity > 0;
        });
      }

      // Ground collision
      if (birdRef.current.y + birdRef.current.height > canvas.height - groundHeight || birdRef.current.y < 0) {
        handleGameOver();
      }
    }, [PIPE, addCloudPuff, createPipeGradient, handleGameOver, isMobile]);

    useEffect(() => {
      if (!bgImageLoaded || !birdImageLoaded) {
        console.log('Game loop waiting for:', {
          bgImageLoaded,
          birdImageLoaded
        });
        return;
      }
      let animationFrameCount = 0;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const groundHeight = 20;
      const updateCanvasSize = () => {
        if (canvas) {
          if (isMobile) {
            canvas.width = MOBILE_CANVAS_WIDTH;
            canvas.height = MOBILE_CANVAS_HEIGHT;
          } else {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
          }
        }
      };
      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);
      // Reset lastTimestamp and pipeSpawnTimer on game start
      lastTimestampRef.current = null;
      const gameLoop = (timestamp?: number) => {
        if (!timestamp) timestamp = performance.now();
        let deltaTime = 0;
        if (lastTimestampRef.current !== null) {
          deltaTime = (timestamp - lastTimestampRef.current) / 1000;
        } else {
          deltaTime = 1 / 60;
        }
        // Clamp deltaTime to avoid spiral of death
        deltaTime = Math.min(deltaTime, 1 / 30);
        lastTimestampRef.current = timestamp;
        // No accumulator, just update once per frame
        if (gameStartedRef.current && !gameOverRef.current && !isMenuOpenRef.current) {
          updateGameLogic(deltaTime, ctx, canvas, groundHeight);
        }
        // Render (draw everything based on current state)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background: blurred/dimmed stretched fill, then aspect-ratio-correct cover
        if (bgImageRef.current) {
          if (!isMobile) {
            // Desktop: blurred/dimmed stretched fill
            ctx.save();
            ctx.filter = 'blur(8px) brightness(0.7)';
            ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
            ctx.restore();
          }
          // 2. Aspect-ratio-correct cover (centered, cropped, no stretching)
          const img = bgImageRef.current;
          const canvasAspect = canvas.width / canvas.height;
          const imgAspect = img.width / img.height;
          let drawWidth, drawHeight, offsetX, offsetY;
          if (imgAspect > canvasAspect) {
            // Image is wider than canvas: crop sides
            drawHeight = canvas.height;
            drawWidth = img.width * (canvas.height / img.height);
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = 0;
          } else {
            // Image is taller than canvas: crop top/bottom
            drawWidth = canvas.width;
            drawHeight = img.height * (canvas.width / img.width);
            offsetX = 0;
            offsetY = (canvas.height - drawHeight) / 2;
          }
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        }

        // Draw ground
        ctx.fillStyle = '#996633';
        ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
        
        // Draw pipes
        pipesRef.current.forEach(pipe => {
          const drawPipe = (x: number, height: number, isTop: boolean) => {
            // Add shadow for all devices
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
            // Main pipe body with gradient or debug color
            if (pipe.gradient) {
              ctx.fillStyle = pipe.gradient;
            } else {
              ctx.fillStyle = '#4EC94E'; // fallback color
            }
            
            if (isTop) {
              // Top pipe
              const pipeHeight = height;
              console.log('Drawing pipe at', x, 0, pipe.width, pipeHeight);
              ctx.fillRect(x, 0, pipe.width, pipeHeight);
              
              // Reset shadow for decorative elements
              ctx.shadowColor = 'transparent';
              
              // Pipe cap with gradient (increased height to 25px)
              const capGradient = ctx.createLinearGradient(x - 5, pipeHeight - 25, x - 5, pipeHeight);
              capGradient.addColorStop(0, '#2E912E');
              capGradient.addColorStop(1, '#267A26');
              ctx.fillStyle = capGradient;
              ctx.fillRect(x - 5, pipeHeight - 25, pipe.width + 10, 25);
              
              // Add highlight
              ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
              ctx.fillRect(x, 0, 10, pipeHeight);
              
              // Add edge detail
              ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
              ctx.fillRect(x + pipe.width - 10, 0, 10, pipeHeight);
            } else {
              // Bottom pipe
              const startY = height;
              const pipeHeight = canvas.height - startY - groundHeight;
              console.log('Drawing pipe at', x, startY, pipe.width, pipeHeight);
              ctx.fillRect(x, startY, pipe.width, pipeHeight);
              
              // Reset shadow for decorative elements
              ctx.shadowColor = 'transparent';
              
              // Pipe cap with gradient (increased height to 25px)
              const capGradient = ctx.createLinearGradient(x - 5, startY, x - 5, startY + 25);
              capGradient.addColorStop(0, '#2E912E');
              capGradient.addColorStop(1, '#267A26');
              ctx.fillStyle = capGradient;
              ctx.fillRect(x - 5, startY, pipe.width + 10, 25);
              
              // Add highlight
              ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
              ctx.fillRect(x, startY, 10, pipeHeight);
              
              // Add edge detail
              ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
              ctx.fillRect(x + pipe.width - 10, startY, 10, pipeHeight);
            }
          };

          // Draw both pipes
          drawPipe(pipe.x, pipe.topHeight, true);
          drawPipe(pipe.x, pipe.topHeight + PIPE.gap, false);
        });
        
        // Draw bird
        if (birdImageRef.current && birdImageRef.current.complete) {
          const { x, y, width, height } = birdRef.current;
          try {
            // Save context state
            ctx.save();
            // Always enable smoothing for the bird
            let prevSmoothing = ctx.imageSmoothingEnabled;
            ctx.imageSmoothingEnabled = true;
            // Calculate rotation based on velocity
            const rotation = Math.min(Math.max(birdRef.current.velocity * 0.1, -0.5), 0.5);
            // Translate to bird center, rotate, and translate back
            ctx.translate(x + width / 2, y + height / 2);
            ctx.rotate(rotation);
            ctx.translate(-(x + width / 2), -(y + height / 2));
            // Draw the bird
            ctx.drawImage(birdImageRef.current, x, y, width, height);
            // Restore smoothing
            ctx.imageSmoothingEnabled = prevSmoothing;
            // Restore context state
            ctx.restore();
          } catch (error) {
            console.error('Error drawing bird:', error);
          }
        }
        
        // Update score display
        if (gameStartedRef.current) {
          // Draw current score
          ctx.fillStyle = 'white';
          ctx.font = isMobile ? '20px "Courier New", monospace' : '30px "Courier New", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${score}`, canvas.width / 2, 50);
        }
        
        // Draw particles
        if (!isMobile) {
          particlesRef.current.forEach(particle => {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.life;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          });
        }
        
        // Draw cloud puffs
        if (!isMobile) {
          cloudPuffsRef.current.forEach(puff => {
            // Draw cloud shape using multiple circles
            const drawCloudBubble = (offsetX: number, offsetY: number, sizeMultiplier: number) => {
              ctx.beginPath();
              ctx.fillStyle = `rgba(255, 255, 255, ${puff.opacity})`;
              ctx.arc(
                puff.x + offsetX, 
                puff.y + offsetY, 
                puff.size * sizeMultiplier, 
                0, 
                Math.PI * 2
              );
              ctx.fill();
            };

            // Create cloud shape with multiple overlapping circles
            drawCloudBubble(0, 0, 1);           // Center
            drawCloudBubble(-puff.size/2, 0, 0.7);  // Left
            drawCloudBubble(puff.size/2, 0, 0.7);   // Right
            drawCloudBubble(0, -puff.size/3, 0.6);  // Top
            drawCloudBubble(0, puff.size/3, 0.6);   // Bottom
            // Add some smaller detail bubbles
            drawCloudBubble(-puff.size/1.5, -puff.size/4, 0.4);
            drawCloudBubble(puff.size/1.5, -puff.size/4, 0.4);
            drawCloudBubble(-puff.size/3, puff.size/2, 0.3);
            drawCloudBubble(puff.size/3, puff.size/2, 0.3);
          });
        }
        
        // Game over
        if (gameOverRef.current) {
          return;
        }
        
        if (!gameOverRef.current) {
          gameLoopRef.current = requestAnimationFrame(gameLoop);
        }
      };
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return () => {
        window.removeEventListener('resize', updateCanvasSize);
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
        }
      };
    }, [gameStarted, gameOver, score, bgImageLoaded, birdImageLoaded, handleGameOver, isMenuOpen, updateGameLogic]);
    
    // Update game over effect to set dead state
    useEffect(() => {
      if (gameOver) {
        setBirdState('dead');
        if (birdStateTimeoutRef.current) {
          window.clearTimeout(birdStateTimeoutRef.current);
        }
      }
    }, [gameOver]);
    
    // Clean up timeout on unmount
    useEffect(() => {
      return () => {
        if (birdStateTimeoutRef.current) {
          window.clearTimeout(birdStateTimeoutRef.current);
        }
      };
    }, []);
    
    // Load high score on mount
    useEffect(() => {
      const savedHighScore = localStorage.getItem('flappyBirdHighScore');
      if (savedHighScore) {
        setHighScore(parseInt(savedHighScore, 10));
      }
    }, []);
    
    // Add effect to handle background music based on game state and menu
    useEffect(() => {
      if (gameStarted || isMenuOpen) {
        soundManager.stopBackgroundMusic();
      } else {
        soundManager.startBackgroundMusic();
      }
    }, [gameStarted, isMenuOpen]);
    
    useEffect(() => {
      loadImages();
    }, [backgroundImage, birdImageSrc]);
    
    useEffect(() => {
      console.log('backgroundImage updated:', backgroundImage);
    }, [backgroundImage]);
    
    useEffect(() => {
      console.log('birdImageSrc updated:', birdImageSrc);
    }, [birdImageSrc]);
    
    console.log('Pipes array:', pipesRef.current);
    
    // DEV: Bypass OrangeID login for now
    const { isLoggedIn, signOut } = useBedrockPassport();
    
    return (
      <>
        {/* OrangeID login overlay OUTSIDE the game container */}
        {!isLoggedIn && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90"
            style={{backdropFilter: 'blur(4px)', pointerEvents: 'auto'}} 
            onClick={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
          >
            <div className="bg-black/90 rounded-2xl border-2 border-orange-500 p-6 max-w-[480px] w-full flex flex-col items-center" style={{pointerEvents: 'auto'}}>
              <img
                src="https://irp.cdn-website.com/e81c109a/dms3rep/multi/orange-web3-logo-v2a-20241018.svg"
                alt="Orange Web3"
                className="h-12 mb-4"
              />
              <h2 className="text-2xl font-bold text-orange-500 mb-4">Sign in to play</h2>
              <LoginPanel
                title="Sign in to"
                logo="https://irp.cdn-website.com/e81c109a/dms3rep/multi/orange-web3-logo-v2a-20241018.svg"
                logoAlt="Orange Web3"
                walletButtonText="Connect Wallet"
                showConnectWallet={false}
                separatorText="OR"
                features={{
                  enableWalletConnect: false,
                  enableAppleLogin: true,
                  enableGoogleLogin: true,
                  enableEmailLogin: false,
                }}
                titleClass="text-xl font-bold"
                logoClass="ml-2 md:h-8 h-6"
                panelClass="container p-2 md:p-8 rounded-2xl max-w-[480px]"
                buttonClass="hover:border-orange-500"
                separatorTextClass="bg-orange-900 text-gray-500"
                separatorClass="bg-orange-900"
                linkRowClass="justify-center"
                headerClass="justify-center"
              />
            </div>
          </div>
        )}
        <div 
          className="w-full h-full flex items-center justify-center relative"
          onClick={handleInteraction}
          {...(isLoggedIn ? {
            onTouchStart: (e: React.TouchEvent) => {
              const target = e.target as HTMLElement;
              if (
                target.closest('button, [role="button"], a, input, select, textarea, [tabindex]:not([tabindex="-1"])')
              ) return;
              e.preventDefault();      // block scrolling/zoom
              handleInteraction();     // start/jump
            },
            style: { touchAction: 'none' as const }
          } : { style: {} })}
        >
          {/* Game End Screen Overlay */}
          {isLoggedIn && !isMenuOpen && gameOver && (
            <div className="absolute inset-0 z-[1100] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm select-none">
              <div className="bg-black/80 rounded-2xl border-2 border-orange-500 p-8 flex flex-col items-center shadow-2xl">
                <h2 className="text-3xl font-bold text-orange-400 pixel-font mb-2">Game Over</h2>
                <div className="text-white text-xl pixel-font mb-2">Score: <span className="text-orange-300">{score}</span></div>
                <div className="text-white text-lg pixel-font mb-4">High Score: <span className="text-orange-200">{highScore}</span></div>
                <div className="text-white text-base pixel-font animate-flash mt-2 text-center">
                  Touch or press <span className="text-orange-400">space bar</span> to start
                </div>
              </div>
            </div>
          )}
          {/* Mute button */}
          <button 
            className={`fixed top-2 left-2 z-[1000] bg-black/70 text-white rounded-full hover:bg-black/90 transition-colors shadow-lg border-2 border-orange-500 flex items-center justify-center ${isMobile ? 'w-10 h-10 p-2 text-lg' : 'w-12 h-12 p-3 text-xl'}`}
            onClick={toggleMute}
            onTouchStart={e => e.stopPropagation()}
            style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
          >
            {isMuted ? <VolumeX size={isMobile ? 20 : 24} /> : <Volume2 size={isMobile ? 20 : 24} />}
          </button>
          
          {/* Customization Button: replaces hamburger/menu icon */}
          <button 
            className={`fixed top-2 right-2 z-[1000] bg-black/70 text-white rounded-full hover:bg-black/90 transition-colors shadow-lg border-2 border-orange-500 flex items-center justify-center font-bold ${isMobile ? 'w-auto h-10 px-4 py-2 text-base' : 'w-auto h-12 px-6 py-3 text-lg'}`}
            style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
            aria-label="Open customization menu"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(true);
            }}
            onTouchStart={e => e.stopPropagation()}
          >
            Change with AI
          </button>
          
          {/* Customization menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetContent className="w-[90vw] max-w-[540px] bg-black/90 border-orange-500 z-[1002] flex flex-col h-full">
              <SheetHeader>
                <SheetTitle className="text-orange-500 text-xl pixel-font">Game Customization</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto">
                <GameCustomizationPanel
                  onUpdateBackground={setBackgroundImage}
                  onUpdateBird={setBirdImageSrc}
                  currentBackground={backgroundImage}
                  currentBird={birdImageSrc}
                />
              </div>
              {isLoggedIn && (
                <Button
                  className="mt-6 mb-2 w-full text-lg font-bold pixel-font bg-white text-black border border-gray-300 hover:bg-gray-100 hover:text-black"
                  onClick={async () => {
                    await signOut();
                    setIsMenuOpen(false);
                    window.location.assign('/');
                  }}
                >
                  Logout
                </Button>
              )}
            </SheetContent>
          </Sheet>
          
          <canvas 
            ref={canvasRef} 
            className={`w-full h-full cursor-pointer${!isMobile ? ' pixel-rendering' : ''}`}
            style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 1, willChange: 'transform', touchAction: 'none', pointerEvents: 'none' }}
          />
        </div>
        
        <style>
          {`
          .pixel-font {
            font-family: 'Courier New', monospace;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          
          .pixel-rendering {
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
          }

          @keyframes flash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }

          .animate-flash {
            animation: flash 1.5s infinite;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          }
          `}
        </style>
      </>
    );
  };

  export default FlappyBirdGame;
