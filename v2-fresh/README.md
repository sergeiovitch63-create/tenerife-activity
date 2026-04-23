# Tenerife Activity — v2 Fresh

Nouvelle version du site d'excursions Tenerife, construite de zéro, isolée du projet parent.

- Inspiration UX : GetYourGuide
- Style : Stripe-like (gradients propres, typographie ample, animations fluides)
- Mascotte IA : **Teo**, guide flottant avec chat scripté
- Toutes les données sont **fictives**

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide Icons

## Démarrage

```bash
cd v2-fresh
npm install     # (ou pnpm / yarn)
npm run dev
```

Le site tourne sur **http://localhost:3001** (port différent du projet parent).

## Structure

```
src/
  app/
    page.tsx                        — Home
    activites/page.tsx              — Listing global + filtres
    categorie/[slug]/page.tsx       — Listing par catégorie
    activite/[slug]/page.tsx        — Détail activité (avec options multiples)
    panier/page.tsx                 — Panier
    checkout/page.tsx               — Tunnel 3 étapes
    checkout/confirmation/page.tsx  — Confirmation
  components/
    Header, Footer, Logo
    AIGuide                         — Mascotte Teo + chat
    HeroSearch                      — Barre de recherche Home
    CategoryCard, ActivityCard
    OptionSelector                  — Sélecteur d'options + dates + participants
    Gallery                         — Galerie plein écran
    CartDrawer, FilterBar
  data/
    categories.ts                   — 15 catégories
    activities.ts                   — 20 activités, options multiples
    zones.ts                        — 6 zones de Tenerife
  lib/
    cart.tsx                        — CartProvider (Context + localStorage)
    filter.ts, utils.ts, images.ts
  types/
    index.ts
```

## À ajuster après prototype

- Branding précis (couleurs, logo final, typographie)
- Vraies images (actuellement picsum.photos)
- Teo : branchement à un vrai LLM ou à une base de questions étendue
- Auth / espace client
- Paiement : Stripe / autre
- i18n (FR prêt, reste à activer multi-lang)

## Notes

Tout le contenu est **factice** pour démo. À remplacer par les vraies données métier une fois la direction validée.
