/* Presentation only: uses the module's original AiMeta/AiSetting rows and AiSlot state. */
class CompactAiMenu {
  current = AI_SLOTS_NAMES[0];
  inUse = false;
  constructor() {
    document
      .querySelectorAll("[data-i18n]")
      .forEach(
        (element) => (element.textContent = localize(element.dataset.i18n)),
      );
    document
      .querySelectorAll("[data-i18n-placeholder]")
      .forEach(
        (element) =>
          (element.placeholder = localize(element.dataset.i18nPlaceholder)),
      );
    document
      .querySelectorAll("[data-i18n-label]")
      .forEach((element) =>
        element.setAttribute("aria-label", localize(element.dataset.i18nLabel)),
      );
    document
      .querySelectorAll("[data-i18n-title]")
      .forEach(
        (element) => (element.title = localize(element.dataset.i18nTitle)),
      );
    this.slots = document.querySelector(".compact-slots");
    this.cards = document.querySelector(".compact-cards");
    this.lang = document.querySelector(".compact-language");
    const languages = new Set();
    FOUND_AI_META.forEach((meta) =>
      meta.supportedLang.forEach((lang) => languages.add(lang)),
    );
    if (!languages.has(DEFAULT_LANGUAGE))
      DEFAULT_LANGUAGE = DEFAULT_VALUE_MARKER;
    [...languages]
      .sort()
      .forEach((lang) =>
        this.lang.appendChild(
          createSimpleOptionElement(lang, languageLabel(lang)),
        ),
      );
    this.lang.value = DEFAULT_LANGUAGE;
    this.lang.disabled = MENU_LOCKED || DEFAULT_LANGUAGE_LOCKED;
    this.lang.classList.add("ucp-language-select");
    this.lang.onchange = () => {
      DEFAULT_LANGUAGE = this.lang.value;
      this.renderCards();
    };
    this.search = document.querySelector(".compact-search input");
    this.search.addEventListener("input", () => this.filterCards());
    this.search.addEventListener("search", () => this.filterCards());
    document.querySelector(".compact-in-use").onchange = (event) => {
      this.inUse = event.target.checked;
      this.renderCards();
    };
    document.querySelector(".compact-reset").onclick = () => {
      const slot = AI_SLOTS.get(this.current);
      slot
        .getUserSettings()
        .forEach((setting) => slot.removeAiSetting(setting));
      this.render();
    };
    document.addEventListener(AI_SELECT_EVENT, (event) => {
      AI_SLOTS.get(this.current).receiveNewAiSetting(event.detail.meta);
      this.render();
      document.querySelector(".compact-scroll").scrollTop = 0;
    });
    document.addEventListener(AI_CHANGE_UPDATE_EVENT, (event) => {
      const slot = AI_SLOTS.get(this.current),
        detail = event.detail ?? {};
      if (detail.type === "component")
        slot.customizeComponent(
          detail.aiSetting,
          detail.component,
          detail.value,
        );
      if (detail.type === "language")
        slot.customizeLanguage(detail.aiSetting, detail.language);
      if (detail.type === "remove") slot.removeAiSetting(detail.aiSetting);
      if (detail.type === "priority")
        slot.changePriority(detail.aiSetting, detail.priority);
      const focus = document.activeElement;
      this.render();
      if (focus?.isConnected) focus.focus();
    });
    document.querySelector(".compact-retry").onclick = async () => {
      const failed = [...FOUND_AI_META.values()].filter(
        (meta) => meta.switched.portrait && !meta.portraitAssetPath,
      );
      const keep = AI_LOAD_WARNINGS.filter(
        (warning) =>
          warning.kind !== "portrait" ||
          !failed.some(
            (meta) => warning.path === `${meta.nativeRoot}portrait.png`,
          ),
      );
      AI_LOAD_WARNINGS.splice(0, AI_LOAD_WARNINGS.length, ...keep);
      await Promise.all(failed.map((meta) => meta.loadAssetPortrait()));
      this.render();
    };
    this.render();
    document.querySelector(".ai-swapper").hidden = false;
  }
  winner(slot, component) {
    return slot.getEffectiveSetting(component);
  }
  render() {
    this.slots.replaceChildren();
    for (const [name, slot] of AI_SLOTS) {
      const portrait = this.winner(slot, "portrait");
      const slotName = localize(`slot.name.${name}`);
      const displayName = portrait?.control.portrait ? portrait.name : slotName;
      const mixed = AI_CONTROL_SETTINGS.some((component) => {
        const winner = this.winner(slot, component);
        return (
          (winner?.control[component] ? winner.root : "") !==
          (portrait?.control.portrait ? portrait.root : "")
        );
      });
      const button = document.createElement("button");
      button.className = "compact-slot";
      button.dataset.slot = name;
      button.setAttribute("aria-pressed", String(name === this.current));
      button.title = `${slotName}${mixed ? `: ${localize("menu.mixed")}` : ""}`;
      button.setAttribute(
        "aria-label",
        localize("menu.edit", { name: slotName }),
      );
      const img = button.appendChild(document.createElement("img"));
      img.src = slot.getAiImgSource();
      img.alt = "";
      img.onerror = () => {
        img.onerror = null;
        img.src = AI_PORTRAIT_MISSING;
      };
      button.appendChild(document.createElement("span")).textContent =
        `${displayName}${mixed ? " *" : ""}`;
      button.onclick = () => {
        this.current = name;
        this.render();
      };
      this.slots.appendChild(button);
    }
    document.querySelector(".compact-slot-title").textContent = localize(
      `slot.name.${this.current}`,
    );
    const summary = document.querySelector(".compact-summary");
    summary.replaceChildren();
    const slot = AI_SLOTS.get(this.current);
    for (const component of AI_CONTROL_SETTINGS) {
      const winner = this.winner(slot, component),
        cell = document.createElement("div");
      cell.appendChild(document.createElement("small")).textContent = localize(
        `term.${component.toLowerCase()}`,
      );
      cell.appendChild(document.createElement("strong")).textContent = winner
        ? winner.control[component]
          ? winner.name
          : localize("menu.vanilla")
        : localize("menu.default");
      cell.title = winner
        ? winner.extension
          ? localize("menu.plugin", { name: winner.extension })
          : localize("menu.selection")
        : localize("menu.inherited");
      if (QUALIFIER_EDITING) {
        const key = `ai.${this.current}.${component}`;
        const keys = qualifierKeys(this.current).filter((entry) => entry === key);
        cell.classList.add('has-qualifier');
        cell.appendChild(createQualifierControl(keys, localize(`term.${component.toLowerCase()}`), () => this.render()));
      }
      summary.appendChild(cell);
    }
    const slotControl = document.querySelector('.compact-slot-qualifier');
    const allControl = document.querySelector('.compact-all-qualifier');
    slotControl.replaceChildren();
    allControl.replaceChildren();
    slotControl.hidden = allControl.hidden = !QUALIFIER_EDITING;
    if (QUALIFIER_EDITING) {
      slotControl.appendChild(createQualifierControl(qualifierKeys(this.current), localize('qualifier.slot'), () => this.render()));
      allControl.appendChild(document.createElement('span')).textContent = localize('qualifier.all');
      allControl.appendChild(createQualifierControl(qualifierKeys(), localize('qualifier.all'), () => this.render()));
    }
    this.renderCards();
    const diagnostics = document.querySelector(".compact-diagnostics");
    diagnostics.hidden = AI_LOAD_WARNINGS.length === 0;
    diagnostics.querySelector("summary").textContent = localize(
      "menu.problems",
      { count: AI_LOAD_WARNINGS.length },
    );
    diagnostics.querySelector("pre").textContent = AI_LOAD_WARNINGS.map(
      (warning) =>
        localize(
          warning.kind === "portrait"
            ? "menu.portraiterror"
            : "menu.metadataerror",
          { path: warning.path },
        ),
    ).join("\n");
  }
  matches(meta) {
    const normalize = (value) =>
      String(value ?? "")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLocaleLowerCase(MENU_LOCALE);
    const words = normalize(this.search.value)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    // Search the displayed metadata, not shared installation paths.
    const text = normalize(
      [meta.name, meta.author, meta.packName].filter(Boolean).join(" "),
    );
    return words.every((word) => text.includes(word));
  }
  filterCards() {
    let visible = 0;
    for (const row of this.cards.querySelectorAll("[data-root]")) {
      const meta = FOUND_AI_META.get(row.dataset.root);
      row.hidden = !meta || !this.matches(meta);
      if (!row.hidden) visible++;
    }
    this.cards.querySelector(".compact-empty").hidden = visible > 0;
  }
  renderCards() {
    const slot = AI_SLOTS.get(this.current);
    const users = slot.getUserSettings(),
      inherited = slot.getPluginSettings();
    const roots = new Set(
      [...users, ...inherited].map((setting) => setting.root),
    );
    const userRoots = new Set(users.map((setting) => setting.root));
    this.cards.replaceChildren();
    slot.updatePluginAndAiSettingsCellStatus();
    for (const setting of [
      ...users,
      ...inherited.filter((setting) => !userRoots.has(setting.root)),
    ]) {
      setting.appendRowToParent(this.cards);
      const row = this.cards.lastElementChild;
      row.dataset.root = setting.root;
      row.classList.add("compact-selected");
      // Reuse the model rows; edit events are handled by AiSlot.
      row.querySelectorAll("[data-component]").forEach((cell) => {
        cell.dataset.label = localize(
          `term.${cell.dataset.component.toLowerCase()}`,
        );
      });
      row.querySelector('[data-role="name"]').title = setting.name;
      const sourceCell = row.querySelector('[data-role="source"]');
      sourceCell.textContent = setting.extension
        ? localize("menu.plugin", { name: setting.extension })
        : `${setting.aiMeta.packName || localize("menu.selection")} · ${localize("menu.priority", { count: users.indexOf(setting) + 1 })}`;
      sourceCell.title = sourceCell.textContent;
      const base = inherited.find(
        (candidate) => candidate.root === setting.root,
      );
      if (!setting.extension && base) {
        sourceCell.textContent = `${localize("menu.override", { name: base.extension })} · ${localize("menu.priority", { count: users.indexOf(setting) + 1 })}`;
        sourceCell.title = sourceCell.textContent;
      }
      row.querySelector('[data-role="image"]').querySelector("img").src =
        setting.aiMeta.portraitAssetPath ?? AI_PORTRAIT_MISSING;
      const select = row
        .querySelector('[data-role="language"]')
        .querySelector("select");
      setting.refreshLanguageSelect();
      const controls = row.querySelectorAll(".priority");
      [controls[0], controls[1], row.querySelector(".remove")].forEach(
        (control, index) => {
          const label = localize(
            ["menu.up", "menu.down", "change.controls.remove"][index],
          );
          control.title = label;
          control.setAttribute("aria-label", label);
          control.setAttribute("role", "button");
        },
      );
      select.setAttribute("aria-label", localize("term.language"));
      setting.setCustomizationLocks(slot);
      if (!setting.extension) {
        controls[0].style.visibility =
          users.indexOf(setting) === 0 ? "hidden" : "visible";
        controls[1].style.visibility =
          users.indexOf(setting) === users.length - 1 ? "hidden" : "visible";
      }
    }
    if (!this.inUse && !MENU_LOCKED)
      for (const meta of FOUND_AI_META.values()) {
        if (roots.has(meta.root)) continue;
        meta.appendRowToParent(this.cards);
        const row = this.cards.lastElementChild;
        row.dataset.root = meta.root;
        row.querySelector('[data-role="pack"]').textContent =
          meta.packName || meta.nativeRoot;
        row.querySelector('[data-role="pack"]').title = meta.nativeRoot;
        AI_CONTROL_SETTINGS.forEach((component) => {
          const cell = row.querySelector(`[data-component="${component}"]`);
          cell.dataset.label = localize(`term.${component.toLowerCase()}`);
          cell.title = localize(
            meta.switched[component] ? "state.enabled" : "state.inherit",
          );
          cell.classList.add("compact-available-component");
          cell.classList.toggle("available", !!meta.switched[component]);
        });
        row.querySelector('[data-role="default-language"]').textContent =
          languageLabel(meta.defaultLang);
        row.querySelector('[data-role="default-language"]').title =
          localize("term.defaultlang");
        row.querySelector('[data-role="author"]').title =
          localize("term.author");
        row.querySelector('[data-role="version"]').title =
          localize("term.version");
      }
    document.querySelector(".compact-count").textContent = localize(
      "menu.count",
      { available: FOUND_AI_META.size, selected: roots.size },
    );
    {
      const row = this.cards.appendChild(document.createElement("tr"));
      row.className = "compact-empty";
      row.appendChild(document.createElement("td")).textContent = localize(
        FOUND_AI_META.size ? "menu.nomatch" : "menu.noais",
      );
    }
    this.filterCards();
  }
}
