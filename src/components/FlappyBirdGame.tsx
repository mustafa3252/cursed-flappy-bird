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
  const birdRef = useRef({
    x: 50,
    y: 150,
    velocity: 0,
    gravity: 0.35,
    flapStrength: -7.5,
    width: 60,
    height: 45,
    frame: 0,
    frameCount: 0,
  });
  
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
  }, [backgroundImage, currentBirdImage, birdState]);
  
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
  }, [backgroundImage, birdImageSrc, loadImages]);
  
  const pipesRef = useRef<Array<{
    x: number, 
    topHeight: number, 
    passed: boolean, 
    width: number,
    gradient?: CanvasGradient,  // Add gradient property
    speed?: number
  }>>([]);
  
  // Add difficulty state
  const [difficulty, setDifficulty] = useState(1);
  const difficultyRef = useRef(1);
  
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
  
  const startGame = useCallback(() => {
    soundManager.stopBackgroundMusic(); // Stop background music when game starts
    soundManager.play('start');
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    birdRef.current = {
      x: 50,
      y: 150,
      velocity: 0,
      gravity: 0.35,
      flapStrength: -7.5,
      width: 60,
      height: 45,
      frame: 0,
      frameCount: 0,
    };
    pipesRef.current = [];
    setIsMenuOpen(false); // Ensure menu is closed when game starts
    frameCountRef.current = 0; // Reset frame count
    console.log('Game started!');
  }, []);
  
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
  
  // Utility: Detect mobile device
  const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  
  // Mobile scaling and physics adjustments
  // Lower the mobile canvas resolution for performance
  const MOBILE_CANVAS_WIDTH = 240;
  const MOBILE_CANVAS_HEIGHT = 360;
  const MOBILE_SCALE = isMobile ? 0.42 : 1; // 240/570 ≈ 0.42
  const MOBILE_BIRD = {
    width: 60 * MOBILE_SCALE,
    height: 45 * MOBILE_SCALE,
    gravity: isMobile ? 0.55 : 0.35,
    flapStrength: isMobile ? -9.5 : -7.5,
    x: 50 * MOBILE_SCALE,
    y: 150 * MOBILE_SCALE
  };
  const MOBILE_PIPE = {
    minWidth: 60 * MOBILE_SCALE,
    maxWidth: 80 * MOBILE_SCALE,
    gap: 160 * MOBILE_SCALE,
    minPipeHeight: 60 * MOBILE_SCALE
  };
  
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
    
    // Define groundHeight here so it's available throughout the effect
    const groundHeight = 20;
    
    // Make canvas fill the container, but smaller on mobile
    const updateCanvasSize = () => {
      if (canvas) {
        if (isMobile) {
          // Use a much smaller, fixed aspect ratio for mobile
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
    
    let loopHandle: number | null = null;
    let lastFrameTime = 0;
    const mobileFrameDelay = 1000 / 24; // 24 FPS for mobile
    
    const gameLoop = (timestamp?: number) => {
      // Throttle on mobile
      if (isMobile) {
        if (timestamp && timestamp - lastFrameTime < mobileFrameDelay) {
          loopHandle = requestAnimationFrame(gameLoop);
          return;
        }
        lastFrameTime = timestamp || 0;
      }
      // Clear canvas and set background
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
      
      // Only update bird position and generate pipes if game is started and menu is not open
      if (gameStarted && !gameOver && !isMenuOpen) {
        // Update bird position
        birdRef.current.velocity += birdRef.current.gravity;
        birdRef.current.y += birdRef.current.velocity;
        
        // Generate pipes with difficulty-based parameters
        frameCountRef.current++;
        if (frameCountRef.current % Math.floor(100 / difficultyRef.current) === 0) {
          const pipeGap = Math.max(MOBILE_PIPE.gap * 0.75, pipeGapRef.current - (difficultyRef.current - 1) * 10 * MOBILE_SCALE);
          const minPipeHeight = MOBILE_PIPE.minPipeHeight;
          const maxPipeHeight = canvas.height - groundHeight - pipeGap - minPipeHeight;
          const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight)) + minPipeHeight;
          // Random width between min and max
          const width = Math.floor(Math.random() * (MOBILE_PIPE.maxWidth - MOBILE_PIPE.minWidth)) + MOBILE_PIPE.minWidth;
          // No gradients on mobile
          const gradient = isMobile ? undefined : createPipeGradient(ctx, width);
          pipesRef.current.push({
            x: canvas.width,
            topHeight,
            passed: false,
            width,
            gradient,
            speed: (isMobile ? 4.2 : 3) + (difficultyRef.current - 1) * (isMobile ? 0.7 : 1)
          });
          console.log('Pipe generated:', pipesRef.current[pipesRef.current.length - 1]);
        }
      }
      
      // Update and draw particles (skip on mobile)
      if (!isMobile) {
        particlesRef.current = particlesRef.current.filter(particle => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.life -= 0.02;
          if (particle.life > 0) {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.life;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            return true;
          }
          return false;
        });
      }
      
      // Update pipe movement with difficulty
      pipesRef.current = pipesRef.current.filter(pipe => {
        if (gameStarted && !gameOver) {
          pipe.x -= pipe.speed || (3 + (difficultyRef.current - 1));
        }
        
        // Draw pipes
        const drawPipe = (x: number, height: number, isTop: boolean) => {
          // No shadow or gradients on mobile
          if (!isMobile) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
          }
          // Main pipe body with gradient or debug color
          if (!isMobile && pipe.gradient) {
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
            if (!isMobile) ctx.shadowColor = 'transparent';
            
            // Pipe cap with gradient (increased height to 25px)
            if (!isMobile) {
              const capGradient = ctx.createLinearGradient(x - 5, pipeHeight - 25, x - 5, pipeHeight);
              capGradient.addColorStop(0, '#2E912E');
              capGradient.addColorStop(1, '#267A26');
              ctx.fillStyle = capGradient;
              ctx.fillRect(x - 5, pipeHeight - 25, pipe.width + 10, 25);
            }
            
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
            if (!isMobile) ctx.shadowColor = 'transparent';
            
            // Pipe cap with gradient (increased height to 25px)
            if (!isMobile) {
              const capGradient = ctx.createLinearGradient(x - 5, startY, x - 5, startY + 25);
              capGradient.addColorStop(0, '#2E912E');
              capGradient.addColorStop(1, '#267A26');
              ctx.fillStyle = capGradient;
              ctx.fillRect(x - 5, startY, pipe.width + 10, 25);
            }
            
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
        drawPipe(pipe.x, pipe.topHeight + pipeGapRef.current, false);
        
        // Only do collision and scoring if game is started
        if (gameStarted && !gameOver) {
          // Update scoring without particles
          if (!pipe.passed && pipe.x + pipe.width < birdRef.current.x) {
            pipe.passed = true;
            setScore(prevScore => prevScore + 1);
            soundManager.play('score');
          }
          
          // Update collision with particles
          if (
            birdRef.current.x + birdRef.current.width > pipe.x &&
            birdRef.current.x < pipe.x + pipe.width &&
            (birdRef.current.y < pipe.topHeight || 
             birdRef.current.y + birdRef.current.height > pipe.topHeight + pipeGapRef.current)
          ) {
            handleGameOver();
          }
        }
        
        return pipe.x > -pipe.width;
      });
      
      // Draw bird
      if (birdImageRef.current && birdImageRef.current.complete) {
        const { x, y, width, height } = birdRef.current;
        try {
          // Save context state
          ctx.save();
          
          // Calculate rotation based on velocity
          const rotation = Math.min(Math.max(birdRef.current.velocity * 0.1, -0.5), 0.5);
          
          // Translate to bird center, rotate, and translate back
          ctx.translate(x + width / 2, y + height / 2);
          ctx.rotate(rotation);
          ctx.translate(-(x + width / 2), -(y + height / 2));
          
          // Draw the bird
          ctx.drawImage(birdImageRef.current, x, y, width, height);
          
          // Restore context state
          ctx.restore();
        } catch (error) {
          console.error('Error drawing bird:', error);
        }
      }
      
      // Update score display
      if (gameStarted) {
        // Draw current score
        ctx.fillStyle = 'white';
        ctx.font = '30px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${score}`, canvas.width / 2, 50);
      }
      
      // Only check collisions if menu is not open
      if (gameStarted && !gameOver && !isMenuOpen) {
        if (birdRef.current.y + birdRef.current.height > canvas.height - groundHeight || birdRef.current.y < 0) {
          handleGameOver();
        }
      }
      
      // Update and draw cloud puffs (skip on mobile)
      if (!isMobile) {
        cloudPuffsRef.current = cloudPuffsRef.current.filter(puff => {
          puff.size += puff.expandSpeed;
          puff.opacity -= puff.fadeSpeed;
          if (puff.opacity > 0) {
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
            return true;
          }
          return false;
        });
      }
      
      // Game over
      if (gameOver) {
        return;
      }
      
      if (!gameOver) {
        if (isMobile) {
          loopHandle = requestAnimationFrame(gameLoop);
        } else {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        }
      }
    };
    if (isMobile) {
      loopHandle = requestAnimationFrame(gameLoop);
    } else {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (loopHandle) {
        cancelAnimationFrame(loopHandle);
      }
    };
  }, [gameStarted, gameOver, score, bgImageLoaded, birdImageLoaded, handleGameOver, isMenuOpen]);
  
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
  
  // Update difficulty based on score
  useEffect(() => {
    if (gameStarted && !gameOver) {
      const newDifficulty = Math.min(3, 1 + Math.floor(score / 10));
      difficultyRef.current = newDifficulty;
      setDifficulty(newDifficulty);
    }
  }, [score, gameStarted, gameOver]);
  
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
  }, [backgroundImage, birdImageSrc, birdState]);
  
  useEffect(() => {
    console.log('backgroundImage updated:', backgroundImage);
  }, [backgroundImage]);
  
  useEffect(() => {
    console.log('birdImageSrc updated:', birdImageSrc);
  }, [birdImageSrc]);
  
  console.log('Pipes array:', pipesRef.current);
  
  // DEV: Bypass OrangeID login for now
  const isLoggedIn = true;
  const { signOut } = useBedrockPassport();
  
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {/* OrangeID login overlay */}
      {!isLoggedIn && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90" style={{backdropFilter: 'blur(4px)'}}>
          <div className="bg-black/90 rounded-2xl border-2 border-orange-500 p-6 max-w-[480px] w-full flex flex-col items-center">
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
      {!gameStarted && !gameOver && (
        <div className="text-center z-10 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <p className="text-2xl font-bold text-white pixel-font mb-4">
            HIGH SCORE: {highScore}
          </p>
          <p className="text-4xl font-bold text-white pixel-font animate-flash">
            TOUCH OR PRESS SPACEBAR TO START
          </p>
        </div>
      )}
      
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center bg-black/90 p-8 rounded-lg border-2 border-white pointer-events-auto">
            <p className="text-4xl font-bold text-red-500 pixel-font mb-4">
              GAME OVER
            </p>
            <p className="text-2xl font-bold text-white pixel-font mb-2">
              SCORE: {score}
            </p>
            <p className="text-xl font-bold text-orange-500 pixel-font mb-8">
              HIGH SCORE: {highScore}
            </p>
            <p className="text-xl font-bold text-white pixel-font animate-flash">
              TOUCH OR PRESS SPACEBAR TO RETRY
            </p>
          </div>
        </div>
      )}
      
      <div 
        className="w-full h-full flex items-center justify-center relative"
        onClick={handleInteraction}
        onTouchStart={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
      >
        {/* Mute button */}
        <button 
          className="absolute top-4 left-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
        
        {/* Hamburger/Menu Button: Larger and always accessible on mobile */}
        <button 
          className={`fixed top-4 right-4 z-[1000] bg-black/70 text-white p-3 rounded-full hover:bg-black/90 transition-colors shadow-lg border-2 border-orange-500 ${isMobile ? 'w-16 h-16 text-3xl' : ''}`}
          style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
          aria-label="Open customization menu"
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(true);
          }}
        >
          <Menu size={isMobile ? 40 : 24} />
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
                }}
              >
                Logout
              </Button>
            )}
          </SheetContent>
        </Sheet>
        
        <canvas 
          ref={canvasRef} 
          className="w-full h-full cursor-pointer pixel-rendering"
          style={{ zIndex: 1, pointerEvents: 'none', willChange: 'transform' }}
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
    </div>
  );
};

export default FlappyBirdGame;
