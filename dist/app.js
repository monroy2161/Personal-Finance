'use strict';
(() => {
  const KEY = 'mis-finanzas.v1';
  const MAX_AMOUNT = 1000000000000;
  const MAX_RECORDS = 5000;
  const categories = {
    expense: ['Comida', 'Supermercado', 'Hogar', 'Transporte', 'Salud', 'Suscripciones', 'Ocio', 'Mascotas', 'Otros gastos'],
    income: ['Sueldo', 'Reembolso', 'Venta', 'Otros ingresos']
  };
  const $ = id => document.getElementById(id);
  const money = new Intl.NumberFormat('es-CL', {style: 'currency', currency: 'CLP', maximumFractionDigits: 0});
  const dateFormat = new Intl.DateTimeFormat('es-CL', {day: '2-digit', month: 'short'});
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  let records = [];
  let storageReady = true;
  let confirmPending = false;
  $('month').value = today.slice(0,7);
  $('date').value = today;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function notify(message, error = false) {
    $('notice').textContent = message;
    $('notice').className = error ? 'notice error' : 'notice';
    $('notice').hidden = false;
  }
  function validDate(value) {
    if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value < '1900-01-01') return false;
    const date = new Date(value + 'T12:00:00');
    return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0,4)) && date.getMonth()+1 === Number(value.slice(5,7)) && date.getDate() === Number(value.slice(8,10));
  }
  function validateRecords(input) {
    if (!Array.isArray(input) || input.length > MAX_RECORDS) throw new Error('El respaldo debe contener hasta 5.000 movimientos.');
    const ids = new Set();
    return input.map(record => {
      if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id || record.id.length > 100 || ids.has(record.id) || !['income','expense'].includes(record.type) || !Number.isSafeInteger(record.amount) || record.amount <= 0 || record.amount > MAX_AMOUNT || !validDate(record.date) || typeof record.description !== 'string' || !record.description.trim() || record.description.length > 100 || !categories[record.type].includes(record.category)) {
        throw new Error('Hay movimientos inválidos o duplicados. El respaldo no se ha restaurado.');
      }
      ids.add(record.id);
      return {id: record.id, type: record.type, amount: record.amount, date: record.date, description: record.description.trim(), category: record.category};
    });
  }
  try {
    const stored = localStorage.getItem(KEY);
    if (stored !== null) records = validateRecords(JSON.parse(stored));
  } catch {
    storageReady = false;
    notify('No se pudieron leer tus datos. Para protegerlos, no se guardarán cambios. Descarga una copia de los datos originales antes de restaurar un respaldo o revisar los permisos de almacenamiento del navegador.', true);
  }
  function save(next) {
    if (!storageReady) {
      notify('El almacenamiento no está disponible. Revisa los permisos del navegador o restaura un respaldo válido. No se guardaron cambios.', true);
      return false;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      records = next;
      render();
      return true;
    } catch {
      notify('No se pudo guardar el cambio. Descarga un respaldo y revisa el espacio o los permisos del navegador.', true);
      return false;
    }
  }
  function fillCategories() {
    const type = document.querySelector('input[name="type"]:checked').value;
    $('category').replaceChildren(...categories[type].map(value => {
      const option = node('option', '', value); option.value = value; return option;
    }));
    $('description').placeholder = type === 'expense' ? 'Ej. Supermercado' : 'Ej. Sueldo de noviembre';
  }
  function emptyState(title, description) {
    const container = node('div','empty');
    const icon = node('span','empty-icon','↗'); icon.setAttribute('aria-hidden','true');
    container.append(icon, node('h3','',title),node('p','',description));
    return container;
  }
  function render() {
    const monthRecords = records.filter(record => record.date.slice(0,7) === $('month').value);
    const sum = type => monthRecords.filter(record => record.type === type).reduce((total, record) => total + record.amount, 0);
    const income = sum('income'), expense = sum('expense');
    $('balance').textContent = money.format(income-expense);
    $('income').textContent = money.format(income);
    $('expense').textContent = money.format(expense);
    for (const type of ['income','expense']) {
      const count = monthRecords.filter(record => record.type === type).length;
      $(type+'-count').textContent = `${count} ${count === 1 ? 'movimiento' : 'movimientos'}`;
    }
    const search = $('search').value.trim().toLocaleLowerCase('es-CL');
    const shown = monthRecords.filter(record => ($('type-filter').value === 'all' || record.type === $('type-filter').value) && `${record.description} ${record.category}`.toLocaleLowerCase('es-CL').includes(search)).sort((a,b) => b.date.localeCompare(a.date));
    $('movement-count').textContent = shown.length;
    $('movements').replaceChildren();
    if (!shown.length) $('movements').append(emptyState(monthRecords.length ? 'Sin coincidencias' : 'Tu mes comienza aquí', monthRecords.length ? 'Prueba con otra búsqueda o cambia el filtro.' : 'Agrega tu primer ingreso o gasto para empezar a ver tus finanzas con claridad.'));
    for (const record of shown) {
      const row = node('div','movement');
      const icon = node('span','movement-symbol ' + record.type, record.type === 'income' ? '↓' : '↑'); icon.setAttribute('aria-hidden','true');
      const info = node('div');
      info.append(node('div','movement-title',record.description),node('div','movement-meta',`${dateFormat.format(new Date(record.date+'T12:00:00'))} · ${record.category}`));
      const amount = node('span','movement-amount' + (record.type === 'income' ? ' positive' : ''), `${record.type === 'income' ? '+' : '−'}${money.format(record.amount)}`);
      const remove = node('button','delete-button','×'); remove.type = 'button';
      remove.setAttribute('aria-label',`Eliminar ${record.description}`);
      remove.title = 'Eliminar movimiento';
      remove.addEventListener('click',async () => {
        if (await confirmAction('Eliminar movimiento', `¿Eliminar “${record.description}” por ${money.format(record.amount)}?`)) {
          if (save(records.filter(item => item.id !== record.id))) notify('Movimiento eliminado.');
        }
      });
      row.append(icon,info,amount,remove); $('movements').append(row);
    }
    const totals = new Map();
    monthRecords.filter(record => record.type === 'expense').forEach(record => totals.set(record.category,(totals.get(record.category)||0)+record.amount));
    $('categories').replaceChildren();
    if (!totals.size) {
      const hint = node('p','muted small','Cuando registres gastos, verás aquí cómo se distribuyen.'); hint.style.lineHeight = '1.8';
      $('categories').append(hint);
    }
    for (const [category,total] of [...totals].sort((a,b) => b[1]-a[1])) {
      const item = node('div','category-item'), label = node('div','category-label');
      label.append(node('span','',category),node('span','',`${money.format(total)} · ${Math.round(total/expense*100)}%`));
      const track = node('div','track'), bar = node('div'); bar.style.width = `${total/expense*100}%`; track.append(bar);
      item.append(label,track); $('categories').append(item);
    }
    if (totals.size) {
      const total = node('div','category-total'); total.append(node('span','','Total de gastos'),node('strong','',money.format(expense))); $('categories').append(total);
    }
  }
  function confirmAction(title, message) {
    if (confirmPending) return Promise.resolve(false);
    confirmPending = true;
    $('dialog-title').textContent = title; $('dialog-message').textContent = message;
    $('confirm-dialog').returnValue = 'cancel';
    return new Promise(resolve => {
      $('confirm-dialog').addEventListener('close',() => {confirmPending = false; resolve($('confirm-dialog').returnValue === 'confirm');},{once:true});
      $('confirm-dialog').showModal();
    });
  }
  $('movement-form').addEventListener('submit',event => {
    event.preventDefault();
    const type = document.querySelector('input[name="type"]:checked').value;
    const description = $('description').value.trim();
    const amount = Number($('amount').value), date = $('date').value;
    if (!description || !Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_AMOUNT || !validDate(date)) {
      notify('Completa una descripción, una fecha válida y un monto entero mayor a cero.',true); return;
    }
    if (records.length >= MAX_RECORDS) {notify('Llegaste al límite de 5.000 movimientos. Descarga un respaldo antes de continuar.',true); return;}
    const record = {id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, type, description, amount, date, category: $('category').value};
    const previousMonth = $('month').value;
    $('month').value = date.slice(0,7);
    if (save([...records,record])) {
      $('description').value = ''; $('amount').value = ''; $('description').focus();
      notify('Movimiento guardado.');
    } else {$('month').value = previousMonth;}
  });
  document.querySelectorAll('input[name="type"]').forEach(input => input.addEventListener('change',fillCategories));
  $('month').addEventListener('change',() => {
    if (!$('month').value) $('month').value = today.slice(0,7);
    render();
  });
  $('search').addEventListener('input',render); $('type-filter').addEventListener('change',render);
  function download(content, filename) {
    const url = URL.createObjectURL(new Blob([content],{type:'application/json'}));
    const link = node('a'); link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  $('export').addEventListener('click',() => {
    try {
      if (!storageReady) {
        const original = localStorage.getItem(KEY);
        if (original === null) {notify('No hay datos originales disponibles para descargar.',true); return;}
        download(original,`mis-finanzas-recuperacion-${today}.json`); return;
      }
      download(JSON.stringify({app:'mis-finanzas',version:1,exportedAt:new Date().toISOString(),records},null,2),`mis-finanzas-${today}.json`);
      notify('Respaldo descargado. Incluye todos los meses.');
    } catch {notify('No se pudo descargar el respaldo en este navegador.',true);}
  });
  $('import').addEventListener('change',async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 5*1024*1024) throw new Error('El archivo supera el máximo de 5 MB.');
      let data;
      try {data = JSON.parse(await file.text());} catch {throw new Error('El archivo no contiene un respaldo JSON válido.');}
      if (data?.app !== 'mis-finanzas' || data.version !== 1) throw new Error('Elige un respaldo creado por esta app.');
      const next = validateRecords(data.records);
      if (await confirmAction('Restaurar respaldo',`El respaldo contiene ${next.length} movimientos. Reemplazará TODOS los datos de este navegador (${records.length} movimientos). Descarga primero tu respaldo actual si quieres conservarlo.`)) {
        const wasReady = storageReady; storageReady = true;
        if (save(next)) {
          if (next.length) $('month').value = next.map(record => record.date.slice(0,7)).sort().at(-1);
          $('search').value = ''; $('type-filter').value = 'all'; render(); notify('Respaldo restaurado.');
        } else {storageReady = wasReady;}
      }
    } catch(error) {notify(error.message,true);} finally {event.target.value = '';}
  });
  window.addEventListener('storage',event => {
    if (event.key === KEY || event.key === null) {
      try {records = validateRecords(JSON.parse(localStorage.getItem(KEY) || '[]')); storageReady = true; render(); notify('Datos actualizados desde otra pestaña.');}
      catch {storageReady = false; notify('Los datos cambiaron en otra pestaña y no se pueden leer. No se guardarán cambios.',true);}
    }
  });
  fillCategories(); render();
})();
