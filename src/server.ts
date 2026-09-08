import { app } from './app';

// Render (and most PaaS hosts) assign the port at runtime via $PORT and
// route external traffic to it — hardcoding 3000 would fail in production
// while still working fine locally, since PORT is simply unset there.
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => console.log(`ecommerce API listening on http://localhost:${port}`));
