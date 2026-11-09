// El estado reúne los datos de la aplicación; la vista se actualiza con render().
const STORAGE_KEY = 'shiplist.tasks.v1';
let tasks = [];
let filter = 'all';
const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const empty = document.querySelector('#empty');
const clearButton = document.querySelector('#clear-done');

function storageWarning() {
  document.querySelector('#storage-note').textContent = 'No se pudo guardar. Tus tareas durarán solo mientras esta página esté abierta.';
}

try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (Array.isArray(stored)) {
    const ids = new Set();
    tasks = stored.filter(task => {
      if (!task || typeof task.id !== 'string' || ids.has(task.id) || typeof task.text !== 'string' || !task.text.trim() || typeof task.done !== 'boolean') return false;
      ids.add(task.id);
      return true;
    }).map(task => ({
      id: task.id,
      text: task.text.slice(0, 180),
      done: task.done,
      completed_at: task.completed_at ?? null,
      daily_since: task.daily_since ?? null,
      daily_completions: task.daily_completions ?? {}
    }));
  }
} catch { storageWarning(); }

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
  catch { storageWarning(); }
}

const client = globalThis.supabase?.createClient(
  'https://fkntwfagcwhwvutslkta.supabase.co',
  'sb_publishable_-DlPwByilGeIOJUlnUvzqg_pVPctjer'
);
const loginForm = document.querySelector('#login-form');
const syncActions = document.querySelector('#sync-actions');
const syncStatus = document.querySelector('#sync-status');
const storageNote = document.querySelector('#storage-note');
let localTasks = tasks;
let account = null;
let busy = false;
let cloudReady = false;

function updateAccount(user) {
  account = user;
  cloudReady = false;
  tasks = user ? [] : localTasks;
  loginForm.hidden = Boolean(user);
  syncActions.hidden = !user;
  storageNote.textContent = user ? 'Tus tareas se guardan en tu cuenta.' : '◦ Tus tareas se guardan solo en este navegador.';
  render();
}

async function refreshTasks() {
  const loaded = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const {data, error} = await client.from('shiplist_tasks')
      .select('id,text,done,completed_at,daily_since,daily_completions').eq('owner_id', account.id)
      .order('created_at').order('id').range(offset, offset + pageSize - 1);
    if (error) throw error;
    loaded.push(...data);
    if (data.length < pageSize) break;
  }
  cloudReady = true;
  if (renderedDay !== dateKey() || JSON.stringify(tasks) !== JSON.stringify(loaded)) {
    tasks = loaded;
    render();
  }
}

async function runCloud(action, errorMessage) {
  if (busy) return false;
  busy = true;
  try {
    await action();
    syncStatus.textContent = account
      ? `Sesión iniciada como ${account.email}.`
      : 'Inicia sesión con la misma cuenta en ambos dispositivos.';
    return true;
  } catch {
    syncStatus.textContent = errorMessage;
    if (account) syncStatus.closest('details').open = true;
    return false;
  } finally {
    busy = false;
  }
}

async function changeTasks(next, write) {
  if (busy || (account && !cloudReady)) return false;
  if (account) {
    const saved = await runCloud(async () => {
      const {error} = await write(client.from('shiplist_tasks'), account.id);
      if (error) throw error;
    }, 'No se guardó el cambio en tu cuenta. Comprueba la conexión e inténtalo de nuevo.');
    if (!saved) return false;
  }
  tasks = next;
  if (!account) {
    localTasks = tasks;
    save();
  }
  return true;
}

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!client) return;
  const {email, password} = loginForm.elements;
  runCloud(async () => {
    const {data, error} = await client.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    });
    if (error) throw error;
    loginForm.reset();
    updateAccount(data.user);
    await refreshTasks();
  }, 'No se pudo completar el acceso. Revisa tu correo, contraseña y conexión.');
});

document.querySelector('#logout').addEventListener('click', () => {
  runCloud(async () => {
    const {error} = await client.auth.signOut({scope: 'local'});
    if (error) throw error;
    updateAccount(null);
  }, 'No se pudo cerrar la sesión. Inténtalo de nuevo.');
});

