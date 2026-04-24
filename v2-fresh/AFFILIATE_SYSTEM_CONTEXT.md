# Tenerife Activity — Contexte complet pour construire le système d'affiliation

> **Comment utiliser ce document :** ouvre une nouvelle session Claude Code (dans ce même worktree ou ailleurs) et colle le contenu de ce fichier comme premier message avec la phrase : *"Construis le système d'affiliation en suivant ce contexte. Commence par la Phase 1."*

---

## 1. Contexte métier

**Tenerife Activity** est une marketplace qui vend des excursions à Tenerife. Elle est revendeur officiel d'**Atlantico Excursiones** (fournisseur local) sous contrat commissionné **20-30%** sur chaque réservation.

**Objectif du système d'affiliation :** permettre à des partenaires externes (hôtels, influenceurs, guides locaux, blogs voyage, conciergeries) de promouvoir nos excursions et toucher une part de NOTRE commission quand leurs visiteurs réservent.

**Modèle économique indicatif à valider avec le user :**
- Nous encaissons 25% du prix de la vente d'Atlantico (commission moyenne)
- Nous reversons 5-15% à l'affilié sur ce même prix de vente (à paramétrer par affilié)
- Notre marge nette = 25% - commission affilié - frais Stripe/Redsys
- Tracking cookie de 30 jours recommandé (Booking.com = 30j, GetYourGuide = 30j, Viator = 365j)

---

## 2. Stack technique existant

**Worktree :** `C:\dev\TENERIFE-ACTIVITY\.claude\worktrees\distracted-hamilton-d29bb0\v2-fresh\`

**Stack :**
- Next.js 14.2.15 (App Router)
- TypeScript
- Tailwind CSS + Framer Motion + Lucide icons
- Pas de ORM : requêtes Supabase directes via `@supabase/supabase-js`
- Middleware : `src/middleware.ts` (à créer/étendre — n'existe pas encore dans CE worktree)
- Port dev : **3001**
- Locales : `fr, en, es, de, it, ru` (dossier `[locale]`)

**Admin back office :** a été construit dans une **autre session / un autre worktree**. Référence dans `C:\Users\ПК\.claude\projects\C--dev-TENERIFE-ACTIVITY\memory\project_backoffice.md` :
- Routes `/admin` hors `[locale]`
- Auth cookie HttpOnly `admin_session`
- Tables Supabase : `admin_sessions`, `excursion_settings`, `excursion_overrides`
- Schéma dans `supabase/admin_schema.sql` (dans l'autre worktree)
- Client Supabase server-only dans `src/lib/supabase/server.ts`

> **Action demandée à l'agent qui reprendra :** commencer par vérifier la présence de `src/app/admin/`, `src/lib/supabase/`, `src/middleware.ts` dans CE worktree. Si absents, récupérer depuis le worktree principal ou les recréer d'après MEMORY.md.

**Variables d'env attendues (`.env.local`) :**
```
ATLANTICO_PROXY_URL=https://api.tenerife-activity.com
ATLANTICO_USER_ID=3645
ADMIN_PASSWORD=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 3. Points d'intégration existants à connaître

**Flux de paiement actuel (`src/app/api/booking/init/route.ts`) :**
1. Form POST `/api/booking/init` depuis le checkout (form-urlencoded)
2. Server ajoute `userId=3645` (collaborateur Tenerife Activity)
3. POST vers Atlantico `/payment/` (proxy `api.tenerife-activity.com`)
4. Atlantico répond soit 302 redirect vers Redsys, soit HTML auto-submit
5. Server pipe la réponse au navigateur

> **Hook critique :** c'est exactement ici qu'on doit capturer l'ID d'affilié pour l'attacher à la commande. Avant le POST vers Atlantico, on lit le cookie `aff_id` et on stocke `{ affiliateId, bookingRef, amount, status: 'pending' }` en base.

**Types Atlantico (`src/lib/atlantico/types.ts`) :** `AtlanticoGroup`, `AtlanticoEvent`, `ParsedPrice`. Les prix contiennent déjà `adultCommission`, `childCommission`, `infantCommission` — ces champs sont la commission QU'ATLANTICO NOUS donne. C'est la base de calcul pour ce qu'on reverse à l'affilié.

**Client Atlantico (`src/lib/atlantico/client.ts`) :** server-only, contient `createPayment`, `getPrices`, `getLimits`, etc.

**Confirmation post-paiement :** le user revient sur `/[locale]/checkout/confirmation?ref=XXX`. C'est là qu'on marque la conversion affilié comme `confirmed` si la réf existe.

---

## 4. Architecture proposée du système d'affiliation

### 4.1 Tables Supabase à créer

