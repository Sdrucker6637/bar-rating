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
  };
}

export default function SplitClient() {
  const [splitStep, setSplitStep] = useState<SplitStep>("names");
  const [splitPeople, setSplitPeople] = useState<SplitPerson[]>([]);
  const [splitNameInput, setSplitNameInput] = useState("");
  const [placesCount, setPlacesCount] = useState(1);
  const [splitPlaces, setSplitPlaces] = useState<SplitPlace[]>([]);
  const [activePlaceIndex, setActivePlaceIndex] = useState(0);

  function resetSplitBill() {
    setSplitStep("names");
    setSplitPeople([]);
    setSplitNameInput("");
    setPlacesCount(1);
    setSplitPlaces([]);
    setActivePlaceIndex(0);
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

  async function parsePlaceReceipts(placeIndex: number) {
    const place = splitPlaces[placeIndex];
    if (!place || place.screenshots.length === 0) return;
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
        return;
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
        prev.map((pl, i) =>
          i === placeIndex
            ? {
                ...pl,
                items,
                tax: data.result.tax || 0,
                tip: data.result.tip || 0,
                name:
                  !pl.nameEdited && data.result.placeName
                    ? data.result.placeName
                    : pl.name,
                parsing: false,
                parseError: null,
              }
            : pl,
        ),
      );
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
    }
  }

  function proceedToTabs() {
    setActivePlaceIndex(0);
    setSplitStep("tabs");
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
            const nextAssigned = { ...it.assignedTo };
            if (nextAssigned[personId]) {
              delete nextAssigned[personId];
            } else {
              nextAssigned[personId] = Math.min(1, it.quantity);
            }
            return { ...it, assignedTo: nextAssigned };
          }),
        };
      }),
    );
  }

  // ---------------- tabs step: crew ----------------
  function togglePersonInPlace(placeIndex: number, personId: string) {
    setSplitPlaces((prev) =>
      prev.map((pl, i) => {
        if (i !== placeIndex) return pl;
        const inCrew = pl.crewIds.includes(personId);
        if (inCrew) {
          // Leaving this place frees up whatever units they had here.
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
        }
        return { ...pl, crewIds: [...pl.crewIds, personId] };
      }),
    );
  }

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

  // ---------------- totals ----------------
  function placeTotals(place: SplitPlace): SplitTotals {
    const perPersonSubtotal: Record<string, number> = {};
    place.crewIds.forEach((id) => (perPersonSubtotal[id] = 0));

    let assignedSubtotal = 0;
    place.items.forEach((it) => {
      const q = it.quantity || 1;
      const perUnit = it.price / q;
      Object.entries(it.assignedTo).forEach(([pid, units]) => {
        if (perPersonSubtotal[pid] === undefined) return;
        const cost = perUnit * units;
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
        onParsePlace={parsePlaceReceipts}
        onProceedToTabs={proceedToTabs}
        activePlaceIndex={activePlaceIndex}
        setActivePlaceIndex={setActivePlaceIndex}
        onAddItem={addManualItemToPlace}
        onRemoveItem={removeItemFromPlace}
        onAdjustUnits={adjustItemPersonUnits}
        onSplitEvenly={splitItemEvenly}
        onToggleIncluded={toggleItemPersonIncluded}
        onTogglePersonInPlace={togglePersonInPlace}
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
