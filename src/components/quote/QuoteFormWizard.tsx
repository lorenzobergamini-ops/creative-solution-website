"use client";

/**
 * Quote form wizard (milestone M3) — 5 steps, React Hook Form + Zod.
 *
 * All UI text is Italian; comments in English. The client validates for UX,
 * the server ALWAYS re-validates every action (src/app/actions/quote.ts).
 *
 * Degradation without credentials: server actions return a clear message
 * ("configurazione non disponibile") and the wizard shows it; everything else
 * (steps, validation, review, success state) works with no database.
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { z } from "zod";
import {
  CONTACT_PREFERENCES,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH,
  quoteFormSchema,
  type QuoteFileDescriptor,
} from "@/lib/validations/quote";
import {
  getFileExtension,
  MAX_REFERENCE_FILES,
  validateUploadFile,
} from "@/lib/upload";
import {
  completeQuoteUpload,
  createQuoteRequest,
  createSignedUploadUrls,
} from "@/app/actions/quote";
import { TurnstileWidget } from "./TurnstileWidget";

export interface QuoteFormWizardProps {
  initialTitle?: string;
  maxFileSizeMb: number;
  allowedExtensions: string[];
  materials: string[];
  turnstileSiteKey: string | null;
}

const TOTAL_STEPS = 5;
const STEP_LABELS = [
  "Contatti",
  "Il progetto",
  "File 3D",
  "Riferimenti",
  "Riepilogo",
] as const;

const CONTACT_PREFERENCE_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Telefono",
  whatsapp: "WhatsApp",
};

/** Shared input style — design system: sharp corners, no gradient/glass. */
const FIELD_CLASS =
  "w-full border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none";
const LABEL_CLASS = "mb-2 block text-sm font-medium text-foreground";

// ---------------------------------------------------------------------------
// Wizard schema = shared server schema + transient client-only fields
// ---------------------------------------------------------------------------
const fileSchema = z.instanceof(File, { message: "Il file non è valido." });

const wizardSchema = quoteFormSchema
  .extend({
    modelFile: z.union([fileSchema, z.null()]),
    referenceFiles: z
      .array(fileSchema)
      .max(MAX_REFERENCE_FILES, `Massimo ${MAX_REFERENCE_FILES} immagini.`),
    turnstileToken: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    // Drive/WeTransfer link is the fallback when no 3D file is attached.
    if (
      values.has3dFile &&
      values.modelFile === null &&
      !(values.driveLink ?? "").trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["modelFile"],
        message: "Aggiungi il file 3D oppure incolla un link di condivisione.",
      });
    }
  });

type WizardValues = z.infer<typeof wizardSchema>;

/** Fields validated when the user clicks "Avanti" on each step. */
const STEP_FIELDS: (keyof WizardValues)[][] = [
  ["clientName", "clientEmail", "clientPhone", "contactPreference"],
  [
    "projectTitle",
    "description",
    "quantity",
    "material",
    "color",
    "deadline",
    "notes",
  ],
  ["has3dFile", "driveLink", "modelFile"],
  ["referenceFiles"],
  ["rightsConfirmed", "privacyAccepted"],
];

// ---------------------------------------------------------------------------
// Submit/upload state machine
// ---------------------------------------------------------------------------

interface UploadItem {
  file: File;
  descriptor: QuoteFileDescriptor;
}

type SubmitState =
  | { phase: "idle" }
  | { phase: "saving" }
  | {
      phase: "uploading";
      currentFile: string | null;
      progress: Record<number, number>;
    }
  | { phase: "success"; quoteRequestId: string }
  | { phase: "partial"; quoteRequestId: string; message: string }
  | { phase: "error"; message: string };

function toDescriptor(
  file: File,
  fileType: "model" | "reference",
): QuoteFileDescriptor {
  return {
    originalName: file.name,
    sizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    extension: getFileExtension(file.name),
    fileType,
  };
}

/**
 * Direct upload to the signed URL via XHR (progress reporting). The signed
 * URL was issued by the server action against the private 'quote-files'
 * bucket and already contains the token.
 */
