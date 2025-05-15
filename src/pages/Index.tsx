import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoginButton from "@/components/LoginButton";
import backgroundImg from '@/assets/background.png';
import soundManager from '@/utils/gameSounds';

const Index = () => {
  const navigate = useNavigate();
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleStartPlaying = () => {
    setHasInteracted(true);
    navigate('/game');
  };

  // Handle keyboard events for starting the game
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault(); // Prevent page scrolling
        handleStartPlaying();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // Start background music when component mounts
  useEffect(() => {
    soundManager.startBackgroundMusic();
    
    // Stop background music when component unmounts
    return () => {
      soundManager.stopBackgroundMusic();
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col bg-gray-900"
      style={{ backgroundImage: `url(${backgroundImg})` }}
    >
      <header className="p-4 bg-black/80 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-500 font-mono">Cursed Flappy Bird</h1>
        <LoginButton />
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl mx-auto bg-black/70 p-8 rounded-lg border-2 border-orange-500">
          <h2 className="text-4xl font-bold mb-6 text-orange-500 font-mono">CURSED FLAPPY BIRD</h2>
          <p className="text-xl text-gray-300 mb-8 font-mono">
            Let AI make this game wild 🐎, use it to edit bird, background and pipes 🥴
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={handleStartPlaying}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg font-mono border-2 border-orange-400"
            >
              START PLAYING
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
