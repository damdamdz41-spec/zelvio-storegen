export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Cle API manquante" });

  const { config, products } = req.body || {};
  if (!config) return res.status(400).json({ error: "Config manquante" });

  const prods = (products || []).filter(p => p.link || p.name);

  let prompt = `Cree une boutique e-commerce HTML complete pour la niche: ${config.niche}. Langue: ${config.langue || "francais"}.`;
  if (config.angle) prompt += ` Promesse: ${config.angle}.`;
  if (config.couleurs) prompt += ` Couleurs: ${config.couleurs}.`;
  prods.forEach((p, i) => {
    prompt += ` Produit ${i+1}: ${p.name || "Produit"}${p.price ? " a "+p.price : ""}${p.link ? " ("+p.link+")" : ""}.`;
  });
  prompt += ` Genere UNIQUEMENT le code HTML complet sans backtick ni texte autour.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        system: "Tu es expert en creation de boutiques e-commerce haute conversion pour le marche francais. Genere une boutique HTML/CSS/JS complete en UN SEUL fichier. Tout le CSS dans style et JS dans script. REGLE ABSOLUE: Reponds UNIQUEMENT avec le code HTML. Zero texte avant ou apres. Zero backtick. La boutique doit avoir: header avec nav, hero percutant, benefices, produits avec vraies photos Unsplash, temoignages, FAQ accordion, footer. Design premium, responsive, animations CSS, copywriting emotionnel en francais.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(500).json({ error: "Erreur API " + r.status + ": " + t.slice(0, 200) });
    }

    const data = await r.json();
    let html = (data.content || []).map(b => b.text || "").join("").trim();
    html = html.replace(/^```html\n?/i, "").replace(/^```\n?/, "").replace(/\n?```$/, "").trim();

    if (!html.includes("<")) {
      return res.status(500).json({ error: "HTML non genere: " + html.slice(0, 200) });
    }

    return res.status(200).json({ success: true, html });

  } catch (err) {
    return res.status(500).json({ error: "Erreur: " + err.message });
  }
}
