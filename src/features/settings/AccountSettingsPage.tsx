import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  Building2,
  KeyRound,
  LogOut,
  Repeat2,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ProfileImageUploader } from "./ProfileImageUploader";

type Detail = { label: string; value: string };

export function AccountSettingsPage({
  schoolSlug,
  schoolName,
  name,
  roleLabel,
  designation,
  imageUrl,
  canUploadImage,
  details,
  notificationsHref,
  imageApprovalRequired = false,
  hasPendingImageRequest = false,
  children,
}: {
  schoolSlug: string;
  schoolName: string;
  name: string;
  roleLabel: string;
  designation?: string | null;
  imageUrl: string | null;
  canUploadImage: boolean;
  details: Detail[];
  notificationsHref: string;
  imageApprovalRequired?: boolean;
  hasPendingImageRequest?: boolean;
  children?: ReactNode;
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Review your profile, school access, and account preferences."
      />

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600" />
            <CardContent className="-mt-12 pb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <Avatar className="size-24 border-4 border-background shadow-lg">
                  <AvatarImage src={imageUrl ?? undefined} alt={`${name} profile`} />
                  <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 pb-1">
                  <h2 className="truncate text-xl font-bold tracking-tight">{name}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{roleLabel}</Badge>
                    {designation && designation !== roleLabel && (
                      <Badge variant="secondary">{designation}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-5 text-primary" />
                Personal profile
              </CardTitle>
              <CardDescription>
                Your identity details are connected to your SchoolDB login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canUploadImage ? (
                <ProfileImageUploader
                  schoolSlug={schoolSlug}
                  initialImageUrl={imageUrl}
                  initials={initials}
                  name={name}
                  approvalRequired={imageApprovalRequired}
                  hasPendingRequest={hasPendingImageRequest}
                />
              ) : (
                <div className="rounded-2xl border border-border/70 bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
                  Profile-image changes are managed by your school administrator for this account.
                </div>
              )}

              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                {details.map((detail) => (
                  <div
                    key={detail.label}
                    className="rounded-2xl border border-border/70 bg-card p-4"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {detail.label}
                    </dt>
                    <dd className="mt-1.5 break-words text-sm font-semibold text-foreground">
                      {detail.value || "Not provided"}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" />
                School access
              </CardTitle>
              <CardDescription>Your active SchoolDB workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl bg-primary/5 p-4">
                <p className="font-semibold">{schoolName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{roleLabel} access</p>
              </div>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/${schoolSlug}/switch-account`}>
                  <Repeat2 className="size-4" />
                  Switch account or role
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/choose-school">
                  <Building2 className="size-4" />
                  Change school
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-600" />
                Account controls
              </CardTitle>
              <CardDescription>Shortcuts for alerts and login access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={notificationsHref}>
                  <Bell className="size-4" />
                  Notification inbox
                </Link>
              </Button>
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 p-4">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm leading-5 text-muted-foreground">
                  Passwords, verification methods, and login recovery are secured by your authentication account.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full justify-start text-destructive">
                <Link href={`/${schoolSlug}/logout`}>
                  <LogOut className="size-4" />
                  Sign out
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
      {children}
    </PageContainer>
  );
}
