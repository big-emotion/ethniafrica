"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getLocalizedRoute } from "@/lib/routing";
import { Language } from "@/types/ethnicity";
import { getEthnicityKey } from "@/lib/entityKeys";
import { Users } from "lucide-react";

interface Subgroup {
  id: string;
  slug: string;
  name_fr: string;
  total_population?: number;
  percentage_in_africa?: number;
}

interface SubgroupsTableProps {
  subgroups: Subgroup[];
  language: Language;
}

export const SubgroupsTable = ({
  subgroups,
  language,
}: SubgroupsTableProps) => {
  const t = {
    en: {
      title: "Sub-groups",
      name: "Name",
      population: "Population",
      percentage: "% in Africa",
    },
    fr: {
      title: "Sous-groupes",
      name: "Nom",
      population: "Population",
      percentage: "% en Afrique",
    },
    es: {
      title: "Subgrupos",
      name: "Nombre",
      population: "Población",
      percentage: "% en África",
    },
    pt: {
      title: "Subgrupos",
      name: "Nome",
      population: "População",
      percentage: "% na África",
    },
  }[language];

  if (subgroups.length === 0) return null;

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(
      language === "en"
        ? "en-US"
        : language === "fr"
          ? "fr-FR"
          : language === "es"
            ? "es-ES"
            : "pt-PT"
    ).format(Math.round(num));
  };

  const formatPercent = (pct: number): string => {
    return `${pct.toFixed(2)}%`;
  };

  const ethnicitiesRoute = getLocalizedRoute(language, "ethnicities");

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" />
        {t.title}
      </h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.name}</TableHead>
              <TableHead className="text-right">{t.population}</TableHead>
              <TableHead className="text-right">{t.percentage}</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subgroups.map((subgroup) => {
              const ethnicityKey =
                getEthnicityKey(subgroup.name_fr) || subgroup.slug;
              const detailUrl = `${ethnicitiesRoute}?ethnicity=${encodeURIComponent(ethnicityKey)}`;

              return (
                <TableRow key={subgroup.id}>
                  <TableCell className="font-medium">
                    {subgroup.name_fr}
                  </TableCell>
                  <TableCell className="text-right">
                    {subgroup.total_population
                      ? formatNumber(subgroup.total_population)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {subgroup.percentage_in_africa
                      ? formatPercent(subgroup.percentage_in_africa)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={detailUrl}>
                      <Button variant="ghost" size="sm">
                        {language === "en"
                          ? "View"
                          : language === "fr"
                            ? "Voir"
                            : language === "es"
                              ? "Ver"
                              : "Ver"}
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
