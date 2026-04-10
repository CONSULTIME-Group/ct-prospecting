# Consultime Prospecting Engine v4

Outil de prospection B2B pour l'équipe commerciale Consultime (FI / FE / FC).

## Ce que fait l'outil
- Génère des prospects qualifiés avec analyse MEDDIC complète
- TJM marché, CA potentiel estimé, angle Consultime, profil type
- Séquence J0–J21 personnalisée par lead (LinkedIn + Email + Téléphone)
- Scripts objections sectoriels
- Pipeline de suivi avec statuts
- Export CSV enrichi
- Cache 1h sur les recherches identiques

---

## Déploiement en 5 étapes (~20 min)

### 1. GitHub — créer le repo
1. github.com → **New repository** → nom : `ct-prospecting` → **Create**
2. Upload tous les fichiers de ce dossier dans le repo

### 2. Vercel — connecter le repo
1. vercel.com → **Add New Project**
2. Importer le repo `ct-prospecting`
3. Framework : **Next.js** (détecté automatiquement)
4. Cliquer **Deploy** (va échouer → normal, clé API manquante)

### 3. Ajouter les variables d'environnement
Dans Vercel → ton projet → **Settings → Environment Variables** :

| Variable | Valeur | Environnements |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` (console.anthropic.com) | Production + Preview + Development |
| `ACCESS_PASSWORD` | Mot de passe choisi (ex: `consultime2025`) | Production + Preview + Development |

### 4. Redéployer
Vercel → **Deployments** → **Redeploy** sur le dernier déploiement → ~30 secondes.

### 5. URL + partage
- URL générée : `ct-prospecting-xxx.vercel.app`
- Domaine custom : Vercel → **Settings → Domains** → ajouter `prospecting.consultime.fr`
- Partager l'URL + le mot de passe à l'équipe (SDs, Max, Tom)

---

## Architecture

```
pages/
  index.js        ← Application principale (React)
  login.js        ← Page de connexion
  api/
    claude.js     ← Proxy API Anthropic (clé côté serveur) + cache + rate limit
    auth.js       ← Authentification par mot de passe
middleware.js     ← Protection des routes par cookie
```

**Sécurité** : la clé API Anthropic est uniquement côté serveur (variable Vercel). Elle n'est jamais exposée au navigateur.

---

## Coûts estimés

| Poste | Coût |
|---|---|
| Vercel | **Gratuit** (Free plan, 100GB bandwidth/mois) |
| Anthropic (recherche, ~8k tokens/appel) | ~0,03$/recherche |
| Anthropic (séquence J0-J21, ~6k tokens) | ~0,02$/séquence |
| **1 000 recherches/mois** | **~30$/mois** |

---

## Évolutions possibles
- Pipeline partagé (Vercel KV ou base Supabase)
- Assignation de leads par SD
- Intégration Kaspr pour enrichissement emails
- Webhook → Bullhorn ou CRM
