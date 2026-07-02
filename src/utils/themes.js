/**
 * ClearJSON Themes — CSS variable definitions for all themes.
 *
 * Free themes (10): dark, light, sepia, monokai, dracula, nord,
 *                   onedark, solarized-light, github, high-contrast
 * Pro themes (20):  unlocked with Pro license
 */

var ClearJSON = window.ClearJSON || {};

(function (C) {
  'use strict';

  var FREE_THEMES = ['dark', 'light', 'sepia', 'monokai', 'dracula', 'nord', 'onedark', 'solarized-light', 'github', 'high-contrast'];

  var PRO_THEMES = [
    'catppuccin', 'tokyo-night', 'gruvbox-dark', 'gruvbox-light',
    'everforest', 'kanagawa', 'rose-pine', 'rose-pine-dawn',
    'cyberpunk', 'oceanic-next', 'palenight', 'ayu-dark', 'ayu-light',
    'andromeda', 'night-owl', 'synthwave', 'retro', 'forest',
    'arctic', 'sunset'
  ];

  /**
   * All theme CSS variable definitions.
   * Each theme defines: bg, surface, text, text-secondary, key, string,
   *   number, boolean, null, punct, link, guide, line-number,
   *   hover, selected, toolbar-bg, toolbar-border, stats-bg, stats-border,
   *   toast-bg, toast-text, search-highlight, search-current
   */
  var THEMES = {

    // ============================================
    //  FREE THEMES (10)
    // ============================================

    dark: {
      bg: '#1e1e2e', surface: '#282840', text: '#cdd6f4', 'text-secondary': '#9399b2',
      key: '#89b4fa', string: '#a6e3a1', number: '#fab387', boolean: '#cba6f7',
      null: '#f38ba8', punct: '#6c7086', link: '#74c7ec', guide: '#313244',
      'line-number': '#585b70', hover: 'rgba(137,180,250,0.08)', selected: 'rgba(137,180,250,0.15)',
      'toolbar-bg': '#181825', 'toolbar-border': '#313244',
      'stats-bg': '#181825', 'stats-border': '#313244',
      'toast-bg': '#45475a', 'toast-text': '#cdd6f4',
      'search-highlight': 'rgba(250,179,135,0.4)', 'search-current': 'rgba(250,179,135,0.7)'
    },

    light: {
      bg: '#ffffff', surface: '#f8f8fa', text: '#1c1c1e', 'text-secondary': '#6e6e73',
      key: '#1d4ed8', string: '#166534', number: '#b45309', boolean: '#7c3aed',
      null: '#dc2626', punct: '#9ca3af', link: '#0891b2', guide: '#e5e7eb',
      'line-number': '#d1d5db', hover: 'rgba(29,78,216,0.06)', selected: 'rgba(29,78,216,0.10)',
      'toolbar-bg': '#f9fafb', 'toolbar-border': '#e5e7eb',
      'stats-bg': '#f9fafb', 'stats-border': '#e5e7eb',
      'toast-bg': '#1f2937', 'toast-text': '#f9fafb',
      'search-highlight': 'rgba(180,83,9,0.3)', 'search-current': 'rgba(180,83,9,0.6)'
    },

    sepia: {
      bg: '#fdf6e3', surface: '#eee8d5', text: '#586e75', 'text-secondary': '#839496',
      key: '#268bd2', string: '#859900', number: '#cb4b16', boolean: '#6c71c4',
      null: '#dc322f', punct: '#93a1a1', link: '#2aa198', guide: '#e0dcc7',
      'line-number': '#c0bbaa', hover: 'rgba(38,139,210,0.06)', selected: 'rgba(38,139,210,0.10)',
      'toolbar-bg': '#eee8d5', 'toolbar-border': '#e0dcc7',
      'stats-bg': '#eee8d5', 'stats-border': '#e0dcc7',
      'toast-bg': '#586e75', 'toast-text': '#fdf6e3',
      'search-highlight': 'rgba(203,75,22,0.3)', 'search-current': 'rgba(203,75,22,0.6)'
    },

    monokai: {
      bg: '#272822', surface: '#3e3d32', text: '#f8f8f2', 'text-secondary': '#75715e',
      key: '#66d9ef', string: '#e6db74', number: '#ae81ff', boolean: '#ae81ff',
      null: '#f92672', punct: '#f8f8f2', link: '#a1efe4', guide: '#49483e',
      'line-number': '#75715e', hover: 'rgba(102,217,239,0.08)', selected: 'rgba(102,217,239,0.15)',
      'toolbar-bg': '#1e1f1c', 'toolbar-border': '#49483e',
      'stats-bg': '#1e1f1c', 'stats-border': '#49483e',
      'toast-bg': '#49483e', 'toast-text': '#f8f8f2',
      'search-highlight': 'rgba(230,219,116,0.4)', 'search-current': 'rgba(230,219,116,0.7)'
    },

    dracula: {
      bg: '#282a36', surface: '#383a59', text: '#f8f8f2', 'text-secondary': '#6272a4',
      key: '#8be9fd', string: '#50fa7b', number: '#ffb86c', boolean: '#bd93f9',
      null: '#ff5555', punct: '#6272a4', link: '#8be9fd', guide: '#44475a',
      'line-number': '#6272a4', hover: 'rgba(139,233,253,0.08)', selected: 'rgba(139,233,253,0.15)',
      'toolbar-bg': '#21222c', 'toolbar-border': '#44475a',
      'stats-bg': '#21222c', 'stats-border': '#44475a',
      'toast-bg': '#44475a', 'toast-text': '#f8f8f2',
      'search-highlight': 'rgba(255,184,108,0.4)', 'search-current': 'rgba(255,184,108,0.7)'
    },

    nord: {
      bg: '#2e3440', surface: '#3b4252', text: '#eceff4', 'text-secondary': '#7b88a1',
      key: '#81a1c1', string: '#a3be8c', number: '#b48ead', boolean: '#b48ead',
      null: '#bf616a', punct: '#616e88', link: '#88c0d0', guide: '#434c5e',
      'line-number': '#616e88', hover: 'rgba(129,161,193,0.08)', selected: 'rgba(129,161,193,0.15)',
      'toolbar-bg': '#272c36', 'toolbar-border': '#434c5e',
      'stats-bg': '#272c36', 'stats-border': '#434c5e',
      'toast-bg': '#434c5e', 'toast-text': '#eceff4',
      'search-highlight': 'rgba(180,142,173,0.4)', 'search-current': 'rgba(180,142,173,0.7)'
    },

    onedark: {
      bg: '#282c34', surface: '#353b45', text: '#abb2bf', 'text-secondary': '#5c6370',
      key: '#61afef', string: '#98c379', number: '#d19a66', boolean: '#c678dd',
      null: '#e06c75', punct: '#5c6370', link: '#56b6c2', guide: '#3e4452',
      'line-number': '#5c6370', hover: 'rgba(97,175,239,0.08)', selected: 'rgba(97,175,239,0.15)',
      'toolbar-bg': '#21252b', 'toolbar-border': '#3e4452',
      'stats-bg': '#21252b', 'stats-border': '#3e4452',
      'toast-bg': '#3e4452', 'toast-text': '#abb2bf',
      'search-highlight': 'rgba(209,154,102,0.4)', 'search-current': 'rgba(209,154,102,0.7)'
    },

    'solarized-light': {
      bg: '#fdf6e3', surface: '#eee8d5', text: '#657b83', 'text-secondary': '#839496',
      key: '#268bd2', string: '#859900', number: '#cb4b16', boolean: '#6c71c4',
      null: '#dc322f', punct: '#93a1a1', link: '#2aa198', guide: '#d5cec0',
      'line-number': '#b5ac9a', hover: 'rgba(38,139,210,0.06)', selected: 'rgba(38,139,210,0.10)',
      'toolbar-bg': '#eee8d5', 'toolbar-border': '#d5cec0',
      'stats-bg': '#eee8d5', 'stats-border': '#d5cec0',
      'toast-bg': '#586e75', 'toast-text': '#fdf6e3',
      'search-highlight': 'rgba(203,75,22,0.3)', 'search-current': 'rgba(203,75,22,0.6)'
    },

    github: {
      bg: '#ffffff', surface: '#f6f8fa', text: '#24292f', 'text-secondary': '#656d76',
      key: '#0550ae', string: '#1a7f37', number: '#953800', boolean: '#8250df',
      null: '#cf222e', punct: '#656d76', link: '#0969da', guide: '#d0d7de',
      'line-number': '#afb8c1', hover: 'rgba(5,80,174,0.06)', selected: 'rgba(5,80,174,0.10)',
      'toolbar-bg': '#f6f8fa', 'toolbar-border': '#d0d7de',
      'stats-bg': '#f6f8fa', 'stats-border': '#d0d7de',
      'toast-bg': '#24292f', 'toast-text': '#ffffff',
      'search-highlight': 'rgba(149,56,0,0.3)', 'search-current': 'rgba(149,56,0,0.6)'
    },

    'high-contrast': {
      bg: '#000000', surface: '#1a1a1a', text: '#ffffff', 'text-secondary': '#aaaaaa',
      key: '#5cadff', string: '#5eff5e', number: '#ffb84d', boolean: '#d65eff',
      null: '#ff5e5e', punct: '#cccccc', link: '#5effff', guide: '#333333',
      'line-number': '#666666', hover: 'rgba(92,173,255,0.12)', selected: 'rgba(92,173,255,0.20)',
      'toolbar-bg': '#0a0a0a', 'toolbar-border': '#333333',
      'stats-bg': '#0a0a0a', 'stats-border': '#333333',
      'toast-bg': '#333333', 'toast-text': '#ffffff',
      'search-highlight': 'rgba(255,184,77,0.5)', 'search-current': 'rgba(255,184,77,0.8)'
    },

    // ============================================
    //  PRO THEMES (20) — unlocked with license
    // ============================================

    catppuccin: {
      bg: '#1e1e2e', surface: '#313244', text: '#cdd6f4', 'text-secondary': '#6c7086',
      key: '#89b4fa', string: '#a6e3a1', number: '#fab387', boolean: '#cba6f7',
      null: '#f38ba8', punct: '#45475a', link: '#74c7ec', guide: '#313244',
      'line-number': '#585b70', hover: 'rgba(137,180,250,0.08)', selected: 'rgba(137,180,250,0.15)',
      'toolbar-bg': '#181825', 'toolbar-border': '#313244',
      'stats-bg': '#181825', 'stats-border': '#313244',
      'toast-bg': '#45475a', 'toast-text': '#cdd6f4',
      'search-highlight': 'rgba(250,179,135,0.4)', 'search-current': 'rgba(250,179,135,0.7)'
    },

    'tokyo-night': {
      bg: '#1a1b26', surface: '#24283b', text: '#c0caf5', 'text-secondary': '#565f89',
      key: '#7aa2f7', string: '#9ece6a', number: '#e0af68', boolean: '#bb9af7',
      null: '#f7768e', punct: '#565f89', link: '#7dcfff', guide: '#292e42',
      'line-number': '#565f89', hover: 'rgba(122,162,247,0.08)', selected: 'rgba(122,162,247,0.15)',
      'toolbar-bg': '#16161e', 'toolbar-border': '#292e42',
      'stats-bg': '#16161e', 'stats-border': '#292e42',
      'toast-bg': '#292e42', 'toast-text': '#c0caf5',
      'search-highlight': 'rgba(224,175,104,0.4)', 'search-current': 'rgba(224,175,104,0.7)'
    },

    'gruvbox-dark': {
      bg: '#282828', surface: '#3c3836', text: '#ebdbb2', 'text-secondary': '#928374',
      key: '#83a598', string: '#b8bb26', number: '#fe8019', boolean: '#d3869b',
      null: '#fb4934', punct: '#928374', link: '#8ec07c', guide: '#504945',
      'line-number': '#665c54', hover: 'rgba(131,165,152,0.08)', selected: 'rgba(131,165,152,0.15)',
      'toolbar-bg': '#1d2021', 'toolbar-border': '#504945',
      'stats-bg': '#1d2021', 'stats-border': '#504945',
      'toast-bg': '#504945', 'toast-text': '#ebdbb2',
      'search-highlight': 'rgba(254,128,25,0.4)', 'search-current': 'rgba(254,128,25,0.7)'
    },

    'gruvbox-light': {
      bg: '#fbf1c7', surface: '#ebdbb2', text: '#3c3836', 'text-secondary': '#928374',
      key: '#076678', string: '#79740e', number: '#af3a03', boolean: '#8f3f71',
      null: '#9d0006', punct: '#928374', link: '#427b58', guide: '#d5c4a1',
      'line-number': '#bdae93', hover: 'rgba(7,102,120,0.06)', selected: 'rgba(7,102,120,0.10)',
      'toolbar-bg': '#ebdbb2', 'toolbar-border': '#d5c4a1',
      'stats-bg': '#ebdbb2', 'stats-border': '#d5c4a1',
      'toast-bg': '#3c3836', 'toast-text': '#fbf1c7',
      'search-highlight': 'rgba(175,58,3,0.3)', 'search-current': 'rgba(175,58,3,0.6)'
    },

    everforest: {
      bg: '#2d353b', surface: '#374247', text: '#d3c6aa', 'text-secondary': '#7a8478',
      key: '#7fbbb3', string: '#a7c080', number: '#e69875', boolean: '#d699b6',
      null: '#e67e80', punct: '#7a8478', link: '#83c092', guide: '#495156',
      'line-number': '#7a8478', hover: 'rgba(127,187,179,0.08)', selected: 'rgba(127,187,179,0.15)',
      'toolbar-bg': '#232a2e', 'toolbar-border': '#495156',
      'stats-bg': '#232a2e', 'stats-border': '#495156',
      'toast-bg': '#495156', 'toast-text': '#d3c6aa',
      'search-highlight': 'rgba(230,152,117,0.4)', 'search-current': 'rgba(230,152,117,0.7)'
    },

    kanagawa: {
      bg: '#1f1f28', surface: '#2a2a37', text: '#dcd7ba', 'text-secondary': '#727169',
      key: '#7e9cd8', string: '#98bb6c', number: '#ffa066', boolean: '#957fb8',
      null: '#e46876', punct: '#727169', link: '#7fb4ca', guide: '#363646',
      'line-number': '#727169', hover: 'rgba(126,156,216,0.08)', selected: 'rgba(126,156,216,0.15)',
      'toolbar-bg': '#1a1a22', 'toolbar-border': '#363646',
      'stats-bg': '#1a1a22', 'stats-border': '#363646',
      'toast-bg': '#363646', 'toast-text': '#dcd7ba',
      'search-highlight': 'rgba(255,160,102,0.4)', 'search-current': 'rgba(255,160,102,0.7)'
    },

    'rose-pine': {
      bg: '#191724', surface: '#26233a', text: '#e0def4', 'text-secondary': '#6e6a86',
      key: '#9ccfd8', string: '#31748f', number: '#ebbcba', boolean: '#c4a7e7',
      null: '#eb6f92', punct: '#6e6a86', link: '#9ccfd8', guide: '#403d52',
      'line-number': '#6e6a86', hover: 'rgba(156,207,216,0.08)', selected: 'rgba(156,207,216,0.15)',
      'toolbar-bg': '#1f1d2e', 'toolbar-border': '#403d52',
      'stats-bg': '#1f1d2e', 'stats-border': '#403d52',
      'toast-bg': '#403d52', 'toast-text': '#e0def4',
      'search-highlight': 'rgba(235,188,186,0.4)', 'search-current': 'rgba(235,188,186,0.7)'
    },

    'rose-pine-dawn': {
      bg: '#faf4ed', surface: '#f2e9e1', text: '#575279', 'text-secondary': '#9893a5',
      key: '#286983', string: '#56949f', number: '#d7827e', boolean: '#907aa9',
      null: '#b4637a', punct: '#9893a5', link: '#286983', guide: '#dfdad9',
      'line-number': '#9893a5', hover: 'rgba(40,105,131,0.06)', selected: 'rgba(40,105,131,0.10)',
      'toolbar-bg': '#f2e9e1', 'toolbar-border': '#dfdad9',
      'stats-bg': '#f2e9e1', 'stats-border': '#dfdad9',
      'toast-bg': '#575279', 'toast-text': '#faf4ed',
      'search-highlight': 'rgba(215,130,126,0.3)', 'search-current': 'rgba(215,130,126,0.6)'
    },

    cyberpunk: {
      bg: '#0d0221', surface: '#15052e', text: '#00ff9d', 'text-secondary': '#00c8ff',
      key: '#ff00ff', string: '#00ff9d', number: '#ffea00', boolean: '#ff00ff',
      null: '#ff0044', punct: '#00c8ff', link: '#00ff9d', guide: '#1a0a3e',
      'line-number': '#4400aa', hover: 'rgba(255,0,255,0.12)', selected: 'rgba(255,0,255,0.18)',
      'toolbar-bg': '#0a0118', 'toolbar-border': '#1a0a3e',
      'stats-bg': '#0a0118', 'stats-border': '#1a0a3e',
      'toast-bg': '#1a0a3e', 'toast-text': '#00ff9d',
      'search-highlight': 'rgba(255,234,0,0.4)', 'search-current': 'rgba(255,234,0,0.7)'
    },

    'oceanic-next': {
      bg: '#1b2b34', surface: '#243540', text: '#c0c5ce', 'text-secondary': '#65737e',
      key: '#6699cc', string: '#99c794', number: '#f99157', boolean: '#c594c5',
      null: '#ec5f67', punct: '#65737e', link: '#5fb3b3', guide: '#343d46',
      'line-number': '#65737e', hover: 'rgba(102,153,204,0.08)', selected: 'rgba(102,153,204,0.15)',
      'toolbar-bg': '#1b2b34', 'toolbar-border': '#343d46',
      'stats-bg': '#1b2b34', 'stats-border': '#343d46',
      'toast-bg': '#343d46', 'toast-text': '#c0c5ce',
      'search-highlight': 'rgba(249,145,87,0.4)', 'search-current': 'rgba(249,145,87,0.7)'
    },

    palenight: {
      bg: '#292d3e', surface: '#353a4e', text: '#bfc7d5', 'text-secondary': '#676e95',
      key: '#82aaff', string: '#c3e88d', number: '#f78c6c', boolean: '#c792ea',
      null: '#f07178', punct: '#676e95', link: '#89ddff', guide: '#434758',
      'line-number': '#676e95', hover: 'rgba(130,170,255,0.08)', selected: 'rgba(130,170,255,0.15)',
      'toolbar-bg': '#1f2233', 'toolbar-border': '#434758',
      'stats-bg': '#1f2233', 'stats-border': '#434758',
      'toast-bg': '#434758', 'toast-text': '#bfc7d5',
      'search-highlight': 'rgba(247,140,108,0.4)', 'search-current': 'rgba(247,140,108,0.7)'
    },

    'ayu-dark': {
      bg: '#0a0e14', surface: '#1a1f29', text: '#bfbdb6', 'text-secondary': '#5c6773',
      key: '#59c2ff', string: '#aad94c', number: '#ff8f40', boolean: '#d2a6ff',
      null: '#f07178', punct: '#5c6773', link: '#95e6cb', guide: '#1f2933',
      'line-number': '#5c6773', hover: 'rgba(89,194,255,0.08)', selected: 'rgba(89,194,255,0.15)',
      'toolbar-bg': '#0d1117', 'toolbar-border': '#1f2933',
      'stats-bg': '#0d1117', 'stats-border': '#1f2933',
      'toast-bg': '#1f2933', 'toast-text': '#bfbdb6',
      'search-highlight': 'rgba(255,143,64,0.4)', 'search-current': 'rgba(255,143,64,0.7)'
    },

    'ayu-light': {
      bg: '#fafafa', surface: '#f0f0f0', text: '#5c6166', 'text-secondary': '#8a9199',
      key: '#399ee6', string: '#86b300', number: '#fa8d3e', boolean: '#a37acc',
      null: '#e65050', punct: '#8a9199', link: '#4cbf99', guide: '#d9d9d9',
      'line-number': '#b3b3b3', hover: 'rgba(57,158,230,0.06)', selected: 'rgba(57,158,230,0.10)',
      'toolbar-bg': '#f0f0f0', 'toolbar-border': '#d9d9d9',
      'stats-bg': '#f0f0f0', 'stats-border': '#d9d9d9',
      'toast-bg': '#5c6166', 'toast-text': '#fafafa',
      'search-highlight': 'rgba(250,141,62,0.3)', 'search-current': 'rgba(250,141,62,0.6)'
    },

    andromeda: {
      bg: '#1f1c2e', surface: '#2a2638', text: '#d5ced9', 'text-secondary': '#6f6a7a',
      key: '#8ab4f8', string: '#a9d483', number: '#f2a65a', boolean: '#c77dba',
      null: '#f3746c', punctu: '#6f6a7a', link: '#74c7ec', guide: '#3d3948',
      'line-number': '#6f6a7a', hover: 'rgba(138,180,248,0.08)', selected: 'rgba(138,180,248,0.15)',
      'toolbar-bg': '#191724', 'toolbar-border': '#3d3948',
      'stats-bg': '#191724', 'stats-border': '#3d3948',
      'toast-bg': '#3d3948', 'toast-text': '#d5ced9',
      'search-highlight': 'rgba(242,166,90,0.4)', 'search-current': 'rgba(242,166,90,0.7)'
    },

    'night-owl': {
      bg: '#011627', surface: '#0d2b45', text: '#d6deeb', 'text-secondary': '#5f7e97',
      key: '#82aaff', string: '#addb67', number: '#f78c6c', boolean: '#c792ea',
      null: '#ef5350', punct: '#5f7e97', link: '#7fdbca', guide: '#1d3b53',
      'line-number': '#5f7e97', hover: 'rgba(130,170,255,0.08)', selected: 'rgba(130,170,255,0.15)',
      'toolbar-bg': '#01111f', 'toolbar-border': '#1d3b53',
      'stats-bg': '#01111f', 'stats-border': '#1d3b53',
      'toast-bg': '#1d3b53', 'toast-text': '#d6deeb',
      'search-highlight': 'rgba(247,140,108,0.4)', 'search-current': 'rgba(247,140,108,0.7)'
    },

    synthwave: {
      bg: '#1a0033', surface: '#2a0050', text: '#f0e6ff', 'text-secondary': '#b380ff',
      key: '#ff66cc', string: '#66ffcc', number: '#ffcc00', boolean: '#cc66ff',
      null: '#ff3366', punct: '#b380ff', link: '#66ffff', guide: '#330066',
      'line-number': '#8000cc', hover: 'rgba(255,102,204,0.10)', selected: 'rgba(255,102,204,0.18)',
      'toolbar-bg': '#12002a', 'toolbar-border': '#330066',
      'stats-bg': '#12002a', 'stats-border': '#330066',
      'toast-bg': '#330066', 'toast-text': '#f0e6ff',
      'search-highlight': 'rgba(255,204,0,0.4)', 'search-current': 'rgba(255,204,0,0.7)'
    },

    retro: {
      bg: '#2d2d2d', surface: '#393939', text: '#d3d0c8', 'text-secondary': '#747369',
      key: '#99cc99', string: '#ffcc66', number: '#f99157', boolean: '#cc99cc',
      null: '#f2777a', punct: '#747369', link: '#6699cc', guide: '#404040',
      'line-number': '#747369', hover: 'rgba(153,204,153,0.08)', selected: 'rgba(153,204,153,0.15)',
      'toolbar-bg': '#222222', 'toolbar-border': '#404040',
      'stats-bg': '#222222', 'stats-border': '#404040',
      'toast-bg': '#404040', 'toast-text': '#d3d0c8',
      'search-highlight': 'rgba(249,145,87,0.4)', 'search-current': 'rgba(249,145,87,0.7)'
    },

    forest: {
      bg: '#1b2d1b', surface: '#243824', text: '#c8d6c0', 'text-secondary': '#6b8a6b',
      key: '#7eb87e', string: '#9ccd7a', number: '#d4a854', boolean: '#a78bb8',
      null: '#d4746e', punct: '#6b8a6b', link: '#6ba8a8', guide: '#2d402d',
      'line-number': '#5a7a5a', hover: 'rgba(126,184,126,0.08)', selected: 'rgba(126,184,126,0.15)',
      'toolbar-bg': '#152415', 'toolbar-border': '#2d402d',
      'stats-bg': '#152415', 'stats-border': '#2d402d',
      'toast-bg': '#2d402d', 'toast-text': '#c8d6c0',
      'search-highlight': 'rgba(212,168,84,0.4)', 'search-current': 'rgba(212,168,84,0.7)'
    },

    arctic: {
      bg: '#eef2f7', surface: '#ffffff', text: '#2c3b4f', 'text-secondary': '#8c9bab',
      key: '#3b7dd8', string: '#2d9d5a', number: '#c75b39', boolean: '#7b52ab',
      null: '#d9434e', punct: '#b4c0cc', link: '#0e98c7', guide: '#dfe6ed',
      'line-number': '#c0cad4', hover: 'rgba(59,125,216,0.06)', selected: 'rgba(59,125,216,0.10)',
      'toolbar-bg': '#e8ecf1', 'toolbar-border': '#dfe6ed',
      'stats-bg': '#e8ecf1', 'stats-border': '#dfe6ed',
      'toast-bg': '#2c3b4f', 'toast-text': '#ffffff',
      'search-highlight': 'rgba(199,91,57,0.3)', 'search-current': 'rgba(199,91,57,0.6)'
    },

    sunset: {
      bg: '#2d1b2e', surface: '#3d283f', text: '#f0d9c0', 'text-secondary': '#c08a6c',
      key: '#e8956c', string: '#c0b050', number: '#e85030', boolean: '#b870cc',
      null: '#e83040', punct: '#a07060', link: '#70b0d0', guide: '#4d3040',
      'line-number': '#907060', hover: 'rgba(232,149,108,0.10)', selected: 'rgba(232,149,108,0.16)',
      'toolbar-bg': '#1f121f', 'toolbar-border': '#4d3040',
      'stats-bg': '#1f121f', 'stats-border': '#4d3040',
      'toast-bg': '#4d3040', 'toast-text': '#f0d9c0',
      'search-highlight': 'rgba(232,80,48,0.4)', 'search-current': 'rgba(232,80,48,0.7)'
    }
  };

  /**
   * Get CSS variable string for a theme.
   */
  function getThemeCSS(themeName) {
    var t = THEMES[themeName] || THEMES['dark'];
    var vars = [];
    var keys = Object.keys(t);
    for (var i = 0; i < keys.length; i++) {
      vars.push('--cj-' + keys[i] + ': ' + t[keys[i]] + ';');
    }
    return ':root { ' + vars.join(' ') + ' }';
  }

  /**
   * Get display name for a theme.
   */
  function getThemeLabel(name) {
    return name
      .split('-')
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); })
      .join(' ');
  }

  C.Themes = {
    FREE_THEMES: FREE_THEMES,
    PRO_THEMES: PRO_THEMES,
    ALL_THEMES: FREE_THEMES.concat(PRO_THEMES),
    THEMES: THEMES,
    getThemeCSS: getThemeCSS,
    getThemeLabel: getThemeLabel,
    isPro: function (name) { return PRO_THEMES.indexOf(name) !== -1; }
  };
})(ClearJSON);
