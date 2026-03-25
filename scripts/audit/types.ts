// Shared audit types for AFRIK data quality auditing

export type EntityType = "country" | "people" | "languageFamily";
export type SectionStatus = "filled" | "empty" | "missing";
export type CompletenessGrade = "full" | "partial" | "empty";

export interface FileAuditResult {
  filePath: string;
  entityType: EntityType;
  entityId: string;
  parseSuccess: boolean;
  parseErrors: string[];
  parseWarnings: string[];
  sections: Record<string, SectionStatus>;
  completenessPercent: number; // 0-100
  grade: CompletenessGrade; // full >=80%, partial >=30%, empty <30%
}

export interface AuditSummary {
  totalFiles: number;
  byType: Record<
    EntityType,
    {
      total: number;
      full: number;
      partial: number;
      empty: number;
      parseFailures: number;
    }
  >;
}

export interface FailureRootCause {
  error: string;
  count: number;
  description: string;
  affectedFamilies: Array<{
    directory: string;
    count: number;
    textValue: string; // what the file actually says
    expectedValue: string; // what the parser expects (e.g. FLG_ATLANTIQUE)
  }>;
  fix: string;
}

export interface FailureAnalysis {
  totalFailures: number;
  byEntityType: Record<EntityType, number>;
  rootCauses: FailureRootCause[];
}

export interface AuditReport {
  generatedAt: string;
  summary: AuditSummary;
  files: FileAuditResult[];
  crossLayerGaps: CrossLayerGap[];
  failureAnalysis?: FailureAnalysis;
}

export interface CrossLayerGap {
  layer: "source-parser" | "parser-component" | "component-source";
  entityType: EntityType;
  field: string;
  severity: "high" | "medium" | "low";
  description: string;
}
