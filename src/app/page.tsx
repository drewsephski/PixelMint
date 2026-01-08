"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { AlertCircle, Loader, Download, Sparkles, History, Zap, Image as ImageIcon, Shield, Trash2, Maximize2, Share2, Heart, TrendingUp, Users, Gift, Video, Laugh, Smartphone, Palette, Theater, Film, MonitorSpeaker, PartyPopper, Lightbulb } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { CreditCard } from "@/components/credit-card";
import { EngagingGenerationLoader } from "@/components/engaging-generation-loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

// Constants
// Model configurations with supported aspect ratios
const IMAGE_MODELS = [
  {
    value: "flux-schnell",
    label: "Fast Flux",
    modelId: "fal-ai/flux/schnell",
    credits: 1,
    description: "Ultra-fast generation, perfect for quick iterations"
  },
  {
    value: "flux-dev",
    label: "High Quality Flux",
    modelId: "fal-ai/flux/dev",
    credits: 2,
    description: "Premium quality with more detail and refinement"
  },
  {
    value: "fast-sdxl",
    label: "Fast SDXL",
    modelId: "fal-ai/fast-sdxl",
    credits: 1,
    description: "Cost-effective Stable Diffusion with broad aspect ratio support"
  }
] as const;

const VIDEO_MODELS = [
  {
    value: "veo3-fast",
    label: "Veo 3 Fast",
    modelId: "fal-ai/veo3/fast",
    supportedAspectRatios: ["landscape", "portrait"],
    supportedDurations: ["4s", "6s", "8s"],
    description: "Google's Veo 3 Fast - high quality video generation with audio"
  }
] as const;

// Legacy style options for backward compatibility
const STYLE_OPTIONS = [
  { value: "photorealistic", label: "Photorealistic" },
  { value: "anime", label: "Anime" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "watercolor", label: "Watercolor" },
  { value: "oil_painting", label: "Oil Painting" },
] as const;


// Legacy video options for backward compatibility
const VIDEO_STYLE_OPTIONS = [
  { value: "standard", label: "High Quality (Wan 2.1)" },
  { value: "creative", label: "Creative (Luma Dream)" },
  { value: "fast", label: "Fast (Minimax)" },
] as const;



const SAMPLE_PROMPTS = [
  "A cyberpunk cat sitting on a neon-lit skyscraper overlooking a futuristic Tokyo",
  "An oil painting of a peaceful cottage in the Swiss Alps during sunset",
  "A majestic dragon made of water rising from a stormy ocean, photorealistic",
  "Studio Ghibli style illustration of a flying castle hidden in fluffy clouds",
  "An astronaut gardening on Mars with bioluminescent plants, cinematic lighting",
  "A surreal underwater city with crystal buildings and floating jellyfish",
  "A vintage steam train racing through a magical forest with glowing mushrooms",
  "A portrait of a robot chef cooking pasta in a cozy Italian kitchen",
  "A mystical phoenix rising from ashes in a stormy desert landscape",
];

const VIRAL_TEMPLATES = [
  {
    id: "meme-generator",
    name: "Viral Meme Generator",
    icon: <Laugh className="h-4 w-4" />,
    prompt: "A hilarious meme format showing [your concept] in the style of the most popular meme templates, guaranteed to go viral on social media",
    category: "trending"
  },
  {
    id: "social-media",
    name: "Social Media Magic",
    icon: <Smartphone className="h-4 w-4" />,
    prompt: "Eye-catching social media content that gets 10x more engagement - perfect thumbnails, story graphics, and viral-worthy visuals",
    category: "marketing"
  },
  {
    id: "brand-identity",
    name: "Brand Identity Suite",
    icon: <Palette className="h-4 w-4" />,
    prompt: "Complete brand identity package including logos, color palettes, typography, and brand guidelines visualized as stunning artwork",
    category: "business"
  },
  {
    id: "ai-artist",
    name: "AI Artist Collaboration",
    icon: <Theater className="h-4 w-4" />,
    prompt: "Create artwork in the style of famous artists like Van Gogh, Picasso, or Dali, but with your unique twist and modern subjects",
    category: "artistic"
  }
];

const VIDEO_TEMPLATES = [
  {
    id: "explainer-video",
    name: "Product Explainer",
    icon: <Video className="h-4 w-4" />,
    prompt: "A dynamic explainer video showing how your product works, with smooth transitions and engaging visuals that explain complex ideas simply",
    category: "business"
  },
  {
    id: "social-story",
    name: "Social Media Story",
    icon: <Smartphone className="h-4 w-4" />,
    prompt: "Vertical video format perfect for social media stories - quick, engaging content that tells your brand story in 15 seconds",
    category: "marketing"
  },
  {
    id: "demo-showcase",
    name: "Demo Showcase",
    icon: <Film className="h-4 w-4" />,
    prompt: "Professional product demo video highlighting key features, user benefits, and unique selling points with cinematic quality",
    category: "business"
  }
];

// Types
interface GenerateResponse {
  success: boolean;
  data?: {
    images?: Array<{ url: string }>;
    video?: { url: string };
    original_url?: string;
    seed?: number;
    timings?: Record<string, unknown>;
  };
  error?: string;
}

