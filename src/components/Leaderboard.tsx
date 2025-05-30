import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

interface Entry { username: string; score: number; }

export default function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('leaderboards')
        .select('username, score')
        .order('score', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading leaderboard:', error);
      } else {
        setEntries(data || []);
      }
    })();
  }, []);

  return (
    <div className="leaderboard bg-black/70 p-4 rounded-lg text-white">
      <h2 className="text-xl font-bold mb-2">Leaderboard</h2>
      <ol className="list-decimal list-inside space-y-1">
        {entries.map((e, i) => (
          <li key={i}>
            <span className="font-bold">{e.username}</span>: {e.score}
          </li>
        ))}
      </ol>
    </div>
  );
} 