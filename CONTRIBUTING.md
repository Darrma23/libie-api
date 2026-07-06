# Contributing

Thank you for helping improve Libie API.

## Development workflow

1. Install dependencies with `npm install`.
2. Start the development server with `npm run dev`.
3. Add or update tests in the `tests/` folder.
4. Run `npm test` before opening a pull request.

## Plugin authoring

- Place new plugins in the `plugins/` directory.
- Follow the metadata contract in [docs/PLUGIN_DEVELOPMENT_GUIDE.md](docs/PLUGIN_DEVELOPMENT_GUIDE.md).
- Keep plugins isolated and avoid importing other plugins directly.
