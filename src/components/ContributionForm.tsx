"use client";

import { useRef, useState, type ReactNode } from "react";
import type { Proof as AntibotProof } from "@/lib/antibot/proofOfWork";
import { ProofOfWorkGate } from "@/components/flags/ProofOfWorkGate";
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
import { ReferenceLibraryFlow } from "./ReferenceLibraryFlow";
import { Language } from "@/types/shared";
import { getContributionSourceCitations } from "@/lib/validations/contribution";
import { FormFieldError } from "@/components/forms/FormFieldError";
import { contributeCopy } from "@/lib/i18n/copy/contribute";

interface ContributionFormProps {
  language: Language;
  /**
   * The anti-bot control, injectable for the same reason `FlagForm` injects
   * it: the real gate spawns a worker, which no test environment can run.
   * Left out, the form renders the real one.
   */
  renderVerification?: (callbacks: {
    onSolved: (proof: AntibotProof) => void;
    onFailed: () => void;
  }) => ReactNode;
}

/** The entity a correction anchors on, by the type of correction proposed. */
const ANCHOR_TYPES: Record<string, string> = {
  update_people: "people",
  update_country: "country",
  update_language_family: "language_family",
};

// @req REQ-092
export function ContributionForm({
  language,
  renderVerification,
}: ContributionFormProps) {
  const t = contributeCopy[language];
  const [type, setType] = useState<string>("");
  const [inputMode, setInputMode] = useState<"json" | "form">("form");
  const [payload, setPayload] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [contributorName, setContributorName] = useState<string>("");
  const [contributorEmail, setContributorEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [honeypot, setHoneypot] = useState<string>("");
  const [proof, setProof] = useState<AntibotProof | null>(null);
  const [verificationError, setVerificationError] = useState<string>("");
  const openedAt = useRef(Date.now());
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceCitations = (() => {
    if (inputMode === "form") return getContributionSourceCitations(formData);

    try {
      const parsedPayload = JSON.parse(payload);
      return parsedPayload && typeof parsedPayload === "object"
        ? getContributionSourceCitations(parsedPayload)
        : [];
    } catch {
      return [];
    }
  })();
  // Advisory, never a gate: the contributor is told how their citation will be
  // labelled, and submits anyway.
  const hasUnverifiedSource = sourceCitations.some(
    (citation) => citation.tier === "unverified"
  );

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

      if (!proof) {
        setError(t.notVerified);
        setLoading(false);
        return;
      }

      const anchorId = parsedPayload.id;
      const summary =
        t.summaries[type as keyof typeof t.summaries] ?? t.summaries.fallback;
      const trimmedNotes = notes.trim();

      const response = await fetch("/api/v2/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flag_kind: "contribution",
          // Anchored only when the proposal names an entity that already
          // exists. A new people has none, and the flags contract exempts a
          // contribution from the anchor for exactly that case.
          ...(ANCHOR_TYPES[type] && anchorId
            ? { target_type: ANCHOR_TYPES[type], target_id: String(anchorId) }
            : {}),
          reason_text: trimmedNotes ? `${summary} — ${trimmedNotes}` : summary,
          contribution_payload: {
            contribution_type: type,
            proposed: parsedPayload,
            contributor_name: contributorName || null,
            contributor_email: contributorEmail || null,
          },
          antibot: proof,
          website: honeypot,
          elapsedMs: Date.now() - openedAt.current,
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.errors?.[0]?.message || t.error);
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
    <Card className="rounded-afh-xl p-4 sm:p-6">
      <h2 className="mb-4 text-afh-h2 font-bold">{t.title}</h2>
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
            <div className="grid gap-2 sm:flex sm:gap-4">
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
              className="font-mono text-afh-small"
            />
          </div>
        ) : (
          type && (
            <ContributionFormFields
              type={type}
              language={language}
              onDataChange={setFormData}
            />
          )
        )}

        {type && <ReferenceLibraryFlow language={language} />}

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

        <section className="space-y-afh-md">
          <h3 className="text-afh-body font-semibold">{t.verification}</h3>
          {/* Nothing is asked of the contributor: the browser pays a small
              computational cost and reports when it is done. */}
          {renderVerification ? (
            renderVerification({
              onSolved: (solved) => {
                setProof(solved);
                setVerificationError("");
              },
              onFailed: () => {
                setProof(null);
                setVerificationError(t.verificationFailed);
              },
            })
          ) : (
            <ProofOfWorkGate
              language={language}
              onSolved={(solved) => {
                setProof(solved);
                setVerificationError("");
              }}
              onFailed={() => {
                setProof(null);
                setVerificationError(t.verificationFailed);
              }}
            />
          )}
          {verificationError && (
            <FormFieldError>{verificationError}</FormFieldError>
          )}
        </section>

        {error && <FormFieldError>{error}</FormFieldError>}

        {hasUnverifiedSource && (
          <div
            className="text-afh-small text-amber-700"
            data-testid="source-tier-notice"
            role="status"
          >
            {t.sourceUnverified}
          </div>
        )}

        {success && (
          <div className="text-green-500 text-afh-small">{t.success}</div>
        )}

        <Button
          type="submit"
          className="w-full md:w-auto"
          disabled={loading || !type}
        >
          {loading ? t.submitting : t.submit}
        </Button>
      </form>
    </Card>
  );
}