```sql
-- Affiliés
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,              -- slug court ex: "hotel-h10"
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  type TEXT NOT NULL,                     -- 'hotel' | 'influencer' | 'blog' | 'concierge' | 'guide'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'suspended'
  commission_rate NUMERIC(5,2) NOT NULL,  -- % reversé (ex: 10.00 pour 10%)
  commission_base TEXT NOT NULL DEFAULT 'gross', -- 'gross' (sur CA) | 'net' (sur notre commission)
  cookie_window_days INT NOT NULL DEFAULT 30,
  payout_method TEXT,                     -- 'bank' | 'paypal' | 'wise'
  payout_details JSONB,                   -- IBAN, email paypal, etc.
  tax_info JSONB,                         -- TVA, SIRET, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- Clics (pour stats, anti-fraude)
CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  landing_url TEXT NOT NULL,
  activity_code TEXT,                     -- si lien deep vers une activité
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,                           -- hash GDPR-safe
  country TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  visitor_id TEXT NOT NULL                -- cookie UUID côté visiteur
);

-- Conversions (réservations attribuées)
CREATE TABLE affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  booking_ref TEXT UNIQUE NOT NULL,       -- réf Atlantico
  visitor_id TEXT,                        -- lien vers clic
  activity_code TEXT NOT NULL,
  gross_amount NUMERIC(10,2) NOT NULL,    -- prix payé client
  our_commission NUMERIC(10,2) NOT NULL,  -- ce qu'Atlantico nous verse
  affiliate_commission NUMERIC(10,2) NOT NULL, -- ce qu'on doit à l'affilié
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'cancelled' | 'paid'
  first_click_at TIMESTAMPTZ,
  last_click_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  paid_in_payout UUID REFERENCES affiliate_payouts(id)
);

-- Payouts (versements groupés)
CREATE TABLE affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  conversions_count INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'paid' | 'failed'
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions affilié (dashboard)
CREATE TABLE affiliate_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversions_affiliate_status ON affiliate_conversions(affiliate_id, status);
CREATE INDEX idx_clicks_affiliate_date ON affiliate_clicks(affiliate_id, clicked_at);
CREATE INDEX idx_clicks_visitor ON affiliate_clicks(visitor_id);
```

### 4.2 Routes à créer

**Public / tracking :**
- `GET /r/[code]` — endpoint de redirection depuis les liens affiliés : pose 2 cookies (`aff_id` = code, `aff_visitor` = UUID), log le clic, redirige vers la destination (query `?to=/fr/activite/X` ou `/fr` par défaut)
- `GET /r/[code]/activite/[activityCode]` — variante deep link

**Affilié (dashboard self-service) :**
- `/affiliate/login` (magic link email)
- `/affiliate/dashboard` — stats : clics, conversions, gains, taux de conversion
- `/affiliate/links` — générateur de liens (home, par catégorie, par activité) avec copier-coller + QR code
- `/affiliate/payouts` — historique versements
- `/affiliate/materials` — bannières, codes promo, flyers PDF téléchargeables
- `/affiliate/settings` — infos de paiement, TVA

**Admin :**
- `/admin/affiliates` — liste, approuver/suspendre
- `/admin/affiliates/[id]` — détail, éditer taux, historique
- `/admin/affiliates/payouts` — payouts pending, générer run mensuel
- `/admin/affiliates/analytics` — top affiliés, fraude detection

**API interne :**
- `POST /api/affiliate/track-click` — log un clic (appelé depuis `/r/[code]`)
- `POST /api/affiliate/track-conversion` — hook interne appelé depuis `/api/booking/init` APRÈS retour Atlantico si cookie `aff_id` présent
- `POST /api/admin/affiliate/create` — créer un affilié (admin auth)
- `POST /api/admin/affiliate/approve` — activer
- `POST /api/admin/affiliate/payout-run` — générer les payouts du mois

### 4.3 Middleware — extension à prévoir

Le middleware actuel gère `[locale]` + auth `/admin`. Il faut ajouter :
1. **Intercepter `/r/...`** hors locale : lire `code`, set cookies `aff_id` (httpOnly=false pour debug côté client OK ou httpOnly=true via endpoint dédié), redirect vers destination
2. **Lire cookie `aff_id`** sur toutes les requêtes et l'exposer via header ou context pour le tracking de conversion
3. **Protéger `/affiliate/*`** : cookie `affiliate_session` sinon redirect `/affiliate/login`

### 4.4 Hook de conversion dans `/api/booking/init`

Modifier `src/app/api/booking/init/route.ts` pour :
1. Lire le cookie `aff_id` + `aff_visitor` avant le POST Atlantico
2. Extraire le `bookingRef` de la réponse Atlantico (à parser selon le format réel : peut être dans le HTML auto-submit ou dans la query string du location)
3. Si `aff_id` présent ET `bookingRef` extrait : INSERT dans `affiliate_conversions` avec status='pending' et calcul commission
4. Ne PAS bloquer le paiement si l'insert échoue (log + continue)

Sur `/checkout/confirmation?ref=XXX` → UPDATE status='confirmed'.

---

## 5. Calcul de la commission affiliée

Deux modes à supporter (choix par affilié, champ `commission_base`) :

**Mode `gross`** (plus simple, plus généreux côté affilié) :
```
affiliate_commission = gross_amount * affiliate.commission_rate / 100
```

