import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { BracketImage } from "@shared/schema";

export default function Playoffs() {
  const { data: bracketImage } = useQuery<BracketImage | null>({
    queryKey: ["/api/bracket-image"],
  });

  return (
    <div className="min-h-screen bg-background py-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-6xl px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-center" data-testid="text-page-title">VFG Playoff Bracket</h1>
        </div>
        {bracketImage?.imageUrl ? (
          <img 
            src={bracketImage.imageUrl} 
            alt="Playoff Bracket" 
            className="w-full h-auto rounded-lg"
            data-testid="bracket-image"
          />
        ) : (
          <div className="w-full aspect-video bg-card border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground" data-testid="bracket-placeholder">
            <p>No bracket image uploaded</p>
          </div>
        )}
      </div>
    </div>
  );
}