document.querySelector('#import-tasks').addEventListener('click', () => {
  if (!account || !localTasks.length) return;
  runCloud(async () => {
    const importKey = `shiplist.imported.${account.id}`;
    const imported = new Set(JSON.parse(localStorage.getItem(importKey) || '[]'));
    const pending = localTasks.filter(task => !imported.has(task.id));
    for (let offset = 0; offset < pending.length; offset += 100) {
      const rows = pending.slice(offset, offset + 100).map(task => ({
        ...task, owner_id: account.id
      }));
      const {error} = await client.from('shiplist_tasks')
        .upsert(rows, {onConflict: 'owner_id,id', ignoreDuplicates: true});
      if (error) throw error;
      rows.forEach(row => imported.add(row.id));
      localStorage.setItem(importKey, JSON.stringify([...imported]));
    }
    await refreshTasks();
  }, 'La importación no terminó. Puedes reintentar sin duplicar las tareas.');
});

function refreshWhenVisible() {
  if (!document.hidden && renderedDay !== dateKey()) render();
  if (account && !document.hidden) {
    runCloud(refreshTasks, 'No se pudo actualizar la lista. Se reintentará al recuperar la conexión.');
  }
}

if (client) {
  runCloud(async () => {
    const {data, error} = await client.auth.getSession();
    if (error) throw error;
    if (data.session) {
      updateAccount(data.session.user);
      await refreshTasks();
    }
  }, 'No se pudo recuperar la sesión. Revisa la conexión.');
  window.addEventListener('focus', refreshWhenVisible);
  window.addEventListener('online', refreshWhenVisible);
  document.addEventListener('visibilitychange', refreshWhenVisible);
} else {
  loginForm.hidden = true;
  syncStatus.textContent = 'La sincronización no está disponible. Puedes usar tu lista local.';
}

// Una rutina usa el mismo día en ambos dispositivos, según la hora de Lima.
const timeZone = 'America/Lima';
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
});
const completionFormat = new Intl.DateTimeFormat('es-PE', {
  timeZone, dateStyle: 'medium', timeStyle: 'short'
});
let renderedDay;