**Mode `net`** (protège notre marge) :
```
affiliate_commission = our_commission * affiliate.commission_rate / 100
```

où `our_commission` est calculé depuis `ParsedPrice.adultCommission * nAdults + childCommission * nChildren + ...` (ces champs viennent d'Atlantico `loadPrices`).

**Règles anti-fraude minimales pour v1 :**
- Self-referral bloqué (email affilié == email booking → reject)
- Same-IP limitation : max 5 conversions / 24h depuis la même IP hashée
- Cookie window : si last_click_at > 30j, ignorer le cookie

---

## 6. Scope v1 (1-2 jours de dev)

**MUST HAVE :**
- [ ] Tables Supabase + migration SQL
- [ ] Route `/r/[code]` qui pose les cookies et redirige
- [ ] Hook tracking conversion dans `/api/booking/init`
- [ ] Confirmation de conversion sur `/checkout/confirmation`
- [ ] Page admin `/admin/affiliates` (liste + créer manuellement + activer)
- [ ] Dashboard affilié minimaliste : login magic link, stats basiques, générateur de liens

**NICE TO HAVE v1.5 :**
- [ ] Matériel marketing (bannières)
- [ ] Codes promo par affilié (10% pour le visiteur, moins de commission pour l'affilié)
- [ ] Payout run automatique mensuel via Stripe Connect
- [ ] Tracking postback pour réseaux externes (AWIN, CJ)

**v2 :**
- [ ] Multi-tier (sous-affiliés)
- [ ] Leaderboard gamification
- [ ] Attribution multi-touch (first-click vs last-click option)

---

## 7. Phases d'exécution recommandées

**Phase 1 — Foundation (3-4h)**
1. Vérifier existence admin + supabase client dans CE worktree
2. Écrire + appliquer la migration SQL (`supabase/affiliate_schema.sql`)
3. Créer `src/lib/affiliate/` : `types.ts`, `tracking.ts` (cookies + click log), `commission.ts` (calcul)
4. Implémenter `/r/[code]/route.ts` (Next.js Route Handler)

**Phase 2 — Conversion tracking (2h)**
5. Patcher `/api/booking/init` pour capturer `aff_id` et logger la conversion
6. Patcher `/checkout/confirmation` pour marquer `confirmed`

**Phase 3 — Dashboard affilié (3-4h)**
7. Pages `/affiliate/login` (magic link), `/affiliate/dashboard`, `/affiliate/links`
8. Auth : table `affiliate_sessions`, cookie `affiliate_session`, middleware

**Phase 4 — Admin (2h)**
9. Pages `/admin/affiliates/*`
10. API routes CRUD + approval

**Phase 5 — Tests bout-en-bout**
11. Créer un affilié test, cliquer sur `/r/test-code?to=/fr/activite/42`, faire une résa, vérifier que la conversion apparaît avec la bonne commission

---

## 8. Design system (réutiliser l'existant)

- Couleurs de marque : dans `tailwind.config.ts` et `src/lib/category-theme.ts`
- Composants UI existants réutilisables : voir `src/components/` (Button patterns, Card patterns, forms du checkout)
- Illustrations / mascotte Teo : dispos dans les dictionnaires i18n (`src/i18n/dictionaries/*.ts`)
- Dashboards : s'inspirer de Stripe Connect pour la clarté (KPI cards en haut, graphique, table)

---

## 9. Questions à poser au user avant de commencer

1. **Commission par défaut** : on part sur 10% `gross` ou 30% `net` ? (équivalent ≈ 7.5% de CA avec commission Atlantico 25%)
2. **Fenêtre cookie** : 30j OK comme défaut ?
3. **Paiement affilié** : Stripe Connect (auto) ou virement manuel au début (manual run admin) ?
4. **Magic link** : via Resend, SendGrid, ou autre service email déjà configuré ?
5. **Le back office admin existe-t-il dans ce worktree ou faut-il le porter depuis l'autre ?**

---

## 10. Références rapides

- Contrat Atlantico : commission ~25% (à confirmer par user)
- `userId` collaborateur : `3645` (env `ATLANTICO_USER_ID`)
- Proxy Atlantico : `api.tenerife-activity.com`
- Langues API Atlantico : FRA, ENG, CAS, ALE, ITA, RUS → locales site fr/en/es/de/it/ru
- Port dev : 3001

**Fichiers clés à lire en premier par l'agent qui reprend :**
- `src/app/api/booking/init/route.ts` (flux paiement — point d'ancrage de la conversion)
- `src/lib/atlantico/types.ts` (structure des prix, commissions)
- `src/lib/atlantico/client.ts` (exemple de pattern server-only Supabase peut suivre)
- `C:\Users\ПК\.claude\projects\C--dev-TENERIFE-ACTIVITY\memory\project_backoffice.md`

**Ne pas toucher :**
- Le flux de paiement Atlantico lui-même (sensible, testé, fonctionnel)
- Les dictionnaires i18n sauf pour ajouter les libellés affiliation
- `src/app/[locale]/activite/[code]/page.tsx` (en cours de refonte personnalisation dans une autre session)
