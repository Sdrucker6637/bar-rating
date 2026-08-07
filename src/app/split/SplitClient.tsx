"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import SplitBillView from "@/components/SplitBillView";
import TabIntro from "@/components/TabIntro";
import type { SplitItem, SplitPerson, SplitTotals } from "@/lib/types";

type SplitStep = "names" | "receipt" | "assign" | "summary";

interface ReceiptImage {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

export default function SplitClient() {
  const [splitStep, setSplitStep] = useState<SplitStep>("names");
  const [splitPeople, setSplitPeople] = useState<SplitPerson[]>([]);
  const [splitNameInput, setSplitNameInput] = useState("");
  const [splitReceiptImage, setSplitReceiptImage] =
    useState<ReceiptImage | null>(null);
  const [splitParsing, setSplitParsing] = useState(false);
  const [splitParseError, setSplitParseError] = useState<string | null>(null);
  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
  const [splitTax, setSplitTax] = useState(0);
  const [splitTip, setSplitTip] = useState(0);

  function resetSplitBill() {
    setSplitStep("names");
    setSplitPeople([]);
    setSplitNameInput("");
    setSplitReceiptImage(null);
    setSplitParsing(false);
    setSplitParseError(null);
    setSplitItems([]);
    setSplitTax(0);
    setSplitTip(0);
  }

  function addSplitPerson() {
    const name = splitNameInput.trim();
    if (!name) return;
    setSplitPeople((prev) => [
      ...prev,
      { id: `p${Date.now()}${Math.random()}`, name },
    ]);
    setSplitNameInput("");
  }

  function removeSplitPerson(id: string) {
    setSplitPeople((prev) => prev.filter((p) => p.id !== id));
    setSplitItems((prev) =>
      prev.map((it) => {
        const nextAssigned = { ...it.assignedTo };
        delete nextAssigned[id];
        return { ...it, assignedTo: nextAssigned };
      }),
    );
  }

  function handleReceiptFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setSplitReceiptImage({
        base64,
        mimeType: file.type || "image/jpeg",
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  }

  async function parseSplitReceipt() {
    if (!splitReceiptImage) return;
    setSplitParsing(true);
    setSplitParseError(null);
    try {
      const response = await fetch("/api/split-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: splitReceiptImage.base64,
          mimeType: splitReceiptImage.mimeType,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.result) {
        setSplitParseError(data.error || "Couldn't read that receipt.");
        setSplitParsing(false);
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
      setSplitItems(items);
      setSplitTax(data.result.tax || 0);
      setSplitTip(data.result.tip || 0);
      setSplitParsing(false);
      setSplitStep("assign");
    } catch (e) {
      setSplitParseError("Something went wrong reading that image.");
      setSplitParsing(false);
    }
  }

  function addManualSplitItem() {
    const name = window.prompt("Item name?", "");
    if (!name || !name.trim()) return;
    const priceInput = window.prompt(
      `Total price for "${name.trim()}"?`,
      "",
    );
    const price = Number(priceInput);
    if (!Number.isFinite(price) || price < 0) return;
    const qtyInput = window.prompt("Quantity? (leave blank for 1)", "1");
    const quantity = Math.max(1, Number(qtyInput) || 1);
    setSplitItems((prev) => [
      ...prev,
      {
        id: `item${Date.now()}`,
        name: name.trim(),
        price,
        quantity,
        assignedTo: {},
      },
    ]);
  }

  function removeSplitItem(id: string) {
    setSplitItems((prev) => prev.filter((it) => it.id !== id));
  }

  // Adjusts how many units of an item are assigned to one person, by
  // `delta` (+1 or -1). Refuses to go below 0 or above the item's
  // remaining unassigned units.
  function adjustItemPersonUnits(itemId: string, personId: string, delta: number) {
    setSplitItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const current = it.assignedTo[personId] || 0;
        const assignedSum = Object.values(it.assignedTo).reduce(
          (a, c) => a + c,
          0,
        );
        const remaining = it.quantity - assignedSum;
        let nextUnits = current + delta;
        if (nextUnits < 0) nextUnits = 0;
        if (delta > 0 && remaining <= 0) return it; // no units left to give out
        if (nextUnits > it.quantity) nextUnits = it.quantity;
        const nextAssigned = { ...it.assignedTo };
        if (nextUnits === 0) {
          delete nextAssigned[personId];
        } else {
          nextAssigned[personId] = nextUnits;
        }
        return { ...it, assignedTo: nextAssigned };
      }),
    );
  }

