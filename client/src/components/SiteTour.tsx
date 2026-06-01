import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TourStep {
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Live Scores",
    description: "Follow every game in real-time with drive details and scoring plays on the Live Scores page.",
  },
  {
    title: "Schedule",
    description: "Plan your season! View the complete league schedule and upcoming matchups.",
  },
  {
    title: "Playoffs",
    description: "Follow the road to the championship with our interactive playoff brackets.",
  },
  {
    title: "Standings",
    description: "Check the current division rankings and see who's leading the pack.",
  },
  {
    title: "Pick'ems",
    description: "Join the weekly prediction challenges and compete with other fans.",
  },
  {
    title: "News",
    description: "Stay up to date with the latest breaking news and analysis from across the league.",
  },
  {
    title: "Partners",
    description: "Learn about our sponsors and partners who make the VFG possible.",
  },
  {
    title: "Social",
    description: "Connect with the community and follow our official social media channels.",
  },
  {
    title: "Changelogs",
    description: "Keep track of all the latest features and updates we've added to the hub.",
  },
  {
    title: "Settings",
    description: "Customize your experience with dark mode and favorite team preferences.",
  },
];

export function SiteTour({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const queryClient = useQueryClient();

  const tourMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/user/tour", { completed: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete();
    },
  });

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsOpen(false);
    tourMutation.mutate(undefined, {
      onSuccess: () => {
        onComplete();
      },
      onError: (error) => {
        console.error("Tour mutation failed:", error);
        onComplete(); // Still call onComplete to close the tour and unblock the UI
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🏈</span>
            {TOUR_STEPS[currentStep].title}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {TOUR_STEPS[currentStep].description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i === currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip Tour
          </Button>
          <Button onClick={handleNext}>
            {currentStep === TOUR_STEPS.length - 1 ? "Get Started" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
