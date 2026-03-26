"use client";

import { Button } from "@apparel-commerce/ui";
import { signIn } from "next-auth/react";
import { cn } from "@apparel-commerce/ui";

type Props = {
  callbackUrl: string;
  label?: string;
  className?: string;
};

export function GoogleSignInButton({
  callbackUrl,
  label = "Continue with Google",
  className,
}: Props) {
  return (
    <Button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className={cn(
        "mt-8 flex w-full py-4 text-xs font-bold uppercase tracking-widest",
        className,
      )}
    >
      {label}
    </Button>
  );
}
