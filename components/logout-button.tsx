"use client";

import { createClient } from "@/lib/supabase/client";
import { sign_out_best_effort } from "@/lib/auth/safe-sign-out";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await sign_out_best_effort(supabase);
    router.push("/auth/login");
  };

  return <Button onClick={logout}>Logout</Button>;
}
