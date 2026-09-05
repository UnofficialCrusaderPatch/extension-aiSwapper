const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(`${root}/menu/ai-swapper.js`, "utf8");
const languages = fs
  .readdirSync(`${root}/locale`)
  .filter((name) => name.endsWith(".yml"))
  .map((name) => name.slice(0, -4));
const readLocale = (language) =>
  Object.fromEntries(
    fs
      .readFileSync(`${root}/locale/${language}.yml`, "utf8")
      .trim()
      .split("\n")
      .map((line) => {
        const index = line.indexOf(":");
        return [line.slice(0, index), JSON.parse(line.slice(index + 1))];
      }),
  );
const english = readLocale("en");
(async () => {
  for (const language of languages) {
    const catalog = readLocale(language);
    assert.deepEqual(
      Object.keys(catalog).sort(),
      Object.keys(english).sort(),
      `Incomplete ${language}`,
    );
    for (const [key, value] of Object.entries(catalog)) {
      assert.ok(
        value.trim() && value !== key && !value.includes("{{"),
        `${language}: ${key}`,
      );
      assert.deepEqual(
        value.match(/\{\w+\}/g)?.sort() ?? [],
        english[key].match(/\{\w+\}/g)?.sort() ?? [],
        `Parameters: ${language} ${key}`,
      );
    }
    const context = vm.createContext({
      SANDBOX_FUNCTIONS: {},
      document: { documentElement: {}, createElement: () => ({}) },
      HOST_FUNCTIONS: { getLocalizedString: async (key) => catalog[key] },
      addEventListener() {},
      DONE_EVENT_NAME: "ready",
      Intl,
      assert,
    });
    vm.runInContext(source, context);
    await vm.runInContext("initData()", context);
    assert.equal(
      vm.runInContext('localize("change.language.default")', context),
      catalog["change.language.default"],
    );
    assert.equal(
      vm.runInContext('localize("state.inherit")', context),
      catalog["state.inherit"],
    );
    assert.ok(
      !vm.runInContext('languageLabel("de")', context).startsWith("change."),
    );
    vm.runInContext(
      `
      const multilingual = {defaultLang:'de', supportedLang:['de','en']};
      assert.equal(resolveAiLanguage(multilingual, undefined, ''), 'de');
      assert.equal(resolveAiLanguage(multilingual, undefined, 'en'), 'en');
      assert.equal(resolveAiLanguage(multilingual, 'de', 'en'), 'de');
      assert.equal(resolveAiLanguage(multilingual, 'fr', 'en'), 'de');
      assert.equal(resolveAiLanguage({defaultLang:'de', supportedLang:['de']}, undefined, 'en'), 'de');
      const languageSelect = {children:[], classList:{add(){}}, replaceChildren(){this.children=[];}, appendChild(option){this.children.push(option);}};
      populateLanguageSelect(languageSelect, ['de','en','de'], 'de');
      assert.equal(languageSelect.value, 'de');
      assert.equal(languageSelect.children.length, 2);
      assert.equal(languageSelect.children[0].value, 'de');
      assert.ok(!languageSelect.children.some(option => ['', 'default'].includes(option.value)));
      const first = {name:'First', root:'first', control:{speech:true}};
      const second = {name:'Second', root:'second', control:{speech:true}};
      const slot = new AiSlot('rat');
      slot.pushUserSetting(first); slot.pushUserSetting(second);
      const saved = () => { const config = {}; slot.appendAiControlSettingsForSlot(config); return config['ai.rat.speech']; };
      assert.equal(saved().name, 'First');
      first.control.speech = nextComponentState(first.control.speech, true);
      assert.equal(first.control.speech, undefined);
      assert.equal(saved().name, 'Second');
      first.control.speech = nextComponentState(first.control.speech, true);
      assert.equal(saved().active, false);
      assert.equal(saved().name, 'First');
      first.control.speech = nextComponentState(first.control.speech, true);
      assert.equal(saved().active, true);
      assert.equal(saved().name, 'First');
      assert.equal(nextComponentState(false, false), undefined);
      // New additions take priority; loading existing settings retains their order.
      const originalFromMeta = AiSetting.fromMeta;
      const newest = {name:'Newest', root:'newest', control:{speech:true}};
      AiSetting.fromMeta = () => newest;
      assert.equal(slot.receiveNewAiSetting({}), newest);
      assert.equal(slot.getUserSettings()[0], newest);
      assert.equal(slot.getUserSettings()[1], first);
      assert.equal(saved().name, 'Newest');
      AiSetting.fromMeta = originalFromMeta;

      // Inherited suggestions are never mutated; user overrides remain sparse.
      const originalFromSettings = AiSetting.fromMetaAndSettings;
      AiSetting.fromMetaAndSettings = (meta, settings) => ({
        ...settings, aiMeta:meta, name:meta.name,
        toSettingNameAndObject() { return {root:this.root, control:{...this.control}, language:this.language}; },
      });
      const inheritedSlot = new AiSlot('rat');
      const inheritedSetting = Object.freeze({
        extension:'Story pack', name:'Rotkaeppchen', root:'story/rotkaeppchen/',
        aiMeta:{name:'Rotkaeppchen', root:'story/rotkaeppchen/'}, language:'de',
        control:Object.freeze({speech:true, portrait:true, aic:true}),
      });
      inheritedSlot.pushBaselineSetting(inheritedSetting);
      inheritedSlot.customizeComponent(inheritedSetting, 'speech', false);
      const override = inheritedSlot.getUserSettings()[0];
      assert.equal(override.extension, undefined);
      assert.equal(override.control.speech, false);
      assert.equal(override.control.portrait, undefined);
      assert.equal(inheritedSetting.control.speech, true);
      assert.equal(inheritedSlot.getEffectiveSetting('speech'), override);
      assert.equal(inheritedSlot.getEffectiveSetting('portrait'), inheritedSetting);
      const overrideConfig = {};
      inheritedSlot.appendAiControlSettingsForSlot(overrideConfig);
      assert.equal(overrideConfig['ai.rat.speech'].active, false);
      assert.equal(overrideConfig['ai.rat.portrait'], undefined);
      inheritedSlot.customizeComponent(inheritedSetting, 'speech', undefined);
      assert.equal(inheritedSlot.getEffectiveSetting('speech'), inheritedSetting);
      assert.equal(inheritedSlot.getUserSettings().length, 1);

      inheritedSlot.requireComponent('speech');
      inheritedSlot.customizeComponent(inheritedSetting, 'speech', false);
      assert.equal(override.control.speech, undefined);
      // Old saved overrides cannot defeat a newly-required component either.
      override.control.speech = false;
      inheritedSlot.appendAiControlSettingsForSlot(overrideConfig);
      assert.equal(overrideConfig['ai.rat.speech'], undefined);
      assert.equal(inheritedSlot.getEffectiveSetting('speech'), inheritedSetting);
      inheritedSlot.customizeLanguage(inheritedSetting, 'en');
      assert.equal(override.language, 'en');
      assert.equal(inheritedSetting.language, 'de');
      assert.equal(override.control.portrait, true);
      inheritedSlot.removeAiSetting(override);
      assert.equal(inheritedSlot.getEffectiveSetting('portrait'), inheritedSetting);
      const restoredMenu = {};
      inheritedSlot.appendUserMenuEntryForSlot(restoredMenu);
      assert.equal(restoredMenu.rat, undefined);
      assert.equal(pluginDisplayName({name:'Story pack'}), 'Story pack');
      assert.equal(pluginDisplayName({'display-name':'Story pack', name:'internal'}), 'Story pack');
      AiSetting.fromMetaAndSettings = originalFromSettings;

      // Exercise the visible-card filter, including active and available rows.
      const metadata = [
        {root:'shared-wolf-path/rat', name:'Rat', author:'Firefly', packName:'Original'},
        {root:'shared-wolf-path/wolf', name:'Wolf', author:'Firefly', packName:'Original'},
        {root:'shared-wolf-path/custom', name:'Azúla', author:'Custom Author', packName:'Fire Pack'},
      ];
      metadata.forEach(meta => FOUND_AI_META.set(meta.root, meta));
      const rows = metadata.map(meta => ({dataset:{root:meta.root}, hidden:false}));
      const empty = {hidden:false};
      const view = Object.create(CompactAiMenu.prototype);
      view.search = {value:'wolf'};
      view.cards = {querySelectorAll: () => rows, querySelector: () => empty};
      const visible = () => rows.filter(row => !row.hidden).map(row => row.dataset.root).join(',');
      view.filterCards();
      assert.equal(visible(), metadata[1].root);
      assert.equal(empty.hidden, true);
      view.search.value = '  AZULA  fire  ';
      view.filterCards();
      assert.equal(visible(), metadata[2].root);
      view.search.value = 'not-present';
      view.filterCards();
      assert.equal(visible(), '');
      assert.equal(empty.hidden, false);
      view.search.value = '';
      view.filterCards();
      assert.equal(rows.filter(row => !row.hidden).length, 3);
      assert.equal(empty.hidden, true);
    `,
      context,
    );
    context.HOST_FUNCTIONS.getLocalizedString = async (key) => key;
    vm.runInContext(
      "Object.assign(GENERAL_LOCALIZATION, LOCALIZATION_FALLBACK)",
      context,
    );
    await vm.runInContext("initData()", context);
    assert.equal(
      vm.runInContext('localize("change.language.default")', context),
      english["change.language.default"],
    );
  }
  console.log(
    `PASS: ${languages.length} locales, resolved language options, cycle/priority/search, sparse plugin overrides, immutable baseline, required locks, language overrides and restore-on-removal.`,
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
