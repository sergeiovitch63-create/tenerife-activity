# Système d'affiliation — Tenerife Activity

Documentation interne du système qui permet à des partenaires (hôtels, influenceurs,
guides locaux, blogs, conciergeries) de promouvoir nos excursions et toucher une
commission sur les ventes qu'ils apportent.

---

## 1. Vue d'ensemble

**Modèle économique v1**

- On revend Atlantico Excursiones avec ~25% de commission qu'Atlantico nous verse.
- On reverse **10% du montant brut** (paramétrable par affilié) au partenaire.
- **Cookie de 30 jours** : un visiteur qui clique le lien d'un affilié et réserve
  dans les 30 jours attribue la vente, même sur une activité différente.

**Architecture en deux plans**

| Plan | Route | Qui y va | Authentification |
|---|---|---|---|
| Back-office admin | `/back-office/*` | Nous (équipe Tenerife Activity) | `ADMIN_PASSWORD` → cookie `admin_session` |
| Dashboard affilié | `/affiliate/*` | Nos partenaires | Magic link généré par admin → cookie `ta_affiliate_session` |
| Tracking public | `/r/[code]` | Tout le monde | Pas d'auth, pose cookies `ta_affiliate_ref` et `ta_affiliate_visitor` |

---

## 2. Flux de tracking

```
 Partenaire partage /r/TESTHOTEL?to=/fr/activite/freebird
          │
          ▼
[middleware/route /r] pose cookies : aff_ref=TESTHOTEL (HttpOnly, 30j)
                                     aff_visitor=<uuid> (HttpOnly, 30j)
          │ redirect 302
          ▼
Visiteur sur /fr/activite/freebird, navigue normalement
          │
          ▼
Clique « Payer » → POST /api/atlantico/booking/payment
          │
          ▼
Notre backend POST api.tenerife-activity.com/payment/ (proxy)
          │ reçoit HTML Redsys
          ▼
[HOOK affiliation] extractBookingDataFromHtml(html) →
                   INSERT affiliate_sales (
                     affiliate_code=TESTHOTEL,
                     booking_reference=DS_MERCHANT_ORDER,
                     amount=AMOUNT/100,
                     commission_amount=amount*10/100,
                     status='pending'
                   )
          │
          ▼
HTML auto-submit pipé au navigateur → Redsys → paiement
          │
          ▼
Redsys → Atlantico confirm.php (on N'EST PAS dans la boucle)
User atterrit sur app.atlanticoexcursiones.com/print_termica.php
```

**Point critique** : le retour du paiement ne passe pas par nous. Atlantico encaisse
et informe le client par email. On a donc seulement le statut `pending` côté base,
jusqu'à reconciliation manuelle depuis l'admin.

---

## 3. Tables Neon

`db/affiliate.sql` crée 5 tables (idempotent) :

| Table | Rôle |
|---|---|
| `affiliates` | Liste des partenaires (code, nom, email, commission%, status) |
| `affiliate_sales` | Ventes attribuées (booking_ref, amount, commission_amount, status) |
| `affiliate_clicks` | Log de chaque clic vers `/r/[code]` (stats, fraude) |
| `affiliate_sessions` | Tokens magic link pour dashboard partenaire |
| `admin_sessions` | Sessions cookie du back-office admin |

**Status `affiliate_sales`** :
- `pending` → vente venant d'être hookée, paiement en cours
- `confirmed` → admin a validé (manuellement ou via reconcile)
- `cancelled` → annulée
- `paid` → commission versée à l'affilié

---

## 4. Variables d'env

```bash
# Obligatoire
ATLANTICO_BASE_URL=https://api.tenerife-activity.com   # le proxy, PAS api.atlanticoexcursiones.com
ATLANTICO_USER_ID=3645                                  # fonctionne uniquement via le proxy
ADMIN_PASSWORD=...                                      # mot de passe back-office
POSTGRES_URL=postgresql://...                           # Neon (via intégration Vercel auto)
DATABASE_URL=...                                        # alias, même valeur

# Recommandé
AFFILIATE_IP_SALT=<32+ hex chars>                       # sel pour hash IP GDPR-safe
NEXT_PUBLIC_SITE_URL=https://www.tenerife-activity.com  # base URL pour les liens partagés
```

---

## 5. Parcours admin

1. Va sur `/back-office` → redirect vers `/back-office/login` → saisis `ADMIN_PASSWORD`
2. **Dashboard** (`/back-office`) : KPI globaux (total affiliés, ventes pending/confirmed, commissions à vie)
3. **Affiliés** (`/back-office/affiliates`) :
   - Liste filtrable par statut
   - Bouton « + Nouvel affilié »
4. **Créer un affilié** (`/back-office/affiliates/new`) :
   - Code (slug URL-safe), nom, email, commission%, statut initial
5. **Détail** (`/back-office/affiliates/[code]`) :
   - Stats + édition (nom, email, rate, statut)
   - 🔑 Générer magic link (à copier/envoyer au partenaire)
   - ✓ Marquer pending → confirmed
   - € Payout (confirmed → paid)
   - Historique complet des ventes
6. **Payouts** (`/back-office/affiliates/payouts`) : vue consolidée des montants à verser

---

## 6. Parcours affilié

1. Reçoit le magic link de l'admin : `https://site/affiliate/auth?token=XXX`
2. Clique → cookie session posé → redirect vers `/affiliate/dashboard`
3. **Dashboard** : clics (30j + total), taux de conversion, ventes confirmées, commission gagnée, actions rapides, 10 ventes récentes
4. **Mes liens** (`/affiliate/links`) : générateur de liens (home / activité / custom path) + QR code téléchargeable
5. **Commissions** (`/affiliate/payouts`) : historique complet des ventes avec statut
6. **Paramètres** : modifier son email de contact (le reste est admin-only)