interface GenerationRecord {
  id: string;
  created_at: string;
  prompt: string;
  style: string;
  aspect_ratio: string;
  image_url: string;
  storage_path: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

interface GenerationsResponse {
  success: boolean;
  data?: {
    generations: GenerationRecord[];
  };
  error?: string;
}

interface GenerationState {
  prompt: string;
  style: string;
  loading: boolean;
  generatedImage: string | null;
  error: string | null;
  generations: GenerationRecord[];
  loadingGenerations: boolean;
  generationType: "image" | "video";
  videoStyle: string;
  generatedVideo: string | null;
  // Video settings
  videoAspectRatio: string;
  videoDuration: string;
  videoGenerateAudio: boolean;
  // Model selection
  selectedImageModel: string;
  selectedVideoModel: string;
}

// Custom Logo Component
function Logo() {
  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      <div className="relative flex h-10 items-center justify-center transition-all duration-500 group-hover:scale-105">
        <svg width="44" height="30" viewBox="0 0 59 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
          <path d="M10 15.1533L56.0254 27.3643C57.7788 27.8295 59 29.4164 59 31.2305V40H49V35.8457L29.501 30.6729L10 35.8457V40H0V31.2305C4.53996e-06 29.4164 1.22118 27.8295 2.97461 27.3643L10.001 25.499L2.97461 23.6357C1.22116 23.1706 3.02567e-05 21.5836 0 19.7695V14C0 11.7909 1.79086 10 4 10H10V15.1533Z" fill="#0BDC85"></path>
          <path d="M55 10C57.2091 10 59 11.7909 59 14V20H49V10H55Z" fill="#0BDC85"></path>
          <path d="M45 0C47.2091 0 49 1.79086 49 4V10H10V4C10 1.79086 11.7909 2.81866e-08 14 0H45Z" fill="#0BDC85"></path>
        </svg>
      </div>
      <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
        PixelMint
      </span>
    </div>
  );
}

