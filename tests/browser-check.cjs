// Real-browser smoke checks. Usage: node tests/browser-check.cjs <path-to-edge-or-chrome>
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const assert = require('node:assert/strict');
const browser = process.argv[2];
assert(browser, 'Provide the path to Edge or Chrome.');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'finanzas-qa-'));
const fixture = path.join(temp, 'check.html');
const test = async function () {
  const results = [];
  const check = (condition, label) => {if (!condition) throw new Error(label); results.push(label);};
  const $ = id => document.getElementById(id);
  const money = amount => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(amount);
  const add = (type, description, amount, date) => {
    const radio = document.querySelector(`input[name="type"][value="${type}"]`);
    radio.checked = true; radio.dispatchEvent(new Event('change'));
    $('description').value = description; $('amount').value = amount; $('date').value = date;
    $('movement-form').requestSubmit();
  };
  const wait = () => new Promise(resolve => setTimeout(resolve, 100));
  const closeDialog = async value => {
    const closed = new Promise(resolve => $('confirm-dialog').addEventListener('close',resolve,{once:true}));
    $('confirm-dialog').close(value); await closed; await wait();
  };
  try {
    localStorage.removeItem('mis-finanzas.v1');
    window.dispatchEvent(new StorageEvent('storage',{key:'mis-finanzas.v1'}));
    $('month').value = '2026-11'; $('month').dispatchEvent(new Event('change'));
    check($('balance').textContent === money(0), 'Empty state has zero balance');
    add('income','Sueldo',1000000,'2026-11-01');
    add('expense','<img src=x onerror=alert(1)>',25000,'2026-11-02');
    add('expense','Comida',15000,'2026-11-03');
    check($('income').textContent === money(1000000) && $('expense').textContent === money(40000) && $('balance').textContent === money(960000), 'Monthly totals and balance');
    check(!document.querySelector('.movement img'), 'Descriptions render as text');
    check(JSON.parse(localStorage.getItem('mis-finanzas.v1')).length === 3, 'Records persist in localStorage');
    $('search').value = '<img'; $('search').dispatchEvent(new Event('input'));
    check($('movement-count').textContent === '1' && $('expense').textContent === money(40000), 'Search preserves monthly totals');
    $('search').value = ''; $('search').dispatchEvent(new Event('input'));
    add('expense','Otro mes',3000,'2026-12-01');
    check($('expense').textContent === money(3000), 'Months are isolated');
    $('month').value = '2026-11'; $('month').dispatchEvent(new Event('change'));
    check($('expense').textContent === money(40000), 'Switch month restores correct totals');
    document.querySelector('.delete-button').click();
    await closeDialog('cancel');
    check(JSON.parse(localStorage.getItem('mis-finanzas.v1')).length === 4, 'Cancel deletion preserves record');
    document.querySelector('.delete-button').click();
    await closeDialog('confirm');
    check(JSON.parse(localStorage.getItem('mis-finanzas.v1')).length === 3 && $('expense').textContent === money(25000), 'Confirmed deletion updates totals and storage');
    const before = localStorage.getItem('mis-finanzas.v1');
    add('expense','Invalid zero',0,'2026-11-04');
    check(localStorage.getItem('mis-finanzas.v1') === before, 'Zero amount is rejected');
    const upload = async data => {
      const transfer = new DataTransfer(); transfer.items.add(new File([JSON.stringify(data)],'backup.json',{type:'application/json'}));
      $('import').files = transfer.files; $('import').dispatchEvent(new Event('change'));
      for (let i = 0; i < 100 && $('import').value && !$('confirm-dialog').open; i++) await new Promise(resolve => setTimeout(resolve, 10));
    };
    await upload({app:'mis-finanzas',version:1,records:[{id:'bad',type:'expense',amount:10,date:'2026-02-30',category:'Comida',description:'Invalid date'}]});
    check(localStorage.getItem('mis-finanzas.v1') === before && $('notice').classList.contains('error'), 'Invalid backup leaves existing data intact');
    await upload({app:'mis-finanzas',version:1,records:[{id:'restore',type:'income',amount:5000,date:'2026-10-01',category:'Sueldo',description:'Restaurado'}]});
    check($('confirm-dialog').open, 'Restore requires confirmation: ' + $('notice').textContent);
    await closeDialog('confirm');
    check($('month').value === '2026-10' && $('balance').textContent === money(5000) && JSON.parse(localStorage.getItem('mis-finanzas.v1')).length === 1, 'Restore replaces data and selects restored month: ' + JSON.stringify({notice:$('notice').textContent,month:$('month').value,records:JSON.parse(localStorage.getItem('mis-finanzas.v1')).length,dialog:$('dialog-message').textContent,value:$('confirm-dialog').returnValue}));
    const nativeSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {throw new DOMException('Quota exceeded','QuotaExceededError');};
    add('expense','Cannot save',100,'2026-10-02');
    check($('notice').classList.contains('error') && $('balance').textContent === money(5000), 'Failed storage does not change records or totals');
    Storage.prototype.setItem = nativeSet;
    const report = document.createElement('pre'); report.id = 'qa-result'; report.textContent = 'QA_PASS ' + results.length + ' checks\n' + results.join('\n'); document.body.append(report);
  } catch(error) {
    const report = document.createElement('pre'); report.id = 'qa-result'; report.textContent = 'QA_FAIL ' + error.message; document.body.append(report);
  }
};
const html = fs.readFileSync(path.join(root,'dist/index.html'),'utf8')
  .replace('href="styles.css"',`href="${pathToFileURL(path.join(root,'dist/styles.css'))}"`)
  .replace('src="app.js"',`src="${pathToFileURL(path.join(root,'dist/app.js'))}"`)
  .replace('</body>',`<script>window.addEventListener('load', ${test.toString()});</script></body>`);
fs.writeFileSync(fixture,html);
const result = spawnSync(browser,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${path.join(temp,'profile')}`,'--virtual-time-budget=5000','--dump-dom',pathToFileURL(fixture).href],{encoding:'utf8',timeout:60000,maxBuffer:5*1024*1024,windowsHide:true});
if (result.error) throw result.error;
const report = result.stdout.match(/<pre id="qa-result">([\s\S]*?)<\/pre>/)?.[1];
console.log(report || 'No browser report.');
assert(report?.startsWith('QA_PASS'), 'Browser checks failed.');
