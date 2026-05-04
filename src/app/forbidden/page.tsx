"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";

export default function ForbiddenPage() {
  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-red-600">403</CardTitle>
          <CardDescription className="text-xl mt-2">Access Denied</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            You don&apos;t have permission to access this resource.
          </p>
          <div className="flex flex-col gap-3 pt-4">
            <Button asChild>
              <Link href="/">Go to Home</Link>
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
