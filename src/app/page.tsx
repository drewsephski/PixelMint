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
import { AlertCircle, Loader, Download, Sparkles, History, Zap, Image as ImageIcon, Shield, Trash2, Maximize2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { CreditCard } from "@/components/credit-card";
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
const STYLE_OPTIONS = [
  { value: "photorealistic", label: "Photorealistic" },
  { value: "anime", label: "Anime" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "watercolor", label: "Watercolor" },
  { value: "oil_painting", label: "Oil Painting" },
] as const;

const ASPECT_RATIO_OPTIONS = [
  { value: "square_hd", label: "1:1" },
  { value: "landscape_4_3", label: "4:3" },
  { value: "landscape_16_9", label: "16:9" },
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

// Types
interface GenerateResponse {
  success: boolean;
  data?: {
    images: Array<{ url: string }>;
    original_url: string;
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
  aspectRatio: string;
  loading: boolean;
  generatedImage: string | null;
  error: string | null;
  generations: GenerationRecord[];
  loadingGenerations: boolean;
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
    aspectRatio: "square_hd",
    loading: false,
    generatedImage: null,
    error: null,
    generations: [],
    loadingGenerations: false,
  });

  const [credits, setCredits] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenPrompt, setFullscreenPrompt] = useState<string>("");

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

  const openFullscreen = useCallback((imageUrl: string, prompt: string = "") => {
    setFullscreenImage(imageUrl);
    setFullscreenPrompt(prompt);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenImage(null);
    setFullscreenPrompt("");
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
   * Handle aspect ratio change
   */
  const handleAspectRatioChange = useCallback((value: string) => {
    setState((prev) => ({ ...prev, aspectRatio: value }));
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
   * Generate image
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
    }));

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          imageSize: state.aspectRatio,
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
        generatedImage: result.data ? result.data.images[0].url : null,
      }));

      fetchGenerations();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      console.error("Generation failed:", error);
      setState((prev) => ({ ...prev, error: errorMessage, generatedImage: null }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [state.prompt, state.aspectRatio, fetchGenerations]);

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
  const aspectRatioOptions = useMemo(() => ASPECT_RATIO_OPTIONS, []);

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
            </div>

            <div className="w-full max-w-3xl">
              <Card className="overflow-hidden border-none shadow-2xl ring-1 ring-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="border-b bg-linear-to-b from-transparent via-muted/30 to-transparent pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl font-bold">Image Blueprint</CardTitle>
                  </div>
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
                      <Label htmlFor="prompt" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Prompt Specification</Label>
                      <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">{state.prompt.length}/500</span>
                    </div>
                    <Textarea
                      id="prompt"
                      placeholder="A cinematic view of a futuristic city..."
                      className="min-h-[140px] resize-none border-2 bg-background p-4 text-base focus-visible:ring-primary/20 transition-all"
                      value={state.prompt}
                      onChange={handlePromptChange}
                      disabled={state.loading}
                      maxLength={500}
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      {SAMPLE_PROMPTS.map((sample, idx) => (
                        <button key={idx} onClick={() => handlePromptChange(sample)} disabled={state.loading} className="inline-flex items-center rounded-lg border bg-muted/50 px-2.5 py-1 text-[11px] font-bold transition-all hover:bg-primary hover:text-black hover:border-primary disabled:opacity-50">
                          {sample.substring(0, 30)}...
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    <div className="space-y-3">
                      <Label htmlFor="style" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Artistic Style</Label>
                      <Select value={state.style} onValueChange={handleStyleChange}>
                        <SelectTrigger id="style" disabled={state.loading} className="h-11 border-2 font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {styleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="focus:bg-primary/10">{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Frame Geometry</Label>
                      <Tabs value={state.aspectRatio} onValueChange={handleAspectRatioChange} className="w-full">
                        <TabsList className="grid h-11 w-full grid-cols-3 border-2 p-1 bg-background">
                          {aspectRatioOptions.map((option) => (
                            <TabsTrigger key={option.value} value={option.value} disabled={state.loading} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all font-bold text-xs">{option.label}</TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-6 bg-muted/30 p-6 sm:p-8">
                  <Button size="lg" className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all rounded-2xl" onClick={handleGenerate} disabled={isGenerateDisabled}>
                    {state.loading ? (<><Loader className="mr-3 h-6 w-6 animate-spin" /> FORGING...</>) : (<><Sparkles className="mr-3 h-6 w-6" /> GENERATE MASTERPIECE</>)}
                  </Button>
                  {state.generatedImage && (
                    <div className="w-full space-y-4 animate-in zoom-in-95 duration-500">
                      <div className="relative group overflow-hidden rounded-3xl border-8 border-background bg-background shadow-2xl ring-1 ring-border">
                        <Image src={state.generatedImage} alt="Generated image" width={1024} height={1024} className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" priority unoptimized />
                        <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                          <Button variant="secondary" className="rounded-full shadow-2xl font-black px-6 h-12" onClick={() => openFullscreen(state.generatedImage!, state.prompt)}>
                            <Maximize2 className="mr-2 h-5 w-5" /> FULLSCREEN
                          </Button>
                          <Button variant="secondary" className="rounded-full shadow-2xl font-black px-6 h-12" onClick={() => downloadImage(state.generatedImage!, `pixelmint-${Date.now()}.jpg`)}>
                            <Download className="mr-2 h-5 w-5" /> SAVE TO DEVICE
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
                  {state.generations.map((generation) => (
                    <Card key={generation.id} className="group overflow-hidden border-none shadow-md hover:shadow-2xl transition-all duration-500 ring-1 ring-border/50 bg-card/40 rounded-3xl">
                      <div className="relative aspect-square overflow-hidden bg-muted">
                        <Image src={generation.image_url} alt={generation.prompt} width={400} height={400} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm gap-3">
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" className="rounded-full font-black px-4" onClick={() => openFullscreen(generation.image_url, generation.prompt)}>
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                            <Button variant="secondary" size="sm" className="rounded-full font-black px-4" onClick={() => downloadImage(generation.image_url, `generation-${generation.id}.jpg`)}>
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
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-primary ring-1 ring-primary/20">{generation.aspect_ratio.split('_')[0]}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(generation.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
              <h2 className="text-4xl font-black tracking-tighter text-foreground sm:text-5xl">Get More <span className="text-primary italic">Credits</span></h2>
              <p className="mt-3 text-lg text-muted-foreground">Fuel your creativity with more image generations.</p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <CreditCard
                credits={10}
                price={1.99}
                description="10 image generations"
                priceId="price_1SnLuDDfHkj3MZlTBqJyqrA8"
                onPurchase={handlePurchaseCredits}
              />
              <CreditCard
                credits={50}
                price={4.99}
                description="50 image generations"
                priceId="price_1SnLuJDfHkj3MZlTP2HheMjp"
                onPurchase={handlePurchaseCredits}
              />
              <CreditCard
                credits={250}
                price={20.00}
                description="250 image generations"
                priceId="price_1SnLuLDfHkj3MZlTMPVFfWyj"
                onPurchase={handlePurchaseCredits}
              />
            </div>
          </section>
        </SignedIn>

        <SignedOut>
          <div className="flex flex-col items-center gap-24 w-full">
            <div className="flex flex-col items-center gap-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-black text-primary mb-2 uppercase tracking-widest shadow-sm">
                <Sparkles className="mr-2 h-3 w-3 fill-primary" /> The Future of Art
              </div>
              <h1 className="text-6xl font-black tracking-tighter text-foreground sm:text-8xl lg:text-9xl max-w-5xl leading-[0.85]">IMAGINE <br /><span className="text-primary italic">WITHOUT</span> LIMITS</h1>
              <p className="max-w-2xl text-xl text-muted-foreground font-medium leading-relaxed">Experience the world&apos;s most advanced AI image generator. From professional concepts to surreal masterpieces in seconds.</p>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                <SignInButton mode="modal">
                  <Button size="lg" className="h-16 px-10 text-lg font-black text-black bg-primary rounded-2xl shadow-2xl shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/50 transition-all group">START CREATING <DynamicArrow className="h-6 w-6" /></Button>
                </SignInButton>
                <Button variant="outline" size="lg" className="h-16 px-10 text-lg font-black rounded-2xl border-2 hover:bg-muted transition-all">VIEW SHOWCASE</Button>
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
          </div>
        </SignedOut>
      </main>

      {/* Fullscreen Image Modal */}
      <Dialog open={!!fullscreenImage} onOpenChange={() => closeFullscreen()}>
        <DialogContent className="max-w-5xl w-auto h-auto max-h-[85vh] p-0 bg-black/95 border-none">
          <div className="relative flex items-center justify-center p-6">
            {fullscreenImage && (
              <Image
                src={fullscreenImage}
                alt={fullscreenPrompt || "Generated image"}
                width={2048}
                height={2048}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                unoptimized
              />
            )}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full shadow-2xl font-black px-4 h-10 bg-black/50 hover:bg-black/70 border-white/20"
                onClick={() => downloadImage(fullscreenImage!, `pixelmint-fullscreen-${Date.now()}.jpg`)}
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
