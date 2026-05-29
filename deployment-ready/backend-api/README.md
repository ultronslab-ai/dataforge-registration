# DataForge Backend API

Deploy this folder as the backend service on Render.

## Render Settings

- Root directory: `deployment-ready/backend-api`
- Build command: leave empty
- Start command: `npm start`
- Environment: Node

After deployment, copy the Render URL and replace `YOUR-RENDER-BACKEND-URL` in both frontend config files:

- `deployment-ready/user-site/js/config.js`
- `deployment-ready/admin-site/js/config.js`

Example:

```js
const DEPLOYED_API_BASE_URL = 'https://dataforge-api.onrender.com/api';
```

## Admin Login

- Username: `admin`
- Password: `cyberadmin2042`

Change this in `easy-data.json` before a real event.
