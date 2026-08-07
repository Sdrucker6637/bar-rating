"use client";

import type { ChangeEvent, FormEvent } from "react";
import type { SplitPerson, SplitPlace, SplitTotals } from "@/lib/types";
import type { SplitStep } from "@/app/split/SplitClient";
import { inputCls, groupBtnCls, addBtnCls } from "@/lib/ui";

interface SplitBillViewProps {
  step: SplitStep;
  setStep: (s: SplitStep) => void;
  people: SplitPerson[];
  nameInput: string;
  setNameInput: (s: string) => void;
  onAddPerson: () => void;
  onRemovePerson: (id: string) => void;

  placesCount: number;
  setPlacesCount: (n: number) => void;
  onConfirmPlacesCount: () => void;

  places: SplitPlace[];
  onSetPlaceName: (placeIndex: number, name: string) => void;
  onAddScreenshots: (placeIndex: number, files: FileList) => void;
  onRemoveScreenshot: (placeIndex: number, shotId: string) => void;
  onParsePlace: (placeIndex: number) => void;
  onProceedToTabs: () => void;

  activePlaceIndex: number;
  setActivePlaceIndex: (i: number) => void;
  onAddItem: (placeIndex: number) => void;
  onRemoveItem: (placeIndex: number, itemId: string) => void;
  onAdjustUnits: (
    placeIndex: number,
    itemId: string,
    personId: string,
    delta: number,
  ) => void;
  onSplitEvenly: (
    placeIndex: number,
    itemId: string,
    personIds: string[],
  ) => void;
  onToggleIncluded: (
    placeIndex: number,
    itemId: string,
    personId: string,
  ) => void;
  onTogglePersonInPlace: (placeIndex: number, personId: string) => void;
  onAddPersonToPlace: (placeIndex: number, name: string) => void;

  placeTotalsList: SplitTotals[];
  grandTotals: { perPersonTotal: Record<string, number> };
  onSendPlaceText: (placeIndex: number) => void;
  onSendGrandText: () => void;
  onReset: () => void;
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{ marginTop: 0, fontFamily: "'Fraunces', serif", fontWeight: 500 }}
      className="text-[1.35rem] text-cream"
    >
      {children}
    </h2>
  );
}

