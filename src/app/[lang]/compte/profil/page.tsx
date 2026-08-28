import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { ProfileForm } from "./ProfileForm";

type ContributorProfile = {
  display_name: string | null;
  public: boolean | null;
  created_at: string | null;
  age_confirmed_at: string | null;
};

function maskEmail(email: string | undefined) {
  if (!email) {
    return "Indisponible";
  }

  const separatorIndex = email.lastIndexOf("@");
  if (separatorIndex < 1) {
    return "Indisponible";
  }

  const localPart = email.slice(0, separatorIndex);
  const domain = email.slice(separatorIndex + 1);
  const visiblePart = localPart.slice(0, Math.min(2, localPart.length));

  return `${visiblePart}••••@${domain}`;
}

function formatCreatedAt(value: string | undefined) {
  if (!value) {
    return "Indisponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

// @req REQ-042
export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/fr/compte/connexion");
  }

  const { data } = await supabase
    .from("contributor_profiles")
    .select("display_name, public, created_at, age_confirmed_at")
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();
  const profile: ContributorProfile | null = data;
  const fallbackName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Contributeur";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10 xl:py-12">
      <header className="mb-6 space-y-2 md:mb-8">
        <p className="text-afh-small font-medium text-primary">Votre compte</p>
        <h1 className="text-afh-h1 font-bold tracking-tight">Mon profil</h1>
        <p className="max-w-2xl text-afh-small text-muted-foreground">
          Gérez les informations associées à vos contributions.
        </p>
      </header>

      <ProfileForm
        displayName={profile?.display_name ?? fallbackName}
        isPublic={profile?.public ?? false}
        maskedEmail={maskEmail(user.email)}
        createdAt={formatCreatedAt(profile?.created_at ?? user.created_at)}
        ageConfirmed={Boolean(profile?.age_confirmed_at)}
      />
    </main>
  );
}
