"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PASSWORD_RESET_REQUIRED_KEY = "password_reset_required";

export default function PasswordRecoveryGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function isRecoveryUrl() {
      return (
        window.location.hash.includes("type=recovery") ||
        window.location.search.includes("type=recovery")
      );
    }

    if (isRecoveryUrl()) {
      localStorage.setItem(PASSWORD_RESET_REQUIRED_KEY, "true");

      if (pathname !== "/reset-password") {
        router.replace("/reset-password");
      }
    }

    const resetRequired =
      localStorage.getItem(PASSWORD_RESET_REQUIRED_KEY) === "true";

    if (resetRequired && pathname !== "/reset-password") {
      router.replace("/reset-password");
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          localStorage.setItem(PASSWORD_RESET_REQUIRED_KEY, "true");

          if (pathname !== "/reset-password") {
            router.replace("/reset-password");
          }

          return;
        }

        const stillRequiresReset =
          localStorage.getItem(PASSWORD_RESET_REQUIRED_KEY) === "true";

        if (session && stillRequiresReset && pathname !== "/reset-password") {
          router.replace("/reset-password");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}