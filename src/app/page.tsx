"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.replace("/dashboard");
      } else {
        router.replace("/landing");
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>
  );
}
