// tsc only compiles .ts files into dist/ — anything that isn't TypeScript
// (like the OpenAPI YAML spec) has to be copied over manually as part of
// the build, or it's missing at runtime in production while still working
// locally under tsx (which runs straight from src/, not dist/).
import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist/docs', { recursive: true });
cpSync('src/docs/openapi.yaml', 'dist/docs/openapi.yaml');
