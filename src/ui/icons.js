import { createIcons, Trash2 } from 'lucide';

const icons = { Trash2 };

export function renderIcons(root = document) {
  createIcons({ icons, attrs: { class: 'lucide' }, nameAttr: 'data-lucide', root });
}
