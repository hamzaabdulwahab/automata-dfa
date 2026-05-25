import { createIcons, Trash2, Github } from 'lucide';

const icons = { Trash2, Github };

export function renderIcons(root = document) {
  createIcons({ icons, attrs: { class: 'lucide' }, nameAttr: 'data-lucide', root });
}
