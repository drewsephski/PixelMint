# PixelMint - AI Image Generator

PixelMint is a cutting-edge AI-powered image generation platform that transforms your creative ideas into stunning visual masterpieces. Built with Next.js and powered by advanced Flux AI models.

## Features

- **Lightning Fast Generation**: Create images in under 4 seconds using state-of-the-art Flux Schnell models
- **Multiple Art Styles**: Choose from photorealistic, anime, cyberpunk, watercolor, and oil painting styles
- **Flexible Aspect Ratios**: Support for 1:1, 4:3, and 16:9 aspect ratios
- **High Fidelity Output**: Crystal clear 1024px exports
- **Secure Storage**: Your creative legacy protected by industry-leading cloud encryption
- **Credit System**: Purchase credits to fuel your creativity

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **UI Components**: Shadcn/UI with Radix UI primitives
- **Authentication**: Clerk
- **Database**: Supabase
- **AI Models**: Fal.ai (Flux Schnell)
- **Payments**: Stripe
- **Styling**: Tailwind CSS with dark mode support

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pixelmint
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Set up environment variables (copy `.env.local` and fill in your API keys)

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # Reusable components
│   ├── ui/               # Shadcn UI components
│   └── ...               # Custom components
└── lib/                  # Utility functions and configurations
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests with Vitest
- `npm run test:coverage` - Run tests with coverage

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

© 2026 PixelMint Image Studio. Forged with passion for the creative community.