function dateKey(now = new Date()) {
  const parts = Object.fromEntries(dayFormat.formatToParts(now).map(({type, value}) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function previousDay(day) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function isDone(task, day) {
  return task.daily_since ? Boolean(task.daily_completions[day]) : task.done;
}

setInterval(refreshWhenVisible, 15000);

function render() {
  const today = dateKey();
  const yesterday = previousDay(today);
  renderedDay = today;
  document.querySelector('#import-tasks').hidden = !localTasks.length;
  list.replaceChildren();
  const visible = tasks.filter(task => filter === 'all' || (filter === 'done' ? isDone(task, today) : !isDone(task, today)));
  for (const task of visible) {
    const item = document.createElement('li');
    const doneToday = isDone(task, today);
    item.classList.toggle('done', doneToday);
    const label = document.createElement('label');
    label.className = 'task-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = doneToday;
    checkbox.addEventListener('change', async () => {
      const done = checkbox.checked;
      checkbox.checked = doneToday;
      if (today !== dateKey()) {
        render();
        return;
      }
      const timestamp = done ? new Date().toISOString() : null;
      let patch = {done, completed_at: timestamp};
      let write = (table, owner) => table.update(patch).eq('owner_id', owner).eq('id', task.id);
      if (task.daily_since) {
        const completions = {...task.daily_completions};
        if (timestamp) completions[today] = timestamp;
        else delete completions[today];
        patch = {daily_completions: completions};
        write = () => client.rpc('set_shiplist_daily_completion', {
          task_id: task.id, task_day: today, completion_time: timestamp
        });
      }
      await changeTasks(tasks.map(candidate =>
        candidate.id === task.id ? {...candidate, ...patch} : candidate
      ), write);
      render();
      const next = list.querySelector(`[data-task-id="${CSS.escape(task.id)}"] input`);
      (next || document.querySelector(`[data-filter="${filter}"]`)).focus();
    });

    const text = document.createElement('span');
    text.textContent = task.text;
    label.append(checkbox, text);
    const content = document.createElement('div');
    content.className = 'task-content';
    content.append(label);
    const completedAt = task.daily_since ? task.daily_completions[today] : task.completed_at;
    if (doneToday && completedAt) {
      const time = document.createElement('time');
      time.dateTime = completedAt;
      time.className = 'task-meta';
      time.textContent = `Hecha · ${completionFormat.format(new Date(completedAt))}`;
      content.append(time);
    }
    if (task.daily_since) {
      const note = document.createElement('small');
      note.className = 'task-meta';
      note.textContent = 'Se repite cada día';
      if (task.daily_since <= yesterday && !task.daily_completions[yesterday]) {
        note.textContent += ' · Ayer quedó pendiente';
      }
      content.append(note);
      const previous = Object.keys(task.daily_completions).filter(day => day < today).sort().reverse();
      if (previous.length) {
        const history = document.createElement('details');
        history.className = 'task-meta';
        const summary = document.createElement('summary');
        summary.textContent = 'Ver historial';
        history.append(summary);
        for (const day of previous) {
          const time = document.createElement('time');
          time.dateTime = task.daily_completions[day];
          time.textContent = completionFormat.format(new Date(time.dateTime));
          history.append(time);
        }
        content.append(history);
      }
    }
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'edit-task';
    edit.textContent = 'Editar';
    edit.setAttribute('aria-label', `Editar: ${task.text}`);
    edit.addEventListener('click', async () => {
      const text = window.prompt('Editar tarea (máximo 180 caracteres)', task.text)?.trim();
      if (!text || text === task.text) return;
      if (text.length > 180) {
        window.alert('La tarea admite hasta 180 caracteres.');
        return;
      }
      await changeTasks(tasks.map(candidate =>
        candidate.id === task.id ? {...candidate, text} : candidate
      ), (table, owner) => table.update({text}).eq('owner_id', owner).eq('id', task.id));
      render();
      input.focus();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Eliminar: ${task.text}`);
    remove.addEventListener('click', async () => {
      if (task.daily_since && !window.confirm('¿Eliminar esta rutina y su historial?')) return;
      await changeTasks(tasks.filter(candidate => candidate.id !== task.id),
        (table, owner) => table.delete().eq('owner_id', owner).eq('id', task.id));
      render();
      input.focus();
    });
    item.dataset.taskId = task.id;
    item.append(content, edit, remove);
    list.append(item);
  }
  const completed = tasks.filter(task => isDone(task, today)).length;
  const pending = tasks.length - completed;
  document.querySelector('#summary').textContent = tasks.length ? `${pending} ${pending === 1 ? 'tarea pendiente' : 'tareas pendientes'} · Tú puedes con esto.` : 'Tu día, a tu ritmo.';
  document.querySelector('#progress-text').textContent = `${completed} de ${tasks.length} completadas`;
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  document.querySelector('#progress-fill').style.width = `${percent}%`;
  document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', percent);
  clearButton.hidden = !tasks.some(task => task.done && !task.daily_since);
  empty.hidden = visible.length > 0;
  empty.querySelector('h3').textContent = !tasks.length ? 'Un espacio para empezar' : filter === 'pending' ? 'Todo listo por ahora' : 'Todavía no hay tareas hechas';
  empty.querySelector('p').textContent = !tasks.length ? 'Agrega tu primera tarea. Lo pequeño también cuenta.' : filter === 'pending' ? 'Disfruta la pausa. Te la ganaste.' : 'Cada pequeño paso suma. Marca una cuando la termines.';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) { input.value = ''; input.focus(); return; }
  const task = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text,
    done: false,
    completed_at: null,
    daily_since: document.querySelector('#daily-task').checked ? dateKey() : null,
    daily_completions: {}
  };
  const added = await changeTasks([...tasks, task],
    (table, owner) => table.insert({...task, owner_id: owner}));
  if (!added) return;
  if (input.value.trim() === text) input.value = '';
  document.querySelector('#daily-task').checked = false;
  setFilter('all');
  input.focus();
});

function setFilter(value) {
  filter = value;
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  render();
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
clearButton.addEventListener('click', async () => {
  const completedIds = tasks.filter(task => task.done && !task.daily_since).map(task => task.id);
  if (!completedIds.length) return;
  await changeTasks(tasks.filter(task => !completedIds.includes(task.id)),
    (table, owner) => table.delete().eq('owner_id', owner).eq('done', true).in('id', completedIds));
  render();
  input.focus();
});
render();
