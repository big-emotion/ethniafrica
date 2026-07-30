import {
  assertionSourceReferenceSchema,
  sourceRecordSchema,
  toAssertionSourceReference,
  toStructuredSourceRecord,
} from "@/lib/sources/source-model";
import type {
  AssertionSourceReference,
  StructuredSourceRecord,
} from "@/types/sources";

export interface SourceParseFieldError {
  path: string;
  message: string;
}

export interface ParsedSourceFile {
  success: boolean;
  data?: StructuredSourceRecord;
  errors?: SourceParseFieldError[];
}

export interface ParsedAssertionSourceReference {
  success: boolean;
  data?: AssertionSourceReference;
  errors?: SourceParseFieldError[];
}

function parseErrors(issues: { path: (string | number)[]; message: string }[]) {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function parseSourceFile(raw: unknown): ParsedSourceFile {
  const result = sourceRecordSchema.safeParse(raw);

  if (!result.success) {
    return { success: false, errors: parseErrors(result.error.issues) };
  }

  return { success: true, data: toStructuredSourceRecord(result.data) };
}

export function parseAssertionSourceReference(
  raw: unknown
): ParsedAssertionSourceReference {
  const result = assertionSourceReferenceSchema.safeParse(raw);

  if (!result.success) {
    return { success: false, errors: parseErrors(result.error.issues) };
  }

  return { success: true, data: toAssertionSourceReference(result.data) };
}
