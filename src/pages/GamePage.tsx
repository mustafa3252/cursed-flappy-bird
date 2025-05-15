import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FlappyBirdGame from '@/components/FlappyBirdGame';
import soundManager from '@/utils/gameSounds';

const GamePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Stop background music when game page mounts
    soundManager.stopBackgroundMusic();
    
    // Cleanup function to handle component unmount
    return () => {
      // Don't restart music here - let Index page handle that
    };
  }, []);

  const handleExitGame = () => {
    navigate('/');
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden">
      <main className="w-full h-full flex items-center justify-center">
        <FlappyBirdGame onExit={handleExitGame} />
      </main>
    </div>
  );
};

export default GamePage;
