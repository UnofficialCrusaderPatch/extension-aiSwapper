# AI Swapper menu maintenance

The GUI custom-menu API accepts one HTML, one CSS and one JS file. `menu/` contains those deployable files. Edit `menu/ai-swapper.html`, `menu-src/` and `locale/`; do not hand-edit generated JS/CSS.

Run from the repository root:

```text
python tools/build-menu.py
python tools/build-menu.py --check
node tests/menu-state.test.cjs
```

- `core.js`: the original AI metadata, slot and setting model, configuration adapter and shared controls. Plugin data stays separate from user overrides; required component values remain in the host baseline.
- `compact-view.js`: slot/card presentation, search and filter wiring. Cells use named `data-role`/`data-component` attributes instead of positional column indices.
- `ai-swapper.css`: module layout. `ucp-controls.css` and `ucp-scrollbar.css` reuse the GUI's controls, River Avenue font and chain scrollbar. Assets are embedded only during the build because relative GUI asset URLs cannot be used inside the sandbox.
- `locale/*.yml`: canonical translations; the English fallback is generated from `locale/en.yml`, not maintained separately.
- `assets/ucp3/provenance.json`: original GUI asset paths and SHA-256 hashes. Font and textures come from UCP3-GUI; original-game portraits remain Firefly Studios assets. Custom AI portraits are still discovered through the host API.

The language resolver mirrors `determineOrVerifyLanguage` in `init.lua`: explicit selection, menu default, AI default; unsupported choices fall back to the AI default. Displaying a resolved language does not create a user override. A new selection stores the resolved language; changing a dropdown stores the selected language code. The per-AI dropdown contains language codes, with localized labels, rather than duplicate “default” options.

This change targets version **1.3.0**. Local preview rebuilds reuse that version; version changes are deliberate release changes. The build never changes version numbers or installs the module. Package generated menu files with the original runtime files and all locale files, preserving explicit ZIP directory entries (especially `locale/`).

The old dialog presentation has been removed; its AI configuration model remains shared by the compact menu. No game/framework smoke test is part of the source checks above.

## Creator qualifiers

The optional host `qualifierEditing` capability and `creatorMode` flag enable persistent component/slot/all-slot controls. Old GUIs keep the original menu with these controls hidden. `getConfigQualifiers()` returns staged qualifiers separately from `getConfig()`; Close never changes host state.

Group controls cover explicit runtime component overrides only, excluding inherited values, the submenu bookkeeping object and default language. Partially required groups display Mixed, including untouched editable components in the group. Group clicks change only local overrides: mixed local qualifiers become Required; if all local overrides are Required, they become Suggested even while untouched siblings make the group display Mixed. A component must have a local selection before its qualifier can be changed. Upstream required components remain locked. Keep this independent from the enabled/inherit/deactivated sword cycle.

Qualifier icons use the same user-supplied 16px transparent lock artwork as the GUI: open for Suggested and closed for Required, without a frame. Mixed retains the Bootstrap Icons dash from `react-bootstrap-icons` 1.11.4; its license is packaged in `menu/bootstrap-icons-LICENSE.txt`.
