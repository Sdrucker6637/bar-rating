"use client";

import type { ChangeEvent, FormEvent } from "react";
import type { SplitPerson, SplitPlace, SplitTotals } from "@/lib/types";
import type { SplitStep } from "@/app/split/SplitClient";
import { distributeCents } from "@/lib/splitMath";
import {
  inputCls,
  groupBtnCls,
  addBtnCls,
  btnPrimaryCls,
  btnSecondaryCls,
  chipCls,
  chipActiveCls,
  cardBaseShadowCls,
  cardWarmSurfaceCls,
} from "@/lib/ui";
import Icon from "./Icon";

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
  readingAll: boolean;
  onReadAllAndProceed: () => void;

  activePlaceIndex: number;
  setActivePlaceIndex: (i: number) => void;
  onRemovePersonFromPlace: (placeIndex: number, personId: string) => void;
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
    readingAll,
    onReadAllAndProceed,
    activePlaceIndex,
    setActivePlaceIndex,
    onRemovePersonFromPlace,
    onAddItem,
    onRemoveItem,
    onAdjustUnits,
    onSplitEvenly,
    onToggleIncluded,
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
      <div
        className={`my-4 rounded-lg border border-line bg-panel p-4 ${cardBaseShadowCls} ${cardWarmSurfaceCls}`}
      >
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
          <button type="submit" className={btnPrimaryCls}>
            + Add
          </button>
        </form>
        {people.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {people.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-2 rounded-[6px] border border-[rgba(184,150,95,0.2)] bg-[#141110] px-2.5 py-1.5"
              >
                <span className="font-serif text-[0.88rem] font-medium leading-tight text-cream">
                  {p.name}
                </span>
                <button
                  onClick={() => onRemovePerson(p.id)}
                  title={`Remove ${p.name}`}
                  className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-transparent text-red/75 transition-colors hover:border-red/40 hover:bg-[rgba(199,118,118,0.12)] hover:text-red"
                >
                  <Icon name="x" size={9} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-2.5 flex justify-end">
          <button
            className={btnPrimaryCls}
            disabled={people.length < 2}
            onClick={() => setStep("placesCount")}
          >
            Next: How many places?
            <Icon name="arrowRight" size={13} />
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
      <div
        className={`my-4 rounded-lg border border-line bg-panel p-4 ${cardBaseShadowCls} ${cardWarmSurfaceCls}`}
      >
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
          <button className={btnSecondaryCls} onClick={() => setStep("names")}>
            <Icon name="arrowLeft" size={12} /> Back
          </button>
          <button className={btnPrimaryCls} onClick={onConfirmPlacesCount}>
            Next: Add receipts
            <Icon name="arrowRight" size={13} />
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
            className={`rounded-lg border border-line bg-panel p-4 ${cardBaseShadowCls} ${cardWarmSurfaceCls}`}
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
              <Icon name="receipt" size={26} className="text-brass/80" />
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

            {place.parsing && (
              <div className="mb-3 font-mono text-[0.75rem] text-brass">
                Reading receipt…
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
          </div>
        ))}

        <div className="flex items-center justify-between gap-2.5">
          <button
            className={btnSecondaryCls}
            onClick={() => setStep("placesCount")}
          >
            <Icon name="arrowLeft" size={12} /> Back
          </button>
          <button
            className={btnPrimaryCls}
            disabled={readingAll}
            onClick={onReadAllAndProceed}
          >
            {readingAll ? "Reading receipts…" : "Next: Divide items"}
            {!readingAll && <Icon name="arrowRight" size={13} />}
          </button>
        </div>
        <div className="text-center font-mono text-[0.68rem] text-mute">
          Every receipt is read automatically when you continue — you can also
          skip a place and add its items by hand on the next step.
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

    return (
      <div className="my-4">
        <div className="mb-3 flex flex-wrap gap-1.5 overflow-x-auto">
          {places.map((pl, i) => (
            <button
              key={pl.id}
              className={`${chipCls} whitespace-nowrap ${
                i === activePlaceIndex ? chipActiveCls : ""
              }`}
              onClick={() => setActivePlaceIndex(i)}
            >
              {placeLabel(pl, i)}
            </button>
          ))}
        </div>

        <div
          className={`rounded-lg border border-line bg-panel p-4 ${cardBaseShadowCls} ${cardWarmSurfaceCls}`}
        >
          <PanelHeading>{placeLabel(place, activePlaceIndex)}</PanelHeading>

          {place.parseError && (
            <div className="mb-3 rounded-lg border border-redDeep bg-ink px-3 py-2.5 font-mono text-[0.72rem] text-red">
              Couldn&apos;t read this receipt: {place.parseError}
            </div>
          )}
          {place.items.length === 0 && !place.parseError && (
            <div className="mb-3 rounded-lg border border-line2 bg-ink px-3 py-2.5 font-mono text-[0.72rem] text-mute">
              No items yet — tap + Add item to enter them by hand, or go back
              to try the receipt again.
            </div>
          )}

          <div className="mb-1 font-mono text-[0.68rem] uppercase tracking-[0.05em] text-mute">
            Who was here
          </div>
          {crew.length > 0 ? (
            <div className="mb-3.5 flex flex-wrap items-center gap-1.5">
              {crew.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-greenLight bg-ink px-3 py-1.5 font-mono text-[0.72rem] text-greenLight"
                >
                  {p.name}
                  <button
                    onClick={() =>
                      onRemovePersonFromPlace(activePlaceIndex, p.id)
                    }
                    className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-red/75 transition-colors hover:bg-[rgba(199,118,118,0.15)] hover:text-red"
                    title="Remove from this place"
                  >
                    <Icon name="x" size={9} />
                  </button>
                </span>
              ))}
              <AddPersonToPlaceButton
                placeIndex={activePlaceIndex}
                onAdd={onAddPersonToPlace}
              />
            </div>
          ) : (
            <div className="mb-3.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[0.68rem] text-mute">
                Nobody here yet —
              </span>
              <AddPersonToPlaceButton
                placeIndex={activePlaceIndex}
                onAdd={onAddPersonToPlace}
              />
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
              // Single source of truth for "who owes what on this item" —
              // the exact same cents-accurate split used for the real
              // totals (src/lib/splitMath.ts), so the number shown under
              // each person's name here always matches what they're
              // actually billed. Never re-derive this with price/qty math.
              const itemCentsByPerson = distributeCents(
                Math.round(it.price * 100),
                includedIds.map((pid) => ({
                  id: pid,
                  weight: it.assignedTo[pid] || 0,
                })),
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
                    <div className="flex items-baseline gap-1.5 font-mono text-[0.8rem] text-mist">
                      <span>${it.price.toFixed(2)}</span>
                      {q > 1 && <span>· Qty {q}</span>}
                      {includedIds.length > 1 && (
                        <span className="rounded-full border border-goldDeep bg-[rgba(138,109,47,0.15)] px-2 py-0.5 font-mono text-[0.66rem] text-gold">
                          ÷ {includedIds.length} ways
                        </span>
                      )}
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
                      Split evenly
                    </button>
                  </div>
                  {includedIds.length > 0 && (
                    <div
                      style={{
                        marginTop: "0.65rem",
                        paddingTop: "0.6rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                      }}
                      className="border-t border-dashed border-line2"
                    >
                      {crew
                        .filter((p) => includedIds.includes(p.id))
                        .map((p) => {
                          const units = it.assignedTo[p.id] || 0;
                          const cost = (itemCentsByPerson[p.id] || 0) / 100;
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

          <div className="mt-5 border-t border-line pt-4">
            <button
              className={`${btnPrimaryCls} w-full`}
              disabled={crew.length === 0}
              onClick={() => onSendPlaceText(activePlaceIndex)}
            >
              <Icon name="message" size={13} /> Send text for this place
            </button>
            <div className="mt-2 text-center font-mono text-[0.68rem] text-mute">
              Opens your messaging app with each person&apos;s total for this
              place.
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              <button
                className={`${btnSecondaryCls} flex-1`}
                onClick={() => setStep("receipts")}
              >
                <Icon name="arrowLeft" size={12} /> Back to receipts
              </button>
              <button
                className={`${btnSecondaryCls} flex-1`}
                onClick={() => setStep("summary")}
              >
                Next: Review all
                <Icon name="arrowRight" size={12} />
              </button>
            </div>
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
        return (<div
            key={place.id}
            className={`rounded-lg border border-line bg-panel p-4 ${cardBaseShadowCls} ${cardWarmSurfaceCls}`}
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

      <div
        className={`rounded-lg border border-brass bg-panel p-4 ${cardBaseShadowCls} ${cardWarmSurfaceCls}`}
      >
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

      <div className="flex flex-col gap-2.5">
        <button
          className={`${btnPrimaryCls} w-full`}
          onClick={onSendGrandText}
        >
          <Icon name="message" size={13} /> Send full summary as text
        </button>
        <div className="text-center font-mono text-[0.68rem] text-mute">
          Opens your messaging app with each place&apos;s totals and the grand
          total per person.
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            className={`${btnSecondaryCls} flex-1`}
            onClick={() => setStep("tabs")}
          >
            <Icon name="arrowLeft" size={12} /> Back to tabs
          </button>
          <button
            className={`${btnSecondaryCls} flex-1`}
            onClick={onReset}
          >
            Start over
          </button>
        </div>
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
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
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
        placeholder="+ add someone"
        className="w-[130px] rounded-full border border-dashed border-line2 bg-transparent px-3 py-1.5 font-mono text-[0.72rem] text-mist focus:border-brass focus:outline-none"
      />
    </form>
  );
}
