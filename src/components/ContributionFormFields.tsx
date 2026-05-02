"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Language } from "@/types/shared";

interface ContributionFormFieldsProps {
  type: string;
  language: Language;
  onDataChange: (data: Record<string, unknown>) => void;
}

interface EntityItem {
  id: string;
  name_main?: string;
  name_fr?: string;
  name_en?: string;
  language_family_id?: string;
}

type EntityCategory = "people" | "country" | "language_family";

function getEntityCategory(type: string): EntityCategory | null {
  if (type.includes("people")) return "people";
  if (type.includes("country")) return "country";
  if (type.includes("language_family")) return "language_family";
  return null;
}

export function ContributionFormFields({
  type,
  language,
  onDataChange,
}: ContributionFormFieldsProps) {
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [families, setFamilies] = useState<EntityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const category = getEntityCategory(type);
  const isUpdate = type.startsWith("update_");

  // Load entities for the current category
  useEffect(() => {
    const loadEntities = async () => {
      setLoading(true);
      try {
        if (category === "people") {
          const [peoplesRes, familiesRes] = await Promise.all([
            fetch("/api/contributions/entities/peoples"),
            fetch("/api/contributions/entities/language-families"),
          ]);
          const peoplesData = await peoplesRes.json();
          const familiesData = await familiesRes.json();
          setEntities(peoplesData.peoples || []);
          setFamilies(familiesData.families || []);
        } else if (category === "country") {
          const res = await fetch("/api/contributions/entities/countries");
          const data = await res.json();
          setEntities(data.countries || []);
        } else if (category === "language_family") {
          const res = await fetch(
            "/api/contributions/entities/language-families"
          );
          const data = await res.json();
          setEntities(data.families || []);
        }
      } catch (error) {
        console.error("Error loading entities:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEntities();
  }, [category]);

  // Load entity details when selected (for update types)
  useEffect(() => {
    if (!selectedEntityId || !isUpdate || !category) return;

    const loadEntityDetails = async () => {
      setLoading(true);
      try {
        let url = "";
        if (category === "people") {
          url = `/api/contributions/entities/people/${selectedEntityId}`;
        } else if (category === "country") {
          url = `/api/contributions/entities/country/${selectedEntityId}`;
        } else if (category === "language_family") {
          url = `/api/contributions/entities/language-family/${selectedEntityId}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setFormData(data);
          onDataChange(data);
        }
      } catch (error) {
        console.error("Error loading entity details:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEntityDetails();
  }, [selectedEntityId, isUpdate, category, onDataChange]);

  const updateField = (field: string, value: unknown) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onDataChange(newData);
  };

  const t = {
    en: {
      selectEntity: "Select entity to update",
      id: "ID",
      nameMain: "Main Name",
      nameFr: "Name (FR)",
      nameEn: "Name (EN)",
      etymology: "Etymology",
      nameOriginActor: "Naming Origin Actor",
      languageFamily: "Language Family",
      currentCountries: "Countries (comma-separated ISO codes)",
      loading: "Loading...",
    },
    fr: {
      selectEntity: "Sélectionner l'entité à modifier",
      id: "ID",
      nameMain: "Nom principal",
      nameFr: "Nom (FR)",
      nameEn: "Nom (EN)",
      etymology: "Étymologie",
      nameOriginActor: "Acteur à l'origine du nom",
      languageFamily: "Famille linguistique",
      currentCountries: "Pays (codes ISO séparés par des virgules)",
      loading: "Chargement...",
    },
    es: {
      selectEntity: "Seleccionar entidad a actualizar",
      id: "ID",
      nameMain: "Nombre principal",
      nameFr: "Nombre (FR)",
      nameEn: "Nombre (EN)",
      etymology: "Etimología",
      nameOriginActor: "Actor del origen del nombre",
      languageFamily: "Familia lingüística",
      currentCountries: "Países (códigos ISO separados por comas)",
      loading: "Cargando...",
    },
    pt: {
      selectEntity: "Selecionar entidade para atualizar",
      id: "ID",
      nameMain: "Nome principal",
      nameFr: "Nome (FR)",
      nameEn: "Nome (EN)",
      etymology: "Etimologia",
      nameOriginActor: "Ator na origem do nome",
      languageFamily: "Família linguística",
      currentCountries: "Países (códigos ISO separados por vírgulas)",
      loading: "Carregando...",
    },
  }[language];

  if (loading && Object.keys(formData).length === 0) {
    return <div className="text-sm text-gray-500">{t.loading}</div>;
  }

  const renderUpdateSelector = () => {
    if (!isUpdate) return null;

    const displayName = (entity: EntityItem) =>
      entity.name_main || entity.name_fr || entity.id;

    return (
      <div>
        <Label>{t.selectEntity}</Label>
        <Select
          value={selectedEntityId}
          onValueChange={(value) => {
            setSelectedEntityId(value);
            setFormData({});
          }}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder={t.selectEntity} />
          </SelectTrigger>
          <SelectContent>
            {entities.map((entity) => (
              <SelectItem key={entity.id} value={entity.id}>
                {displayName(entity)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderPeopleFields = () => (
    <div className="space-y-4">
      {!isUpdate && (
        <div>
          <Label htmlFor="id">{t.id} * (PPL_XXXXX)</Label>
          <Input
            id="id"
            value={(formData.id as string) || ""}
            onChange={(e) => updateField("id", e.target.value)}
            placeholder="PPL_EXAMPLE"
            required
          />
        </div>
      )}
      {isUpdate && (
        <div>
          <Label htmlFor="id">{t.id}</Label>
          <Input
            id="id"
            value={(formData.id as string) || ""}
            disabled
            className="bg-gray-100 cursor-not-allowed"
          />
        </div>
      )}
      <div>
        <Label htmlFor="name_main">{t.nameMain} *</Label>
        <Input
          id="name_main"
          value={(formData.name_main as string) || ""}
          onChange={(e) => updateField("name_main", e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="language_family_id">{t.languageFamily}</Label>
        <Select
          value={(formData.language_family_id as string) || "none"}
          onValueChange={(value) =>
            updateField("language_family_id", value === "none" ? null : value)
          }
        >
          <SelectTrigger id="language_family_id">
            <SelectValue placeholder={t.languageFamily} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-</SelectItem>
            {families.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name_fr || f.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="current_countries">{t.currentCountries}</Label>
        <Input
          id="current_countries"
          value={
            Array.isArray(formData.current_countries)
              ? (formData.current_countries as string[]).join(", ")
              : (formData.current_countries as string) || ""
          }
          onChange={(e) =>
            updateField(
              "current_countries",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          placeholder="CMR, NGA, GHA"
        />
      </div>
    </div>
  );

  const renderCountryFields = () => (
    <div className="space-y-4">
      {!isUpdate && (
        <div>
          <Label htmlFor="id">{t.id} * (ISO 3166-1 alpha-3)</Label>
          <Input
            id="id"
            value={(formData.id as string) || ""}
            onChange={(e) => updateField("id", e.target.value.toUpperCase())}
            placeholder="CMR"
            maxLength={3}
            required
          />
        </div>
      )}
      {isUpdate && (
        <div>
          <Label htmlFor="id">{t.id}</Label>
          <Input
            id="id"
            value={(formData.id as string) || ""}
            disabled
            className="bg-gray-100 cursor-not-allowed"
          />
        </div>
      )}
      <div>
        <Label htmlFor="name_fr">{t.nameFr} *</Label>
        <Input
          id="name_fr"
          value={(formData.name_fr as string) || ""}
          onChange={(e) => updateField("name_fr", e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="etymology">{t.etymology}</Label>
        <Input
          id="etymology"
          value={(formData.etymology as string) || ""}
          onChange={(e) => updateField("etymology", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="name_origin_actor">{t.nameOriginActor}</Label>
        <Input
          id="name_origin_actor"
          value={(formData.name_origin_actor as string) || ""}
          onChange={(e) => updateField("name_origin_actor", e.target.value)}
        />
      </div>
    </div>
  );

  const renderLanguageFamilyFields = () => (
    <div className="space-y-4">
      {!isUpdate && (
        <div>
          <Label htmlFor="id">{t.id} * (FLG_XXXXX)</Label>
          <Input
            id="id"
            value={(formData.id as string) || ""}
            onChange={(e) => updateField("id", e.target.value)}
            placeholder="FLG_EXAMPLE"
            required
          />
        </div>
      )}
      {isUpdate && (
        <div>
          <Label htmlFor="id">{t.id}</Label>
          <Input
            id="id"
            value={(formData.id as string) || ""}
            disabled
            className="bg-gray-100 cursor-not-allowed"
          />
        </div>
      )}
      <div>
        <Label htmlFor="name_fr">{t.nameFr} *</Label>
        <Input
          id="name_fr"
          value={(formData.name_fr as string) || ""}
          onChange={(e) => updateField("name_fr", e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="name_en">{t.nameEn}</Label>
        <Input
          id="name_en"
          value={(formData.name_en as string) || ""}
          onChange={(e) => updateField("name_en", e.target.value)}
        />
      </div>
    </div>
  );

  const renderFields = () => {
    if (isUpdate && !selectedEntityId) return null;

    if (category === "people") return renderPeopleFields();
    if (category === "country") return renderCountryFields();
    if (category === "language_family") return renderLanguageFamilyFields();
    return null;
  };

  return (
    <div className="space-y-4">
      {renderUpdateSelector()}
      {renderFields()}
    </div>
  );
}
