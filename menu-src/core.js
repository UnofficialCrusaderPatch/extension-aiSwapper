// Qualifiers are staged with menu values and committed only by Save/Save and Close.
let QUALIFIER_EDITING = false;
let USER_QUALIFIERS = {};
function createResultQualifiers() {
  const values = createResultConfig();
  return Object.fromEntries(Object.entries(USER_QUALIFIERS).filter(([key]) => values[key] !== undefined));
}
function qualifierKeys(slotName) {
  return Object.entries(createResultConfig()).filter(([key, value]) => value !== undefined &&
    /^ai\.[^.]+\.[^.]+$/.test(key) && (!slotName || key.startsWith(`ai.${slotName}.`))).map(([key]) => key);
}
function qualifierScope(slotName) {
  return [...AI_SLOTS].filter(([name]) => !slotName || name === slotName).flatMap(([name, slot]) =>
    AI_CONTROL_SETTINGS.filter((component) => !slot.isComponentRequired(component) && slot.getEffectiveSetting(component)).map((component) => `ai.${name}.${component}`));
}
// Same Bootstrap Icons as the host GUI (react-bootstrap-icons 1.11.4).
// See menu/bootstrap-icons-LICENSE.txt. Static SVG paths are never AI data.
const QUALIFIER_ICON_PATHS = {
  "mixed": "M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"
};

