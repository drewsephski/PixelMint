"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function Home() {
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("photorealistic")
  const [aspectRatio, setAspectRatio] = useState("square_hd")
  const [loading, setLoading] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setGeneratedImage(null)
    
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageSize: aspectRatio }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || `Error ${response.status}: ${response.statusText}`)
      }
      
      if (result.data?.images?.[0]?.url) {
        setGeneratedImage(result.data.images[0].url)
      } else {
        throw new Error("No image URL returned from API")
      }
    } catch (err) {
      console.error("Generation failed", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-5xl flex-col items-center gap-8 py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            AI Image Generator
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Create stunning visuals with the power of Fal.ai Flux models.
          </p>
        </div>

        {/* Generator Card */}
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader>
            <CardTitle>Create your image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Prompt Input */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Describe the image you want to generate..."
                className="min-h-[100px] text-base"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              
              {/* Style Selector */}
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photorealistic">Photorealistic</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                    <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                    <SelectItem value="watercolor">Watercolor</SelectItem>
                    <SelectItem value="oil_painting">Oil Painting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Aspect Ratio Selector */}
              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <Tabs value={aspectRatio} onValueChange={setAspectRatio} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="square_hd">1:1</TabsTrigger>
                    <TabsTrigger value="landscape_4_3">4:3</TabsTrigger>
                    <TabsTrigger value="landscape_16_9">16:9</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              size="lg" 
              className="w-full text-lg" 
              onClick={handleGenerate}
              disabled={loading || !prompt}
            >
              {loading ? "Generating..." : "Generate"}
            </Button>
            
            {generatedImage && (
              <div className="mt-6 w-full overflow-hidden rounded-lg border bg-background p-2">
                <Image 
                  src={generatedImage} 
                  alt="Generated" 
                  width={1024}
                  height={1024}
                  className="w-full h-auto rounded-md" 
                  unoptimized
                />
              </div>
            )}
          </CardFooter>
        </Card>

      </main>
    </div>
  )
}