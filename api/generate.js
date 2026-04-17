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
  const prodsText = prods.map((p,i) => `Produit ${i+1}: ${p.name||"Produit"} ${p.price||""} ${p.link||""}`).join(", ");

  const system = `Tu es le meilleur développeur de boutiques e-commerce au monde. Tu crées des boutiques HTML qui ressemblent exactement à des vraies boutiques Shopify premium comme Gymshark, Sephora, ou les meilleures boutiques dropshipping françaises.

RÈGLE ABSOLUE: Réponds UNIQUEMENT avec le code HTML complet. Zéro texte avant ou après. Zéro backtick.

DESIGN OBLIGATOIRE:
- Police Google Fonts moderne (Poppins ou Montserrat)
- Couleurs cohérentes et professionnelles adaptées à la niche
- Header sticky avec logo texte stylisé + navigation + icône panier avec compteur
- HERO: Grande image de fond Unsplash RÉELLE (https://images.unsplash.com/photo-XXXXX?w=1200&q=80) avec overlay sombre + titre H1 énorme + sous-titre + 2 boutons CTA
- Section bénéfices: 4 cards avec vraies icônes SVG (pas emoji) + titres + descriptions
- Section produits: Cards produits avec VRAIE photo Unsplash (img src direct), badge promotion, nom, prix barré + prix réduit, étoiles ⭐, bouton "Ajouter au panier" qui fonctionne (JS qui ajoute au panier avec notification)
- Bandeau de réassurance: livraison gratuite, satisfait ou remboursé, paiement sécurisé, support 24/7
- Section témoignages: 3 avis avec photo avatar Unsplash, nom, ville, étoiles, texte crédible
- FAQ accordion fonctionnel en JS
- Footer complet avec liens, réseaux sociaux, copyright
- Notification panier en JS (toast en bas à droite)
- Compteur stock qui décompte
- Design 100% responsive mobile
- Animations CSS au scroll (fadeIn)
- AUCUN emoji comme icône principale, utilise des SVG propres`;

  const prompt = `Crée une boutique e-commerce HTML complète ultra premium pour: niche=${config.niche}, langue=${config.langue||"français"}${config.angle?", promesse="+config.angle:""}${config.couleurs?", couleurs="+config.couleurs:""}. Produits: ${prodsText||"produits génériques adaptés à la niche"}. Boutique complète, fonctionnelle, design qui donne envie d'acheter immédiatement.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(500).json({ error: "Erreur API " + r.status + ": " + t.slice(0,200) });
    }
    const data = await r.json();
    let html = (data.content||[]).map(b=>b.text||"").join("").trim();
    html = html.replace(/^```html\n?/i,"").replace(/^```\n?/,"").replace(/\n?```$/,"").trim();
    if (!html.includes("<")) return res.status(500).json({ error: "HTML non genere" });
    return res.status(200).json({ success: true, html });
  } catch(err) {
    return res.status(500).json({ error: "Erreur: "+err.message });
  }
}
