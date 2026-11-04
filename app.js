'use strict';


const STORAGE_KEY = 'todo-app-tasks';

/** @type {Array<{id: string, title: string, date: string, done: boolean}>} */
let tasks = [];

let currentFilter = 'all';   
let currentSearch = '';
let currentSort = 'none';    

let draggedId = null;

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t) =>
        t &&
        typeof t.id === 'string' &&
        typeof t.title === 'string' &&
        typeof t.date === 'string' &&
        typeof t.done === 'boolean'
    );
  } catch (e) {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}


function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}


const app = el('main', 'app');

const title = el('h1', 'app__title', 'To-Do List');

const addForm = el('form', 'add-form');

const titleInput = el('input', 'add-form__input');
titleInput.type = 'text';
titleInput.placeholder = 'Название задачи';
titleInput.setAttribute('aria-label', 'Название задачи');
titleInput.required = true;

const dateInput = el('input', 'add-form__date');
dateInput.type = 'date';
dateInput.setAttribute('aria-label', 'Дата задачи');

const addSubmit = el('button', 'add-form__submit', 'Добавить');
addSubmit.type = 'submit';

addForm.append(titleInput, dateInput, addSubmit);

const controls = el('section', 'controls');

const searchInput = el('input', 'controls__input');
searchInput.type = 'search';
searchInput.placeholder = 'Поиск по названию';
searchInput.setAttribute('aria-label', 'Поиск по названию');

const filterSelect = el('select', 'controls__select');
filterSelect.setAttribute('aria-label', 'Фильтр по статусу');
[
  ['all', 'Все задачи'],
  ['active', 'Невыполненные'],
  ['done', 'Выполненные'],
].forEach(([value, label]) => {
  const option = el('option', null, label);
  option.value = value;
  filterSelect.append(option);
});

const sortSelect = el('select', 'controls__select');
sortSelect.setAttribute('aria-label', 'Сортировка по дате');
[
  ['none', 'Без сортировки'],
  ['date-asc', 'Дата: сначала ранние'],
  ['date-desc', 'Дата: сначала поздние'],
].forEach(([value, label]) => {
  const option = el('option', null, label);
  option.value = value;
  sortSelect.append(option);
});

controls.append(searchInput, filterSelect, sortSelect);

const taskList = el('ul', 'task-list');

app.append(title, addForm, controls, taskList);

document.addEventListener('DOMContentLoaded', () => {
  document.body.prepend(app);
  tasks = loadTasks();
  render();
});


addForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const titleValue = titleInput.value.trim();
  if (!titleValue) return;

  tasks.push({
    id: generateId(),
    title: titleValue,
    date: dateInput.value || '',
    done: false,
  });

  titleInput.value = '';
  dateInput.value = '';
  titleInput.focus();

  saveTasks();
  render();
});

function removeTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveTasks();
  render();
}

function updateTask(id, newTitle, newDate) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.title = newTitle;
  task.date = newDate;
  saveTasks();
  render();
}

function getVisibleTasks() {
  let result = tasks.slice();

  if (currentFilter === 'active') {
    result = result.filter((t) => !t.done);
  } else if (currentFilter === 'done') {
    result = result.filter((t) => t.done);
  }

  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(q));
  }

  if (currentSort === 'date-asc' || currentSort === 'date-desc') {
    const dir = currentSort === 'date-asc' ? 1 : -1;
    result.sort((a, b) => {
      // задачи без даты уходят в конец
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date) * dir;
    });
  }

  return result;
}

searchInput.addEventListener('input', () => {
  currentSearch = searchInput.value.trim();
  render();
});

filterSelect.addEventListener('change', () => {
  currentFilter = filterSelect.value;
  render();
});

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  render();
});

function onDragStart(event, id) {
  draggedId = id;
  event.dataTransfer.effectAllowed = 'move';
  try {
    event.dataTransfer.setData('text/plain', id);
  } catch (e) {
    /* ignore */
  }
  event.currentTarget.classList.add('task--dragging');
}

