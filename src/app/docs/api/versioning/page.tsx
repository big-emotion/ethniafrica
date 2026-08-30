import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarClock, GitBranch, Info } from "lucide-react";

import { Card } from "@/components/ui/card";

// @req REQ-037
export const metadata: Metadata = {
  title: "Versionnement de l'API — EthniAfrica",
  description:
    "Ce qu'une version majeure engage, ce qui peut changer sans préavis, et le délai garanti avant le retrait d'un endpoint.",
};

/**
 * The promise `/api/v2` makes to the integrations built on it.
 *
 * A server component: the page is prose and a table, so nothing here needs to
 * reach the browser as JavaScript — unlike the two sibling pages, which mount
 * Swagger UI.
 */

interface HeaderContract {
  name: string;
  value: string;
  meaning: string;
}

const RESPONSE_HEADERS: HeaderContract[] = [
  {
    name: "X-API-Version",
    value: "2",
    meaning:
      "La version majeure qui a répondu. Toujours présente, y compris sur une erreur.",
  },
  {
    name: "X-API-Stable",
    value: "true",
    meaning:
      "La version est publiée et tenue. Une version instable serait annoncée comme telle avant d'être ouverte.",
  },
  {
    name: "Deprecation",
    value: "true",
    meaning:
      "L'endpoint appelé est voué au retrait. Absent tant qu'il ne l'est pas.",
  },
  {
    name: "Sunset",
    value: "Mon, 01 Mar 2027 00:00:00 GMT",
    meaning:
      "La date à laquelle l'endpoint cessera de répondre. Toujours au moins six mois après l'apparition de Deprecation.",
  },
  {
    name: "Link",
    value: '<…/docs/api/versioning>; rel="sunset"',
    meaning:
      "Où lire ce qu'il faut appeler à la place. Accompagne systématiquement Sunset.",
  },
];

// @req REQ-037
export default function ApiVersioningPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-4">
          <Link
            href="/docs/api"
            className="inline-flex items-center gap-2 text-afh-small text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Documentation de l&apos;API
          </Link>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <GitBranch className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-afh-h1 font-display font-bold">
                Versionnement de l&apos;API
              </h1>
              <p className="text-muted-foreground mt-1">
                Ce qui peut changer, ce qui ne changera pas sans préavis, et
                combien de temps vous avez pour réagir.
              </p>
            </div>
          </div>
        </div>

        <Card className="p-6 space-y-3">
          <h2 className="text-afh-h2 font-semibold">
            Une majeure est un segment d&apos;URL
          </h2>
          <p className="text-afh-small text-muted-foreground">
            La version majeure figure dans le chemin :{" "}
            <code className="font-mono">/api/v2</code> aujourd&apos;hui,{" "}
            <code className="font-mono">/api/v3</code> le jour où une évolution
            ne pourra plus être rétrocompatible. C&apos;est la seule chose qui
            puisse casser une intégration, et elle est visible dans chaque URL
            que vous appelez.
          </p>
          <p className="text-afh-small text-muted-foreground">
            Une majeure publiée n&apos;est jamais modifiée de façon cassante :
            un champ n&apos;est ni supprimé, ni renommé, ni changé de type ; un
            identifiant reste stable ; une valeur d&apos;énumération n&apos;est
            pas réaffectée. Ces changements attendent la majeure suivante.
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-afh-h2 font-semibold">
            Les ajouts, eux, arrivent sans préavis
          </h2>
          <p className="text-afh-small text-muted-foreground">
            À l&apos;intérieur d&apos;une majeure, nous ajoutons librement : de
            nouveaux champs dans une réponse existante, de nouveaux endpoints,
            de nouveaux paramètres de requête facultatifs. Aucun de ces ajouts
            n&apos;est annoncé, parce qu&apos;aucun ne casse un client
            correctement écrit.
          </p>
          <p className="text-afh-small text-muted-foreground">
            La contrepartie est à votre charge : votre client doit{" "}
            <strong>tolérer les champs inconnus</strong> plutôt que rejeter la
            réponse qui les contient. Un parseur strict, qui échoue sur une clé
            qu&apos;il ne connaît pas, cassera sur un ajout que cette politique
            autorise explicitement.
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-start gap-3">
            <CalendarClock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-3">
              <h2 className="text-afh-h2 font-semibold">
                Six mois avant tout retrait
              </h2>
              <p className="text-afh-small text-muted-foreground">
                Quand un endpoint est voué au retrait, il commence à répondre
                avec l&apos;en-tête{" "}
                <code className="font-mono">Deprecation</code> et la date de son
                retrait. Il s&apos;écoule <strong>au minimum six mois</strong>{" "}
                entre cette première réponse et la date annoncée. Pendant tout
                ce délai l&apos;endpoint continue de fonctionner normalement.
              </p>
              <p className="text-afh-small text-muted-foreground">
                Ce délai est la raison d&apos;être des en-têtes : une
                intégration qui les journalise apprend le retrait le jour où il
                est décidé, sans avoir à surveiller cette page.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-afh-h2 font-semibold">
            Les en-têtes de chaque réponse
          </h2>
          <p className="text-afh-small text-muted-foreground">
            Les trois derniers suivent la{" "}
            <a
              href="https://www.rfc-editor.org/rfc/rfc8594"
              className="text-primary underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              RFC 8594
            </a>
            . Ils n&apos;apparaissent que sur un endpoint effectivement voué au
            retrait.
          </p>

          {/* The table cannot shrink below its content; it scrolls in its own
              box so the page itself never scrolls sideways at 430px. */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-afh-small border-collapse">
              <caption className="sr-only">
                En-têtes de versionnement des réponses de l&apos;API v2
              </caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    En-tête
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Exemple
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Ce qu&apos;il dit
                  </th>
                </tr>
              </thead>
              <tbody>
                {RESPONSE_HEADERS.map((header) => (
                  <tr key={header.name} className="border-b border-border/50">
                    <th
                      scope="row"
                      className="py-3 pr-4 font-mono font-normal align-top whitespace-nowrap"
                    >
                      {header.name}
                    </th>
                    <td className="py-3 pr-4 font-mono align-top whitespace-nowrap text-muted-foreground">
                      {header.value}
                    </td>
                    <td className="py-3 align-top text-muted-foreground min-w-[16rem]">
                      {header.meaning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-3">
              <h2 className="text-afh-h2 font-semibold">
                Ce que reçoit un appel vers un endpoint retiré à terme
              </h2>
              <div className="overflow-x-auto">
                <pre className="text-afh-caption font-mono bg-muted/50 rounded-md p-4">
                  {`X-API-Version: 2
X-API-Stable: true
Deprecation: true
Sunset: Mon, 01 Mar 2027 00:00:00 GMT
Link: <https://africahistory.org/docs/api/versioning>; rel="sunset"`}
                </pre>
              </div>
              <p className="text-afh-small text-muted-foreground">
                Les deux premiers en-têtes sont présents sur{" "}
                <strong>toutes</strong> les réponses de{" "}
                <code className="font-mono">/api/v2</code>, y compris les
                erreurs — une 401 sans clé valide et une 429 de limitation de
                débit les portent aussi.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
