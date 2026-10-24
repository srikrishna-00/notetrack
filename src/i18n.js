// src/i18n.js - Multi-Language Localization Engine for AppFlowy Lean
'use strict';

const translations = {
  en: {
    appName: 'AppFlowy Lean', searchPlaceholder: 'Search or jump to... (Ctrl/Cmd+K)',
    newDoc: '+ New Page', newDb: '+ New Database', scratchpad: 'Quick Scratchpad',
    favorites: 'Favorites', privateSpace: 'Private Space', teamSpace: 'Team Space', trash: 'Trash',
    tags: 'Global Tags', reminders: 'Reminders & Deadlines', settings: 'Settings',
    versionHistory: 'Version History', restoreVersion: 'Restore This Version',
    lockPage: 'Lock Page', unlockPage: 'Unlock Page',
    exportEnex: 'Export Evernote .enex', exportMarkdown: 'Export Markdown', importEnex: 'Import Evernote .enex',
    fontSans: 'Default (Sans)', fontSerif: 'Serif', fontMono: 'Mono',
    smallText: 'Small text', fullWidth: 'Full width', language: 'Language',
    theme: 'Theme', light: 'Light', dark: 'Dark', system: 'System',
    close: 'Close', save: 'Save', cancel: 'Cancel', confirm: 'Confirm', status: 'Status', date: 'Date'
  },
  es: {
    appName: 'AppFlowy Lean', searchPlaceholder: 'Buscar o ir a... (Ctrl/Cmd+K)',
    newDoc: '+ Nueva Página', newDb: '+ Nueva Base de Datos', scratchpad: 'Notas Rápidas',
    favorites: 'Favoritos', privateSpace: 'Espacio Privado', teamSpace: 'Espacio de Equipo', trash: 'Papelera',
    tags: 'Etiquetas Globales', reminders: 'Recordatorios', settings: 'Configuración',
    versionHistory: 'Historial de Versiones', restoreVersion: 'Restaurar Esta Versión',
    lockPage: 'Bloquear Página', unlockPage: 'Desbloquear Página',
    exportEnex: 'Exportar Evernote .enex', exportMarkdown: 'Exportar Markdown', importEnex: 'Importar Evernote .enex',
    fontSans: 'Por Defecto (Sans)', fontSerif: 'Serif', fontMono: 'Mono',
    smallText: 'Texto pequeño', fullWidth: 'Ancho completo', language: 'Idioma',
    theme: 'Tema', light: 'Claro', dark: 'Oscuro', system: 'Sistema',
    close: 'Cerrar', save: 'Guardar', cancel: 'Cancelar', confirm: 'Confirmar', status: 'Estado', date: 'Fecha'
  },
  de: {
    appName: 'AppFlowy Lean', searchPlaceholder: 'Suchen oder springen... (Ctrl/Cmd+K)',
    newDoc: '+ Neue Seite', newDb: '+ Neue Datenbank', scratchpad: 'Schnellnotizen',
    favorites: 'Favoriten', privateSpace: 'Privater Bereich', teamSpace: 'Team Bereich', trash: 'Papierkorb',
    tags: 'Globale Schlagwörter', reminders: 'Erinnerungen', settings: 'Einstellungen',
    versionHistory: 'Versionsverlauf', restoreVersion: 'Diese Version Wiederherstellen',
    lockPage: 'Seite Sperren', unlockPage: 'Seite Entsperren',
    exportEnex: 'Evernote .enex Exportieren', exportMarkdown: 'Markdown Exportieren', importEnex: 'Evernote .enex Importieren',
    fontSans: 'Standard (Sans)', fontSerif: 'Serif', fontMono: 'Mono',
    smallText: 'Kleine Schrift', fullWidth: 'Volle Breite', language: 'Sprache',
    theme: 'Design', light: 'Hell', dark: 'Dunkel', system: 'System',
    close: 'Schließen', save: 'Speichern', cancel: 'Abbrechen', confirm: 'Bestätigen', status: 'Status', date: 'Datum'
  },
  fr: {
    appName: 'AppFlowy Lean', searchPlaceholder: 'Rechercher ou accéder... (Ctrl/Cmd+K)',
    newDoc: '+ Nouvelle Page', newDb: '+ Nouvelle Base de Données', scratchpad: 'Bloc-notes Rapide',
    favorites: 'Favoris', privateSpace: 'Espace Privé', teamSpace: 'Espace Équipe', trash: 'Corbeille',
    tags: 'Mots-clés Globaux', reminders: 'Rappels et Échéances', settings: 'Paramètres',
    versionHistory: 'Historique des Versions', restoreVersion: 'Restaurer Cette Version',
    lockPage: 'Verrouiller la Page', unlockPage: 'Déverrouiller la Page',
    exportEnex: 'Exporter Evernote .enex', exportMarkdown: 'Exporter Markdown', importEnex: 'Importer Evernote .enex',
    fontSans: 'Défaut (Sans)', fontSerif: 'Serif', fontMono: 'Mono',
    smallText: 'Petit texte', fullWidth: 'Pleine largeur', language: 'Langue',
    theme: 'Thème', light: 'Clair', dark: 'Sombre', system: 'Système',
    close: 'Fermer', save: 'Enregistrer', cancel: 'Annuler', confirm: 'Confirmer', status: 'Statut', date: 'Date'
  },
  zh: {
    appName: 'AppFlowy Lean', searchPlaceholder: '搜索或跳转... (Ctrl/Cmd+K)',
    newDoc: '+ 新建页面', newDb: '+ 新建数据库', scratchpad: '快速便签',
    favorites: '收藏夹', privateSpace: '个人空间', teamSpace: '团队空间', trash: '回收站',
    tags: '全局标签', reminders: '提醒与截止日期', settings: '设置',
    versionHistory: '版本历史', restoreVersion: '恢复此版本',
    lockPage: '锁定页面', unlockPage: '解锁页面',
    exportEnex: '导出 Evernote .enex', exportMarkdown: '导出 Markdown', importEnex: '导入 Evernote .enex',
    fontSans: '默认 (无衬线)', fontSerif: '衬线体', fontMono: '等宽字体',
    smallText: '小字体', fullWidth: '全宽显示', language: '语言',
    theme: '外观主题', light: '浅色', dark: '深色', system: '跟随系统',
    close: '关闭', save: '保存', cancel: '取消', confirm: '确认', status: '状态', date: '日期'
  },
  ja: {
    appName: 'AppFlowy Lean', searchPlaceholder: '検索またはジャンプ... (Ctrl/Cmd+K)',
    newDoc: '+ 新しいページ', newDb: '+ 新しいデータベース', scratchpad: 'クイックスクラッチパッド',
    favorites: 'お気に入り', privateSpace: 'プライベート', teamSpace: 'チームスペース', trash: 'ゴミ箱',
    tags: 'グローバルタグ', reminders: 'リマインダーと期限', settings: '設定',
    versionHistory: 'バージョン履歴', restoreVersion: 'このバージョンを復元',
    lockPage: 'ページをロック', unlockPage: 'ロック解除',
    exportEnex: 'Evernote .enex をエクスポート', exportMarkdown: 'Markdown をエクスポート', importEnex: 'Evernote .enex をインポート',
    fontSans: '標準 (Sans)', fontSerif: '明朝体 (Serif)', fontMono: '等幅 (Mono)',
    smallText: '小さいテキスト', fullWidth: '全幅表示', language: '言語',
    theme: 'テーマ', light: 'ライト', dark: 'ダーク', system: 'システム設定',
    close: '閉じる', save: '保存', cancel: 'キャンセル', confirm: '確認', status: 'ステータス', date: '日付'
  }
};

class I18nManager {
  constructor() {
    this.currentLocale = 'en';
    if (typeof localStorage !== 'undefined') {
      try { this.currentLocale = localStorage.getItem('appflowy_locale') || 'en'; } catch {}
    }
    this.listeners = [];
  }

  getLocale() {
    return this.currentLocale;
  }

  setLocale(locale) {
    if (translations[locale]) {
      this.currentLocale = locale;
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem('appflowy_locale', locale); } catch {}
      }
      this.notify();
    }
  }

  getAvailableLocales() {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'de', name: 'Deutsch' },
      { code: 'fr', name: 'Français' },
      { code: 'zh', name: '简体中文' },
      { code: 'ja', name: '日本語' }
    ];
  }

  t(key) {
    const dict = translations[this.currentLocale] || translations.en;
    return dict[key] || (translations.en && translations.en[key]) || key;
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.currentLocale));
  }
}

const i18n = new I18nManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { i18n, translations, I18nManager };
}
