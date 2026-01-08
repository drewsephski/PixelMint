"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader,
  Play,
  Film,
  Wand2,
  CheckCircle,
  Clock,
  Sparkles,
  Zap,
  X,
  Palette,
  Camera,
  Video
} from "lucide-react";

interface EngagingGenerationLoaderProps {
  generationType: "image" | "video";
  prompt: string;
  videoStyle?: string;
  aspectRatio?: string;
  duration?: string;
  generateAudio?: boolean;
  onCancel?: () => void;
  estimatedTime?: number; // in seconds
}

interface GenerationPhase {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  duration: number;
  completed: boolean;
  current: boolean;
}

const MODEL_CONFIGS = {
  "veo3-fast": {
    name: "Veo 3 Fast",
    estimatedTime: 60, // Veo3 fast is typically faster
    quality: "Google's Veo 3 Fast",
    icon: <Film className="h-4 w-4" />,
    color: "bg-primary"
  }
};

const IMAGE_PHASES: GenerationPhase[] = [
  {
    id: "analyzing",
    label: "Analyzing Prompt",
    description: "Understanding your creative vision",
    icon: <Sparkles className="h-4 w-4" />,
    duration: 8,
    completed: false,
    current: false
  },
  {
    id: "composing",
    label: "Composing Scene",
    description: "Arranging elements and lighting",
    icon: <Palette className="h-4 w-4" />,
    duration: 12,
    completed: false,
    current: false
  },
  {
    id: "rendering",
    label: "Rendering Image",
    description: "AI creating your masterpiece",
    icon: <Camera className="h-4 w-4" />,
    duration: 25,
    completed: false,
    current: false
  },
  {
    id: "refining",
    label: "Final Touches",
    description: "Adding details and perfection",
    icon: <CheckCircle className="h-4 w-4" />,
    duration: 5,
    completed: false,
    current: false
  }
];

const VIDEO_PHASES: GenerationPhase[] = [
  {
    id: "preparing",
    label: "Preparing Scene",
    description: "Analyzing prompt and initializing AI",
    icon: <Sparkles className="h-4 w-4" />,
    duration: 15,
    completed: false,
    current: false
  },
  {
    id: "storyboarding",
    label: "Storyboarding",
    description: "Planning the visual sequence",
    icon: <Video className="h-4 w-4" />,
    duration: 20,
    completed: false,
    current: false
  },
  {
    id: "rendering",
    label: "Rendering Frames",
    description: `Generating cinematic content`,
    icon: <Film className="h-4 w-4" />,
    duration: 180,
    completed: false,
    current: false
  },
  {
    id: "processing",
    label: "Final Processing",
    description: "Applying final touches and optimization",
    icon: <CheckCircle className="h-4 w-4" />,
    duration: 15,
    completed: false,
    current: false
  }
];

export function EngagingGenerationLoader({
  generationType,
  prompt,
  videoStyle = "standard",
  aspectRatio = "landscape",
  duration = "8s",
  generateAudio = true,
  onCancel,
  estimatedTime
}: EngagingGenerationLoaderProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [floatingParticles, setFloatingParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);

  const modelConfig = MODEL_CONFIGS[videoStyle as keyof typeof MODEL_CONFIGS] || Object.values(MODEL_CONFIGS)[0];
  const phases = generationType === "video" ? VIDEO_PHASES : IMAGE_PHASES;
  const totalDuration = estimatedTime || phases.reduce((acc, phase) => acc + phase.duration, 0);

  // For video generation, use simple progress without countdown
  const progress = generationType === "video" ? 50 : Math.min((elapsedTime / totalDuration) * 100, 100);
  const remainingTime = generationType === "video" ? 0 : Math.max(0, totalDuration - elapsedTime);

  // Update elapsed time (only for image generation)
  useEffect(() => {
    if (generationType === "video") return; // Skip countdown for video

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [generationType]);

  // Generate floating particles (only for image generation)
  useEffect(() => {
    if (generationType === "video") return; // Skip particles for video

    const particles = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3
    }));
    setFloatingParticles(particles);
  }, [generationType]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPhase = phases[generationType === "video" ? 1 : Math.floor((elapsedTime / totalDuration) * phases.length) || 0];
  const IconComponent = generationType === "video" ? Play : Camera;

  return (
    <Card className="w-full overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 relative">
      {/* Floating particles - only for image generation */}
      {generationType === "image" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {floatingParticles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-1 h-1 bg-primary/30 rounded-full animate-pulse"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: '3s'
              }}
            />
          ))}
        </div>
      )}

      <CardContent className="p-8 space-y-6 relative">
        {/* Header */}
        <div className={`flex items-center ${generationType === "video" ? "justify-center" : "justify-between"}`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <IconComponent className="h-6 w-6 text-primary fill-primary" />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                <Loader className="h-2 w-2 animate-spin text-primary-foreground" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">
                {generationType === "video" ? "CREATING YOUR VIDEO" : "CREATING YOUR MASTERPIECE"}
              </h3>
              <p className="text-sm text-muted-foreground font-medium">
                {generationType === "video" ? "AI is generating your cinematic content" : "Bringing your vision to life"}
              </p>
            </div>
          </div>
          {generationType === "image" && (
            <Badge variant="secondary" className="px-3 py-1 font-bold">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(remainingTime)} left
            </Badge>
          )}
        </div>

        {/* Progress visualization */}
        <div className="relative">
          {generationType === "video" ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Generating video...</span>
                <span className="text-muted-foreground">Please wait</span>
              </div>
              <Progress value={progress} className="h-3 animate-pulse" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Progress</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <div className="relative">
                  <Progress value={progress} className="h-3" />
                  {/* Animated wave overlay */}
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 animate-pulse"
                    style={{
                      width: `${Math.min(progress + 20, 100)}%`,
                      animation: 'wave 2s ease-in-out infinite'
                    }}
                  />
                </div>
              </div>

              {/* Current phase indicator */}
              <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    true ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Loader className="h-5 w-5 animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{currentPhase.label}</p>
                    <p className="text-xs text-muted-foreground">{currentPhase.description}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Model info for video */}
        {generationType === "video" && (
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
        )}

        {/* Prompt preview */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <p className="text-sm font-medium text-muted-foreground mb-2">Current Prompt:</p>
          <p className="text-sm leading-relaxed italic">"{prompt}"</p>
        </div>

        {/* Cancel button */}
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

        {/* Estimated completion - only for image generation */}
        {generationType === "image" && (
          <div className="text-center text-xs text-muted-foreground">
            Estimated completion: {new Date(Date.now() + remainingTime * 1000).toLocaleTimeString()}
          </div>
        )}
      </CardContent>

      <style jsx>{`
        @keyframes wave {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </Card>
  );
}