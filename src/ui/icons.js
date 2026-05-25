import { createIcons, Trash2, Github, Sun, Moon } from 'lucide';

const icons = { Trash2, Github, Sun, Moon };

export function renderIcons(root = document) {
  createIcons({ icons, attrs: { class: 'lucide' }, nameAttr: 'data-lucide', root });
}
