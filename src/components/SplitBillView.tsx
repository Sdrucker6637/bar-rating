"use client";

import type { ChangeEvent, FormEvent } from "react";
import type {
  SplitItem,
  SplitPerson,
  SplitTotals,
} from "@/lib/types";
import { inputCls, groupBtnCls, addBtnCls } from "@/lib/ui";

interface SplitBillViewProps {
  step: "names" | "receipt" | "assign" | "summary";
  setStep: (s: "names" | "receipt" | "assign" | "summary") => void;
  people: SplitPerson[];
  nameInput: string;
  setNameInput: (s: string) => void;
  onAddPerson: () => void;
  onRemovePerson: (id: string) => void;
  receiptImage: { base64: string; mimeType: string; previewUrl: string } | null;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onParseReceipt: () => void;
  parsing: boolean;
  parseError: string | null;
  items: SplitItem[];
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onAdjustUnits: (itemId: string, personId: string, delta: number) => void;
  onSplitEvenly: (itemId: string, personIds: string[]) => void;
  onToggleIncluded: (itemId: string, personId: string) => void;
  tax: number;
  tip: number;
  totals: SplitTotals;
  onSendText: () => void;
  onReset: () => void;
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        marginTop: 0,
        fontFamily: "'Fraunces', serif",
        fontWeight: 500,
      }}
      className="text-[1.35rem] text-cream"
    >
      {children}
    </h2>
  );
}

