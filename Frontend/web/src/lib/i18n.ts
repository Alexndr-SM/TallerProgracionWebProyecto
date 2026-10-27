// =========================================================
// IcaTurismo — i18n (es / en / fr)
// Textos de la interfaz común (header, footer, selector de idioma).
// Los textos de cada página están en src/lib/home.ts (por ahora solo la home).
// =========================================================
export const LOCALES = ['es', 'en', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  es: '/assets/flags/es.svg',
  en: '/assets/flags/en.svg',
  fr: '/assets/flags/fr.svg',
};

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export const ui = {
  es: {
    skip: 'Saltar al contenido',
    'nav.aria': 'Principal',
    'nav.home': 'Inicio',
    'nav.beaches': 'Playas',
    'nav.dunes': 'Dunas',
    'nav.culture': 'Cultura',
    'nav.contact': 'Contacto',
    'menu.open': 'Abrir menú',
    'account.btn': 'Cuenta',
    'account.menu': 'Menú de usuario',
    'account.login': 'Iniciar sesión',
    'account.register': 'Registrarse',
    'account.user': 'Usuario',
    'account.profile': 'Mi Perfil',
    'account.logout': 'Cerrar sesión',
    'theme.toggle': 'Cambiar a modo oscuro',
    'cart.aria': 'Ir al carrito de compras',
    'cart.title': 'Carrito de compras',
    'lang.show': 'Mostrar idiomas',
    'lang.title': 'Idiomas',
    'lang.options': 'Opciones de idioma',
    'chat.open': 'Abrir el chat de IcaTurismo',
  },
  en: {
    skip: 'Skip to content',
    'nav.aria': 'Main',
    'nav.home': 'Home',
    'nav.beaches': 'Beaches',
    'nav.dunes': 'Dunes',
    'nav.culture': 'Culture',
    'nav.contact': 'Contact',
    'menu.open': 'Open menu',
    'account.btn': 'Account',
    'account.menu': 'User menu',
    'account.login': 'Log in',
    'account.register': 'Sign up',
    'account.user': 'User',
    'account.profile': 'My profile',
    'account.logout': 'Log out',
    'theme.toggle': 'Switch to dark mode',
    'cart.aria': 'Go to shopping cart',
    'cart.title': 'Shopping cart',
    'lang.show': 'Show languages',
    'lang.title': 'Languages',
    'lang.options': 'Language options',
    'chat.open': 'Open the IcaTurismo chat',
  },
  fr: {
    skip: 'Aller au contenu',
    'nav.aria': 'Principal',
    'nav.home': 'Accueil',
    'nav.beaches': 'Plages',
    'nav.dunes': 'Dunes',
    'nav.culture': 'Culture',
    'nav.contact': 'Contact',
    'menu.open': 'Ouvrir le menu',
    'account.btn': 'Compte',
    'account.menu': 'Menu utilisateur',
    'account.login': 'Connexion',
    'account.register': "S'inscrire",
    'account.user': 'Utilisateur',
    'account.profile': 'Mon profil',
    'account.logout': 'Déconnexion',
    'theme.toggle': 'Passer en mode sombre',
    'cart.aria': 'Aller au panier',
    'cart.title': 'Panier',
    'lang.show': 'Afficher les langues',
    'lang.title': 'Langues',
    'lang.options': 'Options de langue',
    'chat.open': 'Ouvrir le chat IcaTurismo',
  },
} as const;

export type UIKey = keyof (typeof ui)['es'];

export function t(key: UIKey, locale: Locale = DEFAULT_LOCALE): string {
  return ui[locale][key] ?? ui[DEFAULT_LOCALE][key] ?? key;
}

/** Inicio de cada idioma: /es/, /en/, /fr/ */
export const homePath = (locale: Locale) => `/${locale}/`;

/**
 * Páginas que todavía NO están migradas a Astro: siguen siendo los HTML
 * originales (en español) dentro de /public/html. Cuando migres una página,
 * solo cambia su ruta aquí y todo el sitio se actualiza.
 */
export const legacy = {
  beaches: '/html/promociones/playas/playas.html',
  dunes: '/html/promociones/dunas/dunas.html',
  culture: '/html/promociones/cultura/cultura.html',
  contact: '/html/contacto.html',
  login: '/html/login.html',
  register: '/html/registro.html',
  profile: '/html/perfil.html',
  cart: '/html/compras.html',
  comments: '/html/comentarios.html',
} as const;

/** Misma página en otro idioma (por ahora solo la home está traducida) */
export function switchLocalePath(_currentPath: string, target: Locale): string {
  return homePath(target);
}

export function hreflangLinks(siteUrl: string) {
  return [
    ...LOCALES.map((l) => ({ locale: l as string, href: `${siteUrl}${homePath(l)}` })),
    { locale: 'x-default', href: `${siteUrl}${homePath(DEFAULT_LOCALE)}` },
  ];
}