  // Divides an item's full quantity evenly across exactly the given
  // set of person IDs, overwriting any prior assignment for this item.
  function splitItemEvenly(itemId: string, personIds: string[]) {
    setSplitItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        if (personIds.length === 0) return { ...it, assignedTo: {} };
        const share = it.quantity / personIds.length;
        const nextAssigned: Record<string, number> = {};
        personIds.forEach((pid) => {
          nextAssigned[pid] = share;
        });
        return { ...it, assignedTo: nextAssigned };
      }),
    );
  }

  // Toggles whether a person is included in an item at all. Turning
  // someone off removes their share; turning someone on gives them a
  // share equal to 1 unit (or the whole item, for quantity-1 items) —
  // "Split evenly" can then be used to rebalance after toggling.
  function toggleItemPersonIncluded(itemId: string, personId: string) {
    setSplitItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const nextAssigned = { ...it.assignedTo };
        if (nextAssigned[personId]) {
          delete nextAssigned[personId];
        } else {
          nextAssigned[personId] = Math.min(1, it.quantity);
        }
        return { ...it, assignedTo: nextAssigned };
      }),
    );
  }

  // Tax and tip are then allocated to each person proportional to their
  // share of the pre-tax subtotal.
  const splitTotals: SplitTotals = useMemo(() => {
    const perPersonSubtotal: Record<string, number> = {};
    splitPeople.forEach((p) => (perPersonSubtotal[p.id] = 0));

    let assignedSubtotal = 0;
    splitItems.forEach((it) => {
      const q = it.quantity || 1;
      const perUnit = it.price / q;
      Object.entries(it.assignedTo).forEach(([pid, units]) => {
        if (perPersonSubtotal[pid] === undefined) return; // person was removed
        const cost = perUnit * units;
        perPersonSubtotal[pid] += cost;
        assignedSubtotal += cost;
      });
    });

    const extra = Number(splitTax || 0) + Number(splitTip || 0);
    const extraPerPerson =
      splitPeople.length > 0 ? extra / splitPeople.length : 0;
    const perPersonTotal: Record<string, number> = {};
    splitPeople.forEach((p) => {
      const sub = perPersonSubtotal[p.id] || 0;
      perPersonTotal[p.id] = sub + extraPerPerson;
    });

    const unassignedUnitsCount = splitItems.reduce((sum, it) => {
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
  }, [splitItems, splitPeople, splitTax, splitTip]);

  function buildSplitMessage() {
    const lines = splitPeople.map(
      (p) =>
        `${p.name}: $${(splitTotals.perPersonTotal[p.id] || 0).toFixed(2)}`,
    );
    return `Bill split:\n${lines.join("\n")}`;
  }

  function sendSplitText() {
    const message = buildSplitMessage();
    const smsUrl = `sms:?&body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  }

  return (
    <div>
      <TabIntro
        title="Split the Bill"
        sub="Add your crew, snap the itemized receipt, and divide the tab fairly — no math required."
      />
      <SplitBillView
        step={splitStep}
        setStep={setSplitStep}
        people={splitPeople}
        nameInput={splitNameInput}
        setNameInput={setSplitNameInput}
        onAddPerson={addSplitPerson}
        onRemovePerson={removeSplitPerson}
        receiptImage={splitReceiptImage}
        onFileChange={handleReceiptFileChange}
        onParseReceipt={parseSplitReceipt}
        parsing={splitParsing}
        parseError={splitParseError}
        items={splitItems}
        onAddItem={addManualSplitItem}
        onRemoveItem={removeSplitItem}
        onAdjustUnits={adjustItemPersonUnits}
        onSplitEvenly={splitItemEvenly}
        onToggleIncluded={toggleItemPersonIncluded}
        tax={splitTax}
        tip={splitTip}
        totals={splitTotals}
        onSendText={sendSplitText}
        onReset={resetSplitBill}
      />
    </div>
  );
}
