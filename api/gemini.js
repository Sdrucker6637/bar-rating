import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { barId, prompt } = req.body;

    const docRef = db
      .collection("tourDeAlcoholism")
      .doc("sharedList");

    const snapshot = await docRef.get();
    const data = snapshot.data();

    const bars = data.bars || [];

    const existingBar = bars.find(
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

    // Call Gemini only once
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
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

    const description =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("\n") || "";

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
    console.error(error);

    return res.status(500).json({
      error: "Failed to generate details",
    });
  }
}