---

## 7. Check-list de test manuel (avant ship)

### Pré-requis
```bash
# Dans le worktree
npm install
npm run dev  # port 3001
```

### Parcours admin
- [ ] `http://localhost:3001/back-office` → redirige vers `/back-office/login`
- [ ] Login `E2g0O0r3` → dashboard affiché
- [ ] Dashboard affiche « Affiliés total : 1 » (TESTHOTEL seed)
- [ ] `/back-office/affiliates` → TESTHOTEL dans la liste, status actif, 10%
- [ ] Crée un 2e affilié « hotel-test » / nom « Hotel Test » / 15%
- [ ] Redirect vers `/back-office/affiliates/hotel-test` (page détail)
- [ ] Clique « Générer magic link » → URL mauve affichée, copie-la
- [ ] Logout admin

### Parcours affilié
- [ ] Ouvre le magic link → cookie posé → landing sur `/affiliate/dashboard`
- [ ] Header affiche « Hotel Test (hotel-test) »
- [ ] `/affiliate/links` → change le type de lien, la langue → URL + QR se mettent à jour
- [ ] `/affiliate/payouts` → vide au début, message « Pas encore de vente »
- [ ] `/affiliate/settings` → change l'email → flash « mis à jour »
- [ ] Logout affilié → redirect login

### Parcours tracking de conversion
- [ ] Vide les cookies du navigateur
- [ ] Visite `http://localhost:3001/r/hotel-test?to=/fr` → redirect vers `/fr`
- [ ] Vérifie en DevTools que `ta_affiliate_ref` et `ta_affiliate_visitor` sont posés
- [ ] `SELECT * FROM affiliate_clicks WHERE affiliate_code='hotel-test';` → 1 ligne
- [ ] Lance le curl de test pour simuler un paiement :
  ```bash
  curl -v -b "ta_affiliate_ref=hotel-test" \
    -X POST http://localhost:3001/api/atlantico/booking/payment \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "userId=3645&t_id=580&t_group=69&language=ENG&tourDate=20260424&sesTime=10:00&adults=2&childs=0&infants=0&name=Juan+Garcia&email=test@gmail.com&phone=+34612345678"
  ```
- [ ] Le curl renvoie le HTML Redsys (tag `<form>` action redsys.es)
- [ ] `SELECT * FROM affiliate_sales WHERE affiliate_code='hotel-test';` → 1 ligne, `status=pending`, `commission_amount` = 15% du montant
- [ ] Reconnecte-toi admin, va sur `/back-office/affiliates/hotel-test` → la vente apparaît dans l'historique
- [ ] Clique « Marquer pending → confirmed » → flash « 1 vente marquée confirmée »
- [ ] `/back-office/affiliates/payouts` → Hotel Test listé avec montant dû
- [ ] Clique « Payer X € » → flash « Payout effectué : 1 ventes, X € »
- [ ] Reconnecte-toi affilié → dashboard montre 1 vente, 1 commission gagnée, X € versés

### Cas d'erreur
- [ ] Lien magic link invalide (`/affiliate/auth?token=xxx`) → redirect login avec erreur
- [ ] Affilié suspendu : magic link existant ne doit plus fonctionner (verify échoue)
- [ ] Sans cookie `ta_affiliate_ref`, le curl de paiement log `no_affiliate_cookie`, aucune ligne insérée
- [ ] Avec cookie mais code inexistant, même chose avec `unknown_affiliate`
- [ ] Re-POST du même paiement (même booking_reference) → log `duplicate`, pas de doublon

---

## 8. Ce qui N'EST PAS dans v1

- **Retour automatique du statut paiement** : Atlantico ne nous envoie pas de webhook.
  Reconciliation manuelle depuis l'admin en attendant.
- **Versement automatique des commissions** : aucun Stripe Connect / virement auto.
  L'admin clique « Payer » après avoir fait le virement à la main.
- **Email magic link** : pas de service SMTP / Resend configuré. L'admin copie le
  lien et l'envoie manuellement (email, WhatsApp, etc.).
- **Multi-tier / sous-affiliés** : chaque vente = 1 affilié, pas de hiérarchie.
- **Codes promo affilié** : un affilié = un lien, pas de code de réduction pour le
  visiteur.
- **Postback serveur pour réseaux externes** (AWIN, CJ, etc.) : à prévoir si on
  rejoint un réseau plus tard.
- **Anti-fraude avancée** : self-referral / same-IP limit sont listés dans le plan
  original mais pas implémentés. Le volume initial ne le justifie pas.

---

## 9. Fichiers clés

### Backend / DB
- `db/affiliate.sql` — schéma idempotent des 5 tables
- `src/lib/db/postgres.ts` — client Neon
- `src/lib/affiliate/*` — ref parsing, tracking clicks, conversion recording,
  Redsys parser, commission math, sessions affilié
- `src/lib/back-office/*` — admin auth, helpers DB affiliés, constants

### Routes
- `src/middleware.ts` — route auth + capture `?ref=CODE`
- `src/app/r/[code]/route.ts` — tracking redirect
- `src/app/api/atlantico/booking/payment/route.ts` — hook affiliation (lignes ~1225 et ~1090)
- `src/app/api/affiliate/*` — track, logout, settings
- `src/app/api/back-office/*` — login, logout, affiliates CRUD, magic-link
- `src/app/back-office/**` — pages admin
- `src/app/affiliate/**` — pages partenaires

### Scripts utilitaires
- `scripts/sniff-payment-html.ts` — capture le HTML `/payment/` d'Atlantico
- `scripts/test-redsys-parser.ts` — smoke test du parser sur HTML réel
