"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Film, Loader } from "lucide-react";

interface VideoSkeletonProps {
  aspectRatio: string;
  className?: string;
}

export function VideoSkeleton({ aspectRatio, className = "" }: VideoSkeletonProps) {
  const isPortrait = aspectRatio === "portrait";
  const aspectClass = isPortrait ? "aspect-[9/16]" : "aspect-video";

  return (
    <Card className={`w-full overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Film className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">GENERATING VIDEO</h3>
              <p className="text-sm text-muted-foreground">AI is creating your cinematic content</p>
            </div>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            <Loader className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        </div>

        {/* Video Placeholder */}
        <div className={`relative ${aspectClass} bg-muted rounded-2xl overflow-hidden border-2 border-muted`}>
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse" />

          {/* Film strip effect */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-1 opacity-20">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-16 bg-primary/30 rounded-sm animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 animate-pulse">
              <Film className="h-8 w-8 text-primary" />
            </div>
            <h4 className="text-lg font-bold text-foreground mb-2">Creating Your Video</h4>
            <p className="text-sm text-muted-foreground max-w-xs">
              Our AI is crafting a cinematic masterpiece just for you
            </p>
          </div>

          {/* Aspect ratio indicator */}
          <div className="absolute top-4 left-4">
            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
              {isPortrait ? "9:16" : "16:9"}
            </Badge>
          </div>
        </div>

        {/* Skeleton text below */}
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}