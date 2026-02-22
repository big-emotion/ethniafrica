"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContributionFormFields } from "./ContributionFormFields";
import { Language } from "@/types/shared";

interface ContributionFormProps {
  language: Language;
}

export function ContributionForm({
  language: propLanguage,
}: ContributionFormProps) {
  const params = useParams();
  const urlLang = params?.lang as string;
  const detectedLanguage: Language =
    urlLang && ["en", "fr"].includes(urlLang)
      ? (urlLang as Language)
      : propLanguage;
  const [type, setType] = useState<string>("");
  const [inputMode, setInputMode] = useState<"json" | "form">("form");
  const [payload, setPayload] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [contributorName, setContributorName] = useState<string>("");
  const [contributorEmail, setContributorEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [honeypot, setHoneypot] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    en: {
      title: "Submit a Contribution",
      type: "Contribution Type",
      inputMode: "Input Mode",
      jsonMode: "JSON",
      formMode: "Form",
      payload: "Data (JSON)",
      payloadPlaceholder:
        '{"name_main": "...", "language_family_id": "FLG_...", ...}',
      name: "Your Name (optional)",
      email: "Your Email (optional)",
      notes: "Notes (optional)",
      submit: "Submit Contribution",
      submitting: "Submitting...",
      success: "Contribution submitted successfully!",
      error: "Error submitting contribution",
      invalidJson: "Invalid JSON format",
      selectType: "Select type",
      newPeople: "New People",
      updatePeople: "Update People",
      newCountry: "New Country",
      updateCountry: "Update Country",
      newLanguageFamily: "New Language Family",
      updateLanguageFamily: "Update Language Family",
      requiredFields: "Please fill in all required fields",
    },
    fr: {
      title: "Soumettre une contribution",
      type: "Type de contribution",
      inputMode: "Mode de saisie",
      jsonMode: "JSON",
      formMode: "Formulaire",
      payload: "Données (JSON)",
      payloadPlaceholder:
        '{"name_main": "...", "language_family_id": "FLG_...", ...}',
      name: "Votre nom (optionnel)",
      email: "Votre email (optionnel)",
      notes: "Notes (optionnel)",
      submit: "Soumettre la contribution",
      submitting: "Envoi en cours...",
      success: "Contribution soumise avec succès !",
      error: "Erreur lors de la soumission",
      invalidJson: "Format JSON invalide",
      selectType: "Sélectionner un type",
      newPeople: "Nouveau peuple",
      updatePeople: "Modifier un peuple",
      newCountry: "Nouveau pays",
      updateCountry: "Modifier un pays",
      newLanguageFamily: "Nouvelle famille linguistique",
      updateLanguageFamily: "Modifier une famille linguistique",
      requiredFields: "Veuillez remplir tous les champs obligatoires",
    },
  }[detectedLanguage];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let parsedPayload: Record<string, unknown>;

      if (inputMode === "json") {
        try {
          parsedPayload = JSON.parse(payload);
        } catch {
          setError(t.invalidJson);
          setLoading(false);
          return;
        }
      } else {
        if (!type) {
          setError(t.selectType);
          setLoading(false);
          return;
        }

        // For update types, include the identifier
        if (type.startsWith("update_") && formData.id) {
          parsedPayload = { ...formData };
        } else {
          parsedPayload = { ...formData };
        }

        if (Object.keys(parsedPayload).length === 0) {
          setError(t.requiredFields);
          setLoading(false);
          return;
        }
      }

      const response = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          proposed_payload: parsedPayload,
          contributor_name: contributorName || null,
          contributor_email: contributorEmail || null,
          notes: notes || null,
          honeypot,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t.error);
      }

      setSuccess(true);
      setType("");
      setInputMode("form");
      setPayload("");
      setFormData({});
      setContributorName("");
      setContributorEmail("");
      setNotes("");
      setHoneypot("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">{t.title}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="type">{t.type}</Label>
          <Select
            value={type}
            onValueChange={(value) => {
              setType(value);
              setPayload("");
              setFormData({});
            }}
            required
          >
            <SelectTrigger id="type">
              <SelectValue placeholder={t.selectType} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_people">{t.newPeople}</SelectItem>
              <SelectItem value="update_people">{t.updatePeople}</SelectItem>
              <SelectItem value="new_country">{t.newCountry}</SelectItem>
              <SelectItem value="update_country">{t.updateCountry}</SelectItem>
              <SelectItem value="new_language_family">
                {t.newLanguageFamily}
              </SelectItem>
              <SelectItem value="update_language_family">
                {t.updateLanguageFamily}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {type && (
          <div>
            <Label>{t.inputMode}</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="inputMode"
                  value="form"
                  checked={inputMode === "form"}
                  onChange={(e) => {
                    setInputMode(e.target.value as "form");
                    setPayload("");
                    setFormData({});
                  }}
                />
                <span>{t.formMode}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="inputMode"
                  value="json"
                  checked={inputMode === "json"}
                  onChange={(e) => {
                    setInputMode(e.target.value as "json");
                    setFormData({});
                  }}
                />
                <span>{t.jsonMode}</span>
              </label>
            </div>
          </div>
        )}

        {inputMode === "json" ? (
          <div>
            <Label htmlFor="payload">{t.payload}</Label>
            <Textarea
              id="payload"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder={t.payloadPlaceholder}
              required
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        ) : (
          type && (
            <ContributionFormFields
              type={type}
              language={detectedLanguage}
              onDataChange={setFormData}
            />
          )
        )}

        <div>
          <Label htmlFor="name">{t.name}</Label>
          <Input
            id="name"
            type="text"
            value={contributorName}
            onChange={(e) => setContributorName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="email">{t.email}</Label>
          <Input
            id="email"
            type="email"
            value={contributorEmail}
            onChange={(e) => setContributorEmail(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="notes">{t.notes}</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Honeypot field (hidden) */}
        <input
          type="text"
          name="honeypot"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ display: "none" }}
          tabIndex={-1}
          autoComplete="off"
        />

        {error && <div className="text-red-500 text-sm">{error}</div>}

        {success && <div className="text-green-500 text-sm">{t.success}</div>}

        <Button type="submit" disabled={loading || !type}>
          {loading ? t.submitting : t.submit}
        </Button>
      </form>
    </Card>
  );
}
