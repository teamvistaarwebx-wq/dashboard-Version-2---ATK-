"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, CircleX, FileSpreadsheet, ImageIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropZone } from "@/components/ui/drop-zone";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { parseCsvObjects } from "@/lib/csv";
import { formatINR, formatNumber } from "@/lib/format";
import { fileToThumbnail, isImageFile } from "@/lib/images";
import { subcategoryLabel } from "@/mocks/catalog";
import { importMockProducts, useMockStore } from "@/mocks/store";
import { validateImport } from "../lib/import-products";
import { swatchFor } from "../lib/swatch";

/**
 * Bulk import in three steps — Upload, Review, Import — sized for the usual
 * 100–150 product batches. Parsing and checks run in the browser, so Review
 * appears instantly and nothing is written until Import is pressed.
 */
const STEPS = ["Upload", "Review", "Import"];
const SAMPLE_URL = "/samples/atk-products-sample.csv";

export function ImportProductsModal({ onClose }) {
  const store = useMockStore();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [csvFile, setCsvFile] = useState(null);
  const [images, setImages] = useState([]);
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState(null);
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(null);
  const [readError, setReadError] = useState("");

  async function review() {
    setReadError("");
    try {
      const text = await csvFile.text();
      const imageMap = new Map(images.map((file) => [file.name.toLowerCase(), file]));
      const checked = validateImport(parseCsvObjects(text), { products: store.products, images: imageMap, overwrite });
      if (checked.fileError) {
        setReadError(checked.fileError);
        return;
      }
      setResult(checked);
      setStep(1);
    } catch {
      setReadError("That file could not be read. Save it as CSV (UTF-8) and try again.");
    }
  }

  async function runImport() {
    setStep(2);
    const rows = result.rows.filter((row) => row.state !== "error");
    const entries = [];
    const chunk = 10;
    const today = store.world.todayKey;

    for (let start = 0; start < rows.length; start += chunk) {
      for (const row of rows.slice(start, start + chunk)) {
        const uploaded = await Promise.all(
          row.imageRefs.map(async (ref, index) => ({
            id: `${row.product.sku}-${index}`,
            name: ref.name,
            url: ref.url ?? (await fileToThumbnail(ref.file, 320)),
          }))
        );
        entries.push({
          product: {
            swatch: swatchFor(row.product.title),
            createdAt: today,
            popularity: 1,
            ...row.product,
            images: uploaded.length ? uploaded : row.product.images ?? [],
          },
          quantity: row.quantity + (row.product.id ? store.inventoryById.get(row.product.id)?.committed ?? 0 : 0),
          lowStockThreshold: row.product.lowStockThreshold,
        });
      }
      setProgress(Math.round((Math.min(start + chunk, rows.length) / rows.length) * 100));
      // Lets the bar paint between batches.
      await new Promise((resolve) => setTimeout(resolve, 40));
    }

    importMockProducts(entries);
    const created = entries.filter((entry) => !entry.product.id).length;
    const updated = entries.length - created;
    setDone({ created, updated, skipped: result.rows.length - rows.length });
    toast(`${formatNumber(created)} products and their inventory created${updated ? `, ${updated} updated` : ""}`);
  }

  const visibleRows = result ? (problemsOnly ? result.rows.filter((row) => row.state !== "ready") : result.rows) : [];

  const footer =
    step === 0 ? (
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!csvFile} onClick={review}>
          Review import
        </Button>
      </>
    ) : step === 1 ? (
      <>
        <Button variant="secondary" onClick={() => setStep(0)}>
          Back
        </Button>
        <Button disabled={!result.counts.importable} onClick={runImport}>
          Import {formatNumber(result.counts.importable)} {result.counts.importable === 1 ? "product" : "products"}
        </Button>
      </>
    ) : done ? (
      <Button onClick={onClose}>View products</Button>
    ) : null;

  return (
    <Modal title="Import products" size="lg" onClose={onClose} footer={footer} dismissible={step !== 2 || Boolean(done)}>
      <ol className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-13" aria-label="Import steps">
        {STEPS.map((name, index) => (
          <li key={name} className="flex items-center gap-2" aria-current={index === step ? "step" : undefined}>
            <span
              className={`flex size-5 items-center justify-center rounded-full font-mono text-xs ${
                index < step ? "bg-success-bg text-success" : index === step ? "bg-brand text-white" : "bg-neutral-bg text-muted"
              }`}
            >
              {index + 1}
            </span>
            <span className={index === step ? "font-medium" : "text-muted"}>{name}</span>
            {index < STEPS.length - 1 ? <span className="mx-1 h-px w-6 bg-border" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="flex flex-col gap-4 p-4">
          <p className="text-13 text-muted">
            One row per product. Each row creates the product and its stock at Main Warehouse in one go.{" "}
            <a href={SAMPLE_URL} download className="font-medium text-brand-text hover:underline">
              Download sample CSV
            </a>
          </p>

          {csvFile ? (
            <FileChip icon={FileSpreadsheet} name={csvFile.name} meta={`${Math.ceil(csvFile.size / 1024)} KB`} onRemove={() => setCsvFile(null)} />
          ) : (
            <DropZone label="Choose CSV file" hint="or drop it here" accept=".csv,text/csv" onFiles={([file]) => setCsvFile(file)} />
          )}

          <div className="flex flex-col gap-2">
            <p className="text-13 font-medium">Product images (optional)</p>
            <DropZone
              compact
              multiple
              label="Choose images"
              hint="Matched to the image_files column by file name"
              accept="image/*"
              onFiles={(files) => setImages((current) => [...current, ...files.filter(isImageFile)])}
            />
            {images.length ? (
              <div className="flex items-center justify-between text-13">
                <span className="flex items-center gap-1.5 text-muted">
                  <ImageIcon className="size-4" aria-hidden="true" />
                  {images.length} {images.length === 1 ? "image" : "images"} ready
                </span>
                <button type="button" className="text-brand-text hover:underline" onClick={() => setImages([])}>
                  Clear
                </button>
              </div>
            ) : null}
          </div>

          <label className="flex items-start gap-2.5 text-13">
            <Checkbox checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} className="mt-0.5" />
            <span>
              Overwrite products with matching SKU
              <span className="block text-xs text-muted">Otherwise rows whose SKU already exists are skipped.</span>
            </span>
          </label>

          {readError ? (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-critical-bg px-3 py-2 text-13 text-critical">
              <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {readError}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 1 && result ? (
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm" role="status">
              <span className="font-mono">{formatNumber(result.counts.total)}</span> rows ·{" "}
              <span className="font-mono text-success">{formatNumber(result.counts.importable)}</span> ready ·{" "}
              <span className="font-mono text-critical">{formatNumber(result.counts.errors)}</span> errors ·{" "}
              <span className="font-mono text-warning">{formatNumber(result.counts.warnings)}</span> warnings
            </p>
            <label className="flex items-center gap-2 text-13">
              <Checkbox checked={problemsOnly} onChange={(event) => setProblemsOnly(event.target.checked)} />
              Show problems only
            </label>
          </div>

          <div className="max-h-[46dvh] overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[46rem] text-left text-13">
              <thead className="sticky top-0 z-10 border-b border-border bg-surface-muted text-xs text-muted">
                <tr>
                  <th scope="col" className="w-10 px-3 py-2 font-medium">
                    <span className="sr-only">Status</span>
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">Row</th>
                  <th scope="col" className="px-3 py-2 font-medium">Product</th>
                  <th scope="col" className="px-3 py-2 font-medium">Category</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Price</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Qty</th>
                  <th scope="col" className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleRows.map((row) => (
                  <tr key={row.line} className={row.state === "error" ? "bg-critical-bg/40" : ""}>
                    <td className="px-3 py-2">
                      <StateIcon state={row.state} />
                    </td>
                    <td className="px-3 py-2 font-mono text-muted">{row.line}</td>
                    <td className="max-w-56 px-3 py-2">
                      <span className="block truncate">{row.product.title || <em className="text-muted">No title</em>}</span>
                      <span className="block font-mono text-xs text-muted">{row.product.sku || "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-muted">{row.product.subcategory ? subcategoryLabel(row.product.subcategory) : row.data.subcategory || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{row.product.price ? formatINR(row.product.price) : row.data.price || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{row.product.fulfillment === "made_to_order" ? "MTO" : row.quantity}</td>
                    <td className="px-3 py-2">
                      <ul className="flex flex-col gap-0.5 text-xs">
                        {row.errors.map((message) => (
                          <li key={message} className="text-critical">{message}</li>
                        ))}
                        {row.warnings.map((message) => (
                          <li key={message} className="text-warning">{message}</li>
                        ))}
                        {row.state === "ready" ? <li className="text-muted">Ready</li> : null}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.counts.errors ? (
            <p className="text-xs text-muted">Rows with errors are skipped. Fix them in the sheet and import again.</p>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          {done ? (
            <>
              <CircleCheck className="size-8 text-success" aria-hidden="true" />
              <div>
                <p className="text-base font-semibold" role="status">
                  {formatNumber(done.created)} products and their inventory created
                </p>
                <p className="mt-1 text-13 text-muted">
                  {done.updated ? `${done.updated} existing products updated. ` : ""}
                  {done.skipped ? `${done.skipped} rows with errors skipped. ` : ""}
                  New products are at the top of the list with an <Badge tone="gold">Imported</Badge> badge.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Importing products…</p>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Import progress"
                className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-neutral-bg"
              >
                <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <p className="font-mono text-13 text-muted">{progress}%</p>
            </>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function StateIcon({ state }) {
  if (state === "error") return <CircleX className="size-4 text-critical" aria-label="Error" />;
  if (state === "warning") return <CircleAlert className="size-4 text-warning" aria-label="Warning" />;
  return <CircleCheck className="size-4 text-success" aria-label="Ready" />;
}

function FileChip({ icon: Icon, name, meta, onRemove }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
      <Icon className="size-5 text-muted" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{name}</span>
        <span className="block text-xs text-muted">{meta}</span>
      </span>
      <button type="button" aria-label={`Remove ${name}`} onClick={onRemove} className="rounded-lg p-1.5 text-muted hover:bg-neutral-bg hover:text-foreground">
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