export default function SplitBillView(props: SplitBillViewProps) {
  const {
    step,
    setStep,
    people,
    nameInput,
    setNameInput,
    onAddPerson,
    onRemovePerson,
    receiptImage,
    onFileChange,
    onParseReceipt,
    parsing,
    parseError,
    items,
    onAddItem,
    onRemoveItem,
    onAdjustUnits,
    onSplitEvenly,
    onToggleIncluded,
    tax,
    tip,
    totals,
    onSendText,
    onReset,
  } = props;

  if (step === "names") {
    return (
      <div className="my-4 rounded-lg border border-line bg-panel p-4">
        <PanelHeading>Who&apos;s splitting the bill?</PanelHeading>
        <div className="mb-3.5 font-mono text-[0.68rem] text-mute">
          Add names one at a time — press Enter or tap + Add after each one.
        </div>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onAddPerson();
          }}
          className="mb-4 flex flex-wrap items-center gap-2.5"
        >
          <input
            className={`${inputCls} min-w-0 flex-[1_1_200px]`}
            placeholder="Enter a name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="cursor-pointer rounded-full border-none bg-brass px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-deep hover:bg-gold"
          >
            + Add
          </button>
        </form>
        {people.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1">
            {people.map((p) => (
              <span
                key={p.id}
                className="rounded-full bg-line px-3 py-1.5 font-mono text-[0.85rem] text-mist"
              >
                {p.name}{" "}
                <button
                  onClick={() => onRemovePerson(p.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#C77676",
                    cursor: "pointer",
                    marginLeft: "0.3rem",
                    fontSize: "0.8rem",
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-2.5 flex justify-end">
          <button
            className="cursor-pointer rounded-full border-none bg-brass px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-deep hover:bg-gold disabled:cursor-default disabled:opacity-50"
            disabled={people.length < 2}
            onClick={() => setStep("receipt")}
          >
            Next: Add receipt →
          </button>
        </div>
        {people.length > 0 && people.length < 2 && (
          <div className="mt-2 font-mono text-[0.68rem] text-mute">
            Add at least one more person to split with.
          </div>
        )}
      </div>
    );
  }

  if (step === "receipt") {
    return (
      <div className="my-4 rounded-lg border border-line bg-panel p-4">
        <PanelHeading>Upload the receipt</PanelHeading>
        <div className="mb-4 font-mono text-[0.68rem] text-mute">
          Open the receipt link, screenshot the itemized page, then upload it
          below.
        </div>
        <label
          htmlFor="tda-receipt-upload-input"
          className="mb-4 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-line2 bg-ink p-10 text-center transition-colors duration-150 hover:border-brass hover:bg-panelHover"
        >
          {receiptImage ? (
            <>
              <img
                src={receiptImage.previewUrl}
                className="block max-h-[360px] max-w-full rounded-lg border border-line2"
              />
              <div className="mt-2.5 font-mono text-[0.72rem] text-brass">
                Tap to choose a different screenshot
              </div>
            </>
          ) : (
            <>
              <div className="mb-1 text-[2.2rem] leading-none">🧾</div>
              <div className="font-serif text-[1.05rem] font-medium text-cream">
                Tap to upload a screenshot
              </div>
              <div className="font-mono text-[0.72rem] text-mute">
                PNG or JPG of the itemized receipt
              </div>
            </>
          )}
        </label>
        <input
          id="tda-receipt-upload-input"
          type="file"
          accept="image/*"
          onChange={onFileChange}
          style={{ display: "none" }}
        />
        {parseError && (
          <div className="py-10 text-center font-mono text-[0.85rem] text-mute">
            {parseError}
          </div>
        )}
        <div className="flex justify-end">
          <button
            className="cursor-pointer bg-transparent py-2.5 font-mono text-[0.72rem] text-mute underline underline-offset-[3px] hover:text-gold"
            style={{ border: "none" }}
            onClick={() => setStep("assign")}
          >
            Skip — enter items manually
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2.5">
          <button
            className="flex-[0_0_auto] cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
            onClick={() => setStep("names")}
          >
            ← Back
          </button>
          <button
            className="cursor-pointer rounded-full border-none bg-brass px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-deep hover:bg-gold disabled:cursor-default disabled:opacity-50"
            disabled={!receiptImage || parsing}
            onClick={onParseReceipt}
          >
            {parsing ? "Reading receipt…" : "Read receipt"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "assign") {
    return (
      <div className="my-4 rounded-lg border border-line bg-panel p-4">
        <PanelHeading>Assign items</PanelHeading>
        <div className="mt-4 flex flex-col gap-2.5">
          {items.map((it) => {
            const q = it.quantity || 1;
            const includedIds = people
              .filter((p) => (it.assignedTo[p.id] || 0) > 0)
              .map((p) => p.id);
            const splitTargetIds =
              includedIds.length > 0 ? includedIds : people.map((p) => p.id);
            const assignedSum = Object.values(it.assignedTo).reduce(
              (a, c) => a + c,
              0,
            );
            const remaining = q - assignedSum;
            const assignedShares = Object.values(it.assignedTo);
            const isEvenlySplit =
              assignedShares.length > 1 &&
              Math.abs(assignedSum - q) < 0.001 &&
              assignedShares.every(
                (s) => Math.abs(s - assignedShares[0]) < 0.001,
              );
            return (
              <div key={it.id} className="rounded-lg border border-line bg-panel px-5 py-4">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: "0.6rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div className="cursor-pointer font-serif text-[1.1rem] font-medium text-cream">
                    {it.name || "(unnamed item)"}
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "0.8rem",
                      color: "#A79EB2",
                    }}
                  >
                    ${it.price.toFixed(2)}
                    {q > 1 ? ` · Qty ${q}` : ""}
                  </div>
                  <button
                    className="cursor-pointer rounded-[5px] border border-line2 bg-transparent px-2.5 py-1 font-mono text-[0.7rem] text-mist hover:border-redDeep hover:text-red"
                    onClick={() => onRemoveItem(it.id)}
                  >
                    Remove
                  </button>
                </div>
                {q > 1 && (
                  <div className="mt-0.5 font-mono text-[0.68rem] text-mute">
                    ${(it.price / q).toFixed(2)} each · {remaining} of {q}{" "}
                    unassigned
                  </div>
                )}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {people.map((p) => {
                    const included = includedIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        className={`cursor-pointer rounded-full border px-3 py-1.5 font-mono text-[0.72rem] ${
                          included
                            ? "border-greenLight text-greenLight"
                            : "border-line2 text-mist disabled:opacity-40"
                        }`}
                        onClick={() => onToggleIncluded(it.id, p.id)}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                  <button
                    className={`cursor-pointer rounded-full border px-3 py-1.5 font-mono text-[0.72rem] ${
                      isEvenlySplit
                        ? "border-goldDeep bg-goldDeep text-cream"
                        : "border-line2 text-mist"
                    }`}
                    onClick={() => onSplitEvenly(it.id, splitTargetIds)}
                    title={
                      includedIds.length > 0
                        ? "Divide this item evenly among the people selected above"
                        : "Divide this item evenly among everyone in the group"
                    }
                  >
                    ⚖ Split evenly
                  </button>
                </div>
                {includedIds.length > 0 && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                    }}
                  >
                    {people
                      .filter((p) => includedIds.includes(p.id))
                      .map((p) => {
                        const units = it.assignedTo[p.id] || 0;
                        const cost = (it.price / q) * units;
                        return (
                          <div
                            key={p.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "0.6rem",
                            }}
                          >
                            <span
                              style={{
                                minWidth: "90px",
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: "0.78rem",
                                color: "#A79EB2",
                              }}
                            >
                              {p.name}
                            </span>
                            {q > 1 ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                <button
                                  className={groupBtnCls}
                                  onClick={() =>
                                    onAdjustUnits(it.id, p.id, -1)
                                  }
                                >
                                  −
                                </button>
                                <b
                                  style={{
                                    minWidth: "1.6rem",
                                    textAlign: "center",
                                    color: "#EDE6D9",
                                  }}
                                >
                                  {Number.isInteger(units)
                                    ? units
                                    : units.toFixed(2)}
                                </b>
                                <button
                                  className={groupBtnCls}
                                  disabled={remaining <= 0}
                                  onClick={() =>
                                    onAdjustUnits(it.id, p.id, 1)
                                  }
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span />
                            )}
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: "0.8rem",
                                color: "#C9A876",
                              }}
                            >
                              ${cost.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          className={`${addBtnCls} w-full`}
          onClick={onAddItem}
        >
          + Add item
        </button>
        <div
          style={{
            marginTop: "1rem",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.85rem",
            color: "#A79EB2",
            display: "flex",
            gap: "1.5rem",
          }}
        >
          <span>
            Tax: <b className="text-cream">${Number(tax || 0).toFixed(2)}</b>
          </span>
          <span>
            Tip: <b className="text-cream">${Number(tip || 0).toFixed(2)}</b>
          </span>
        </div>
        {totals.unassignedUnitsCount > 0 && (
          <div className="mt-2.5 font-mono text-[0.68rem] text-mute">
            {totals.unassignedUnitsCount} unit
            {totals.unassignedUnitsCount === 1 ? "" : "s"} not assigned to
            anyone yet.
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            className="flex-1 cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
            onClick={() => setStep("receipt")}
          >
            ← Back
          </button>
          <button
            className="flex-1 cursor-pointer rounded-full border-none bg-brass px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-deep hover:bg-gold disabled:cursor-default disabled:opacity-50"
            disabled={items.length === 0}
            onClick={() => setStep("summary")}
          >
            Next: Review →
          </button>
        </div>
      </div>
    );
  }

  // step === "summary"
  return (
    <div className="my-4 rounded-lg border border-line bg-panel p-4">
      <PanelHeading>Who owes what</PanelHeading>
      <div className="mt-4 flex flex-col gap-2.5">
        {people.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-line bg-panel px-5 py-4"
          >
            <div className="font-serif text-[1.1rem] font-medium text-cream">
              {p.name}
            </div>
            <div className="font-mono text-[1.3rem] font-semibold text-gold">
              ${(totals.perPersonTotal[p.id] || 0).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <button
          className="flex-1 cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
          onClick={() => setStep("assign")}
        >
          ← Back to items
        </button>
        <button
          className="flex-1 cursor-pointer rounded-full border-none bg-brass px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-deep hover:bg-gold"
          onClick={onSendText}
        >
          📱 Send as text
        </button>
        <button
          className="flex-1 cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
          onClick={onReset}
        >
          Start over
        </button>
      </div>
    </div>
  );
}
