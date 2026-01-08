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
import { AlertCircle, Loader, Download, Sparkles, History, ArrowRight, Zap, Image as ImageIcon, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <div className="flex items-center gap-2 group cursor-pointer">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 group-hover:shadow-primary/40 group-hover:scale-105 transition-all duration-300">
        <Sparkles className="h-6 w-6 text-primary-foreground" />
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent animate-pulse" />
      </div>
      <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
        ImagineAI
      </span>
    </div>
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

  /**
   * Handle prompt change
   */
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
  }, [fetchGenerations]);

  const isGenerateDisabled = useMemo(
    () => state.loading || !state.prompt.trim(),
    [state.loading, state.prompt]
  );

  const styleOptions = useMemo(() => STYLE_OPTIONS, []);
  const aspectRatioOptions = useMemo(() => ASPECT_RATIO_OPTIONS, []);

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background font-sans selection:bg-primary/20 transition-colors duration-300">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between py-4 px-4 sm:px-6 lg:px-8">
          <Logo />
          
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <div className="h-6 w-px bg-border mx-1" />
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="default" size="sm" className="rounded-full shadow-md hover:shadow-lg transition-all px-6">
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
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

      {/* Main Content */}
      <main className="flex w-full max-w-7xl flex-col items-center gap-16 py-12 px-4 sm:px-6 lg:px-8">
        
        <SignedIn>
          {/* Authenticated View: Generator */}
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
                <CardHeader className="border-b bg-muted/30 pb-4">
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
                      <Label htmlFor="prompt" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Prompt Specification
                      </Label>
                      <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
                        {state.prompt.length}/500
                      </span>
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
                        <button
                          key={idx}
                          onClick={() => handlePromptChange(sample)}
                          disabled={state.loading}
                          className="inline-flex items-center rounded-lg border bg-muted/50 px-2.5 py-1 text-[11px] font-bold transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-50"
                        >
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
                            <SelectItem key={option.value} value={option.value} className="focus:bg-primary/10">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Frame Geometry</Label>
                      <Tabs value={state.aspectRatio} onValueChange={handleAspectRatioChange} className="w-full">
                        <TabsList className="grid h-11 w-full grid-cols-3 border-2 p-1 bg-background">
                          {aspectRatioOptions.map((option) => (
                            <TabsTrigger
                              key={option.value}
                              value={option.value}
                              disabled={state.loading}
                              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all font-bold text-xs"
                            >
                              {option.label}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-6 bg-muted/30 p-6 sm:p-8">
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all rounded-2xl"
                    onClick={handleGenerate}
                    disabled={isGenerateDisabled}
                  >
                    {state.loading ? (
                      <><Loader className="mr-3 h-6 w-6 animate-spin" /> FORGING...</>
                    ) : (
                      <><Sparkles className="mr-3 h-6 w-6" /> GENERATE MASTERPIECE</>
                    )}
                  </Button>

                  {state.generatedImage && (
                    <div className="w-full space-y-4 animate-in zoom-in-95 duration-500">
                      <div className="relative group overflow-hidden rounded-3xl border-8 border-background bg-background shadow-2xl ring-1 ring-border">
                        <Image
                          src={state.generatedImage}
                          alt="Generated image"
                          width={1024}
                          height={1024}
                          className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                          priority
                          unoptimized
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                           <Button
                            variant="secondary"
                            className="rounded-full shadow-2xl font-black px-8 h-12"
                            onClick={() => downloadImage(state.generatedImage!, `imagine-ai-${Date.now()}.jpg`)}
                          >
                            <Download className="mr-2 h-5 w-5" />
                            SAVE TO DEVICE
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardFooter>
              </Card>
            </div>

            {/* Gallery Section */}
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
                        <Image
                          src={generation.image_url}
                          alt={generation.prompt}
                          width={400}
                          height={400}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mb-2 rounded-full font-black px-6"
                            onClick={() => downloadImage(generation.image_url, `generation-${generation.id}.jpg`)}
                          >
                            <Download className="mr-2 h-4 w-4" /> DOWNLOAD
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-6">
                        <p className="line-clamp-3 text-sm font-bold leading-relaxed text-foreground/80 group-hover:text-foreground transition-colors">
                          {generation.prompt}
                        </p>
                        <div className="mt-5 flex items-center justify-between border-t pt-4">
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-primary ring-1 ring-primary/20">
                            {generation.aspect_ratio.split('_')[0]}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {new Date(generation.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
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
                  <p className="mt-3 max-w-xs text-muted-foreground font-medium">
                    Your future masterpieces will appear here. Start generating above!
                  </p>
                </div>
              )}
            </div>
          </div>
        </SignedIn>

        <SignedOut>
          {/* Unauthenticated View: Landing Page */}
          <div className="flex flex-col items-center gap-24 w-full">
            {/* Hero */}
            <div className="flex flex-col items-center gap-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-black text-primary mb-2 uppercase tracking-widest shadow-sm">
                <Sparkles className="mr-2 h-3 w-3 fill-primary" /> The Future of Art
              </div>
              <h1 className="text-6xl font-black tracking-tighter text-foreground sm:text-8xl lg:text-9xl max-w-5xl leading-[0.85]">
                IMAGINE <br />
                <span className="text-primary italic">WITHOUT</span> LIMITS
              </h1>
              <p className="max-w-2xl text-xl text-muted-foreground font-medium leading-relaxed">
                Experience the world's most advanced AI image generator. 
                From professional concepts to surreal masterpieces in seconds.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                <SignInButton mode="modal">
                  <Button size="lg" className="h-16 px-10 text-lg font-black rounded-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all group">
                    START CREATING <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </SignInButton>
                <Button variant="outline" size="lg" className="h-16 px-10 text-lg font-black rounded-2xl border-2 hover:bg-muted transition-all">
                  VIEW SHOWCASE
                </Button>
              </div>
            </div>

            {/* Showcase Grid */}
            <div className="w-full space-y-12">
              <div className="flex flex-col items-center text-center gap-2">
                <h2 className="text-4xl font-black tracking-tighter uppercase">Studio Showcase</h2>
                <div className="h-1.5 w-24 bg-primary rounded-full" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  {
                    title: "Cyberpunk Visions",
                    img: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=800",
                    tag: "SCIFI"
                  },
                  {
                    title: "Nature Reimagined",
                    img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
                    tag: "SURREAL"
                  },
                  {
                    title: "Classical Evolution",
                    img: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=800",
                    tag: "ART"
                  }
                ].map((item, i) => (
                  <div key={i} className="group relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-muted shadow-2xl ring-1 ring-border transition-all duration-700 hover:-translate-y-2">
                    <img 
                      src={item.img} 
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-1"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8">
                      <span className="w-fit px-3 py-1 rounded-full bg-primary text-[10px] font-black text-primary-foreground mb-3 tracking-widest">{item.tag}</span>
                      <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-tighter">{item.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-5xl py-12">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Zap className="h-8 w-8 fill-primary" />
                </div>
                <h4 className="text-xl font-black uppercase tracking-tighter">Lightning Fast</h4>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">Images forged in under 4 seconds using state-of-the-art Flux Schnell models.</p>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Shield className="h-8 w-8 fill-primary" />
                </div>
                <h4 className="text-xl font-black uppercase tracking-tighter">Secure Storage</h4>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">Your creative legacy is protected by industry-leading cloud encryption.</p>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <ImageIcon className="h-8 w-8 fill-primary" />
                </div>
                <h4 className="text-xl font-black uppercase tracking-tighter">High Fidelity</h4>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">Crystal clear 1024px exports with multiple aspect ratio support.</p>
              </div>
            </div>
          </div>
        </SignedOut>

      </main>

      {/* Footer */}
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
              © 2026 ImagineAI Image Studio. Forged with passion for the creative community.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}