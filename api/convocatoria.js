// Seguridad: solo usuarios autenticados en Firebase pueden usar el endpoint
const FIREBASE_WEB_KEY = process.env.FIREBASE_WEB_API_KEY || "AIzaSyBP3EtZNGNscSUxh6XxZ1viiFN6SNIBA7s";
async function verifyFirebaseToken(idToken) {
  const r = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_WEB_KEY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d.users && d.users[0] ? d.users[0] : null;
}

export default async function handler(req, res) {
  // Mismo origen: sin CORS abierto
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization || "";
  const idToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!idToken) return res.status(401).json({ error: "No autorizado" });
  const user = await verifyFirebaseToken(idToken).catch(() => null);
  if (!user || user.disabled) return res.status(401).json({ error: "No autorizado" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const { prompt, image, imageType } = req.body;
    if (!prompt && !image) return res.status(400).json({ error: "Missing prompt or image" });

    let messages;
    if (image) {
      // Image mode: send image + prompt
      messages = [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: imageType || "image/jpeg",
              data: image
            }
          },
          {
            type: "text",
            text: prompt || "Analiza esta imagen de una convocatoria de fútbol y extrae los datos en JSON según el formato indicado."
          }
        ]
      }];
    } else {
      messages = [{ role: "user", content: prompt }];
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 4000,
        messages
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("convocatoria:", err);
    res.status(500).json({ error: "Error interno" });
  }
}
