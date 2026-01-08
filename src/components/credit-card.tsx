"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

interface CreditCardProps {
  credits: number;
  price: number;
  description: string;
  priceId: string;
  onPurchase: (priceId: string) => void;
}

export function CreditCard({ credits, price, description, priceId, onPurchase }: CreditCardProps) {
  const handlePurchaseClick = () => {
    onPurchase(priceId);
  };

  return (
    <Card className="flex flex-col items-start justify-start items-start text-left p-6 bg-card/60 shadow-lg border border-primary/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-start mb-4">
          <Zap className="h-10 w-10 text-primary fill-primary" />
        </div>
        <CardTitle className="text-4xl font-black text-foreground">{credits} Credits</CardTitle>
        <CardDescription className="mt-2 text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-start">
        <p className="text-5xl font-extrabold text-foreground">${price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="w-full">
        <Button onClick={handlePurchaseClick} className="w-full text-lg font-bold py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          Purchase
        </Button>
      </CardFooter>
    </Card>
  );
}
