Frontend & Backend deployment notes (Render)

1) Frontend (Vite)
- Ensure this repo's frontend build command runs `npm run build` in the project root.
- Add environment variable in Render for the frontend service:
  - VITE_API_BASE_URL = https://backendsaas-htlv.onrender.com
- Build & Deploy. Vite will bake the variable into the built assets.
- If using Apache/Netlify, place `dist/.htaccess` in the served folder to enable SPA rewrites.

2) Backend (Node/Express)
- In the backend service settings on Render, add:
  - DATABASE_URL = <your postgres connection string>
  - FRONTEND_URL = <your frontend origin, e.g. https://app.mondomaine.com>
  - NODE_ENV = production
- Ensure the start command runs `node app.js` (already set in package.json)
- Deploy. Check logs for startup errors (we added console.error visible messages).

3) Quick tests
- Health: GET https://backendsaas-htlv.onrender.com/api/health
- From browser, open frontend and use devtools Network tab to ensure calls go to the backend.

Notes:
- Vite variables must start with VITE_ to be available in client-side code.
- Render injects env variables at build time for static sites; ensure variables are present before build step.
