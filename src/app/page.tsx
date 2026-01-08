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
import { AlertCircle, Loader, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

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
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setState((prev) => ({
        ...prev,
        prompt: e.target.value,
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
        throw new Error(result.error || `Failed to fetch generations: ${response.statusText}`);
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
        throw new Error(
          `Server returned invalid response (Status ${response.status}).`
        );
      }

      const result = (await response.json()) as GenerateResponse;

      if (!response.ok) {
        throw new Error(
          result.error || `Generation failed: ${response.statusText}`
        );
      }

      if (!result.data?.images?.[0]?.url) {
        throw new Error("No image URL returned from API");
      }

      setState((prev) => ({
        ...prev,
        generatedImage: result.data ? result.data.images[0].url : null,
      }));

      // Refresh generations list
      fetchGenerations();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      console.error("Generation failed:", error);

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        generatedImage: null,
      }));
    } finally {
      setState((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  }, [state.prompt, state.aspectRatio, fetchGenerations]);

  /**
   * Load generations on component mount
   */
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
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      {/* Header */}
      <header className="flex w-full max-w-5xl items-center justify-between border-b py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={80}
            height={16}
            priority
          />
        </div>
        <nav className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex w-full max-w-5xl flex-col items-center gap-12 py-8 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            AI Image Generator
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Create stunning visuals with the power of Fal.ai Flux models.
          </p>
        </div>

        {/* Generator Card */}
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader>
            <CardTitle>Create your image</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {state.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="prompt">
                Prompt
                <span className="ml-2 text-xs text-muted-foreground">
                  ({state.prompt.length}/500)
                </span>
              </Label>
              <Textarea
                id="prompt"
                placeholder="Describe the image you want to generate..."
                className="min-h-[100px] resize-none text-base"
                value={state.prompt}
                onChange={handlePromptChange}
                disabled={state.loading}
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="style">Style</Label>
                <Select value={state.style} onValueChange={handleStyleChange}>
                  <SelectTrigger id="style" disabled={state.loading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {styleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <Tabs
                  value={state.aspectRatio}
                  onValueChange={handleAspectRatioChange}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    {aspectRatioOptions.map((option) => (
                      <TabsTrigger
                        key={option.value}
                        value={option.value}
                        disabled={state.loading}
                      >
                        {option.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 border-t pt-6">
            <Button
              size="lg"
              className="w-full text-base font-semibold"
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
            >
              {state.loading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Image"
              )}
            </Button>

            {state.generatedImage && (
              <div className="mt-4 w-full space-y-3">
                <div className="overflow-hidden rounded-lg border bg-background p-2">
                  <Image
                    src={state.generatedImage}
                    alt="Generated image"
                    width={512}
                    height={512}
                    className="h-auto w-full rounded-md object-cover"
                    priority
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => downloadImage(state.generatedImage!, `generated-${Date.now()}.jpg`)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Image
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Generations Gallery */}
        <div className="w-full max-w-5xl space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-2xl font-semibold text-foreground">Past Generations</h2>
            {state.loadingGenerations && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader className="h-4 w-4 animate-spin" />
                Updating...
              </div>
            )}
          </div>

          {state.generations.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {state.generations.map((generation) => (
                <Card key={generation.id} className="group overflow-hidden shadow-sm transition-shadow hover:shadow-md">
                  <div className="relative aspect-square overflow-hidden bg-zinc-100">
                    <Image
                      src={generation.image_url}
                      alt={generation.prompt}
                      width={400}
                      height={400}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadImage(generation.image_url, `generation-${generation.id}.jpg`)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <p className="line-clamp-2 text-sm font-medium leading-relaxed text-foreground">
                      {generation.prompt}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                        {generation.aspect_ratio.replace('_', ' ')}
                      </span>
                      <span>{new Date(generation.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-900">
                <Image className="opacity-20 grayscale" src="/next.svg" alt="Empty" width={40} height={10} />
              </div>
              <p className="text-muted-foreground">No generations yet. Start by creating one above!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}