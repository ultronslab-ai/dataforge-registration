# DataForge Deployment Folders

This folder is prepared for separate free hosting:

- `user-site` -> Netlify public user website
- `admin-site` -> Netlify admin website
- `backend-api` -> Render backend API

Deploy the backend first. Then copy its Render URL into:

- `user-site/js/config.js`
- `admin-site/js/config.js`

Replace:

```js
https://YOUR-RENDER-BACKEND-URL.onrender.com/api
```

with your real backend URL, for example:

```js
https://dataforge-api.onrender.com/api
```

Then deploy `user-site` and `admin-site` separately on Netlify.

Note: this free-ready backend uses JSON files and local uploads. It is fine for demo/small club testing, but free hosts may reset local storage on redeploys. For important events, move data/uploads to Supabase.
