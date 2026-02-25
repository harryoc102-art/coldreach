"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";

interface GenerateEmailsButtonProps {
  campaignId: string;
  pendingCount: number;
}

export function GenerateEmailsButton({ campaignId, pendingCount }: GenerateEmailsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    count: number;
    message: string;
    error?: boolean;
  } | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          count: data.generated || 0,
          message: `Successfully generated ${data.generated} personalized emails`,
        });
        // Close and refresh after success
        setTimeout(() => {
          setIsOpen(false);
          setResult(null);
          window.location.reload();
        }, 1500);
      } else {
        setResult({
          count: 0,
          message: data.error || "Failed to generate emails",
          error: true,
        });
      }
    } catch (error) {
      setResult({
        count: 0,
        message: "Network error occurred",
        error: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Emails
          {pendingCount > 0 && (
            <span className="ml-2 text-xs bg-primary-foreground text-primary px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate AI Emails</DialogTitle>
          <DialogDescription>
            Use GPT-4o-mini to generate personalized cold emails for your prospects
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              This will generate personalized emails for <strong>{pendingCount}</strong> pending prospects.
            </p>
            <p>
              Each email will be tailored based on the prospect&apos;s company, title, and your campaign&apos;s target audience.
            </p>
          </div>

          {isGenerating && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm">Generating emails...</span>
            </div>
          )}

          {result && (
            <div
              className={`p-3 rounded text-sm ${
                result.error
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {result.message}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || pendingCount === 0}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate {pendingCount > 0 && `(${pendingCount})`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