function onDragEnd(event) {
  event.currentTarget.classList.remove('task--dragging');
  draggedId = null;
  document.querySelectorAll('.task--dragover').forEach((node) => {
    node.classList.remove('task--dragover');
  });
}

function onDragOver(event, targetId) {
  if (!draggedId || draggedId === targetId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('task--dragover');
}

function onDragLeave(event) {
  event.currentTarget.classList.remove('task--dragover');
}

function onDrop(event, targetId) {
  event.preventDefault();
  event.currentTarget.classList.remove('task--dragover');

  const sourceId = draggedId;
  if (!sourceId || sourceId === targetId) return;

  const fromIndex = tasks.findIndex((t) => t.id === sourceId);
  const toIndex = tasks.findIndex((t) => t.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return;

  const [moved] = tasks.splice(fromIndex, 1);
  tasks.splice(toIndex, 0, moved);

  saveTasks();
  render();
}

function render() {
  while (taskList.firstChild) {
    taskList.removeChild(taskList.firstChild);
  }

  const visible = getVisibleTasks();

  if (visible.length === 0) {
    taskList.append(el('li', 'task-list__empty', 'Задач нет'));
    return;
  }

  visible.forEach((task) => {
    taskList.append(createTaskNode(task));
  });
}

function createTaskNode(task) {
  const li = el('li', 'task');
  li.dataset.id = task.id;
  if (task.done) li.classList.add('task--done');

  const dragHandle = el('span', 'task__drag', '⋮⋮');
  dragHandle.title = 'Перетащите, чтобы изменить порядок';

  const checkbox = el('input', 'task__checkbox');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.setAttribute('aria-label', 'Отметить как выполненную');
  checkbox.addEventListener('change', () => toggleTask(task.id));

  const body = el('div', 'task__body');
  body.append(
    el('div', 'task__title', task.title),
    el('div', 'task__date', task.date ? `Дата: ${task.date}` : 'Дата не указана')
  );

  const actions = el('div', 'task__actions');

  const editBtn = el('button', 'task__btn', 'Изменить');
  editBtn.type = 'button';
  editBtn.addEventListener('click', () => startEdit(li, task));

  const deleteBtn = el('button', 'task__btn task__btn--delete', 'Удалить');
  deleteBtn.type = 'button';
  deleteBtn.addEventListener('click', () => removeTask(task.id));

  actions.append(editBtn, deleteBtn);

  li.append(dragHandle, checkbox, body, actions);

  li.draggable = true;
  li.addEventListener('dragstart', (e) => onDragStart(e, task.id));
  li.addEventListener('dragend', onDragEnd);
  li.addEventListener('dragover', (e) => onDragOver(e, task.id));
  li.addEventListener('dragleave', onDragLeave);
  li.addEventListener('drop', (e) => onDrop(e, task.id));

  return li;
}

function startEdit(li, task) {
  while (li.firstChild) {
    li.removeChild(li.firstChild);
  }
  li.draggable = false;
  li.classList.remove('task--dragging', 'task--dragover');

  const body = el('div', 'task__body');

  const titleEdit = el('input', 'task__edit-input');
  titleEdit.type = 'text';
  titleEdit.value = task.title;
  titleEdit.setAttribute('aria-label', 'Название задачи');

  const dateEdit = el('input', 'task__edit-date');
  dateEdit.type = 'date';
  dateEdit.value = task.date || '';
  dateEdit.setAttribute('aria-label', 'Дата задачи');

  const editActions = el('div', 'task__edit-actions');

  const saveBtn = el('button', 'task__btn', 'Сохранить');
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', () => {
    const newTitle = titleEdit.value.trim();
    if (!newTitle) {
      titleEdit.focus();
      return;
    }
    updateTask(task.id, newTitle, dateEdit.value || '');
  });

  const cancelBtn = el('button', 'task__btn', 'Отмена');
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => render());

  editActions.append(saveBtn, cancelBtn);
  body.append(titleEdit, dateEdit, editActions);

  li.append(body);
  titleEdit.focus();
}