// Custom Dynamic Arrow Component
function DynamicArrow({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]`}
    >
      <path
        d="M5 12h14"
        className="opacity-0 [stroke-dasharray:20] [stroke-dashoffset:20] group-hover:opacity-100 group-hover:[stroke-dashoffset:0] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
      />
      <path
        d="M12 5l7 7-7 7"
        className="translate-x-[-6px] group-hover:translate-x-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
      />
    </svg>
  );
}

export default function Home() {
  const [state, setState] = useState<GenerationState>({
    prompt: "",
    style: "photorealistic",
    loading: false,
    generatedImage: null,
    error: null,
    generations: [],
    loadingGenerations: false,
    generationType: "image",
    videoStyle: "standard",
    generatedVideo: null,
    // Video settings
    videoAspectRatio: "landscape",
    videoDuration: "8s",
    videoGenerateAudio: true,
    // Model selection
    selectedImageModel: "flux-schnell",
    selectedVideoModel: "veo3-fast",
  });

  const [credits, setCredits] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenPrompt, setFullscreenPrompt] = useState<string>("");
  const [fullscreenType, setFullscreenType] = useState<"image" | "video">("image");

  const fetchCredits = useCallback(async () => {
    try {
      const response = await fetch("/api/credits");
      if (!response.ok) {
        throw new Error("Failed to fetch credits");
      }
      const data = await response.json();
      setCredits(data.credits);
    } catch (error) {
      console.error("Failed to fetch credits:", error);
      setCredits(0); // Default to 0 on error
    }
  }, []);

  /**
   * Handle image deletion
   */
  const handleDelete = useCallback(async () => {
    if (!idToDelete) return;

    const id = idToDelete;
    setDeletingId(id);
    setIsDeleteDialogOpen(false);

    try {
      const response = await fetch(`/api/generations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete");
      }

      // Optimistically update UI
      setState(prev => ({
        ...prev,
        generations: prev.generations.filter(g => g.id !== id)
      }));
    } catch (error) {
      console.error("Deletion failed:", error);
      alert(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setDeletingId(null);
      setIdToDelete(null);
    }
  }, [idToDelete]);

  const confirmDelete = useCallback((id: string) => {
    setIdToDelete(id);
    setIsDeleteDialogOpen(true);
  }, []);

  const openFullscreen = useCallback((mediaUrl: string, prompt: string = "", type: "image" | "video" = "image") => {
    setFullscreenImage(mediaUrl);
    setFullscreenPrompt(prompt);
    setFullscreenType(type);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenImage(null);
    setFullscreenPrompt("");
    setFullscreenType("image");
  }, []);

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement> | string) => {
      const value = typeof e === "string" ? e : e.target.value;
      setState((prev) => ({
        ...prev,
        prompt: value,
        error: null,
      }));
    },
    []
  );

  /**
   * Handle style change
   */
  const handleStyleChange = useCallback((value: string) => {
    setState((prev) => ({ ...prev, style: value }));
  }, []);


  /**
   * Handle generation type change
   */
  const handleGenerationTypeChange = useCallback((value: string) => {
    setState((prev) => ({ ...prev, generationType: value as "image" | "video" }));
  }, []);

  /**
   * Handle video style change
   */
  const handleVideoStyleChange = useCallback((value: string) => {
    setState((prev) => ({ ...prev, videoStyle: value }));
  }, []);

  /**
   * Handle video aspect ratio change
   */
  const handleVideoAspectRatioChange = useCallback((value: string) => {
    setState((prev) => ({ ...prev, videoAspectRatio: value as any }));
  }, []);

  /**
   * Handle video duration change
   */
  const handleVideoDurationChange = useCallback((value: string) => {
    setState((prev) => ({ ...prev, videoDuration: value }));
  }, []);

  /**
   * Handle video audio toggle
   */
  const handleVideoAudioToggle = useCallback((checked: boolean) => {
    setState((prev) => ({ ...prev, videoGenerateAudio: checked }));
  }, []);

  /**
   * Handle image model change
   */
  const handleImageModelChange = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      selectedImageModel: value
    }));
  }, []);

  /**
   * Handle video model change
   */
  const handleVideoModelChange = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      selectedVideoModel: value
    }));
  }, []);



  /**
   * Fetch user's past generations
   */
  const fetchGenerations = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loadingGenerations: true }));

      const response = await fetch("/api/generations");

      if (!response.ok) {
        const result = (await response.json()) as GenerationsResponse;
        throw new Error(result.error || `Failed to fetch generations`);
      }

      const result = (await response.json()) as GenerationsResponse;

      if (result.data?.generations) {
        setState((prev) => ({
          ...prev,
          generations: result.data ? result.data.generations : [],
          loadingGenerations: false,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch generations:", error);
      setState((prev) => ({ ...prev, loadingGenerations: false }));
    }
  }, []);

  /**
   * Generate image or video
   */
  const handleGenerate = useCallback(async () => {
    const trimmedPrompt = state.prompt.trim();

    if (!trimmedPrompt) {
      setState((prev) => ({
        ...prev,
        error: "Please enter a prompt",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      generatedImage: null,
      generatedVideo: null,
    }));

    try {
      if (state.generationType === "video") {
        // Video generation
        const response = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: trimmedPrompt,
            aspectRatio: state.videoAspectRatio,
            duration: state.videoDuration,
            generateAudio: state.videoGenerateAudio,
            model: state.selectedVideoModel,
          }),
        });

        const result = (await response.json()) as GenerateResponse;

        if (!response.ok) {
          throw new Error(result.error || "Video generation failed");
        }

        if (!result.data?.video?.url) {
          throw new Error("No video URL returned from API");
        }

        setState((prev) => ({
          ...prev,
          generatedVideo: result.data?.video?.url || null,
        }));
      } else {
        // Image generation
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: trimmedPrompt,
            model: state.selectedImageModel,
          }),
        });

        const contentType = response.headers.get("content-type");
        const isJson = contentType?.includes("application/json");

        if (!isJson) {
          throw new Error("Server returned invalid response.");
        }

        const result = (await response.json()) as GenerateResponse;

        if (!response.ok) {
          throw new Error(result.error || "Generation failed");
        }

        if (!result.data?.images?.[0]?.url) {
          throw new Error("No image URL returned from API");
        }

        setState((prev) => ({
          ...prev,
          generatedImage: result.data?.images?.[0]?.url || null,
        }));
      }

      fetchGenerations();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      console.error("Generation failed:", error);
      setState((prev) => ({ ...prev, error: errorMessage, generatedImage: null, generatedVideo: null }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [state.prompt, state.generationType, state.videoStyle, state.videoAspectRatio, state.videoDuration, state.videoGenerateAudio, state.selectedImageModel, state.selectedVideoModel, fetchGenerations]);

  useEffect(() => {
    fetchGenerations();
    fetchCredits();

    const query = new URLSearchParams(window.location.search);
    const sessionId = query.get("session_id");
    const success = query.get("success");

    if (success === "true" && sessionId) {
      // Clear the query parameters from the URL
      window.history.replaceState(null, "", window.location.pathname);

      // Call the API to update credits
      fetch("/api/update-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("Credits updated successfully:", data.newCredits);
            fetchCredits(); // Re-fetch credits to update the UI
          } else {
            console.error("Failed to update credits:", data.error);
          }
        })
        .catch((error) => {
          console.error("Error updating credits:", error);
        });
    }
  }, [fetchGenerations, fetchCredits]);

  const handlePurchaseCredits = useCallback(async (priceId: string) => {
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url; // Redirect to Stripe checkout
    } catch (error) {
      console.error("Credit purchase failed:", error);
      alert(error instanceof Error ? error.message : "Failed to purchase credits.");
    }
  }, []);

  const isGenerateDisabled = useMemo(
    () => state.loading || !state.prompt.trim(),
    [state.loading, state.prompt]
  );

  const styleOptions = useMemo(() => STYLE_OPTIONS, []);

  // New computed properties for dynamic model-based options
  const selectedImageModel = useMemo(() =>
    IMAGE_MODELS.find(model => model.value === state.selectedImageModel) || IMAGE_MODELS[0],
    [state.selectedImageModel]
  );

  const selectedVideoModel = useMemo(() =>
    VIDEO_MODELS.find(model => model.value === state.selectedVideoModel) || VIDEO_MODELS[0],
    [state.selectedVideoModel]
  );

  const availableVideoAspectRatios = useMemo(() =>
    [
      { value: "landscape", label: "16:9 Landscape" },
      { value: "portrait", label: "9:16 Portrait" }
    ].filter(option =>
      (selectedVideoModel.supportedAspectRatios as unknown as string[]).includes(option.value)
    ),
    [selectedVideoModel]
  );

  const availableVideoDurations = useMemo(() =>
    [
      { value: "4s", label: "4 seconds" },
      { value: "6s", label: "6 seconds" },
      { value: "8s", label: "8 seconds" }
    ].filter(option =>
      (selectedVideoModel.supportedDurations as unknown as string[]).includes(option.value)
    ),
    [selectedVideoModel]
  );

  // Calculate credits based on duration and audio with better profit margins
  const calculateVideoCredits = useMemo(() => {
    const durationSeconds = parseInt(state.videoDuration.replace('s', ''));

    if (!state.videoGenerateAudio) {
      // No audio: keep current pricing (good margins already)
      return durationSeconds === 4 ? 2 : durationSeconds === 6 ? 3 : 4;
    } else {
      // With audio: increased pricing for better profit on expensive videos
      if (durationSeconds === 4) return 4;      // $0.12 (200% profit vs $0.60 cost)
      else if (durationSeconds === 6) return 8; // $0.24 (267% profit vs $0.90 cost)
      else return 12;                           // $0.36 (300% profit vs $1.20 cost)
    }
  }, [state.videoDuration, state.videoGenerateAudio]);



  const downloadImage = async (url: string, filename: string) => {
    try {
      // Fetch the image to avoid CORS issues
      const response = await fetch(url);
      const blob = await response.blob();

      // Create a blob URL for the downloaded image
      const blobUrl = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback to direct download if fetch fails
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const shareCreation = async (url: string, prompt: string, type: "image" | "video" = "image") => {
    const shareText = `Just created this amazing ${type} with PixelMint AI: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\n#PixelMint #AI${type === 'video' ? 'Video' : 'Art'} #CreativeAI`;
    const shareUrl = `${window.location.origin}?ref=shared`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `PixelMint ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Share cancelled or failed');
        fallbackShare(shareText, shareUrl);
      }
    } else {
      fallbackShare(shareText, shareUrl);
    }
  };

  const fallbackShare = (text: string, url: string) => {
    navigator.clipboard.writeText(`${text}\n\nCreate your own: ${url}`);
    alert('Link copied to clipboard! Share it with your friends.');
  };

  const applyTemplate = (template: { prompt: string; name?: string }) => {
    handlePromptChange(template.prompt);
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background font-sans selection:bg-primary/20 transition-colors duration-300">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between py-4 px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <div className="h-6 w-px bg-border mx-1" />
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="default" size="sm" className="rounded-full font-black text-black bg-primary shadow-md hover:bg-primary/90 hover:shadow-lg transition-all px-6 group">
                  SIGN IN <DynamicArrow className="h-4 w-4" />
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              {credits !== null && (
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Zap className="h-4 w-4 fill-primary" /> {credits} Credits
                </div>
              )}
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-9 w-9 border-2 border-primary/20 hover:border-primary transition-all shadow-sm"
                  }
                }}
              />
            </SignedIn>
          </nav>
        </div>
      </header>

      <main className="flex w-full max-w-7xl flex-col items-center gap-16 py-12 px-4 sm:px-6 lg:px-8">
        <SignedIn>
          <div className="flex flex-col items-center gap-12 w-full">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary mb-2 uppercase tracking-tighter">
                <Zap className="mr-2 h-3 w-3 fill-primary" /> Ready to Forge
              </div>
              <h1 className="text-5xl font-extrabold tracking-tighter text-foreground sm:text-7xl lg:text-8xl max-w-4xl">
                Creative <span className="text-primary italic">Studio</span>
              </h1>
              <div className="flex items-center gap-4 mt-4">
                <div className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-bold text-green-600 uppercase tracking-widest">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  LIVE DEMO
                </div>
                <div className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary uppercase tracking-widest">
                  <Zap className="w-3 h-3 mr-2" />
                  2 FREE CREDITS
                </div>
              </div>
            </div>

            <div className="w-full max-w-3xl">
              {/* Demo Mode Banner */}
              <div className="mb-6 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/30 p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gift className="h-5 w-5 text-primary" />
                  <span className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <PartyPopper className="h-4 w-4" />
                    PRODUCT HUNT SPECIAL
                  </span>
                </div>
                <p className="text-sm font-bold text-foreground mb-2">Get 2 FREE credits when you sign up!</p>
                <p className="text-xs text-muted-foreground">No credit card required • Create images and videos • Full access to all features</p>
              </div>

              <Card className="overflow-hidden border-none shadow-2xl ring-1 ring-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="border-b bg-linear-to-b from-transparent via-muted/30 to-transparent pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl font-bold">Creative Studio</CardTitle>
                  </div>
                  <Tabs value={state.generationType} onValueChange={handleGenerationTypeChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 border-2 p-1 bg-background">
                      <TabsTrigger value="image" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all font-bold text-sm">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Image
                      </TabsTrigger>
                      <TabsTrigger value="video" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all font-bold text-sm">
                        <Video className="h-4 w-4 mr-2" />
                        Video
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="space-y-8 p-6 sm:p-8">
                  {state.error && (
                    <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Action Required</AlertTitle>
                      <AlertDescription>{state.error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prompt" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {state.generationType === "video" ? "Video Script" : "Prompt Specification"}
                      </Label>
                      <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">{state.prompt.length}/500</span>
                    </div>
                    <Textarea
                      id="prompt"
                      placeholder={state.generationType === "video"
                        ? "A majestic eagle soaring over snow-capped mountains at sunset, wings spread wide..."
                        : "A cinematic view of a futuristic city..."}
                      className="min-h-[140px] resize-none border-2 bg-background p-4 text-base focus-visible:ring-primary/20 transition-all"
                      value={state.prompt}
                      onChange={handlePromptChange}
                      disabled={state.loading}
                      maxLength={500}
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(state.generationType === "video" ? [
                        "A serene lake reflecting snow-capped mountains at golden hour",
                        "A futuristic cityscape with flying cars and neon lights",
                        "A majestic wolf howling at the full moon in a misty forest",
                        "Underwater scene with colorful coral reefs and tropical fish",
                        "A steampunk airship floating through stormy clouds",
                        "A ballet dancer performing in a grand theater with crystal chandeliers"
                      ] : SAMPLE_PROMPTS).map((sample, idx) => (
                        <button key={idx} onClick={() => handlePromptChange(sample)} disabled={state.loading} className="inline-flex items-center rounded-lg border bg-muted/50 px-2.5 py-1 text-[11px] font-bold transition-all hover:bg-primary hover:text-black hover:border-primary disabled:opacity-50">
                          {sample.substring(0, 30)}...
                        </button>
                      ))}
                    </div>

                    {/* Viral Templates Section */}
                    <div className="pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Viral Templates</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(state.generationType === "video" ? VIDEO_TEMPLATES : VIRAL_TEMPLATES).map((template) => (
                          <button
                            key={template.id}
                            onClick={() => applyTemplate(template)}
                            disabled={state.loading}
                            className="inline-flex items-center gap-2 rounded-lg border bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2 text-[11px] font-bold transition-all hover:from-primary/20 hover:to-primary/10 hover:border-primary/50 hover:shadow-md disabled:opacity-50 group"
                          >
                            {template.icon}
                            <span className="text-primary group-hover:text-primary/80">{template.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {state.generationType === "image" ? (
                    <div className="space-y-3">
                      <Label htmlFor="imageModel" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI Model</Label>
                      <Select value={state.selectedImageModel} onValueChange={handleImageModelChange}>
                        <SelectTrigger id="imageModel" disabled={state.loading} className="h-11 border-2 font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IMAGE_MODELS.map((model) => (
                            <SelectItem key={model.value} value={model.value} className="focus:bg-primary/10">
                              <div className="flex items-center justify-between w-full">
                                <span>{model.label}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {model.credits} credits
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground font-medium">{selectedImageModel.description}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                      <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Veo 3 Fast Model</Label>
                        <div className="h-11 border-2 border-border rounded-md bg-muted/30 flex items-center px-3">
                          <span className="font-semibold text-sm">Veo 3 Fast</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {calculateVideoCredits} credits
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium">Google's Veo 3 Fast - high quality video generation with audio</p>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aspect Ratio</Label>
                        <Select value={state.videoAspectRatio} onValueChange={handleVideoAspectRatioChange}>
                          <SelectTrigger disabled={state.loading} className="h-11 border-2 font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVideoAspectRatios.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="focus:bg-primary/10">{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Duration</Label>
                        <Select value={state.videoDuration} onValueChange={handleVideoDurationChange}>
                          <SelectTrigger disabled={state.loading} className="h-11 border-2 font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVideoDurations.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="focus:bg-primary/10">{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Audio Generation</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="videoAudio"
                            checked={state.videoGenerateAudio}
                            onChange={(e) => handleVideoAudioToggle(e.target.checked)}
                            disabled={state.loading}
                            className="rounded border-2 border-border"
                          />
                          <Label htmlFor="videoAudio" className="text-sm font-medium">
                            Generate audio
                          </Label>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Include AI-generated audio with your video</p>
                      </div>
                    </div>
                  )}

                  {state.generationType === "video" && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary">
                          <Zap className="h-4 w-4" />
                          <span className="text-sm font-bold">
                            {calculateVideoCredits} credits • {state.videoDuration} • {state.videoAspectRatio === 'landscape' ? '16:9' : '9:16'} • {state.videoGenerateAudio ? 'with audio' : 'no audio'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-6 bg-muted/30 p-6 sm:p-8">
                  <Button size="lg" className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all rounded-2xl" onClick={handleGenerate} disabled={isGenerateDisabled}>
                    {state.loading ? (
                      <>
                        <Loader className="mr-3 h-6 w-6 animate-spin" />
                        {state.generationType === "video" ? "GENERATING VIDEO..." : "GENERATING IMAGE..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-3 h-6 w-6" />
                        {state.generationType === "video" ? "CREATE VIDEO" : "GENERATE MASTERPIECE"}
                      </>
                    )}
                  </Button>

                  {/* Loading Animation */}
                  {state.loading && (
                    <div className="w-full animate-in fade-in-0 zoom-in-95 duration-500">
                      <EngagingGenerationLoader
                        generationType={state.generationType}
                        prompt={state.prompt}
                        videoStyle={state.videoStyle}
                        aspectRatio={state.videoAspectRatio}
                        duration={state.videoDuration}
                        generateAudio={state.videoGenerateAudio}
                        onCancel={() => {
                          // TODO: Implement cancel functionality
                          console.log("Cancel generation");
                        }}
                      />
                    </div>
                  )}

                  {state.generatedImage && (
                    <div className="w-full space-y-4 animate-in zoom-in-95 duration-500">
                      <div className="relative group overflow-hidden rounded-3xl border-8 border-background bg-background shadow-2xl ring-1 ring-border">
                        <Image src={state.generatedImage} alt="Generated image" width={1024} height={1024} className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" priority unoptimized />
                        <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                          <Button variant="secondary" className="rounded-full shadow-2xl font-black px-6 h-12" onClick={() => openFullscreen(state.generatedImage!, state.prompt, "image")}>
                            <Maximize2 className="mr-2 h-5 w-5" /> FULLSCREEN
                          </Button>
                          <Button variant="secondary" className="rounded-full shadow-2xl font-black px-6 h-12" onClick={() => downloadImage(state.generatedImage!, `pixelmint-${Date.now()}.jpg`)}>
                            <Download className="mr-2 h-5 w-5" /> SAVE
                          </Button>
                          <Button variant="secondary" className="rounded-full shadow-2xl font-black px-6 h-12 bg-primary/80 hover:bg-primary" onClick={() => shareCreation(state.generatedImage!, state.prompt, "image")}>
                            <Share2 className="mr-2 h-5 w-5" /> SHARE
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {state.generatedVideo && (
                    <div className="w-full space-y-4 animate-in zoom-in-95 duration-500">
                      <div className="relative group overflow-hidden rounded-3xl border-8 border-background bg-background shadow-2xl ring-1 ring-border">
                        <video
                          src={state.generatedVideo}
                          controls
                          className="h-auto w-full object-cover rounded-2xl"
                          poster="/api/placeholder/800/450"
                        >
                          Your browser does not support the video tag.
                        </video>
                        <div className="absolute top-4 right-4 flex gap-2">
                          <Button variant="secondary" className="rounded-full shadow-2xl font-black px-4 h-10 bg-black/50 hover:bg-black/70 border-white/20" onClick={() => openFullscreen(state.generatedVideo!, state.prompt, "video")}>
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                          <Button variant="secondary" className="rounded-full shadow-2xl font-black px-4 h-10 bg-black/50 hover:bg-black/70 border-white/20" onClick={() => downloadImage(state.generatedVideo!, `pixelmint-video-${Date.now()}.mp4`)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="secondary" className="rounded-full shadow-2xl font-black px-4 h-10 bg-primary/80 hover:bg-primary border-white/20" onClick={() => shareCreation(state.generatedVideo!, state.prompt, "video")}>
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardFooter>
              </Card>
            </div>

            <div className="w-full space-y-10 pt-16 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <History className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground">Archive</h2>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Your Creative Legacy</p>
                  </div>
                </div>
                {state.loadingGenerations && (
                  <div className="flex items-center gap-2 text-xs font-black text-primary animate-pulse uppercase tracking-widest">
                    <Loader className="h-4 w-4 animate-spin" /> Syncing...
                  </div>
                )}
              </div>
              {state.generations.length > 0 ? (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {state.generations.map((generation) => {
                    const isVideo = generation.metadata?.type === 'video';
                    return (
                      <Card key={generation.id} className="group overflow-hidden border-none shadow-md hover:shadow-2xl transition-all duration-500 ring-1 ring-border/50 bg-card/40 rounded-3xl">
                        <div className="relative aspect-square overflow-hidden bg-muted">
                          {isVideo ? (
                            <video
                              src={generation.image_url}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                              muted
                              onMouseEnter={(e) => e.currentTarget.play()}
                              onMouseLeave={(e) => e.currentTarget.pause()}
                            />
                          ) : (
                            <Image src={generation.image_url} alt={generation.prompt} width={400} height={400} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                          )}
                          <div className="absolute top-3 left-3">
                            <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest ${
                              isVideo ? 'bg-purple-500/80 text-white' : 'bg-primary/80 text-primary-foreground'
                            } ring-1 ring-white/20`}>
                              {isVideo ? 'VIDEO' : 'IMAGE'}
                            </span>
                          </div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm gap-3">
                            <div className="flex gap-2">
                              <Button variant="secondary" size="sm" className="rounded-full font-black px-4" onClick={() => openFullscreen(generation.image_url, generation.prompt, isVideo ? "video" : "image")}>
                                <Maximize2 className="h-4 w-4" />
                              </Button>
                              <Button variant="secondary" size="sm" className="rounded-full font-black px-4" onClick={() => downloadImage(generation.image_url, `generation-${generation.id}${isVideo ? '.mp4' : '.jpg'}`)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button variant="destructive" size="sm" className="rounded-full font-black px-6 bg-red-500/80 hover:bg-red-600 shadow-lg" onClick={() => confirmDelete(generation.id)} disabled={deletingId === generation.id}>
                              {deletingId === generation.id ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              <span className="ml-2">{deletingId === generation.id ? 'DELETING...' : 'DELETE'}</span>
                            </Button>
                          </div>
                        </div>
                        <CardContent className="p-6">
                          <p className="line-clamp-3 text-sm font-bold leading-relaxed text-foreground/80 group-hover:text-foreground transition-colors">{generation.prompt}</p>
                          <div className="mt-5 flex items-center justify-between border-t pt-4">
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-primary ring-1 ring-primary/20">
                              {isVideo ? `${generation.metadata?.duration || '8s'} • ${generation.metadata?.aspect_ratio || '16:9'}` : 'IMAGE'}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(generation.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-[3rem] border-4 border-dashed border-muted py-32 text-center bg-muted/5">
                  <div className="mb-6 rounded-3xl bg-muted p-8 shadow-inner">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter">The Canvas is Empty</h3>
                  <p className="mt-3 max-w-xs text-muted-foreground font-medium">Your future masterpieces will appear here. Start generating above!</p>
                </div>
              )}
            </div>
          </div>
          {/* Credit Purchase Section */}
          <section className="w-full space-y-8 pt-12">
            <div className="text-center">
              <div className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-sm font-bold text-primary mb-4 uppercase tracking-widest">
                <TrendingUp className="mr-2 h-4 w-4" />
                🚀 PRODUCT HUNT LAUNCH WEEK - 50% OFF!
              </div>
              <h2 className="text-4xl font-black tracking-tighter text-foreground sm:text-5xl">Get More <span className="text-primary italic">Credits</span></h2>
              <p className="mt-3 text-lg text-muted-foreground">Fuel your creativity with more image and video generations. Limited time offer!</p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="bg-primary text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">MOST POPULAR</span>
                </div>
                <CreditCard
                  credits={10}
                  price={1.99}
                  originalPrice={4.99}
                  description="10 image gens + ~1 video"
                  priceId="price_1SnLuDDfHkj3MZlTBqJyqrA8"
                  onPurchase={handlePurchaseCredits}
                />
              </div>
              <div className="relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="bg-green-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">BEST VALUE</span>
                </div>
                <CreditCard
                  credits={50}
                  price={4.99}
                  originalPrice={9.99}
                  description="50 image gens + ~3-5 videos"
                  priceId="price_1SnLuJDfHkj3MZlTP2HheMjp"
                  onPurchase={handlePurchaseCredits}
                />
              </div>
              <div className="relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="bg-purple-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">PRO CREATOR</span>
                </div>
                <CreditCard
                  credits={250}
                  price={19.99}
                  originalPrice={39.99}
                  description="250 image gens + ~16-25 videos"
                  priceId="price_1SnLuLDfHkj3MZlTMPVFfWyj"
                  onPurchase={handlePurchaseCredits}
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-medium">
                <Lightbulb className="h-4 w-4 inline mr-1" /> <strong>Pro tip:</strong> Video quality varies by model - Fast (6 credits) for quick results, Standard (10 credits) for high quality, Creative (15 credits) for premium results!
              </p>
            </div>
          </section>
        </SignedIn>

        <SignedOut>
          <div className="flex flex-col items-center gap-24 w-full">
            <div className="flex flex-col items-center gap-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-black text-primary mb-2 uppercase tracking-widest shadow-sm">
                <Sparkles className="mr-2 h-3 w-3 fill-primary" /> The Future of Art
              </div>
              <h1 className="text-6xl font-black tracking-tighter text-foreground sm:text-8xl lg:text-9xl max-w-5xl leading-[0.85]">CREATE VIRAL <br /><span className="text-primary italic">CONTENT</span> INSTANTLY</h1>
              <p className="max-w-2xl text-xl text-muted-foreground font-medium leading-relaxed">
                The only AI creative studio that generates both <strong className="text-primary">images AND videos</strong>.
                From viral memes to professional brand content - create everything you need in one place.
              </p>

              {/* Viral Hook Section */}
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl p-8 max-w-4xl border border-primary/20">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <span className="text-sm font-black uppercase tracking-widest text-primary">VIRAL CREATIONS</span>
                  </div>
                  <div className="h-4 w-px bg-primary/30" />
                  <div className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    <span className="text-sm font-black uppercase tracking-widest text-primary">COMMUNITY POWERED</span>
                  </div>
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-4">Create. Share. Go Viral.</h3>
                <p className="text-muted-foreground font-medium leading-relaxed mb-6">
                  Join thousands of creators who are turning their ideas into viral sensations. From meme generators to brand identities,
                  our AI templates are designed to create content that spreads like wildfire.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-2 mt-1">
                      <Gift className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-widest">Viral Templates</h4>
                      <p className="text-xs text-muted-foreground mt-1">Pre-built prompts designed for maximum shareability</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-2 mt-1">
                      <Share2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-widest">One-Click Sharing</h4>
                      <p className="text-xs text-muted-foreground mt-1">Share your creations directly to social media</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/20 p-2 mt-1">
                      <Heart className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-widest">Community Gallery</h4>
                      <p className="text-xs text-muted-foreground mt-1">Discover trending creations from our community</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 mt-4">
                <SignInButton mode="modal">
                  <Button size="lg" className="h-16 px-10 text-lg font-black text-black bg-primary rounded-2xl shadow-2xl shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/50 transition-all group">START CREATING <DynamicArrow className="h-6 w-6" /></Button>
                </SignInButton>
                <Button variant="outline" size="lg" className="h-16 px-10 text-lg font-black rounded-2xl border-2 hover:bg-muted transition-all">VIEW SHOWCASE</Button>
              </div>

              {/* Unique Differentiators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-4xl">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-8 border border-primary/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <div className="h-6 w-6 rounded-sm bg-primary"></div>
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">VIDEO GENERATION</h3>
                  </div>
                  <p className="text-muted-foreground font-medium leading-relaxed">
                    Unlike other AI tools that only do images, PixelMint creates both images AND videos.
                    Turn your ideas into dynamic video content that captivates audiences.
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-3xl p-8 border border-purple-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">VIRAL TEMPLATES</h3>
                  </div>
                  <p className="text-muted-foreground font-medium leading-relaxed">
                    Pre-built templates designed for maximum shareability. From viral memes to brand identities,
                    our prompts are crafted to create content that spreads.
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full space-y-12">
              <div className="flex flex-col items-center text-center gap-2">
                <h2 className="text-4xl font-black tracking-tighter uppercase">Studio Showcase</h2>
                <div className="h-1.5 w-24 bg-primary rounded-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  { title: "Cyberpunk Visions", img: "/cyberpunk.png", tag: "SCIFI" },
                  { title: "Nature Reimagined", img: "/nature.png", tag: "SURREAL" },
                  { title: "Classical Evolution", img: "/art.png", tag: "ART" }
                ].map((item, i) => (
                  <div key={i} className="group relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-muted shadow-2xl ring-1 ring-border transition-all duration-700 hover:-translate-y-2">
                    <img src={item.img} alt={item.title} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-1" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8">
                      <span className="w-fit px-3 py-1 rounded-full bg-primary text-[10px] font-black text-black mb-3 tracking-widest">{item.tag}</span>
                      <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-tighter">{item.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-5xl py-12">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner"><Zap className="h-8 w-8 fill-primary" /></div>
                <h4 className="text-xl font-black uppercase tracking-tighter">Lightning Fast</h4>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">Images forged in under 4 seconds using state-of-the-art Flux Schnell models.</p>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner"><Shield className="h-8 w-8 fill-primary" /></div>
                <h4 className="text-xl font-black uppercase tracking-tighter">Secure Storage</h4>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">Your creative legacy is protected by industry-leading cloud encryption.</p>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner"><ImageIcon className="h-8 w-8 fill-primary" /></div>
                <h4 className="text-xl font-black uppercase tracking-tighter">High Fidelity</h4>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">Crystal clear 1024px exports with multiple aspect ratio support.</p>
              </div>
            </div>

            {/* Viral Community Showcase */}
            <div className="w-full space-y-12">
              <div className="flex flex-col items-center text-center gap-2">
                <h2 className="text-4xl font-black tracking-tighter uppercase">Community Creations</h2>
                <div className="h-1.5 w-24 bg-primary rounded-full" />
                <p className="text-lg text-muted-foreground font-medium">See what the PixelMint community is creating</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { prompt: "Viral meme about AI taking over creative jobs", img: "/cyberpunk.png", type: "meme", likes: 1247 },
                  { prompt: "Product Hunt launch graphics for a SaaS app", img: "/art.png", type: "brand", likes: 892 },
                  { prompt: "Social media story series for fashion brand", img: "/nature.png", type: "marketing", likes: 2156 },
                  { prompt: "Brand identity visualization for tech startup", img: "/cyberpunk.png", type: "identity", likes: 756 }
                ].map((creation, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-2xl bg-muted shadow-lg ring-1 ring-border transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
                    <div className="aspect-square overflow-hidden">
                      <img src={creation.img} alt={creation.prompt} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          creation.type === 'meme' ? 'bg-purple-500 text-white' :
                          creation.type === 'brand' ? 'bg-blue-500 text-white' :
                          creation.type === 'marketing' ? 'bg-green-500 text-white' :
                          'bg-orange-500 text-white'
                        }`}>
                          {creation.type}
                        </span>
                      </div>
                      <p className="text-white font-bold text-sm leading-tight mb-2 line-clamp-2">{creation.prompt}</p>
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-400 fill-red-400" />
                        <span className="text-white text-xs font-bold">{creation.likes.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <SignInButton mode="modal">
                  <Button size="lg" className="h-14 px-8 text-base font-black text-black bg-primary rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 transition-all">
                    JOIN THE CREATIVE REVOLUTION
                  </Button>
                </SignInButton>
              </div>
            </div>
          </div>
        </SignedOut>
      </main>

      {/* Fullscreen Image Modal */}
      <Dialog open={!!fullscreenImage} onOpenChange={() => closeFullscreen()}>
        <DialogContent className="max-w-5xl w-auto h-auto max-h-[85vh] p-0 bg-black/95 border-none">
          <div className="relative flex items-center justify-center p-6">
            {fullscreenImage && fullscreenType === "image" && (
              <Image
                src={fullscreenImage}
                alt={fullscreenPrompt || "Generated image"}
                width={2048}
                height={2048}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                unoptimized
              />
            )}
            {fullscreenImage && fullscreenType === "video" && (
              <video
                src={fullscreenImage}
                controls
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                autoPlay={false}
              >
                Your browser does not support the video tag.
              </video>
            )}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full shadow-2xl font-black px-4 h-10 bg-black/50 hover:bg-black/70 border-white/20"
                onClick={() => downloadImage(fullscreenImage!, `pixelmint-fullscreen-${Date.now()}.${fullscreenType === "video" ? "mp4" : "jpg"}`)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full shadow-2xl font-black px-4 h-10 bg-black/50 hover:bg-black/70 border-white/20"
                onClick={closeFullscreen}
              >
                ✕
              </Button>
            </div>
            {fullscreenPrompt && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm rounded-b-lg p-4">
                <p className="text-white font-medium text-sm leading-relaxed">{fullscreenPrompt}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight uppercase">Delete Masterpiece?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              This action cannot be undone. Your generation will be permanently removed from our archive and cloud storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-full font-bold border-2">CANCEL</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-full font-black bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20">CONFIRM DELETE</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="w-full border-t bg-muted/20 py-16 mt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
            <Logo />
            <div className="flex gap-8 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">API</a>
              <a href="#" className="hover:text-primary transition-colors">Discord</a>
            </div>
          </div>
          <div className="mt-12 text-center border-t pt-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">© 2026 PixelMint Image Studio. Forged with passion for the creative community.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
