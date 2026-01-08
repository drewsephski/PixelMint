"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Loader,
  Play,
  Film,
  Wand2,
  Zap,
  X
} from "lucide-react";

interface VideoGenerationLoaderProps {
  videoStyle: string;
  aspectRatio: string;
  duration: string;
  generateAudio: boolean;
  prompt: string;
  onCancel?: () => void;
}

const MODEL_CONFIGS = {
  "veo3-fast": {
    name: "Veo 3 Fast",
    quality: "Google's Veo 3 Fast",
    icon: <Film className="h-4 w-4" />,
    color: "bg-primary"
  }
};

export function VideoGenerationLoader({
  videoStyle,
  aspectRatio,
  duration,
  generateAudio,
  prompt,
  onCancel
}: VideoGenerationLoaderProps) {
  const modelConfig = MODEL_CONFIGS[videoStyle as keyof typeof MODEL_CONFIGS] || Object.values(MODEL_CONFIGS)[0];

  return (
    <Card className="w-full overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <CardContent className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Play className="h-6 w-6 text-primary fill-primary" />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                <Loader className="h-2 w-2 animate-spin text-primary-foreground" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">CREATING YOUR VIDEO</h3>
              <p className="text-sm text-muted-foreground font-medium">
                AI is generating your cinematic content
              </p>
            </div>
          </div>
        </div>

        {/* Model Info */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full ${modelConfig.color} flex items-center justify-center text-white`}>
              {modelConfig.icon}
            </div>
            <div>
              <p className="font-bold text-sm">{modelConfig.name}</p>
              <p className="text-xs text-muted-foreground">{modelConfig.quality}</p>
            </div>
          </div>
          <div className="text-right flex items-center gap-4">
            <div>
              <p className="font-bold text-sm">{aspectRatio === 'landscape' ? '16:9' : '9:16'}</p>
              <p className="text-xs text-muted-foreground">Aspect Ratio</p>
            </div>
            <div>
              <p className="font-bold text-sm">{duration}</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
            <div>
              <p className="font-bold text-sm text-primary">6</p>
              <p className="text-xs text-muted-foreground">Credits</p>
            </div>
          </div>
        </div>

        {/* Simple Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Generating video...</span>
            <span className="text-muted-foreground">Please wait</span>
          </div>
          <Progress value={50} className="h-3 animate-pulse" />
        </div>

        {/* Prompt Preview */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <p className="text-sm font-medium text-muted-foreground mb-2">Current Prompt:</p>
          <p className="text-sm leading-relaxed italic">"{prompt}"</p>
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="rounded-full border-2 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Generation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}