import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface BreakingNewsData {
  message: string;
  active: boolean;
  expiresAt: string | null;
}

export function BreakingNewsBanner() {
  const [isVisible, setIsVisible] = useState(false);

  const { data: breakingNews } = useQuery<BreakingNewsData>({
    queryKey: ["/api/settings/breaking-news"],
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (breakingNews?.active && breakingNews?.message) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [breakingNews]);

  if (!isVisible || !breakingNews?.message) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[10001] bg-accent text-accent-foreground border-b border-accent-foreground/10 overflow-hidden backdrop-blur-md">
      <div className="py-1.5 px-4">
        <div className="marquee-container">
          <div className="marquee-content py-0.5">
            <span className="font-black italic mr-4 tracking-tighter uppercase">BREAKING:</span>
            <span className="font-bold">{breakingNews.message}</span>
            <span className="mx-12 opacity-50 font-black">///</span>
            <span className="font-black italic mr-4 tracking-tighter uppercase">BREAKING:</span>
            <span className="font-bold">{breakingNews.message}</span>
            <span className="mx-12 opacity-50 font-black">///</span>
          </div>
        </div>
      </div>
      <style>{`
        .marquee-container {
          width: 100%;
          overflow: hidden;
        }
        .marquee-content {
          display: inline-block;
          white-space: nowrap;
          padding-left: 100%;
          animation: marquee 25s linear infinite;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
