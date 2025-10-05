# Déploiement sur Vercel (Front-end)

Ce guide décrit comment déployer l'application frontend (Vite + React) sur Vercel.

## Prérequis
- Compte Vercel
- Repo Git (GitHub/GitLab/Bitbucket) connecté à Vercel

## Fichiers importants
- `vercel.json` : configuration des builds et du fallback SPA
- `vite.config.ts` : configuration Vite (build -> `dist`)
- `.env.example` : variables d'environnement à définir sur Vercel

## Variables d'environnement (à ajouter dans Vercel)
- `VITE_API_BASE_URL` -> l'URL publique de ton backend (ex: https://my-backend.onrender.com)

## Paramètres de build dans Vercel
- Build Command: `npm run build`
- Output Directory: `dist`

## Étapes rapides
1. Lier ton repo à Vercel
2. Dans Project Settings > Environment Variables ajouter `VITE_API_BASE_URL` pour Preview et Production
3. Déployer via le dashboard ou CLI (`vercel --prod`)

## CORS côté backend (Rappel)
- Si tu utilises des tokens (Authorization header) : tu peux autoriser origines spécifiques ou `*` si tu n'utilises pas de cookies.
- Si tu utilises cookies et `credentials: true` : autoriser explicitement l'origine Vercel et `credentials: true` dans ta config CORS.

## Troubleshooting
- 404 au refresh : vérifier `vercel.json` (routes fallback vers `/index.html`) et `base` dans `vite.config.ts`.
- Mauvaise API URL : vérifier variable `VITE_API_BASE_URL` dans Vercel.

