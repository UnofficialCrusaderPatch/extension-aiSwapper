const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../menu/ai-swapper.js'), 'utf8');
const context = vm.createContext({ SANDBOX_FUNCTIONS: {}, assert, DONE_EVENT_NAME: 'ready', addEventListener() {}, document: { createElement: () => ({ setAttribute() {} }) } });
vm.runInContext(source, context);
// The API must be advertised before the async ready listener runs.
assert.equal(typeof context.SANDBOX_FUNCTIONS.getConfigQualifiers, "function");
vm.runInContext(`
  localize = key => key;
  let values = {menu: {}, 'ai.rat.speech': {active: false}, 'ai.rat.portrait': {}, 'ai.wolf.speech': {}, 'ai.wolf.aic': undefined};
  createResultConfig = () => values;
  USER_QUALIFIERS = {'ai.rat.speech': 'required', 'ai.wolf.aic': 'required'};
  assert.deepEqual(Array.from(qualifierKeys('rat')), ['ai.rat.speech', 'ai.rat.portrait']);
  assert.equal(qualifierKeys().length, 3);
  USER_QUALIFIERS['ai.rat.speech'] = 'required';
  values['ai.rat.portrait'] = undefined;
  const inherited = Object.freeze({control: Object.freeze({speech:false, portrait:true})});
  AI_SLOTS.set('rat', {
    getEffectiveSetting: () => inherited,
    customizeComponent(source, component, value) { values['ai.rat.' + component] = {active:value}; },
  });
  const partial = createQualifierControl(['ai.rat.speech'], 'Rat', () => {}, ['ai.rat.speech', 'ai.rat.portrait']);
  assert.equal(partial.className, 'qualifier-control qualifier-mixed');
  partial.onclick();
  assert.equal(USER_QUALIFIERS['ai.rat.speech'], 'required');
  assert.equal(USER_QUALIFIERS['ai.rat.portrait'], 'required');
  assert.equal(values['ai.rat.speech'].active, false);
  assert.equal(values['ai.rat.portrait'].active, true);
  assert.equal(inherited.control.portrait, true);
  AI_SLOTS.clear();
  delete USER_QUALIFIERS['ai.rat.portrait'];
  USER_QUALIFIERS['ai.rat.speech'] = 'required';
  let renders = 0;
  const mixed = createQualifierControl(qualifierKeys('rat'), 'Rat', () => renders++);
  assert.equal(mixed.className, 'qualifier-control qualifier-mixed');
  mixed.onclick();
  assert.equal(USER_QUALIFIERS['ai.rat.portrait'], 'required');
  assert.equal(USER_QUALIFIERS['ai.wolf.speech'], undefined);
  const required = createQualifierControl(qualifierKeys('rat'), 'Rat', () => renders++);
  required.onclick();
  assert.equal(USER_QUALIFIERS['ai.rat.speech'], 'suggested');
  assert.equal(renders, 2);
  assert.equal(createQualifierControl([], 'Empty', () => {}).disabled, true);
  assert.equal(createResultQualifiers()['ai.wolf.aic'], undefined);
  assert.equal(SANDBOX_FUNCTIONS.getConfigQualifiers()['ai.rat.speech'], 'suggested');
  values['ai.rat.speech'] = undefined;
  assert.equal(createResultQualifiers()['ai.rat.speech'], undefined);
`, context);
console.log('PASS: staged component/group qualifiers, mixed state, explicit false, scope boundaries and removed overrides.');
