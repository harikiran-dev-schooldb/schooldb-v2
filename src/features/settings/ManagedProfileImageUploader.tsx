"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

export function ManagedProfileImageUploader({
  targetType,
  targetId,
  name,
  imageUrl,
  onImageChange,
}: {
  targetType: "STUDENT" | "TEACHER";
  targetId: string;
  name: string;
  imageUrl: string | null;
  onImageChange?: (imageUrl: string | null) => void;
}) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(imageUrl);
  const [busy, setBusy] = useState(false);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || (targetType === "STUDENT" ? "S" : "T");

  async function upload(file: File) {
    if (!file.type.match(/^image\/(?:jpeg|png|webp)$/)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_PROFILE_IMAGE_BYTES) {
      toast.error("Profile image must be smaller than 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set("schoolSlug", schoolSlug);
      body.set("targetType", targetType);
      body.set("targetId", targetId);
      body.set("file", file);
      const response = await fetch("/api/v1/settings/managed-profile-image", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to update profile image.");
      }
      setPreview(result.data.imageUrl);
      onImageChange?.(result.data.imageUrl);
      toast.success("Profile image updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update profile image.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const query = new URLSearchParams({ schoolSlug, targetType, targetId });
      const response = await fetch(
        `/api/v1/settings/managed-profile-image?${query}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to remove profile image.");
      }
      setPreview(null);
      onImageChange?.(null);
      toast.success("Profile image removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove profile image.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background p-4 sm:flex-row sm:items-center">
      <div className="relative w-fit">
        <Avatar className="size-20 border-4 border-background shadow-md">
          <AvatarImage src={preview ?? undefined} alt={`${name} profile`} />
          <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground">
          <Camera className="size-3.5" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Profile image</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          JPG, PNG, or WebP up to 5 MB. This change is published immediately.
        </p>
        <Input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          disabled={busy}
          className="sr-only"
          aria-label={`Choose ${targetType.toLowerCase()} profile image`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Choose image
          </Button>
          {preview ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void remove()}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
