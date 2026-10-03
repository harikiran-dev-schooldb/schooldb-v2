"use client";

import { useRef, useState } from "react";
import { Camera, Clock3, Loader2, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

export function ProfileImageUploader({
  schoolSlug,
  initialImageUrl,
  initials,
  name,
  approvalRequired = false,
  hasPendingRequest = false,
}: {
  schoolSlug: string;
  initialImageUrl: string | null;
  initials: string;
  name: string;
  approvalRequired?: boolean;
  hasPendingRequest?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(initialImageUrl);
  const [busy, setBusy] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(hasPendingRequest);

  async function upload(file: File) {
    if (!file.type.match(/^image\/(?:jpeg|png|webp)$/)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      toast.error("Profile image must be smaller than 5 MB.");
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.set("schoolSlug", schoolSlug);
      body.set("file", file);
      const response = await fetch("/api/v1/settings/profile-image", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to update profile image.");
      }
      if (result.data.pendingApproval) {
        setPendingApproval(true);
        toast.success("Image submitted for administrator approval.");
      } else {
        setPreview(result.data.imageUrl);
        toast.success("Profile image updated.");
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update profile image.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/v1/settings/profile-image?schoolSlug=${encodeURIComponent(schoolSlug)}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to remove profile image.");
      }
      if (approvalRequired) {
        setPendingApproval(false);
        toast.success("Pending image request cancelled.");
      } else {
        setPreview(result.data.imageUrl);
        toast.success("Profile image removed.");
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to remove profile image.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="relative w-fit">
        <Avatar className="size-24 border-4 border-background shadow-lg">
          <AvatarImage src={preview ?? undefined} alt={`${name} profile`} />
          <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground">
          <Camera className="size-4" />
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <Label htmlFor="profile-image">Profile image</Label>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            JPG, PNG, or WebP up to 5 MB. A square image works best.
            {approvalRequired
              ? " Your current image stays visible until an administrator approves the new one."
              : ""}
          </p>
          {pendingApproval ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-300">
              <Clock3 className="size-4" />
              Waiting for approval
            </p>
          ) : null}
        </div>
        <Input
          ref={inputRef}
          id="profile-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Choose image
          </Button>
          {!approvalRequired && preview ? (
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
          {approvalRequired && pendingApproval ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void remove()}
            >
              <X className="size-4" />
              Cancel request
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
