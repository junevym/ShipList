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
    }).map(task => ({id: task.id, text: task.text.slice(0, 180), done: task.done}));
  }
} catch { storageWarning(); }

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
  catch { storageWarning(); }
}

function render() {
  list.replaceChildren();
  const visible = tasks.filter(task => filter === 'all' || (filter === 'done' ? task.done : !task.done));
  for (const task of visible) {
    const item = document.createElement('li');
    item.classList.toggle('done', task.done);
    const label = document.createElement('label');
    label.className = 'task-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => {
      task.done = checkbox.checked;
      save();
      render();
      const next = list.querySelector(`[data-task-id="${CSS.escape(task.id)}"] input`);
      (next || document.querySelector(`[data-filter="${filter}"]`)).focus();
    });
    const text = document.createElement('span');
    // textContent muestra lo escrito como texto, sin interpretarlo como HTML.
    text.textContent = task.text;
    label.append(checkbox, text);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Eliminar: ${task.text}`);
    remove.addEventListener('click', () => {
      tasks = tasks.filter(candidate => candidate.id !== task.id);
      save();
      render();
      input.focus();
    });
    item.dataset.taskId = task.id;
    item.append(label, remove);
    list.append(item);
  }
  const completed = tasks.filter(task => task.done).length;
  const pending = tasks.length - completed;
  document.querySelector('#summary').textContent = tasks.length ? `${pending} ${pending === 1 ? 'tarea pendiente' : 'tareas pendientes'} · Tú puedes con esto.` : 'Tu día, a tu ritmo.';
  document.querySelector('#progress-text').textContent = `${completed} de ${tasks.length} completadas`;
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  document.querySelector('#progress-fill').style.width = `${percent}%`;
  document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', percent);
  clearButton.hidden = !completed;
  empty.hidden = visible.length > 0;
  empty.querySelector('h3').textContent = !tasks.length ? 'Un espacio para empezar' : filter === 'pending' ? 'Todo listo por ahora' : 'Todavía no hay tareas hechas';
  empty.querySelector('p').textContent = !tasks.length ? 'Agrega tu primera tarea. Lo pequeño también cuenta.' : filter === 'pending' ? 'Disfruta la pausa. Te la ganaste.' : 'Cada pequeño paso suma. Marca una cuando la termines.';
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) { input.value = ''; input.focus(); return; }
  tasks.push({id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, done: false});
  input.value = '';
  setFilter('all');
  save();
  input.focus();
});

function setFilter(value) {
  filter = value;
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  render();
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
clearButton.addEventListener('click', () => {
  tasks = tasks.filter(task => !task.done);
  save();
  render();
  input.focus();
});
render();
