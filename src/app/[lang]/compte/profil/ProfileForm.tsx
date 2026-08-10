"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormFieldError } from "@/components/forms/FormFieldError";
import {
  eraseAccountAction,
  updateProfileAction,
  type ProfileActionState,
} from "./actions";

type ProfileFormProps = {
  displayName: string;
  isPublic: boolean;
  maskedEmail: string;
  createdAt: string;
  ageConfirmed: boolean;
};

const initialActionState: ProfileActionState = {
  success: false,
  message: "",
};

// @req REQ-042
export function ProfileForm({
  displayName,
  isPublic,
  maskedEmail,
  createdAt,
  ageConfirmed,
}: ProfileFormProps) {
  const router = useRouter();
  const [publicProfile, setPublicProfile] = useState(isPublic);
  const [confirmation, setConfirmation] = useState("");
  const [updateState, setUpdateState] =
    useState<ProfileActionState>(initialActionState);
  const [erasureState, setErasureState] =
    useState<ProfileActionState>(initialActionState);
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isErasing, startErasureTransition] = useTransition();

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startUpdateTransition(() => {
      void updateProfileAction(updateState, formData).then(setUpdateState);
    });
  }

  function handleErasureSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startErasureTransition(() => {
      void eraseAccountAction(erasureState, formData).then((state) => {
        setErasureState(state);
        if (state.success) {
          router.push("/fr");
        }
      });
    });
  }

  return (
    <div className="grid gap-6 min-[1200px]:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
      <Card className="rounded-afh-xl">
        <CardHeader className="p-5 md:p-6">
          <CardTitle className="text-xl md:text-2xl">
            Informations du profil
          </CardTitle>
          <CardDescription>
            Choisissez le nom visible avec vos contributions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 md:p-6 md:pt-0">
          <form className="space-y-5" onSubmit={handleProfileSubmit}>
            <div className="space-y-2">
              <Label htmlFor="display_name">Nom d’affichage</Label>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={displayName}
                minLength={2}
                maxLength={40}
                required
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md border p-4">
              <div className="space-y-1">
                <Label htmlFor="public-profile">Profil public</Label>
                <p className="text-sm text-muted-foreground">
                  Afficher votre nom d’affichage avec vos signalements.
                </p>
              </div>
              <Switch
                id="public-profile"
                checked={publicProfile}
                onCheckedChange={setPublicProfile}
                aria-label="Profil public"
              />
              <input
                type="hidden"
                name="public"
                value={publicProfile ? "on" : "off"}
              />
            </div>

            {updateState.message ? (
              updateState.success ? (
                <p role="status" className="text-sm text-green-700">
                  {updateState.message}
                </p>
              ) : (
                <FormFieldError role="status">
                  {updateState.message}
                </FormFieldError>
              )
            ) : null}

            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={isUpdating}
            >
              {isUpdating ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-afh-xl">
          <CardHeader className="p-5 md:p-6">
            <CardTitle className="text-xl">Détails du compte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0 text-sm md:p-6 md:pt-0">
            <div>
              <p className="font-medium">Adresse e-mail</p>
              <p className="break-all text-muted-foreground">{maskedEmail}</p>
            </div>
            <div>
              <p className="font-medium">Compte créé le</p>
              <p className="text-muted-foreground">{createdAt}</p>
            </div>
            <div>
              <p className="font-medium">Confirmation d’âge</p>
              <p className="text-muted-foreground">
                {ageConfirmed ? "Confirmé" : "Non confirmé"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-afh-xl border-destructive/50">
          <CardHeader className="p-5 md:p-6">
            <CardTitle className="text-xl text-destructive">
              Supprimer le compte
            </CardTitle>
            <CardDescription>
              Efface définitivement votre profil et vos données personnelles.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 md:p-6 md:pt-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full md:w-auto"
                >
                  Supprimer mon compte
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[calc(100%_-_2rem)] rounded-lg p-5 md:max-w-lg md:p-6">
                <form onSubmit={handleErasureSubmit}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Confirmer la suppression
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      cette action est irréversible — vos signalements resteront
                      publics sans votre nom
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="my-5 space-y-2">
                    <Label htmlFor="confirmation">
                      Saisissez SUPPRIMER pour confirmer
                    </Label>
                    <Input
                      id="confirmation"
                      name="confirmation"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      autoComplete="off"
                    />
                  </div>

                  {erasureState.message ? (
                    erasureState.success ? (
                      <p role="status" className="mb-4 text-sm text-green-700">
                        {erasureState.message}
                      </p>
                    ) : (
                      <div className="mb-4">
                        <FormFieldError role="status" id="erasure-error">
                          {erasureState.message}
                        </FormFieldError>
                      </div>
                    )
                  ) : null}

                  <AlertDialogFooter>
                    <AlertDialogCancel type="button" disabled={isErasing}>
                      Annuler
                    </AlertDialogCancel>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={confirmation !== "SUPPRIMER" || isErasing}
                    >
                      {isErasing ? "Suppression…" : "Supprimer définitivement"}
                    </Button>
                  </AlertDialogFooter>
                </form>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
