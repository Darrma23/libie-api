# Plugin Development Guide

## Plugin Contract

Every plugin should export an object with the following shape:

```js
module.exports = {
  name: 'Example Plugin',
  description: 'What it does',
  category: 'info',
  method: 'GET',
  path: '/example',
  aliases: ['example'],
  params: [],
  async execute(req, res) {
    return { ok: true }
  }
}
```

## Notes

- Use `execute` as the primary entrypoint.
- Keep plugins isolated and avoid importing other plugins directly.
- Return plain data from `execute`; the framework wraps it in the standard API response.
- Throw `Error` objects for failures; the handler will convert them into API-safe errors.