function placeLabel(place: SplitPlace, index: number) {
  return place.name.trim() || `Place ${index + 1}`;
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
    placesCount,
    setPlacesCount,
    onConfirmPlacesCount,
    places,
    onSetPlaceName,
    onAddScreenshots,
    onRemoveScreenshot,
    onParsePlace,
    onProceedToTabs,
    activePlaceIndex,
    setActivePlaceIndex,
    onAddItem,
    onRemoveItem,
    onAdjustUnits,
    onSplitEvenly,
    onToggleIncluded,
    onTogglePersonInPlace,
    onAddPersonToPlace,
    placeTotalsList,
    grandTotals,
    onSendPlaceText,
    onSendGrandText,
    onReset,
  } = props;

  // ---------------- names ----------------
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
            onClick={() => setStep("placesCount")}
          >
            Next: How many places? →
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

  // ---------------- places count ----------------
  if (step === "placesCount") {
    return (
      <div className="my-4 rounded-lg border border-line bg-panel p-4">
        <PanelHeading>How many places did you go?</PanelHeading>
        <div className="mb-4 font-mono text-[0.68rem] text-mute">
          One tab will be created per place, so each receipt gets its own crew
          and items.
        </div>
        <div className="flex items-center gap-2.5 font-mono text-[1rem]">
          <button
            className={groupBtnCls}
            onClick={() => setPlacesCount(Math.max(1, placesCount - 1))}
          >
            −
          </button>
          <b className="min-w-[2rem] text-center text-cream">{placesCount}</b>
          <button
            className={groupBtnCls}
            onClick={() => setPlacesCount(Math.min(10, placesCount + 1))}
          >
            +
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2.5">
          <button
            className="cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
            onClick={() => setStep("names")}
          >
            ← Back
          </button>
          <button
            className="cursor-pointer rounded-full border-none bg-brass px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-deep hover:bg-gold"
            onClick={onConfirmPlacesCount}
          >
            Next: Add receipts →
          </button>
        </div>
      </div>
    );
  }

  // ---------------- receipts ----------------
  if (step === "receipts") {
    return (
      <div className="my-4 flex flex-col gap-3">
        {places.map((place, i) => (
          <div
            key={place.id}
            className="rounded-lg border border-line bg-panel p-4"
          >
            <div className="mb-2.5 flex flex-col gap-1">
              <label className="font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
                Place {i + 1} name (optional — we&apos;ll try to read it off the
                receipt)
              </label>
              <input
                className={inputCls}
                placeholder={`Place ${i + 1}`}
                value={place.name}
                onChange={(e) => onSetPlaceName(i, e.target.value)}
              />
            </div>

            <label
              htmlFor={`tda-receipt-upload-${place.id}`}
              className="mb-3 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-line2 bg-ink p-6 text-center transition-colors duration-150 hover:border-brass hover:bg-panelHover"
            >
              <div className="mb-1 text-[1.8rem] leading-none">🧾</div>
              <div className="font-serif text-[1rem] font-medium text-cream">
                Tap to add screenshot(s)
              </div>
              <div className="font-mono text-[0.7rem] text-mute">
                Add more than one if the receipt didn&apos;t fit in a single
                shot
              </div>
            </label>
            <input
              id={`tda-receipt-upload-${place.id}`}
              type="file"
              accept="image/*"
              multiple
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                if (e.target.files && e.target.files.length > 0) {
                  onAddScreenshots(i, e.target.files);
                }
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />

            {place.screenshots.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {place.screenshots.map((shot) => (
                  <div key={shot.id} className="relative">
                    <img
                      src={shot.previewUrl}
                      className="block h-[90px] w-[70px] rounded-md border border-line2 object-cover"
                    />
                    <button
                      onClick={() => onRemoveScreenshot(i, shot.id)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-line2 bg-ink font-mono text-[0.65rem] text-red"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {place.parseError && (
              <div className="mb-3 font-mono text-[0.75rem] text-red">
                {place.parseError}
              </div>
            )}
            {place.items.length > 0 && (
              <div className="mb-3 font-mono text-[0.72rem] text-greenLight">
                {place.items.length} item{place.items.length === 1 ? "" : "s"}{" "}
                found
                {place.tax || place.tip
                  ? ` · tax $${place.tax.toFixed(2)} · tip $${place.tip.toFixed(2)}`
                  : ""}
              </div>
            )}

            <button
              className="cursor-pointer rounded-full border-none bg-brass px-5 py-2 font-mono text-[0.78rem] font-semibold text-deep hover:bg-gold disabled:cursor-default disabled:opacity-50"
              disabled={place.screenshots.length === 0 || place.parsing}
              onClick={() => onParsePlace(i)}
            >
              {place.parsing
                ? "Reading receipt…"
                : place.items.length > 0
                  ? "Re-read receipt"
                  : "Read receipt"}
            </button>
          </div>
        ))}

        <div className="flex items-center justify-between gap-2.5">
          <button
            className="cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
            onClick={() => setStep("placesCount")}
          >
            ← Back
          </button>
          <button
            className="cursor-pointer rounded-full border-none bg-brass px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-deep hover:bg-gold"
            onClick={onProceedToTabs}
          >
            Next: Divide items →
          </button>
        </div>
        <div className="text-center font-mono text-[0.68rem] text-mute">
          You can skip reading a receipt and add its items by hand on the next
          step.
        </div>
      </div>
    );
  }

  // ---------------- tabs ----------------
  if (step === "tabs") {
    const place = places[activePlaceIndex];
    const totals = placeTotalsList[activePlaceIndex];
    if (!place || !totals) return null;

    const crew = people.filter((p) => place.crewIds.includes(p.id));
    const nonCrew = people.filter((p) => !place.crewIds.includes(p.id));

    return (
      <div className="my-4">
        <div className="mb-3 flex flex-wrap gap-1.5 overflow-x-auto">
          {places.map((pl, i) => (
            <button
              key={pl.id}
              className={`cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 font-mono text-[0.72rem] ${
                i === activePlaceIndex
                  ? "border-brass bg-brass font-semibold text-deep"
                  : "border-line2 bg-transparent text-mist"
              }`}
              onClick={() => setActivePlaceIndex(i)}
            >
              {placeLabel(pl, i)}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-line bg-panel p-4">
          <PanelHeading>{placeLabel(place, activePlaceIndex)}</PanelHeading>

          <div className="mb-1 font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
            Who was here
          </div>
          <div className="mb-3.5 flex flex-wrap gap-1.5">
            {people.map((p) => {
              const included = place.crewIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 font-mono text-[0.72rem] ${
                    included
                      ? "border-greenLight text-greenLight"
                      : "border-line2 text-mist"
                  }`}
                  onClick={() => onTogglePersonInPlace(activePlaceIndex, p.id)}
                >
                  {p.name}
                </button>
              );
            })}
            <AddPersonToPlaceButton
              placeIndex={activePlaceIndex}
              onAdd={onAddPersonToPlace}
            />
          </div>
          {nonCrew.length === people.length && (
            <div className="mb-3.5 font-mono text-[0.68rem] text-mute">
              Nobody&apos;s assigned to this place yet — tap names above to add
              them.
            </div>
          )}

          <div className="mt-2 flex flex-col gap-2.5">
            {place.items.map((it) => {
              const q = it.quantity || 1;
              const includedIds = crew
                .filter((p) => (it.assignedTo[p.id] || 0) > 0)
                .map((p) => p.id);
              const splitTargetIds =
                includedIds.length > 0 ? includedIds : crew.map((p) => p.id);
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
                <div
                  key={it.id}
                  className="rounded-lg border border-line bg-panel px-5 py-4"
                >
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
                      onClick={() => onRemoveItem(activePlaceIndex, it.id)}
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
                    {crew.map((p) => {
                      const included = includedIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 font-mono text-[0.72rem] ${
                            included
                              ? "border-greenLight text-greenLight"
                              : "border-line2 text-mist disabled:opacity-40"
                          }`}
                          onClick={() =>
                            onToggleIncluded(activePlaceIndex, it.id, p.id)
                          }
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
                      onClick={() =>
                        onSplitEvenly(activePlaceIndex, it.id, splitTargetIds)
                      }
                      title={
                        includedIds.length > 0
                          ? "Divide this item evenly among the people selected above"
                          : "Divide this item evenly among everyone at this place"
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
                      {crew
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
                                      onAdjustUnits(
                                        activePlaceIndex,
                                        it.id,
                                        p.id,
                                        -1,
                                      )
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
                                      onAdjustUnits(
                                        activePlaceIndex,
                                        it.id,
                                        p.id,
                                        1,
                                      )
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
            onClick={() => onAddItem(activePlaceIndex)}
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
              Tax:{" "}
              <b className="text-cream">${Number(place.tax || 0).toFixed(2)}</b>
            </span>
            <span>
              Tip:{" "}
              <b className="text-cream">${Number(place.tip || 0).toFixed(2)}</b>
            </span>
          </div>
          {totals.unassignedUnitsCount > 0 && (
            <div className="mt-2.5 font-mono text-[0.68rem] text-mute">
              {totals.unassignedUnitsCount} unit
              {totals.unassignedUnitsCount === 1 ? "" : "s"} not assigned to
              anyone yet.
            </div>
          )}

          {crew.length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5 rounded-lg border border-line2 bg-ink p-3">
              {crew.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between font-mono text-[0.8rem]"
                >
                  <span className="text-mist">{p.name}</span>
                  <span className="text-gold">
                    ${(totals.perPersonTotal[p.id] || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              className="cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
              onClick={() => setStep("receipts")}
            >
              ← Back to receipts
            </button>
            <button
              className="cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist disabled:cursor-default disabled:opacity-50"
              disabled={crew.length === 0}
              onClick={() => onSendPlaceText(activePlaceIndex)}
            >
              📱 Send text for this place
            </button>
            <button
              className="ml-auto cursor-pointer rounded-full border-none bg-brass px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-deep hover:bg-gold"
              onClick={() => setStep("summary")}
            >
              Next: Review all →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- summary ----------------
  return (
    <div className="my-4 flex flex-col gap-3">
      {places.map((place, i) => {
        const totals = placeTotalsList[i];
        const crew = people.filter((p) => place.crewIds.includes(p.id));
        if (crew.length === 0) return null;
        return (
          <div
            key={place.id}
            className="rounded-lg border border-line bg-panel p-4"
          >
            <PanelHeading>{placeLabel(place, i)}</PanelHeading>
            <div className="flex flex-col gap-1.5">
              {crew.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between font-mono text-[0.85rem]"
                >
                  <span className="text-mist">{p.name}</span>
                  <span className="text-gold">
                    ${(totals.perPersonTotal[p.id] || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="rounded-lg border border-brass bg-panel p-4">
        <PanelHeading>Grand total</PanelHeading>
        <div className="flex flex-col gap-2.5">
          {people.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-line bg-panel px-5 py-4"
            >
              <div className="font-serif text-[1.1rem] font-medium text-cream">
                {p.name}
              </div>
              <div className="font-mono text-[1.3rem] font-semibold text-gold">
                ${(grandTotals.perPersonTotal[p.id] || 0).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          className="flex-1 cursor-pointer rounded-[5px] border border-line2 bg-transparent px-3 py-2.5 font-mono text-mist"
          onClick={() => setStep("tabs")}
        >
          ← Back to tabs
        </button>
        <button
          className="flex-1 cursor-pointer rounded-full border-none bg-brass px-5 py-2.5 font-mono text-[0.8rem] font-semibold text-deep hover:bg-gold"
          onClick={onSendGrandText}
        >
          📱 Send full summary as text
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

function AddPersonToPlaceButton({
  placeIndex,
  onAdd,
}: {
  placeIndex: number;
  onAdd: (placeIndex: number, name: string) => void;
}) {
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        const input = e.currentTarget.elements.namedItem(
          "newPerson",
        ) as HTMLInputElement;
        if (!input.value.trim()) return;
        onAdd(placeIndex, input.value);
        input.value = "";
      }}
      className="inline-flex items-center gap-1"
    >
      <input
        name="newPerson"
        placeholder="+ someone new"
        className="w-[110px] rounded-full border border-dashed border-line2 bg-transparent px-3 py-1.5 font-mono text-[0.72rem] text-mist focus:border-brass focus:outline-none"
      />
    </form>
  );
}
