import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "../hooks/use-toast";

export default function AuthCallbackPage() {
  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const type = url.searchParams.get("type");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else if (type === "recovery") {
        await supabase.auth.exchangeCodeForSession(window.location.href);
      }
      window.location.replace(`${import.meta.env.BASE_URL}`);
    };
    run().catch((err) => {
      toast({
        title: "Login callback failed",
        description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
      window.location.replace(`${import.meta.env.BASE_URL}login`);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
    </div>
  );
}
