import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { barId, prompt } = req.body;

    let existingBar = null;
    let bars = null;
    let docRef = null;

    // Only use Firebase caching when we are fetching details
    // for an existing bar
    if (barId) {
      docRef = db
        .collection("tourDeAlcoholism")
        .doc("sharedList");

      const snapshot = await docRef.get();
      const data = snapshot.data();

      bars = data?.bars || [];

      existingBar = bars.find(
        (bar) => bar.id === barId
      );

      if (!existingBar) {
        return res.status(404).json({
          error: "Bar not found",
        });
      }

      // Return cached result
      if (existingBar.detailsFetched) {
        return res.status(200).json(existingBar);
      }
    }

    // Call Gemini
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const geminiData = await response.json();

    // Surface Gemini errors (quota, invalid key, etc.)
    if (!response.ok) {
      console.error("Gemini error:", geminiData);

      return res.status(response.status).json({
        error: geminiData?.error?.message || "Gemini request failed",
      });
    }

    const description =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("\n") || "";

    // If this was only a suggestion/random search,
    // return Gemini directly and do not touch Firebase
    if (!barId) {
      return res.status(200).json({
        description,
      });
    }

    // Update Firestore cache for existing bar
    const updatedBars = bars.map((bar) => {
      if (bar.id !== barId) {
        return bar;
      }

      return {
        ...bar,
        description,
        detailsFetched: true,
        lastUpdated: new Date().toISOString(),
      };
    });

    await docRef.update({
      bars: updatedBars,
    });

    return res.status(200).json({
      ...existingBar,
      description,
      detailsFetched: true,
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: error.message || "Failed to generate details",
    });
  }
}