# Fix: Erreur "-1" de l'API Atlantico

## Problème

L'API Atlantico retourne `-1` au lieu du formulaire GetNet, ce qui signifie que la requête de paiement a été **rejetée**.

## Cause

Le code `-1` d'Atlantico signifie généralement :
- **Paramètres invalides** (userId, t_id, t_group, etc.)
- **Date/heure non disponible** pour cet événement
- **Événement non disponible** pour cette date
- **Format de paramètres incorrect**

## Diagnostic

Dans les logs serveur, vous devriez voir :
```
[ATL_PAYMENT_ERROR] Atlantico returned -1 (error): {
  requestDetails: {
    userId: 3645,
    t_id: 2744,
    t_group: 508,
    language: 'ENG',
    tourDate: '2026-02-20',
    tourDateFormatted: '20260220',
    sesTime: '09:00',
    ...
  }
}
```

## Solutions

### 1. Vérifier la disponibilité de la date/heure

La date `2026-02-20` à `09:00` peut ne pas être disponible pour l'événement `t_id=2744`.

**Solution :**
- Vérifiez les disponibilités avec `/api/atlantico/limits/{t_id}/{lang}/{month}`
- Utilisez une date/heure qui est **réellement disponible**
- Testez avec une date dans le futur proche (au moins 1-2 jours)

### 2. Vérifier les paramètres de l'événement

**Vérifiez :**
- `t_id` : L'ID de l'événement existe-t-il ?
- `t_group` : Le groupe est-il correct pour cet événement ?
- `userId` : Le `ATLANTICO_USER_ID` est-il valide et autorisé ?

**Test :**
```bash
# Vérifier les détails de l'événement
GET /api/atlantico/event/2744/ENG
```

### 3. Vérifier le format des paramètres

**Format requis selon PDF section 2.7 :**
- `tourDate` : `YYYYMMDD` (ex: `20260220`) ✅ Correct
- `sesTime` : `HH:mm` (ex: `09:00`) ✅ Correct
- `language` : `ENG`, `CAS`, `FRA`, `RUS`, `ALE`, `ITA` ✅ Correct

### 4. Tester avec des données valides

**Utilisez la page de test :**
1. Accédez à : `http://localhost:3000/api/atlantico/booking/payment/test`
2. **Modifiez les valeurs** :
   - Utilisez une date **disponible** (vérifiez avec `/api/atlantico/limits/`)
   - Utilisez un `t_id` et `t_group` **valides**
   - Utilisez un `sesTime` **disponible** pour cette date

### 5. Vérifier l'environnement

**Pour l'environnement de test :**
```env
ATLANTICO_ENV=test
ATLANTICO_USER_ID=votre_user_id_test
ATLANTICO_TOKEN=votre_token_test
```

**Pour l'environnement de production :**
```env
ATLANTICO_ENV=prod
ATLANTICO_USER_ID=votre_user_id_prod
ATLANTICO_TOKEN=votre_token_prod
```

## Comment obtenir des dates/heures valides

### Option 1: Via l'API limits

```bash
# Obtenir les disponibilités pour février 2026
GET /api/atlantico/limits/2744/ENG/2026-02-01
```

Cela retournera les dates et heures disponibles.

### Option 2: Via le catalogue

1. Accédez à la page de l'activité : `/en/activity/{slug}`
2. Utilisez le calendrier de réservation
3. Sélectionnez une date **disponible** (en vert)
4. Notez l'heure disponible

## Test avec des données valides

Une fois que vous avez une date/heure **vraiment disponible**, testez :

```json
{
  "t_id": "2744",
  "t_group": "508",
  "language": "ENG",
  "tourDate": "20260225",  // Date disponible
  "sesTime": "10:00",      // Heure disponible pour cette date
  "adults": 1,
  "childs": 0,
  "infants": 0,
  "name": "Test User",
  "email": "test@example.com",
  "phone": "+34600000000"
}
```

## Logs détaillés

Le code affiche maintenant des logs détaillés pour identifier le problème :

```
[ATL_PAYMENT_ERROR] Atlantico returned -1 (error): {
  requestDetails: { ... },
  possibleReasons: [
    'Invalid userId (check ATLANTICO_USER_ID)',
    'Invalid t_id or t_group',
    'Invalid tourDate format (should be YYYYMMDD, got: ...)',
    'Invalid sesTime format (should be HH:mm, got: ...)',
    'Date/time not available for this event',
    'Event not available for this date',
    ...
  ]
}
```

## Prochaines étapes

1. **Vérifiez les logs** pour voir les détails de la requête
2. **Vérifiez la disponibilité** avec `/api/atlantico/limits/`
3. **Testez avec une date/heure disponible**
4. **Vérifiez que `ATLANTICO_USER_ID` est valide**

Si le problème persiste après avoir utilisé des données **vraiment disponibles**, le problème peut être :
- `userId` invalide ou non autorisé
- `t_id` ou `t_group` incorrect
- Problème de configuration côté Atlantico



