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
  const prodsText = prods.map((p,i) => `${p.name||"Produit"} ${p.price||""}`).join(", ");
  const prompt = `Crée une boutique HTML premium pour: ${config.niche}${config.angle?", "+config.angle:""}${config.couleurs?", couleurs: "+config.couleurs:""}. Produits: ${prodsText||"produits de la niche"}. UNIQUEMENT le code HTML, zéro texte autour.`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 6000,
        system: `Tu crées des boutiques e-commerce HTML premium qui ressemblent à de vraies boutiques Shopify professionnelles. RÈGLE: Réponds UNIQUEMENT avec le code HTML complet. Zéro texte avant/après. Zéro backtick. Un seul fichier HTML avec CSS dans style et JS dans script. OBLIGATOIRE: Google Fonts Poppins, design moderne avec vraies couleurs pro, header sticky avec logo + nav + panier, HERO avec grande image Unsplash réelle (https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200), overlay + grand titre + CTA, section bénéfices avec icônes SVG propres PAS D'EMOJIS, cards produits avec photos Unsplash réelles intégrées en img src, prix barré + prix réduit, bouton ajouter au panier en JS avec notification toast, témoignages clients avec avatars Unsplash, FAQ accordion JS, bandeau réassurance, footer complet, 100% responsive, animations CSS.`,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) { const t = await r.text(); return res.status(500).json({ error: "API "+r.status+": "+t.slice(0,200) }); }
    const data = await r.json();
    let html = (data.content||[]).map(b=>b.text||"").join("").trim();
    html = html.replace(/^```html\n?/i,"").replace(/^```\n?/,"").replace(/\n?```$/,"").trim();
    if (!html.includes("<")) return res.status(500).json({ error: "HTML non genere" });
    return res.status(200).json({ success: true, html });
  } catch(err) {
    return res.status(500).json({ error: "Erreur: "+err.message });
  }
}