function uploadFileToSignedUrl(
  file: File,
  signedUrl: string,
  onProgress: (percent: number) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true });
      } else {
        resolve({ ok: false, error: `Upload fallito (HTTP ${xhr.status}).` });
      }
    };
    xhr.onerror = () =>
      resolve({
        ok: false,
        error:
          "Errore di rete durante l'upload. Controlla la connessione e riprova.",
      });
    xhr.onabort = () => resolve({ ok: false, error: "Upload interrotto." });
    xhr.send(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuoteFormWizard({
  initialTitle,
  maxFileSizeMb,
  allowedExtensions,
  materials,
  turnstileSiteKey,
}: QuoteFormWizardProps) {
  const [step, setStep] = useState(0);
  const [modelFileError, setModelFileError] = useState<string | null>(null);
  const [referenceFileError, setReferenceFileError] = useState<string | null>(
    null,
  );
  const [submit, setSubmit] = useState<SubmitState>({ phase: "idle" });
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  /** Object URLs for the reference-image previews, kept in sync with the files. */
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  /** Files of the last (re)try, kept for the retry flow and the UI. */
  const [pendingUpload, setPendingUpload] = useState<{
    quoteRequestId: string;
    items: UploadItem[];
  } | null>(null);

  const form = useForm<WizardValues>({
    resolver: zodResolver(wizardSchema),
    mode: "onTouched",
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      contactPreference: "email",
      projectTitle: initialTitle ?? "",
      description: "",
      quantity: 1,
      material: "",
      color: "",
      deadline: "",
      notes: "",
      has3dFile: false,
      driveLink: "",
      rightsConfirmed: false,
      privacyAccepted: false,
      modelFile: null,
      referenceFiles: [],
      turnstileToken: "",
    },
  });

  const {
    register,
    trigger,
    setValue,
    getValues,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  const has3dFile = useWatch({ control, name: "has3dFile" });
  const modelFile = useWatch({ control, name: "modelFile" });
  const referenceFiles = useWatch({ control, name: "referenceFiles" });

  // ----- file handlers ------------------------------------------------------

  const addModelFile = useCallback(
    (list: FileList | null) => {
      const file = list?.[0];
      if (!file) return;
      const validation = validateUploadFile(file, "model", {
        maxSizeMb: maxFileSizeMb,
        allowedExtensions,
      });
      if (!validation.ok) {
        setModelFileError(validation.error);
        return;
      }
      setModelFileError(null);
      setValue("modelFile", file, { shouldValidate: true, shouldDirty: true });
      setValue("driveLink", "", { shouldValidate: true, shouldDirty: true });
    },
    [maxFileSizeMb, allowedExtensions, setValue],
  );

  const removeModelFile = useCallback(() => {
    setValue("modelFile", null, { shouldValidate: true, shouldDirty: true });
  }, [setValue]);

  /** Sets referenceFiles and keeps the preview URL list in sync (revokes stale URLs). */
  const setReferenceFiles = useCallback(
    (files: File[]) => {
      const nextPreviews = files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }));
      setPreviews((previous) => {
        for (const preview of previous) {
          if (!nextPreviews.some((next) => next.file === preview.file)) {
            URL.revokeObjectURL(preview.url);
          }
        }
        return nextPreviews;
      });
      setValue("referenceFiles", files, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [setValue],
  );

  const addReferenceFiles = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      const current = getValues("referenceFiles");
      const accepted: File[] = [...current];
      const problems: string[] = [];
      for (const file of Array.from(list)) {
        if (accepted.length >= MAX_REFERENCE_FILES) {
          problems.push(`Massimo ${MAX_REFERENCE_FILES} immagini.`);
          break;
        }
        const validation = validateUploadFile(file, "reference", {
          maxSizeMb: maxFileSizeMb,
        });
        if (!validation.ok) {
          problems.push(`${file.name}: ${validation.error}`);
        } else {
          accepted.push(file);
        }
      }
      setReferenceFileError(problems.length > 0 ? problems.join(" ") : null);
      setReferenceFiles(accepted);
    },
    [getValues, maxFileSizeMb, setReferenceFiles],
  );

  const removeReferenceFile = useCallback(
    (index: number) => {
      const next = getValues("referenceFiles").filter(
        (_file, i) => i !== index,
      );
      setReferenceFiles(next);
    },
    [getValues, setReferenceFiles],
  );

  // ----- navigation ---------------------------------------------------------

  const goNext = useCallback(async () => {
    const valid = await trigger(STEP_FIELDS[step] as FieldPath<WizardValues>[]);
    if (valid) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step, trigger]);

  const goBack = useCallback(() => {
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ----- Turnstile token ----------------------------------------------------

  const onTurnstileToken = useCallback(
    (token: string) => {
      setValue("turnstileToken", token, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue],
  );

  // ----- upload pipeline ----------------------------------------------------

  const runUpload = useCallback(
    async (quoteRequestId: string, items: UploadItem[]) => {
      setSubmit({ phase: "uploading", currentFile: null, progress: {} });
      const urlsResult = await createSignedUploadUrls(
        quoteRequestId,
        items.map((item) => item.descriptor),
      );
      if (!urlsResult.ok) {
        setPendingUpload({ quoteRequestId, items });
        setSubmit({
          phase: "partial",
          quoteRequestId,
          message: urlsResult.error,
        });
        return;
      }
      const signedFiles = urlsResult.files;

      const targetsByIndex = new Map(
        signedFiles.map((target) => [target.index, target]),
      );
      const storagePaths: string[] = [];
      const failures: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const target = targetsByIndex.get(i);
        if (!target) {
          failures.push(item.file.name);
          continue;
        }
        setSubmit((prev) =>
          prev.phase === "uploading"
            ? { ...prev, currentFile: item.file.name }
            : prev,
        );
        const upload = await uploadFileToSignedUrl(
          item.file,
          target.signedUrl,
          (percent) => {
            setSubmit((prev) =>
              prev.phase === "uploading"
                ? { ...prev, progress: { ...prev.progress, [i]: percent } }
                : prev,
            );
          },
        );
        if (upload.ok) {
          storagePaths.push(target.storagePath);
        } else {
          failures.push(`${item.file.name} (${upload.error})`);
        }
      }

      if (failures.length > 0) {
        setPendingUpload({ quoteRequestId, items });
        setSubmit({
          phase: "partial",
          quoteRequestId,
          message: `Alcuni file non sono stati caricati: ${failures.join(", ")}. Puoi riprovare l'upload.`,
        });
        return;
      }

      const completed = await completeQuoteUpload(quoteRequestId, storagePaths);
      if (!completed.ok) {
        setPendingUpload({ quoteRequestId, items });
        setSubmit({
          phase: "partial",
          quoteRequestId,
          message: completed.error,
        });
        return;
      }

      setPendingUpload(null);
      setSubmit({ phase: "success", quoteRequestId });
    },
    [],
  );

  const retryUpload = useCallback(() => {
    if (!pendingUpload) return;
    void runUpload(pendingUpload.quoteRequestId, pendingUpload.items);
  }, [pendingUpload, runUpload]);

  // ----- submit -------------------------------------------------------------

  const onSubmit = handleSubmit(async (values) => {
    if (turnstileSiteKey && !(values.turnstileToken ?? "").trim()) {
      setSubmit({
        phase: "error",
        message: "Completa la verifica anti-bot prima di inviare.",
      });
      return;
    }

    const items: UploadItem[] = [];
    if (values.modelFile) {
      items.push({
        file: values.modelFile,
        descriptor: toDescriptor(values.modelFile, "model"),
      });
    }
    for (const reference of values.referenceFiles) {
      items.push({
        file: reference,
        descriptor: toDescriptor(reference, "reference"),
      });
    }

    const payload = {
      clientName: values.clientName,
      clientEmail: values.clientEmail,
      clientPhone: values.clientPhone,
      contactPreference: values.contactPreference,
      projectTitle: values.projectTitle,
      description: values.description,
      quantity: values.quantity,
      material: values.material,
      color: values.color,
      deadline: values.deadline,
      notes: values.notes,
      has3dFile: values.has3dFile,
      driveLink: values.driveLink,
      rightsConfirmed: values.rightsConfirmed,
      privacyAccepted: values.privacyAccepted,
    };

    setSubmit({ phase: "saving" });
    const created = await createQuoteRequest({
      ...payload,
      turnstileToken: values.turnstileToken?.trim() || undefined,
    });
    if (!created.ok) {
      setTurnstileResetKey((key) => key + 1);
      setSubmit({ phase: "error", message: created.error });
      return;
    }

    setUploadItems(items);
    if (items.length === 0) {
      setPendingUpload(null);
      setSubmit({ phase: "success", quoteRequestId: created.quoteRequestId });
      return;
    }
    setPendingUpload({
      quoteRequestId: created.quoteRequestId,
      items,
    });
    await runUpload(created.quoteRequestId, items);
  });

  const busy =
    submit.phase === "saving" || submit.phase === "uploading";
  const percent = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  const fieldError = (name: keyof WizardValues, id: string) => {
    const message = errors[name]?.message;
    return message ? (
      <p id={id} role="alert" className="mt-1.5 text-xs text-error">
        {message}
      </p>
    ) : null;
  };

  // =========================================================================
  // Success / partial / error screens
  // =========================================================================
  if (submit.phase === "success") {
    return (
      <div className="mx-auto max-w-2xl border border-accent bg-surface p-8 md:p-10">
        <p className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Richiesta inviata!
        </p>
        <p className="mt-4 text-base leading-relaxed text-foreground">
          Ti ricontatteremo con un preventivo personalizzato.
        </p>
        <p className="mt-6 border border-border bg-background px-4 py-3 text-sm text-muted">
          Numero richiesta:{" "}
          <span className="font-mono text-accent">
            {submit.quoteRequestId}
          </span>
        </p>
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-foreground">
            Cosa succede ora
          </h2>
          <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted">
            <li>
              Il team esamina la richiesta e i file allegati, poi prepara un
              preventivo personalizzato.
            </li>
            <li>
              Ti contatteremo usando il canale che hai scelto (email,
              telefono o WhatsApp).
            </li>
            <li>
              Per domande urgenti puoi usare la pagina{" "}
              <Link href="/contatti" className="text-accent underline">
                Contatti
              </Link>
              .
            </li>
          </ul>
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-accent px-6 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] text-background transition-colors hover:bg-foreground hover:text-background"
          >
            Torna alla home
          </Link>
          <Link
            href="/galleria"
            className="inline-flex items-center justify-center border border-border px-6 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Vedi la galleria
          </Link>
        </div>
      </div>
    );
  }

  if (submit.phase === "partial") {
    return (
      <div className="mx-auto max-w-2xl border border-border bg-surface p-8 md:p-10">
        <p className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Richiesta salvata, upload da completare
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          La tua richiesta è stata salvata con numero{" "}
          <span className="font-mono text-accent">{submit.quoteRequestId}</span>
          , ma alcuni file non sono ancora arrivati.
        </p>
        <p role="alert" className="mt-4 border border-dashed border-border bg-background px-4 py-3 text-sm text-foreground">
          {submit.message}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={retryUpload}
            className="inline-flex items-center justify-center bg-accent px-6 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] text-background transition-colors hover:bg-foreground hover:text-background"
          >
            Riprova upload
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center border border-border px-6 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Torna alla home
          </Link>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted">
          Puoi chiudere la pagina: la richiesta resta salvata. Se preferisci,
          invia il file 3D separatamente e cita il numero richiesta.
        </p>
      </div>
    );
  }

  if (submit.phase === "error") {
    return (
      <div className="mx-auto max-w-2xl border border-border bg-surface p-8 md:p-10">
        <p className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Invio non riuscito
        </p>
        <p role="alert" className="mt-4 border border-dashed border-border bg-background px-4 py-3 text-sm text-foreground">
          {submit.message}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => setSubmit({ phase: "idle" })}
            className="inline-flex items-center justify-center bg-accent px-6 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] text-background transition-colors hover:bg-foreground hover:text-background"
          >
            Torna al modulo
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Wizard
  // =========================================================================
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mx-auto max-w-3xl border border-border bg-surface p-6 md:p-10"
    >
      {/* Progress */}
      <div className="mb-10">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
            Passo {step + 1} di {TOTAL_STEPS}{" "}
            <span className="text-muted">— {STEP_LABELS[step]}</span>
          </p>
          <p className="text-sm font-medium text-accent">{percent}%</p>
        </div>
        <div
          role="progressbar"
          aria-label="Avanzamento del modulo"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-3 h-1.5 w-full bg-border"
        >
          <div className="h-full bg-accent transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* Step 1 — Contatti */}
      {step === 0 && (
        <fieldset className="flex flex-col gap-6">
          <legend className="sr-only">I tuoi contatti</legend>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            I tuoi contatti
          </h2>

          <div>
            <label htmlFor="clientName" className={LABEL_CLASS}>
              Nome <span className="text-accent">*</span>
            </label>
            <input
              id="clientName"
              type="text"
              autoComplete="name"
              placeholder="Come ti chiami?"
              aria-invalid={Boolean(errors.clientName)}
              aria-describedby={errors.clientName ? "clientName-error" : undefined}
              className={FIELD_CLASS}
              {...register("clientName")}
            />
            {fieldError("clientName", "clientName-error")}
          </div>

          <div>
            <label htmlFor="clientEmail" className={LABEL_CLASS}>
              Email <span className="text-accent">*</span>
            </label>
            <input
              id="clientEmail"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nome@esempio.it"
              aria-invalid={Boolean(errors.clientEmail)}
              aria-describedby={errors.clientEmail ? "clientEmail-error" : undefined}
              className={FIELD_CLASS}
              {...register("clientEmail")}
            />
            {fieldError("clientEmail", "clientEmail-error")}
          </div>

          <div>
            <label htmlFor="clientPhone" className={LABEL_CLASS}>
              Telefono{" "}
              <span className="font-normal text-muted">(facoltativo)</span>
            </label>
            <input
              id="clientPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+39 …"
              aria-invalid={Boolean(errors.clientPhone)}
              aria-describedby={errors.clientPhone ? "clientPhone-error" : undefined}
              className={FIELD_CLASS}
              {...register("clientPhone")}
            />
            {fieldError("clientPhone", "clientPhone-error")}
          </div>

          <div>
            <label htmlFor="contactPreference" className={LABEL_CLASS}>
              Come preferisci essere ricontattato?{" "}
              <span className="text-accent">*</span>
            </label>
            <select
              id="contactPreference"
              className={FIELD_CLASS}
              aria-invalid={Boolean(errors.contactPreference)}
              {...register("contactPreference")}
            >
              {CONTACT_PREFERENCES.map((preference) => (
                <option key={preference} value={preference}>
                  {CONTACT_PREFERENCE_LABELS[preference]}
                </option>
              ))}
            </select>
            {fieldError("contactPreference", "contactPreference-error")}
          </div>
        </fieldset>
      )}

      {/* Step 2 — Il progetto */}
      {step === 1 && (
        <fieldset className="flex flex-col gap-6">
          <legend className="sr-only">Dettagli del progetto</legend>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Il progetto
          </h2>

          <div>
            <label htmlFor="projectTitle" className={LABEL_CLASS}>
              Titolo del progetto <span className="text-accent">*</span>
            </label>
            <input
              id="projectTitle"
              type="text"
              placeholder="Es. Bracket per stampante 3D"
              aria-invalid={Boolean(errors.projectTitle)}
              aria-describedby={errors.projectTitle ? "projectTitle-error" : undefined}
              className={FIELD_CLASS}
              {...register("projectTitle")}
            />
            {fieldError("projectTitle", "projectTitle-error")}
          </div>

          <div>
            <label htmlFor="description" className={LABEL_CLASS}>
              Descrizione del progetto <span className="text-accent">*</span>
            </label>
            <textarea
              id="description"
              rows={6}
              placeholder="Spiega cosa vuoi realizzare: forma, funzione, misure indicative, uso previsto…"
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "description-error" : undefined}
              className={`${FIELD_CLASS} resize-y`}
              {...register("description")}
            />
            <div className="mt-1 flex items-start justify-between gap-4">
              {fieldError("description", "description-error")}
              <span className="ml-auto text-xs text-muted">
                min 20 caratteri · max {MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="quantity" className={LABEL_CLASS}>
                Quantità <span className="text-accent">*</span>
              </label>
              <input
                id="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={1000}
                aria-invalid={Boolean(errors.quantity)}
                aria-describedby={errors.quantity ? "quantity-error" : undefined}
                className={FIELD_CLASS}
                {...register("quantity", { valueAsNumber: true })}
              />
              {fieldError("quantity", "quantity-error")}
            </div>

            <div>
              <label htmlFor="material" className={LABEL_CLASS}>
                Materiale{" "}
                <span className="font-normal text-muted">(facoltativo)</span>
              </label>
              <input
                id="material"
                type="text"
                list="materials-list"
                placeholder="Es. PLA, PETG, Resina…"
                aria-invalid={Boolean(errors.material)}
                aria-describedby={errors.material ? "material-error" : undefined}
                className={FIELD_CLASS}
                {...register("material")}
              />
              <datalist id="materials-list">
                {materials.map((material) => (
                  <option key={material} value={material} />
                ))}
              </datalist>
              {fieldError("material", "material-error")}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="color" className={LABEL_CLASS}>
                Colore{" "}
                <span className="font-normal text-muted">(facoltativo)</span>
              </label>
              <input
                id="color"
                type="text"
                placeholder="Es. Nero, bianco, grigio…"
                aria-invalid={Boolean(errors.color)}
                aria-describedby={errors.color ? "color-error" : undefined}
                className={FIELD_CLASS}
                {...register("color")}
              />
              {fieldError("color", "color-error")}
            </div>

            <div>
              <label htmlFor="deadline" className={LABEL_CLASS}>
                Scadenza{" "}
                <span className="font-normal text-muted">(facoltativa)</span>
              </label>
              <input
                id="deadline"
                type="text"
                placeholder="Es. Servirebbe entro fine mese"
                aria-invalid={Boolean(errors.deadline)}
                aria-describedby={errors.deadline ? "deadline-error" : undefined}
                className={FIELD_CLASS}
                {...register("deadline")}
              />
              {fieldError("deadline", "deadline-error")}
            </div>
          </div>

          <div>
            <label htmlFor="notes" className={LABEL_CLASS}>
              Note aggiuntive{" "}
              <span className="font-normal text-muted">(facoltative)</span>
            </label>
            <textarea
              id="notes"
              rows={4}
              placeholder="Altre informazioni utili…"
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "notes-error" : undefined}
              className={`${FIELD_CLASS} resize-y`}
              {...register("notes")}
            />
            <div className="mt-1 flex items-start justify-between gap-4">
              {fieldError("notes", "notes-error")}
              <span className="ml-auto text-xs text-muted">
                max {MAX_NOTES_LENGTH} caratteri
              </span>
            </div>
          </div>
        </fieldset>
      )}

      {/* Step 3 — File 3D */}
      {step === 2 && (
        <fieldset className="flex flex-col gap-6">
          <legend className="sr-only">File 3D</legend>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Hai già un file 3D?
          </h2>

          <div className="flex flex-col gap-3 md:flex-row md:gap-6">
            <label className="flex cursor-pointer items-center gap-3 border border-border bg-background px-5 py-4 has-[:checked]:border-accent">
              <input
                type="radio"
                value="true"
                className="h-4 w-4 accent-[var(--accent)]"
                {...register("has3dFile", { setValueAs: (value) => value === "true" })}
              />
              <span className="text-sm font-medium text-foreground">Sì</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 border border-border bg-background px-5 py-4 has-[:checked]:border-accent">
              <input
                type="radio"
                value="false"
                className="h-4 w-4 accent-[var(--accent)]"
                {...register("has3dFile", { setValueAs: (value) => value === "true" })}
              />
              <span className="text-sm font-medium text-foreground">
                No, avete solo le specifiche
              </span>
            </label>
          </div>

          {has3dFile && (
            <div className="flex flex-col gap-6 border-t border-border pt-6">
              <div>
                <p className={LABEL_CLASS}>
                  File 3D modello (STL, OBJ, 3MF o ZIP){" "}
                  <span className="font-normal text-muted">
                    — max {maxFileSizeMb} MB
                  </span>
                </p>

                {modelFile ? (
                  <div className="flex items-center justify-between gap-4 border border-border bg-background px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        {modelFile.name}
                      </p>
                      <p className="text-xs text-muted">
                        {formatBytes(modelFile.size)} · .{getFileExtension(modelFile.name)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeModelFile}
                      className="shrink-0 text-xs font-semibold uppercase tracking-[0.15em] text-error hover:text-foreground"
                    >
                      Rimuovi
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="modelFile"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      addModelFile(event.dataTransfer.files);
                    }}
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-background px-4 py-10 text-center transition-colors hover:border-accent focus-within:border-accent"
                  >
                    <input
                      id="modelFile"
                      type="file"
                      className="sr-only"
                      accept={allowedExtensions.map((ext) => `.${ext}`).join(",")}
                      onChange={(event) => addModelFile(event.target.files)}
                    />
                    <span className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-foreground">
                      Scegli o trascina il file
                    </span>
                    <span className="text-xs text-muted">
                      {allowedExtensions.map((ext) => ext.toUpperCase()).join(" / ")} — fino a{" "}
                      {maxFileSizeMb} MB
                    </span>
                  </label>
                )}

                {modelFileError ? (
                  <p role="alert" className="mt-1.5 text-xs text-error">
                    {modelFileError}
                  </p>
                ) : null}
                {fieldError("modelFile", "modelFile-error")}

                <div className="mt-4 flex items-start gap-3 border border-border bg-background px-4 py-3">
                  <span aria-hidden="true" className="mt-0.5 text-accent">→</span>
                  <p className="text-xs leading-relaxed text-muted">
                    Il file supera {maxFileSizeMb} MB? Caricalo su Drive o
                    WeTransfer e incolla qui sotto il link di condivisione:
                    lo scaricheremo noi.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="driveLink" className={LABEL_CLASS}>
                  Link Drive / WeTransfer{" "}
                  <span className="font-normal text-muted">(in alternativa al file)</span>
                </label>
                <input
                  id="driveLink"
                  type="url"
                  inputMode="url"
                  placeholder="https://drive.google.com/…"
                  aria-invalid={Boolean(errors.driveLink)}
                  aria-describedby={errors.driveLink ? "driveLink-error" : undefined}
                  className={FIELD_CLASS}
                  {...register("driveLink")}
                />
                {fieldError("driveLink", "driveLink-error")}
              </div>
            </div>
          )}
        </fieldset>
      )}

      {/* Step 4 — Riferimenti */}
      {step === 3 && (
        <fieldset className="flex flex-col gap-6">
          <legend className="sr-only">Immagini di riferimento</legend>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Riferimenti visivi
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            Foto o immagini di riferimento facoltative (fino a{" "}
            {MAX_REFERENCE_FILES}) per capire meglio cosa vuoi realizzare.
            Se preferisci, puoi saltare questo passaggio.
          </p>

          <label
            htmlFor="referenceFiles"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              addReferenceFiles(event.dataTransfer.files);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-background px-4 py-10 text-center transition-colors hover:border-accent focus-within:border-accent"
          >
            <input
              id="referenceFiles"
              type="file"
              className="sr-only"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => addReferenceFiles(event.target.files)}
            />
            <span className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-foreground">
              {referenceFiles.length > 0
                ? `Aggiungi altre immagini (${referenceFiles.length}/${MAX_REFERENCE_FILES})`
                : "Scegli o trascina le immagini"}
            </span>
            <span className="text-xs text-muted">
              JPG / PNG / WebP / GIF — fino a {maxFileSizeMb} MB ciascuna
            </span>
          </label>

          {referenceFileError ? (
            <p role="alert" className="text-xs text-error">
              {referenceFileError}
            </p>
          ) : null}
          {fieldError("referenceFiles", "referenceFiles-error")}

          {referenceFiles.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {referenceFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="group relative border border-border bg-background"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previews[index]?.url ?? ""}
                    alt={file.name}
                    className="aspect-square w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeReferenceFile(index)}
                    aria-label={`Rimuovi ${file.name}`}
                    className="absolute right-2 top-2 border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:border-error hover:text-error"
                  >
                    Rimuovi
                  </button>
                  <p className="truncate border-t border-border px-2 py-1.5 text-xs text-muted">
                    {file.name}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      )}

      {/* Step 5 — Riepilogo */}
      {step === 4 && (
        <fieldset className="flex flex-col gap-6">
          <legend className="sr-only">Riepilogo e invio</legend>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Riepilogo
          </h2>

          <dl className="divide-y divide-border border border-border bg-background">
            {[
              ["Nome", getValues("clientName")],
              ["Email", getValues("clientEmail")],
              [
                "Telefono",
                getValues("clientPhone") || "—",
              ],
              [
                "Preferenza contatto",
                CONTACT_PREFERENCE_LABELS[getValues("contactPreference")] ?? "—",
              ],
              ["Progetto", getValues("projectTitle")],
              ["Quantità", String(getValues("quantity"))],
              ["Materiale", getValues("material") || "—"],
              ["Colore", getValues("color") || "—"],
              ["Scadenza", getValues("deadline") || "—"],
              [
                "File 3D",
                getValues("has3dFile")
                  ? modelFile
                    ? `${modelFile.name} (${formatBytes(modelFile.size)})`
                    : getValues("driveLink") || "—"
                  : "No",
              ],
              [
                "Riferimenti",
                referenceFiles.length > 0
                  ? `${referenceFiles.length} immagine${referenceFiles.length > 1 ? "e" : ""}`
                  : "Nessuno",
              ],
            ].map(([term, detail]) => (
              <div key={term} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <dt className="shrink-0 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                  {term}
                </dt>
                <dd className="break-words text-sm text-foreground">{detail}</dd>
              </div>
            ))}
          </dl>

          {getValues("description") ? (
            <div className="border border-border bg-background px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                Descrizione
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                {getValues("description")}
              </p>
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 border border-border bg-background px-4 py-4 has-[:checked]:border-accent">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              aria-invalid={Boolean(errors.rightsConfirmed)}
              aria-describedby={errors.rightsConfirmed ? "rightsConfirmed-error" : undefined}
              {...register("rightsConfirmed")}
            />
            <span className="text-sm leading-relaxed text-foreground">
              Confermo di avere il diritto di utilizzare e inviare i file
              allegati a questa richiesta. <span className="text-accent">*</span>
            </span>
          </label>
          {fieldError("rightsConfirmed", "rightsConfirmed-error")}

          <label className="flex cursor-pointer items-start gap-3 border border-border bg-background px-4 py-4 has-[:checked]:border-accent">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              aria-invalid={Boolean(errors.privacyAccepted)}
              aria-describedby={errors.privacyAccepted ? "privacyAccepted-error" : undefined}
              {...register("privacyAccepted")}
            />
            <span className="text-sm leading-relaxed text-foreground">
              Ho letto e accetto l&apos;
              <Link href="/privacy" className="text-accent underline">
                informativa privacy
              </Link>{" "}
              e acconsento al trattamento dei dati per la gestione di questa
              richiesta. <span className="text-accent">*</span>
            </span>
          </label>
          {fieldError("privacyAccepted", "privacyAccepted-error")}

          <div className="border-t border-border pt-6">
            {turnstileSiteKey ? (
              <>
                <TurnstileWidget
                  key={`turnstile-${turnstileResetKey}`}
                  siteKey={turnstileSiteKey}
                  onTokenChange={onTurnstileToken}
                />
              </>
            ) : (
              <p className="border border-dashed border-border px-3 py-2 text-xs text-muted">
                Protezione anti-bot non configurata (modalità sviluppo).
              </p>
            )}
          </div>
        </fieldset>
      )}

      {/* Error summary (shown when navigation fails) */}
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="mt-6 border border-dashed border-error/50 px-4 py-3 text-sm text-error">
          Controlla i campi evidenziati prima di continuare.
        </p>
      )}

      {/* Navigation */}
      <div className="mt-10 flex flex-col-reverse gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              disabled={busy}
              className="inline-flex items-center justify-center border border-border px-6 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Indietro
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={busy}
              className="inline-flex items-center justify-center bg-accent px-8 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] text-background transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Avanti →
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center bg-accent px-8 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] text-background transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Invio in corso…" : "Invia richiesta"}
            </button>
          )}
        </div>
      </div>

      {/* In-flight states */}
      {busy && (
        <div aria-live="polite" className="mt-8 flex flex-col gap-4 border border-border bg-background p-5">
          {submit.phase === "saving" && (
            <p className="text-sm text-foreground">Salvataggio della richiesta…</p>
          )}
          {submit.phase === "uploading" && (
            <>
              <p className="text-sm text-foreground">
                Invio dei file in corso…{" "}
                {submit.currentFile ? (
                  <span className="text-muted">({submit.currentFile})</span>
                ) : null}
              </p>
              <ul className="flex flex-col gap-2">
                {uploadItems.map((item, index) => {
                  const value = submit.progress[index] ?? 0;
                  return (
                    <li key={`${item.file.name}-${index}`} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs text-muted">
                        <span className="truncate">{item.file.name}</span>
                        <span>{value}%</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`Avanzamento upload ${item.file.name}`}
                        aria-valuenow={value}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-1.5 w-full bg-border"
                      >
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </form>
  );
}