function createQualifierControl(keys, label, onChange, scope = keys) {
  const button = document.createElement('button');
  const states = new Set(keys.map((key) => USER_QUALIFIERS[key] === 'required' ? 'required' : 'suggested'));
  const actionState = states.size > 1 ? 'mixed' : states.has('required') ? 'required' : 'suggested';
  const state = actionState === 'required' && scope.some((key) => !keys.includes(key)) ? 'mixed' : actionState;
  button.type = 'button';
  button.className = `qualifier-control qualifier-${state}`;
  button.innerHTML = state === 'mixed' ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="${QUALIFIER_ICON_PATHS[state]}"/></svg>` : '';
  button.title = `${label}: ${localize(`qualifier.${state}`)}. ${localize(scope.length ? 'qualifier.action' : 'qualifier.empty')}`;
  button.setAttribute('aria-label', button.title);
  button.setAttribute('aria-pressed', state === 'mixed' ? 'mixed' : String(state === 'required'));
  button.disabled = !scope.length;
  button.onclick = () => {
    const next = state === 'required' ? 'suggested' : 'required';
    for (const key of scope) {
      const [, slotName, component] = key.split('.');
      const slot = AI_SLOTS.get(slotName);
      const source = slot?.getEffectiveSetting(component);
      if (source) slot.customizeComponent(source, component, source.control[component]);
    }
    const values = createResultConfig();
    scope.filter((key) => values[key] !== undefined).forEach((key) => { USER_QUALIFIERS[key] = next; });
    onChange();
  };
  return button;
}

/** STATIC CONSTANTS **/

const AI_SLOTS_NAMES = [
  "rat",
  "snake",
  "pig",
  "wolf",
  "saladin",
  "caliph",
  "sultan",
  "richard",
  "frederick",
  "phillip",
  "wazir",
  "emir",
  "nizar",
  "sheriff",
  "marshal",
  "abbot",
];

/* GENERATED_MISSING_PORTRAIT */

/* Base64 encoded versions of the original game portraits. All rights belong to Firefly Studios. */
/* GENERATED_PORTRAITS */

const AI_CONTROL_SETTINGS = [
  "binks",
  "speech",
  "lines",
  "portrait",
  "aic",
  "aiv",
  "lord",
  "startTroops",
];

const AI_SELECT_EVENT = "ai_select_event";
const AI_CHANGE_UPDATE_EVENT = "ai_change_update_event";

const DEFAULT_VALUE_MARKER = "";

const PATH_ROOT_VERSION_PART_REGEX = /(?<=ucp\/plugins\/.+)-[\d\.]+(?=\/.*)/;

/** DYNAMIC GLOBALS **/

/* GENERATED_LOCALIZATION */
const GENERAL_LOCALIZATION = { ...LOCALIZATION_FALLBACK };
let MENU_LOCALE = "en";

const AI_SLOTS = new Map();

const FOUND_AI_META = new Map();
const AI_LOAD_WARNINGS = [];

let DEFAULT_LANGUAGE = DEFAULT_VALUE_MARKER;
let MENU_LOCKED = false;
let DEFAULT_LANGUAGE_LOCKED = false;

/** HELPER **/

function isPrimitiveBool(bool) {
  return typeof bool === "boolean";
}

function receiveBooleanOrFallback(bool, fallback = undefined) {
  return isPrimitiveBool(bool) ? bool : fallback;
}

function receiveStringOrFallback(str, fallback = undefined) {
  return typeof str === "string" ? str : fallback;
}

function addEnterAndClickListener(element, func) {
  element.addEventListener("click", func);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      element.click();
    }
  });
}

function createTextCell(text, role) {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (role) cell.dataset.role = role;
  return cell;
}

function createBooleanText(bool) {
  return isPrimitiveBool(bool) ? (bool ? "\u2714" : "\u2716") : "-";
}

function createBooleanCell(bool) {
  return createTextCell(createBooleanText(bool));
}

function createSimpleOptionElement(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label ?? value;
  return option;
}

function createVersionFreeRootPath(path) {
  return path.replace(PATH_ROOT_VERSION_PART_REGEX, "");
}

// Keep resource values unchanged; localize their display labels only.
function localize(key, args = {}) {
  const value = GENERAL_LOCALIZATION[key] ?? LOCALIZATION_FALLBACK[key] ?? "";
  return value.replace(/\{(\w+)\}/g, (match, name) =>
    String(args[name] ?? match),
  );
}

function languageLabel(code) {
  if (!code) return localize("menu.language.unspecified");
  try {
    const tag = code === "ch" ? "zh" : code;
    const name = new Intl.DisplayNames([MENU_LOCALE], { type: "language" }).of(
      tag,
    );
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

// Mirrors determineOrVerifyLanguage in init.lua. Display resolution never writes config.
function resolveAiLanguage(meta, language, menuLanguage = DEFAULT_LANGUAGE) {
  const selected = language || menuLanguage || meta.defaultLang;
  return meta.supportedLang.includes(selected) ? selected : meta.defaultLang;
}

function populateLanguageSelect(select, languages, selected) {
  select.replaceChildren();
  for (const code of new Set(languages.filter(Boolean))) {
    select.appendChild(createSimpleOptionElement(code, languageLabel(code)));
  }
  if (!select.children.length) {
    select.appendChild(
      createSimpleOptionElement("", localize("menu.language.unspecified")),
    );
  }
  select.value = selected ?? "";
  select.classList.add("ucp-language-select");
}

function nextComponentState(current, available) {
  if (current === true) return undefined;
  if (current === undefined) return false;
  return available ? true : undefined;
}

function pluginDisplayName(entity, fallback = "") {
  if (typeof entity === "string") return entity;
  return (
    entity?.["display-name"] ?? entity?.displayName ?? entity?.name ?? fallback
  );
}

/** CLASSES **/

class AiControl {
  binks;
  speech;
  lines;
  portrait;
  aic;
  aiv;
  lord;
  startTroops;

  static fromControlObject(controlObj, fallback = undefined) {
    const aiControl = new AiControl();
    AI_CONTROL_SETTINGS.forEach(
      (setting) =>
        (aiControl[setting] = receiveBooleanOrFallback(
          controlObj[setting],
          fallback,
        )),
    );
    return aiControl;
  }

  toControlObject() {
    const controlObj = {};
    AI_CONTROL_SETTINGS.forEach(
      (setting) => (controlObj[setting] = this[setting]),
    );
    return controlObj;
  }
}

class AiMeta {
  name;
  description;
  author;
  link;
  version;
  defaultLang;
  supportedLang;
  switched;
  nativeRoot;
  root;

  portraitAssetPath;

  #dataRow;
  #dataRowImg;

  static META_FILE = "meta.json";

  #appendDataRowImg() {
    const newCell = document.createElement("td");
    newCell.dataset.role = "image";
    this.#dataRowImg = document.createElement("img");
    this.#dataRowImg.classList.add("ai-image", "selectable");
    this.#dataRowImg.src = AI_PORTRAIT_MISSING;
    newCell.appendChild(this.#dataRowImg);
    this.#dataRow.appendChild(newCell);

    // event
    addEnterAndClickListener(this.#dataRow, () =>
      document.dispatchEvent(
        new CustomEvent(AI_SELECT_EVENT, {
          detail: {
            meta: this,
          },
        }),
      ),
    );
  }

  #createDataRow() {
    this.#dataRow = document.createElement("tr");
    this.#dataRow.classList.add("ai-meta-row");
    this.#dataRow.tabIndex = 0;
    this.#dataRow.setAttribute("role", "button");
    this.#dataRow.setAttribute(
      "aria-label",
      localize("menu.add", { name: this.name }),
    );

    this.#appendDataRowImg();

    this.#dataRow.appendChild(createTextCell(this.name, "name"));
    this.#dataRow.appendChild(createTextCell(this.version, "version"));
    this.#dataRow.appendChild(createTextCell(this.author, "author"));
    this.#dataRow.appendChild(createTextCell(this.nativeRoot, "pack"));
    this.#dataRow.appendChild(
      createTextCell(this.defaultLang, "default-language"),
    );
    this.#dataRow.appendChild(
      createTextCell(this.supportedLang.join(", "), "supported-languages"),
    );

    AI_CONTROL_SETTINGS.forEach((setting) => {
      const cell = createBooleanCell(this.switched[setting]);
      cell.dataset.component = setting;
      this.#dataRow.appendChild(cell);
    });
  }

  constructor(nativeMetaPath, metaObj) {
    this.name = receiveStringOrFallback(metaObj.name, DEFAULT_VALUE_MARKER);
    this.description = receiveStringOrFallback(
      metaObj.description,
      DEFAULT_VALUE_MARKER,
    );
    this.author = receiveStringOrFallback(metaObj.author, DEFAULT_VALUE_MARKER);
    this.link = receiveStringOrFallback(metaObj.link, DEFAULT_VALUE_MARKER);
    this.version = receiveStringOrFallback(
      metaObj.version,
      DEFAULT_VALUE_MARKER,
    );
    this.defaultLang = receiveStringOrFallback(metaObj.defaultLang);
    this.supportedLang = Array.isArray(metaObj.supportedLang)
      ? metaObj.supportedLang
      : [];
    this.switched = AiControl.fromControlObject(metaObj.switched ?? {}, false);
    this.nativeRoot = nativeMetaPath.replace(
      /meta\.json$/i,
      DEFAULT_VALUE_MARKER,
    );
    this.root = createVersionFreeRootPath(this.nativeRoot);

    this.#createDataRow();
  }

  async loadAssetPortrait() {
    if (!this.switched.portrait) return;
    const path = `${this.nativeRoot}portrait.png`;
    try {
      const url = await HOST_FUNCTIONS.getAssetUrl(path);
      if (!url) throw new Error("No asset URL returned");
      await new Promise((resolve, reject) => {
        const img = new Image();
        const timer = setTimeout(() => {
          img.onload = img.onerror = null;
          reject(new Error("Portrait load timed out"));
        }, 8000);
        img.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timer);
          reject(new Error("Portrait could not be decoded"));
        };
        img.src = url;
      });
      this.portraitAssetPath = url;
      this.#dataRowImg.src = url;
    } catch (error) {
      this.portraitAssetPath = undefined;
      AI_LOAD_WARNINGS.push({ kind: "portrait", path, name: this.name });
    }
  }

  appendRowToParent(parent) {
    parent.appendChild(this.#dataRow);
  }

  static async fromNativeMetaRootPath(nativeMetaRootPath) {
    return this.fromNativeMetaPath(`${nativeMetaRootPath}/${AiMeta.META_FILE}`);
  }

  static async fromNativeMetaPath(nativeMetaPath) {
    try {
      const loadedFile = await HOST_FUNCTIONS.getTextFile(nativeMetaPath);
      if (!loadedFile) throw new Error("Metadata file is empty or unavailable");
      const metaObj = JSON.parse(loadedFile.replace(/^\uFEFF/, ""));
      if (!metaObj || typeof metaObj !== "object" || Array.isArray(metaObj))
        throw new Error("Invalid metadata object");
      const aiMeta = new AiMeta(nativeMetaPath, metaObj);
      await aiMeta.loadAssetPortrait();
      return aiMeta;
    } catch (error) {
      AI_LOAD_WARNINGS.push({ kind: "metadata", path: nativeMetaPath });
      return null;
    }
  }
}

class AiSetting {
  name;
  language;
  root;
  control;
  aiMeta;
  extension;

  #dataRow;
  #controlCell;
  #boolCells = {};
  #languageSelect;

  #appendDataRowControl() {
    this.#controlCell = document.createElement("td");
    this.#controlCell.dataset.role = "controls";

    const controlDiv = this.#controlCell.appendChild(
      document.createElement("div"),
    );
    controlDiv.classList.add("ai-setting-control");

    const prioDiv = controlDiv.appendChild(document.createElement("div"));

    const prioUpDiv = prioDiv.appendChild(document.createElement("div"));
    prioUpDiv.textContent = "\u2B99";
    prioUpDiv.classList.add("priority", "up");
    prioUpDiv.tabIndex = 0;
    addEnterAndClickListener(prioUpDiv, () =>
      document.dispatchEvent(
        new CustomEvent(AI_CHANGE_UPDATE_EVENT, {
          detail: {
            type: "priority",
            aiSetting: this,
            priority: -1,
          },
        }),
      ),
    );

    const prioDownDiv = prioDiv.appendChild(document.createElement("div"));
    prioDownDiv.textContent = "\u2B9B";
    prioDownDiv.classList.add("priority", "down");
    prioDownDiv.tabIndex = 0;
    addEnterAndClickListener(prioDownDiv, () =>
      document.dispatchEvent(
        new CustomEvent(AI_CHANGE_UPDATE_EVENT, {
          detail: {
            type: "priority",
            aiSetting: this,
            priority: +1,
          },
        }),
      ),
    );

    const removeDiv = controlDiv.appendChild(document.createElement("div"));
    removeDiv.textContent = "\u2716";
    removeDiv.classList.add("remove");
    removeDiv.tabIndex = 0;
    addEnterAndClickListener(removeDiv, () =>
      document.dispatchEvent(
        new CustomEvent(AI_CHANGE_UPDATE_EVENT, {
          detail: {
            type: "remove",
            aiSetting: this,
          },
        }),
      ),
    );

    this.#dataRow.appendChild(this.#controlCell);
  }

  #appendDataRowImg() {
    const newCell = document.createElement("td");
    newCell.dataset.role = "image";
    const img = document.createElement("img");
    img.classList.add("ai-image");
    img.src = this.aiMeta.portraitAssetPath ?? AI_PORTRAIT_MISSING;
    newCell.appendChild(img);
    this.#dataRow.appendChild(newCell);
  }

  #appendDataRowLanguage() {
    const newCell = document.createElement("td");
    newCell.dataset.role = "language";
    const newSelect = document.createElement("select");
    this.#languageSelect = newSelect;
    this.refreshLanguageSelect();

    newSelect.onchange = () => {
      if (newSelect.disabled) return;
      const language = newSelect.value || undefined;
      document.dispatchEvent(
        new CustomEvent(AI_CHANGE_UPDATE_EVENT, {
          detail: { type: "language", aiSetting: this, language },
        }),
      );
    };

    newCell.appendChild(newSelect);
    this.#dataRow.appendChild(newCell);
  }

  refreshLanguageSelect() {
    populateLanguageSelect(
      this.#languageSelect,
      [...this.aiMeta.supportedLang, this.aiMeta.defaultLang],
      resolveAiLanguage(this.aiMeta, this.language),
    );
  }

  #setDataRowBooleanClass(element, statusBool) {
    element.title = localize(
      statusBool === true
        ? "state.enabled"
        : statusBool === false
          ? "state.deactivated"
          : "state.inherit",
    );
    element.setAttribute("role", "checkbox");
    element.setAttribute(
      "aria-checked",
      statusBool === undefined ? "mixed" : String(statusBool),
    );
    if (!isPrimitiveBool(statusBool)) {
      element.classList.add("ignored");
      element.classList.remove("active", "inactive");
    } else if (statusBool) {
      element.classList.add("active");
      element.classList.remove("ignored", "inactive");
    } else {
      element.classList.add("inactive");
      element.classList.remove("ignored", "active");
    }
  }

  #appendDataRowBoolean(setting) {
    const newCell = createBooleanCell(this.control[setting]);
    newCell.classList.add("ai-setting-bool");
    newCell.dataset.component = setting;
    newCell.setAttribute(
      "aria-label",
      `${this.name}: ${localize(`term.${setting.toLowerCase()}`)}`,
    );
    newCell.tabIndex = 0;

    const metaSettingExists = this.aiMeta.switched[setting];
    if (!metaSettingExists) {
      newCell.classList.add("no-setting");
    }
    addEnterAndClickListener(newCell, () => {
      if (newCell.getAttribute("aria-disabled") === "true") return;
      const currentValue = this.control[setting];
      const newValue = nextComponentState(currentValue, metaSettingExists);

      // will be pretty heavy
      document.dispatchEvent(
        new CustomEvent(AI_CHANGE_UPDATE_EVENT, {
          detail: {
            type: "component",
            aiSetting: this,
            component: setting,
            value: newValue,
          },
        }),
      );
    });

    this.#setDataRowBooleanClass(newCell, this.control[setting]);
    this.#dataRow.appendChild(newCell);
    this.#boolCells[setting] = newCell;
  }

  #createDataRow() {
    this.#dataRow = document.createElement("tr");
    this.#dataRow.classList.add("ai-setting-row");

    if (!this.extension) {
      this.#dataRow.classList.add("ai-setting-row--user");
    }

    this.#appendDataRowControl();
    this.#dataRow.appendChild(createTextCell(this.extension ?? "-", "source"));
    this.#appendDataRowImg();
    this.#dataRow.appendChild(createTextCell(this.name, "name"));
    this.#dataRow.appendChild(createTextCell(this.root, "root"));

    this.#appendDataRowLanguage();

    AI_CONTROL_SETTINGS.forEach((setting) =>
      this.#appendDataRowBoolean(setting),
    );
  }

  #verifyAiControlSetting(currentSetting, metaSetting) {
    // unsets if control stops being available
    return currentSetting && !metaSetting ? undefined : currentSetting;
  }

  #verifyAiControl() {
    const aiMetaSwitched = this.aiMeta.switched;
    const aiControl = this.control;

    AI_CONTROL_SETTINGS.forEach(
      (setting) =>
        (aiControl[setting] = this.#verifyAiControlSetting(
          aiControl[setting],
          aiMetaSwitched[setting],
        )),
    );
  }

  #setInteractionStatus(active) {
    this.#dataRow
      .querySelectorAll(active ? '[tabIndex="-1"]' : '[tabIndex="0"]')
      .forEach((elem) => (elem.tabIndex = active ? 0 : -1));
    this.#dataRow
      .querySelectorAll(active ? "select[disabled]" : "select")
      .forEach((elem) => (elem.disabled = !active));

    const controls = this.#controlCell.querySelector(".ai-setting-control");
    active
      ? controls.removeAttribute("inert")
      : controls.setAttribute("inert", "");
  }

  constructor(meta, settingObj) {
    this.aiMeta = meta;

    this.extension = settingObj.extension;
    this.name = receiveStringOrFallback(this.aiMeta.name, DEFAULT_VALUE_MARKER);
    this.root = receiveStringOrFallback(this.aiMeta.root, DEFAULT_VALUE_MARKER);
    this.language = receiveStringOrFallback(settingObj.language);
    this.control = AiControl.fromControlObject(settingObj.control ?? {});
    this.#verifyAiControl();

    // updating state based on meta, in case invalid settings are present
    if (this.name !== this.aiMeta.name) {
      this.name = this.aiMeta.name;
    }

    if (
      (this.language && !this.aiMeta.supportedLang.includes(this.language)) ||
      this.language === DEFAULT_VALUE_MARKER
    ) {
      this.language = undefined;
    }

    this.#createDataRow();
    this.#setInteractionStatus(!this.extension);
  }

  setBoolCellCurrent(controlName, isCurrent) {
    this.#boolCells[controlName].classList.toggle("current", isCurrent);
  }

  setCustomizationLocks(slot) {
    for (const component of AI_CONTROL_SETTINGS) {
      const cell = this.#boolCells[component];
      this.#setDataRowBooleanClass(cell, this.control[component]);
      const locked = slot.isComponentRequired(component);
      cell.tabIndex = locked ? -1 : 0;
      cell.setAttribute("aria-disabled", String(locked));
      if (locked) {
        this.#setDataRowBooleanClass(
          cell,
          slot.getEffectiveSetting(component)?.control[component],
        );
        cell.title = localize("state.required");
      }
    }
    // A language is stored inside each component value; required values include it.
    const select = this.#languageSelect;
    select.disabled =
      !this.aiMeta.supportedLang.length ||
      MENU_LOCKED ||
      (this.extension &&
        AI_CONTROL_SETTINGS.every(
          (component) =>
            !isPrimitiveBool(this.control[component]) ||
            slot.isComponentRequired(component),
        ));
  }

  appendRowToParent(parent) {
    parent.appendChild(this.#dataRow);
  }

  toSettingNameAndObject() {
    const settingObj = {
      name: this.name,
      language: this.language,
      root: this.root,
      control: this.control.toControlObject(),
    };
    return settingObj;
  }

  // if received from a present config
  static fromMetaAndSettings(meta, settingObj) {
    if (
      meta.root !==
      receiveStringOrFallback(settingObj.root, DEFAULT_VALUE_MARKER)
    ) {
      return null; // something went wrong, just ignore it for now
    }
    return new AiSetting(meta, settingObj);
  }

  // sets everything present to true by default, others is undefined
  static fromMeta(meta) {
    const settingsObj = {
      control: {},
      language: resolveAiLanguage(meta),
    };
    AI_CONTROL_SETTINGS.forEach(
      (setting) =>
        (settingsObj.control[setting] = meta.switched[setting]
          ? true
          : undefined),
    );
    return new AiSetting(meta, settingsObj);
  }
}

class AiSlot {
  #slotName;
  #aiSettings = [];
  #pluginSettings = [];
  #requiredComponents = new Set();

  #localizedSlotName;

  constructor(slotName) {
    this.#slotName = slotName;
  }

  getUserSettings() {
    return [...this.#aiSettings];
  }

  getPluginSettings() {
    return [...this.#pluginSettings];
  }

  async loadLocalizedSlotName() {
    this.#localizedSlotName = localize(`slot.name.${this.#slotName}`);
  }

  requireComponent(component) {
    this.#requiredComponents.add(component);
  }

  isComponentRequired(component) {
    return MENU_LOCKED || this.#requiredComponents.has(component);
  }

  getEffectiveSetting(component) {
    const baseline = this.#pluginSettings.find((setting) =>
      isPrimitiveBool(setting.control[component]),
    );
    if (this.isComponentRequired(component)) return baseline;
    return (
      this.#aiSettings.find((setting) =>
        isPrimitiveBool(setting.control[component]),
      ) ?? baseline
    );
  }

  getOrCreateOverride(source) {
    if (!source.extension) return source;
    let override = this.#aiSettings.find(
      (setting) => setting.root === source.root,
    );
    if (!override) {
      override = AiSetting.fromMetaAndSettings(source.aiMeta, {
        root: source.root,
        language: source.language,
        control: {},
      });
      this.#aiSettings.unshift(override);
    }
    return override;
  }

  customizeComponent(source, component, value) {
    if (this.isComponentRequired(component)) return;
    this.getOrCreateOverride(source).control[component] = value;
  }

  customizeLanguage(source, language) {
    if (MENU_LOCKED) return;
    const components = AI_CONTROL_SETTINGS.filter(
      (component) =>
        isPrimitiveBool(source.control[component]) &&
        !this.isComponentRequired(component),
    );
    if (source.extension && !components.length) return;
    const override = this.getOrCreateOverride(source);
    // Language is a field of a resource selection in the existing config contract.
    if (source.extension)
      for (const component of components)
        override.control[component] = source.control[component];
    override.language = language;
  }

  pushBaselineSetting(aiSetting) {
    this.#pluginSettings.push(aiSetting);
  }

  pushUserSetting(aiSetting) {
    this.#aiSettings.push(aiSetting);
  }

  appendUserMenuEntryForSlot(menu) {
    if (!this.#aiSettings.length) {
      menu[this.#slotName] = undefined; // deleting old setting
      return;
    }
    menu[this.#slotName] = this.#aiSettings.map((setting) =>
      setting.toSettingNameAndObject(),
    );
  }

  appendAiControlSettingsForSlot(config) {
    AI_CONTROL_SETTINGS.forEach((controlSetting) => {
      const configKey = `ai.${this.#slotName}.${controlSetting}`;
      if (this.isComponentRequired(controlSetting)) {
        config[configKey] = undefined; // the host retains the plugin's required value
        return;
      }

      for (const aiSetting of this.#aiSettings) {
        if (!isPrimitiveBool(aiSetting.control[controlSetting])) {
          continue;
        }

        config[configKey] = {
          name: aiSetting.name,
          root: aiSetting.root,
          active: aiSetting.control[controlSetting],
          language: aiSetting.language,
        };
        return;
      }

      config[configKey] = undefined; // unset
    });
  }

  getAiSlotName() {
    if (!this.#aiSettings.length && !this.#pluginSettings.length) {
      return this.#localizedSlotName;
    }
    // using first that has any kind of setting
    for (const aiSetting of this.#aiSettings) {
      if (
        AI_CONTROL_SETTINGS.map((setting) => aiSetting.control[setting]).some(
          isPrimitiveBool,
        )
      ) {
        return aiSetting.name;
      }
    }
    for (const aiSetting of this.#pluginSettings) {
      if (
        AI_CONTROL_SETTINGS.map((setting) => aiSetting.control[setting]).some(
          isPrimitiveBool,
        )
      ) {
        return aiSetting.name;
      }
    }
    return this.#localizedSlotName;
  }

  getAiImgSource() {
    if (this.isComponentRequired("portrait")) {
      const setting = this.getEffectiveSetting("portrait");
      return setting?.control.portrait
        ? (setting.aiMeta.portraitAssetPath ?? AI_PORTRAIT_MISSING)
        : AI_PORTRAIT_DATA[this.#slotName];
    }
    for (const aiSetting of this.#aiSettings) {
      const controlValue = aiSetting.control.portrait;
      if (!isPrimitiveBool(controlValue)) {
        continue;
      }
      if (!controlValue) {
        return AI_PORTRAIT_DATA[this.#slotName];
      }
      return aiSetting.aiMeta.portraitAssetPath ?? AI_PORTRAIT_MISSING;
    }
    for (const aiSetting of this.#pluginSettings) {
      const controlValue = aiSetting.control.portrait;
      if (!isPrimitiveBool(controlValue)) {
        continue;
      }
      if (!controlValue) {
        return AI_PORTRAIT_DATA[this.#slotName];
      }
      return aiSetting.aiMeta.portraitAssetPath ?? AI_PORTRAIT_MISSING;
    }
    return AI_PORTRAIT_DATA[this.#slotName];
  }

  receiveNewAiSetting(aiMeta) {
    const newAiSetting = AiSetting.fromMeta(aiMeta);
    for (const component of AI_CONTROL_SETTINGS) {
      if (this.isComponentRequired(component))
        newAiSetting.control[component] = undefined;
    }
    this.#aiSettings.unshift(newAiSetting);
    return newAiSetting;
  }

  updatePluginAndAiSettingsCellStatus() {
    AI_CONTROL_SETTINGS.forEach((controlSetting) => {
      let discoveredActive = false;

      this.#aiSettings.forEach((aiSetting) => {
        if (discoveredActive) {
          aiSetting.setBoolCellCurrent(controlSetting, false);
          return;
        }
        discoveredActive = isPrimitiveBool(aiSetting.control[controlSetting]);
        aiSetting.setBoolCellCurrent(controlSetting, discoveredActive);
      });

      this.#pluginSettings.forEach((pluginSetting) => {
        if (discoveredActive) {
          pluginSetting.setBoolCellCurrent(controlSetting, false);
          return;
        }
        discoveredActive = isPrimitiveBool(
          pluginSetting.control[controlSetting],
        );
        pluginSetting.setBoolCellCurrent(controlSetting, discoveredActive);
      });
    });
  }

  removeAiSetting(aiSetting) {
    const index = this.#aiSettings.indexOf(aiSetting);
    if (index < 0) {
      return; // nothing found
    }
    this.#aiSettings.splice(index, 1);
  }

  changePriority(aiSetting, priorityChange) {
    const index = this.#aiSettings.indexOf(aiSetting);
    if (index < 0) {
      return; // nothing found
    }
    const nextIndex = index + priorityChange;
    if (nextIndex < 0 || nextIndex >= this.#aiSettings.length) return;
    this.#aiSettings.splice(nextIndex, 0, ...this.#aiSettings.splice(index, 1));
  }
}

/** RESULT FUNCTIONS **/

function createResultConfig() {
  const configState = {};

  configState.menu = {};
  AI_SLOTS.forEach((slot) => slot.appendUserMenuEntryForSlot(configState.menu));
  if (MENU_LOCKED) configState.menu = undefined;
  configState.defaultLanguage = DEFAULT_LANGUAGE ? DEFAULT_LANGUAGE : null;
  if (DEFAULT_LANGUAGE_LOCKED) configState.defaultLanguage = undefined;

  AI_SLOTS.forEach((slot) => slot.appendAiControlSettingsForSlot(configState));
  return configState;
}

/** INIT FUNCTIONS **/

async function initData() {
  await Promise.all(
    Object.keys(GENERAL_LOCALIZATION).map(async (key) => {
      const value = await HOST_FUNCTIONS.getLocalizedString(key).catch(
        () => null,
      );
      if (
        typeof value === "string" &&
        value.trim() &&
        value !== key &&
        !value.includes("{{")
      ) {
        GENERAL_LOCALIZATION[key] = value;
      }
    }),
  );
  MENU_LOCALE = localize("menu.locale");
  document.documentElement.lang = MENU_LOCALE;
  document.documentElement.dir = MENU_LOCALE === "fa" ? "rtl" : "ltr";
  AI_SLOTS_NAMES.forEach((slotName) =>
    AI_SLOTS.set(slotName, new AiSlot(slotName)),
  );
  for (const [, slot] of AI_SLOTS) await slot.loadLocalizedSlotName();
}

async function receiveAllAvailableAi() {
  const foundAis = await HOST_FUNCTIONS.receivePluginPaths(
    "resources/ai",
    `**/${AiMeta.META_FILE}`,
  );
  for (const foundAi of foundAis) {
    (await Promise.all(foundAi.paths.map(AiMeta.fromNativeMetaPath)))
      .filter((meta) => !!meta)
      .toSorted(
        (metaOne, metaTwo) =>
          metaOne.name.localeCompare(metaTwo.name) ||
          metaOne.root.localeCompare(metaTwo.root),
      )
      .forEach((meta) => {
        meta.packName =
          foundAi.description?.["display-name"] ??
          foundAi.description?.name ??
          "";
        FOUND_AI_META.set(meta.root, meta);
      });
  }
}

async function receiveCurrentConfig() {
  const { baseline, user, qualifiers, creatorMode, qualifierEditing } = await HOST_FUNCTIONS.getCurrentConfig();
  QUALIFIER_EDITING = !!creatorMode && !!qualifierEditing;
  USER_QUALIFIERS = { ...(qualifiers ?? {}) };
  MENU_LOCKED = baseline.menu?.modifications?.value?.qualifier === "required";
  DEFAULT_LANGUAGE_LOCKED =
    baseline.defaultLanguage?.modifications?.value?.qualifier === "required";
  for (const [key, entry] of Object.entries(baseline)) {
    const match = /^ai\.([^.]+)\.([^.]+)$/.exec(key);
    if (match && entry.modifications?.value?.qualifier === "required") {
      AI_SLOTS.get(match[1])?.requireComponent(match[2]);
    }
  }

  // ignore baseline default language and menu
  const {
    defaultLanguage: _baselineDefaultLanguage,
    menu: _baselineMenu,
    ...baselineAi
  } = baseline;
  const { defaultLanguage, menu } = user;

  if (defaultLanguage) {
    DEFAULT_LANGUAGE = defaultLanguage;
  }
  if (DEFAULT_LANGUAGE_LOCKED)
    DEFAULT_LANGUAGE =
      baseline.defaultLanguage.modifications.value.content ??
      DEFAULT_VALUE_MARKER;

  const baselineConfigObject = Object.entries(baselineAi)
    .map(([key, value]) => [
      key.replace("ai.", ""),
      pluginDisplayName(
        value.modifications.value.entity,
        value.modifications.value.entityName,
      ),
      { ...value.modifications.value.content },
    ])
    .reduce((resultObj, [aiSettingUrl, extension, value]) => {
      const [ai, aiSetting] = aiSettingUrl.split(".");
      const aiObj = (resultObj[ai] = resultObj[ai] ?? {});

      // clean version if present
      value.root = createVersionFreeRootPath(value.root);

      const sourceKey = `${extension}-${value.root}-${value.name}-${value.language}`;
      if (!aiObj[sourceKey]) {
        const configObj = (aiObj[sourceKey] = {});
        configObj.root = value.root;
        configObj.name = value.name;
        configObj.control = {};
        configObj.language = value.language;
        configObj.extension = extension;
      }
      aiObj[sourceKey].control[aiSetting] = value.active;
      return resultObj;
    }, {});
  for (const [ai, configObj] of Object.entries(baselineConfigObject)) {
    Object.values(configObj)
      .filter((config) => FOUND_AI_META.has(config.root))
      .map((config) =>
        AiSetting.fromMetaAndSettings(FOUND_AI_META.get(config.root), config),
      )
      .filter((aiSetting) => !!aiSetting)
      .forEach((aiSetting) => AI_SLOTS.get(ai)?.pushBaselineSetting(aiSetting));
  }

  // filter to handle keys set to undefined
  for (const [ai, configArray] of Object.entries(menu ?? {}).filter(
    ([, configArray]) => !!configArray,
  )) {
    configArray
      .map((config) => {
        // clean version if present
        config.root = createVersionFreeRootPath(config.root);
        return config;
      })
      .filter((config) => FOUND_AI_META.has(config.root))
      .map((config) =>
        AiSetting.fromMetaAndSettings(FOUND_AI_META.get(config.root), config),
      )
      .filter((aiSetting) => !!aiSetting)
      .forEach((aiSetting) => AI_SLOTS.get(ai)?.pushUserSetting(aiSetting));
  }
}

function initMainElements() {
  new CompactAiMenu();
}

/** INIT **/

// Websandbox snapshots method names before asynchronous initialization finishes.
SANDBOX_FUNCTIONS.getConfigQualifiers = createResultQualifiers;

addEventListener(
  DONE_EVENT_NAME,
  async () => {
    await initData();
    await receiveAllAvailableAi();
    await receiveCurrentConfig();
    initMainElements();
    SANDBOX_FUNCTIONS.getConfig = createResultConfig;
  },
  { once: true },
);

// TODO: could in the end use maybe a little rework regarding which calls what...

// allows to find file for debugging
//# sourceURL=ai-swapper.js
