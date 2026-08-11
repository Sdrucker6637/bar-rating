"use client";

import { useMemo, useState } from "react";
import SplitBillView from "@/components/SplitBillView";
import TabIntro from "@/components/TabIntro";
import type {
  SplitItem,
  SplitPerson,
  SplitPlace,
  SplitScreenshot,
  SplitTotals,
} from "@/lib/types";

export type SplitStep =
  | "names"
  | "placesCount"
  | "receipts"
  | "tabs"
  | "summary";

function newPersonId(): string {
  return `p${Date.now()}${Math.random()}`;
}

function emptyPlace(id: string, crewIds: string[]): SplitPlace {
  return {
    id,
    name: "",
    nameEdited: false,
    screenshots: [],
    items: [],
    tax: 0,
    tip: 0,
    crewIds: [...crewIds],
    parsing: false,
    parseError: null,
    parsedShotCount: 0,
  };
}

function normName(n: string): string {
  return n.toLowerCase().replace(/\s+/g, " ").trim();
}

// Same-name + same-price line items are treated as the same receipt line —
// used when merging a fresh parse into items that are already there so
// re-reading a receipt never duplicates anything.
function itemKey(name: string, price: number): string {
  return `${normName(name)}|${price.toFixed(2)}`;
}

// Fairly splits `totalCents` across entries proportional to `weight`,
// guaranteeing the returned cents sum to EXACTLY `totalCents` (largest-
// remainder method). This is what keeps e.g. $8.00 split 3 ways from
// displaying as $2.67 + $2.67 + $2.67 = $8.01 — the leftover cent(s) are
// handed to whichever share got rounded down the most.
function distributeCents(
  totalCents: number,
  entries: Array<{ id: string; weight: number }>,
): Record<string, number> {
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight <= 0) return {};
  const shares = entries.map((e) => {
    const exact = (totalCents * e.weight) / totalWeight;
    return { id: e.id, cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  const allocated = shares.reduce((sum, s) => sum + s.cents, 0);
  const leftover = totalCents - allocated;
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < leftover; i++) {
    byRemainder[i % byRemainder.length].cents += 1;
  }
  const out: Record<string, number> = {};
  shares.forEach((s) => {
    out[s.id] = s.cents;
  });
  return out;
}

export default function SplitClient() {
  const [splitStep, setSplitStep] = useState<SplitStep>("names");
  const [splitPeople, setSplitPeople] = useState<SplitPerson[]>([]);
  const [splitNameInput, setSplitNameInput] = useState("");
  const [placesCount, setPlacesCount] = useState(1);
  const [splitPlaces, setSplitPlaces] = useState<SplitPlace[]>([]);
  const [activePlaceIndex, setActivePlaceIndex] = useState(0);
  // Roster ids captured when the places are created — people added later via
  // "+ someone new" are deletable; the original crew isn't.
  const [originalRosterIds, setOriginalRosterIds] = useState<string[]>([]);
  const [readingAll, setReadingAll] = useState(false);

  function resetSplitBill() {
    setSplitStep("names");
    setSplitPeople([]);
    setSplitNameInput("");
    setPlacesCount(1);
    setSplitPlaces([]);
    setActivePlaceIndex(0);
    setOriginalRosterIds([]);
    setReadingAll(false);
  }

  // ---------------- names step ----------------
  function addSplitPerson() {
    const name = splitNameInput.trim();
    if (!name) return;
    setSplitPeople((prev) => [...prev, { id: newPersonId(), name }]);
    setSplitNameInput("");
  }

  function removeSplitPerson(id: string) {
    setSplitPeople((prev) => prev.filter((p) => p.id !== id));
    setSplitPlaces((prev) =>
      prev.map((place) => ({
        ...place,
        crewIds: place.crewIds.filter((cid) => cid !== id),
        items: place.items.map((it) => {
          if (!(id in it.assignedTo)) return it;
          const nextAssigned = { ...it.assignedTo };
          delete nextAssigned[id];
          return { ...it, assignedTo: nextAssigned };
        }),
      })),
    );
  }

  // ---------------- places count step ----------------
  function confirmPlacesCount() {
    const ids = splitPeople.map((p) => p.id);
    setOriginalRosterIds(ids);
    setSplitPlaces(
      Array.from({ length: placesCount }, (_, i) =>
        emptyPlace(`place${Date.now()}${i}`, ids),
      ),
    );
    setSplitStep("receipts");
  }

  // ---------------- receipts step ----------------
  function setPlaceName(placeIndex: number, name: string) {
    setSplitPlaces((prev) =>
      prev.map((pl, i) =>
        i === placeIndex ? { ...pl, name, nameEdited: true } : pl,
      ),
    );
  }

  function addScreenshotsToPlace(placeIndex: number, files: FileList) {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        const shot: SplitScreenshot = {
          id: `shot${Date.now()}${Math.random()}`,
          base64,
          mimeType: file.type || "image/jpeg",
          previewUrl: dataUrl,
        };
        setSplitPlaces((prev) =>
          prev.map((pl, i) =>
            i === placeIndex
              ? { ...pl, screenshots: [...pl.screenshots, shot] }
              : pl,
          ),
        );
      };
      reader.readAsDataURL(file);
    });
  }

  function removeScreenshotFromPlace(placeIndex: number, shotId: string) {
    setSplitPlaces((prev) =>
      prev.map((pl, i) =>
        i === placeIndex
          ? {
              ...pl,
              screenshots: pl.screenshots.filter((s) => s.id !== shotId),
            }
          : pl,
      ),
    );
  }

  // Parses one place's screenshots and merges the result into its items.
  // Returns true when the read succeeded (or there was nothing to read).
  async function parsePlaceReceipts(placeIndex: number): Promise<boolean> {
    const place = splitPlaces[placeIndex];
    if (!place || place.screenshots.length === 0) return true;
    setSplitPlaces((prev) =>
      prev.map((pl, i) =>
        i === placeIndex ? { ...pl, parsing: true, parseError: null } : pl,
      ),
    );
    try {
      const response = await fetch("/api/split-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: place.screenshots.map((s) => ({
            base64: s.base64,
            mimeType: s.mimeType,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.result) {
        setSplitPlaces((prev) =>
          prev.map((pl, i) =>
            i === placeIndex
              ? {
                  ...pl,
                  parsing: false,
                  parseError: data.error || "Couldn't read that receipt.",
                }
              : pl,
          ),
        );
        return false;
      }
      const items: SplitItem[] = data.result.items.map(
        (it: { name: string; price: number; quantity: number }, i: number) => ({
          id: `item${Date.now()}${i}`,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          assignedTo: {},
        }),
      );
      setSplitPlaces((prev) =>
        prev.map((pl, i) => {
          if (i !== placeIndex) return pl;
          // Merge rather than replace: anything the user added by hand in the
          // tabs is kept, and re-reading the same receipt can't duplicate a
          // line that's already there.
          const merged = [...pl.items];
          const seen = new Set(merged.map((it) => itemKey(it.name, it.price)));
          items.forEach((it) => {
            const key = itemKey(it.name, it.price);
            if (!seen.has(key)) {
              merged.push(it);
              seen.add(key);
            }
          });
          return {
            ...pl,
            items: merged,
            tax: Math.max(pl.tax, data.result.tax || 0),
            tip: Math.max(pl.tip, data.result.tip || 0),
            name:
              !pl.nameEdited && data.result.placeName
                ? data.result.placeName
                : pl.name,
            parsedShotCount: pl.screenshots.length,
            parsing: false,
            parseError: null,
          };
        }),
      );
      return true;
    } catch (e) {
      setSplitPlaces((prev) =>
        prev.map((pl, i) =>
          i === placeIndex
            ? {
                ...pl,
                parsing: false,
                parseError: "Something went wrong reading those images.",
              }
            : pl,
        ),
      );
      return false;
    }
  }

  function proceedToTabs() {
    setActivePlaceIndex(0);
    setSplitStep("tabs");
  }

  // Reads every place's receipts in one go (only places with new or never-read
  // screenshots are sent), then opens the tabs step. If every read failed we
  // stay on the receipts step so the errors are visible.
  async function readAllAndProceed() {
    const toParse = splitPlaces
      .map((pl, i) => ({ pl, i }))
      .filter(
        ({ pl }) =>
          pl.screenshots.length > 0 &&
          pl.parsedShotCount !== pl.screenshots.length,
      );
    if (toParse.length === 0) {
      proceedToTabs();
      return;
    }
    setReadingAll(true);
    // Read one place at a time — gentler on the Gemini API than firing every
    // receipt in parallel, and barely slower for the usual 2–4 stops.
    const results: boolean[] = [];
    for (const { i } of toParse) {
      results.push(await parsePlaceReceipts(i));
    }
    setReadingAll(false);
    if (results.every((ok) => !ok)) return; // all failed — stay & show errors
    proceedToTabs();
  }

  // ---------------- tabs step: items ----------------
  function addManualItemToPlace(placeIndex: number) {
    const name = window.prompt("Item name?", "");
    if (!name || !name.trim()) return;
    const priceInput = window.prompt(`Total price for "${name.trim()}"?`, "");
    const price = Number(priceInput);
    if (!Number.isFinite(price) || price < 0) return;
    const qtyInput = window.prompt("Quantity? (leave blank for 1)", "1");
    const quantity = Math.max(1, Number(qtyInput) || 1);
    setSplitPlaces((prev) =>
      prev.map((pl, i) =>
        i === placeIndex
          ? {
              ...pl,
              items: [
                ...pl.items,
                {
                  id: `item${Date.now()}`,
                  name: name.trim(),
                  price,
                  quantity,
                  assignedTo: {},
                },
              ],
            }
          : pl,
      ),
    );
  }

  function removeItemFromPlace(placeIndex: number, itemId: string) {
    setSplitPlaces((prev) =>
      prev.map((pl, i) =>
        i === placeIndex
          ? { ...pl, items: pl.items.filter((it) => it.id !== itemId) }
          : pl,
      ),
    );
  }

  function adjustItemPersonUnits(
    placeIndex: number,
    itemId: string,
    personId: string,
    delta: number,
  ) {
    setSplitPlaces((prev) =>
      prev.map((pl, pi) => {
        if (pi !== placeIndex) return pl;
        return {
          ...pl,
          items: pl.items.map((it) => {
            if (it.id !== itemId) return it;
            const current = it.assignedTo[personId] || 0;
            const assignedSum = Object.values(it.assignedTo).reduce(
              (a, c) => a + c,
              0,
            );
            const remaining = it.quantity - assignedSum;
            let nextUnits = current + delta;
            if (nextUnits < 0) nextUnits = 0;
            if (delta > 0 && remaining <= 0) return it;
            if (nextUnits > it.quantity) nextUnits = it.quantity;
            const nextAssigned = { ...it.assignedTo };
            if (nextUnits === 0) {
              delete nextAssigned[personId];
            } else {
              nextAssigned[personId] = nextUnits;
            }
            return { ...it, assignedTo: nextAssigned };
          }),
        };
      }),
    );
  }

  function splitItemEvenly(
    placeIndex: number,
    itemId: string,
    personIds: string[],
  ) {
    setSplitPlaces((prev) =>
      prev.map((pl, pi) => {
        if (pi !== placeIndex) return pl;
        return {
          ...pl,
          items: pl.items.map((it) => {
            if (it.id !== itemId) return it;
            if (personIds.length === 0) return { ...it, assignedTo: {} };
            const share = it.quantity / personIds.length;
            const nextAssigned: Record<string, number> = {};
            personIds.forEach((pid) => {
              nextAssigned[pid] = share;
            });
            return { ...it, assignedTo: nextAssigned };
          }),
        };
      }),
    );
  }

  // Toggling a person on/off an item rebalances the WHOLE currently-included
  // set evenly across the item's quantity — the same rule "Split evenly"
  // uses. This is the fix for the bug where clicking each person's chip
  // individually gave every person the item's full quantity (and therefore
  // its full price) instead of dividing it among them.
  function toggleItemPersonIncluded(
    placeIndex: number,
    itemId: string,
    personId: string,
  ) {
    setSplitPlaces((prev) =>
      prev.map((pl, pi) => {
        if (pi !== placeIndex) return pl;
        return {
          ...pl,
          items: pl.items.map((it) => {
            if (it.id !== itemId) return it;
            const currentlyIncluded = Object.keys(it.assignedTo).filter(
              (pid) => (it.assignedTo[pid] || 0) > 0,
            );
            const isIncluded = currentlyIncluded.includes(personId);
            const nextIncluded = isIncluded
              ? currentlyIncluded.filter((pid) => pid !== personId)
              : [...currentlyIncluded, personId];
            if (nextIncluded.length === 0) return { ...it, assignedTo: {} };
            const share = it.quantity / nextIncluded.length;
            const nextAssigned: Record<string, number> = {};
            nextIncluded.forEach((pid) => {
              nextAssigned[pid] = share;
            });
            return { ...it, assignedTo: nextAssigned };
          }),
        };
      }),
    );
  }

  // ---------------- tabs step: crew ----------------
  // Adds someone to this place's crew only. If they're not already on the
  // master roster (someone joining for just this one stop), they're added
  // to the roster too — but only into this place's crew, not retroactively
  // into places already created.
  function addPersonToPlace(placeIndex: number, rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    const existing = splitPeople.find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    const person = existing || { id: newPersonId(), name };
    if (!existing) setSplitPeople((prev) => [...prev, person]);
    setSplitPlaces((prev) =>
      prev.map((pl, i) =>
        i === placeIndex && !pl.crewIds.includes(person.id)
          ? { ...pl, crewIds: [...pl.crewIds, person.id] }
          : pl,
      ),
    );
  }

  // Removes someone from one place's crew, freeing whatever units they were
  // assigned there. If they were added mid-flow via "+ someone new" and this
  // was their last place, they're dropped from the roster entirely so they
  // stop showing up on other tabs and in the summary.
  function removePersonFromPlace(placeIndex: number, personId: string) {
    setSplitPlaces((prev) =>
      prev.map((pl, i) => {
        if (i !== placeIndex) return pl;
        return {
          ...pl,
          crewIds: pl.crewIds.filter((id) => id !== personId),
          items: pl.items.map((it) => {
            if (!(personId in it.assignedTo)) return it;
            const nextAssigned = { ...it.assignedTo };
            delete nextAssigned[personId];
            return { ...it, assignedTo: nextAssigned };
          }),
        };
      }),
    );
    const stillSomewhere = splitPlaces.some(
      (pl, i) => i !== placeIndex && pl.crewIds.includes(personId),
    );
    if (!stillSomewhere && !originalRosterIds.includes(personId)) {
      setSplitPeople((roster) => roster.filter((p) => p.id !== personId));
    }
  }

  // ---------------- totals ----------------
  function placeTotals(place: SplitPlace): SplitTotals {
    const perPersonSubtotal: Record<string, number> = {};
    place.crewIds.forEach((id) => (perPersonSubtotal[id] = 0));

    let assignedSubtotal = 0;
    place.items.forEach((it) => {
      const entries = Object.entries(it.assignedTo)
        .filter(([, units]) => (units || 0) > 0)
        .map(([pid, units]) => ({ id: pid, weight: units }));
      if (entries.length === 0) return;
      const totalCents = Math.round(it.price * 100);
      const centsByPerson = distributeCents(totalCents, entries);
      Object.entries(centsByPerson).forEach(([pid, cents]) => {
        if (perPersonSubtotal[pid] === undefined) return;
        const cost = cents / 100;
        perPersonSubtotal[pid] += cost;
        assignedSubtotal += cost;
      });
    });

    const extra = Number(place.tax || 0) + Number(place.tip || 0);
    const extraPerPerson =
      place.crewIds.length > 0 ? extra / place.crewIds.length : 0;
    const perPersonTotal: Record<string, number> = {};
    place.crewIds.forEach((id) => {
      perPersonTotal[id] = (perPersonSubtotal[id] || 0) + extraPerPerson;
    });

    const unassignedUnitsCount = place.items.reduce((sum, it) => {
      const q = it.quantity || 1;
      const assignedSum = Object.values(it.assignedTo).reduce(
        (a, c) => a + c,
        0,
      );
      return sum + Math.max(0, q - assignedSum);
    }, 0);

    return {
      perPersonSubtotal,
      perPersonTotal,
      assignedSubtotal,
      unassignedUnitsCount,
    };
  }

  const placeTotalsList = useMemo(
    () => splitPlaces.map((pl) => placeTotals(pl)),
    [splitPlaces],
  );

  const grandTotals = useMemo(() => {
    const perPersonTotal: Record<string, number> = {};
    splitPeople.forEach((p) => (perPersonTotal[p.id] = 0));
    placeTotalsList.forEach((totals) => {
      Object.entries(totals.perPersonTotal).forEach(([pid, amount]) => {
        perPersonTotal[pid] = (perPersonTotal[pid] || 0) + amount;
      });
    });
    return { perPersonTotal };
  }, [placeTotalsList, splitPeople]);

  function placeLabel(place: SplitPlace, index: number) {
    return place.name.trim() || `Place ${index + 1}`;
  }

  function buildPlaceMessage(placeIndex: number) {
    const place = splitPlaces[placeIndex];
    const totals = placeTotalsList[placeIndex];
    const lines = place.crewIds.map((id) => {
      const person = splitPeople.find((p) => p.id === id);
      return `${person ? person.name : "?"}: $${(totals.perPersonTotal[id] || 0).toFixed(2)}`;
    });
    return `${placeLabel(place, placeIndex)}:\n${lines.join("\n")}`;
  }

  function buildGrandMessage() {
    const perPlaceLines = splitPlaces.map((_, i) => buildPlaceMessage(i));
    const totalLines = splitPeople.map(
      (p) =>
        `${p.name}: $${(grandTotals.perPersonTotal[p.id] || 0).toFixed(2)}`,
    );
    return `${perPlaceLines.join("\n\n")}\n\nGrand total:\n${totalLines.join("\n")}`;
  }

  function sendPlaceText(placeIndex: number) {
    window.location.href = `sms:?&body=${encodeURIComponent(buildPlaceMessage(placeIndex))}`;
  }

  function sendGrandText() {
    window.location.href = `sms:?&body=${encodeURIComponent(buildGrandMessage())}`;
  }

  return (
    <div>
      <TabIntro
        title="Split the Bill"
        sub="Add your crew, snap the itemized receipts for each place, and divide every tab fairly — no math required."
      />
      <SplitBillView
        step={splitStep}
        setStep={setSplitStep}
        people={splitPeople}
        nameInput={splitNameInput}
        setNameInput={setSplitNameInput}
        onAddPerson={addSplitPerson}
        onRemovePerson={removeSplitPerson}
        placesCount={placesCount}
        setPlacesCount={setPlacesCount}
        onConfirmPlacesCount={confirmPlacesCount}
        places={splitPlaces}
        onSetPlaceName={setPlaceName}
        onAddScreenshots={addScreenshotsToPlace}
        onRemoveScreenshot={removeScreenshotFromPlace}
        onRemovePersonFromPlace={removePersonFromPlace}
        readingAll={readingAll}
        onReadAllAndProceed={readAllAndProceed}
        activePlaceIndex={activePlaceIndex}
        setActivePlaceIndex={setActivePlaceIndex}
        onAddItem={addManualItemToPlace}
        onRemoveItem={removeItemFromPlace}
        onAdjustUnits={adjustItemPersonUnits}
        onSplitEvenly={splitItemEvenly}
        onToggleIncluded={toggleItemPersonIncluded}
        onAddPersonToPlace={addPersonToPlace}
        placeTotalsList={placeTotalsList}
        grandTotals={grandTotals}
        onSendPlaceText={sendPlaceText}
        onSendGrandText={sendGrandText}
        onReset={resetSplitBill}
      />
    </div>
  );
}
