# Property Folder

**根据自身笔记管理需求，参考tags folder vibe coding出来的一个插件，欢迎各位大佬指导**
Property Folder is a community plugin for Obsidian that lets you browse and manage note property relationships as a tree.

For example, you can configure:

- `Area = Writing`
  - `Task = Draft article`
- `Area = Research`
  - `Task = Read paper`

When a note is assigned a configured child property value, Property Folder can add the matching parent property value automatically.

## Features

- Browse configured parent and child property relationships in a sidebar tree.
- See note counts for parent and child property values.
- Click a parent value to show the union of notes under all configured child mappings.
- Click a child value to show notes matching that child mapping.
- Add missing parent property values automatically.
- Run an explicit reconcile command to backfill existing notes.
- Configure mappings in the plugin settings.
- English and Chinese UI text.

## Usage

1. Enable Property Folder.
2. Open **Settings -> Community plugins -> Property Folder**.
3. Add a relation mapping such as:
   - Parent property: `Area`
   - Parent value: `Writing`
   - Child property: `Task`
   - Child value: `Draft article`
4. Open the command palette and run **Open Property Folder**.
5. Add `Task: Draft article` to a note. If auto-apply is enabled, the plugin adds `Area: Writing`.

## Commands

- **Open Property Folder**: Opens the sidebar tree.
- **Reconcile Property Parents**: Scans notes in scope and adds missing parent property values for enabled mappings.

## Privacy

Property Folder does not upload note content.

The plugin does not make network requests, does not collect telemetry, and does not use external services.

Indexing uses Obsidian metadata, frontmatter, and properties. The plugin stores its own settings in Obsidian's normal plugin settings storage.

The plugin writes frontmatter only when:

- auto parent completion is enabled and a note matches a configured child property value; or
- you explicitly run **Reconcile Property Parents**.

## Compatibility

The plugin is designed without NodeJS or Electron runtime APIs and is marked as mobile-compatible in `manifest.json`.

Before public directory submission, verify basic behavior on mobile. If mobile testing is not completed, document the tested platform status in the release notes.

## Development

Install dependencies:

```bash
npm install
```

Build release assets:

```bash
npm run build
```

The build creates `main.js` for GitHub Release assets. The source repository intentionally does not commit `main.js` or source maps.

## Release checklist

- `manifest.json` version matches `versions.json` and the GitHub Release tag.
- GitHub Release tag has no `v` prefix, for example `1.0.0`.
- Release assets include `main.js`, `manifest.json`, and `styles.css`.
- Release assets install and run in a clean test vault.
- No private vault data, local settings, notes, attachments, or real vault screenshots are committed.
