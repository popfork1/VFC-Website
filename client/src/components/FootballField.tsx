import { useEffect, useState, useRef } from "react";
import type { GamePlay, Game } from "@shared/schema";
import { motion } from "framer-motion";
import fieldBg from "@assets/Football_field_diagram_1767142475671.webp";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FootballFieldProps {
  plays: GamePlay[];
  team1: string;
  team2: string;
  team1Score: number;
  team2Score: number;
  onPositionChange?: (position: number) => void;
  isAdmin?: boolean;
  game?: Game;
}

export function FootballField({ plays, team1, team2, team1Score, team2Score, onPositionChange, isAdmin, game }: FootballFieldProps) {
  const [ballPosition, setBallPosition] = useState(50); // 0-100 scale, 50 = midfield
  const containerWidthRef = useRef(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);

  // Track container width on mount and resize (use ref, not state)
  useEffect(() => {
    const updateWidth = () => {
      if (fieldRef.current) {
        containerWidthRef.current = fieldRef.current.offsetWidth;
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Update ball position from game data
  useEffect(() => {
    const pos = game?.ballPosition ?? 50;
    setBallPosition(pos);
    console.log("[FIELD] Prop/DB position update:", pos);
  }, [game?.ballPosition]);

  const handleDrag = (event: any, info: any) => {
    if (containerWidthRef.current === 0) return;
    
    // Calculate position as percentage of container width
    const xPos = info.offset.x;
    const percentage = Math.max(0, Math.min(100, (xPos / containerWidthRef.current) * 100));
    const roundedX = Math.round(percentage);
    
    if (roundedX !== ballPosition) {
      setBallPosition(roundedX);
      const payload = { 
        type: "ball_move",
        gameId: game?.id,
        ballPosition: roundedX 
      };
      
      const wss = (window as any).socket;
      if (wss && wss.readyState === WebSocket.OPEN) {
        wss.send(JSON.stringify(payload));
      }
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    if (containerWidthRef.current === 0) return;
    
    const xPos = info.offset.x;
    const percentage = Math.max(0, Math.min(100, (xPos / containerWidthRef.current) * 100));
    const roundedX = Math.round(percentage);
    
    setBallPosition(roundedX);
    console.log("[FIELD] Drag ended, persisting ball position:", roundedX, "Container width:", containerWidthRef.current);

    if (onPositionChange) {
      onPositionChange(roundedX);
    }
    
    if (game?.id) {
      const payload = { ballPosition: roundedX };
      apiRequest("PATCH", `/api/games/${game.id}`, payload)
        .then((updated) => {
          console.log("[FIELD] Successfully persisted to DB:", updated);
          queryClient.setQueryData(["/api/games", game.id], (old: any) => {
            if (!old) return old;
            return { ...old, ballPosition: roundedX };
          });
        })
        .catch(err => console.error("[FIELD] Final save failed:", err));
    }
  };

  // Calculate pixel position from percentage
  const pixelPosition = containerWidthRef.current > 0 ? (ballPosition / 100) * containerWidthRef.current : 0;

  return (
    <div className="w-full rounded-lg overflow-hidden shadow-lg border-4 border-white">
      <div 
        ref={fieldRef}
        className="relative w-full aspect-[16/9] bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${fieldBg})`,
          contain: "layout style paint",
        } as any}
      >
        <motion.div
          ref={ballRef}
          drag={isAdmin ? "x" : false}
          dragElastic={0}
          dragMomentum={false}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={{ x: pixelPosition }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ 
            top: "50%",
            position: "absolute",
            willChange: "transform",
            originX: 0.5,
            originY: 0.5,
          }}
          initial={{ x: pixelPosition }}
          className={`absolute w-4 h-6 bg-amber-900 rounded-full shadow-xl cursor-grab active:cursor-grabbing z-20 flex items-center justify-center border border-white/30 ${isAdmin ? 'ring-2 ring-primary ring-offset-2' : ''}`}
        >
          <div className="w-full h-[1px] bg-white/50 absolute top-1/4" />
          <div className="w-full h-[1px] bg-white/50 absolute top-3/4" />
        </motion.div>
      </div>
    </div>
  );
}
