export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { config, products } = req.body;
  if (!config || !products) return res.status(400).json({ error: "Paramètres manquants" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Clé API manquante" });

  const prods = products.filter(p => p.link || p.name);

  let userPrompt = `Génère une boutique e-commerce complète en HTML/CSS/JS pour la niche: ${config.niche}.
Langue: ${config.langue || "français"}`;
  if (config.angle) userPrompt += `\nPromesse: ${config.angle}`;
  if (config.couleurs) userPrompt += `\nCouleurs: ${config.couleurs}`;
  if (config.concurrent) userPrompt += `\nInspire-toi de: ${config.concurrent}`;
  userPrompt += `\n\nPRODUITS:\n`;
  prods.forEach((p, i) => {
    userPrompt += `${i+1}. ${p.name || "Produit"}${p.price ? " - " + p.price : ""}${p.link ? " (" + p.link + ")" : ""}\n`;
  });
  userPrompt += `\nGénère une boutique HTML complète, moderne, haute conversion. Réponds UNIQUEMENT avec le code HTML complet, rien d'autre, pas de backtick.`;

  const systemPrompt = `Tu es un expert en création de boutiques e-commerce Shopify et landing pages haute conversion pour le marché français.

Tu génères des boutiques HTML/CSS/JS complètes, autonomes (tout dans un seul fichier), professionnelles et qui convertissent mieux que tous les concurrents.

RÈGLES ABSOLUES:
- Réponds UNIQUEMENT avec le code HTML complet. Zéro texte avant ou après. Zéro backtick.
- Tout en un seul fichier HTML (CSS et JS inclus dans les balises style et script)
- Design premium, moderne, qui inspire confiance
- Utilise Google Fonts pour les polices
- Utilise des couleurs adaptées à la niche
- Images: utilise des URLs Unsplash réelles (https://images.unsplash.com/photo-XXXXX?w=800)

STRUCTURE DE LA BOUTIQUE:
1. Header avec logo + navigation + panier
2. Hero section avec accroche percutante + CTA
3. Section bénéfices (3-4 icônes SVG + textes)
4. Section produits avec cards (photo Unsplash, nom, prix, bouton ajouter au panier)
5. Section preuve sociale (témoignages clients avec étoiles)
6. Section garantie (satisfait ou remboursé 30 jours)
7. Section FAQ accordion
8. Footer complet

COPYWRITING:
- Accroches émotionnelles et percutantes en français
- Bénéfices clairs orientés résultats
- Témoignages crédibles avec prénoms français
- Urgence et rareté subtiles
- Prix barrés avec réduction

DESIGN:
- Palette cohérente adaptée à la niche
- Typographie Google Fonts premium
- Animations CSS subtiles (fade-in, hover effects)
- 100% responsive mobile
- Boutons avec effets hover
- Ombres et bordures arrondies modernes
- Badge "Bestseller", "Stock limité", etc.

FONCTIONNALITÉS JS:
- Compteur de stock qui décompte (ex: "Plus que 7 en stock")
- Timer d'urgence si pertinent
- Accordion FAQ fonctionnel
- Smooth scroll
- Notification "ajout au panier" visuelle`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `API ${response.status}: ${errText.slice(0, 300)}` });
    }

    const data = await response.json();
    let html = (data.content || []).map(b => b.text || "").join("").trim();

    // Nettoyer les backticks si présents
    html = html.replace(/^```html\n?/i, "").replace(/^```\n?/, "").replace(/\n?```$/, "").trim();

    if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
      return res.status(500).json({ error: "HTML invalide généré" });
    }

    return res.status(200).json({ success: true, html });

  } catch (err) {
    return res.status(500).json({ error: "Erreur: " + err.message });
  }
}
