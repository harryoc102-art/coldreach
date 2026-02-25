"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Download } from "lucide-react";

interface ProspectUploadProps {
  campaignId: string;
}

export function ProspectUpload({ campaignId }: ProspectUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    errors: number;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/prospects`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          success: result.imported || 0,
          errors: result.errors?.length || 0,
          message: `Successfully imported ${result.imported} prospects`,
        });
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        // Close dialog after short delay on success
        setTimeout(() => {
          setIsOpen(false);
          setUploadResult(null);
          window.location.reload();
        }, 1500);
      } else {
        setUploadResult({
          success: 0,
          errors: result.errors?.length || 1,
          message: result.error || "Failed to upload prospects",
        });
      }
    } catch (error) {
      setUploadResult({
        success: 0,
        errors: 1,
        message: "Network error occurred",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `email,name,company,title,linkedin_url
john@example.com,John Doe,Acme Inc,CEO,https://linkedin.com/in/johndoe
jane@example.com,Jane Smith,Tech Corp,CTO,https://linkedin.com/in/janesmith`;
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prospects_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Add Prospects
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Prospects</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your prospect list
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Required columns: email. Optional: name, company, title, linkedin_url
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={downloadTemplate}
            className="text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Download template
          </Button>

          {isUploading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm">Uploading...</span>
            </div>
          )}

          {uploadResult && (
            <div
              className={`p-3 rounded text-sm ${
                uploadResult.errors === 0
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {uploadResult.message}
              {uploadResult.errors > 0 && (
                <p className="mt-1 text-xs">
                  {uploadResult.errors} errors occurred
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
