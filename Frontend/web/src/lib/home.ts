// =========================================================
// Textos de la página de inicio, por idioma.
// Las imágenes, enlaces y clases CSS están en src/pages/[lang]/index.astro;
// aquí solo vive el texto que hay que traducir.
// =========================================================
import type { Locale } from './i18n';

interface Slide { h2: string; p: string; sr: string; alt: string }
interface Card {
  badge: string; title: string; text: string; aria: string;
  h4a: string; list: string[]; h4b: string; recs: string[]; h4c: string;
  head: [string, string]; rows: [string, string][];
}
interface Item { title: string; text: string }

export interface HomeContent {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  kicker: string;
  carouselLabel: string;
  slideLabel: (n: number, total: number) => string;
  prev: string; next: string; pause: string;
  slides: Slide[];
  explore: string;
  services: { title: string; items: Item[] };
  about: {
    kicker: string; title: string; p1: string; p2: string;
    teamAria: string; toggleAria: string; teamAlt: string; hint: string; teamTitle: string;
  };
  benefits: { title: string; items: Item[] };
  cta: { title: string; text: string };
  destinations: { title: string; cards: [Card, Card, Card] };
  media: { title: string; videoTitle: string; mapTitle: string };
  reviews: {
    title: string; loading: string; all: string; formTitle: string; formText: string;
    label: string; placeholder: string; rating: string; star: (n: number) => string;
    photo: string; submit: string;
  };
  footer: {
    homeAria: string; payAlt: string; explore: string; destinations: string;
    follow: string; contact: string; destinationsLink: string; top: string; bottom: string;
  };
}

const es: HomeContent = {
  metaTitle: 'IcaTurismo · Destinos de Ica',
  metaDescription: 'Promociones de playas, dunas y cultura en Ica. Reserva tu aventura.',
  h1: 'IcaTurismo: destinos turísticos de Ica, Perú',
  kicker: 'Ica · Perú',
  carouselLabel: 'Destinos destacados de Ica',
  slideLabel: (n, total) => `${n} de ${total}`,
  prev: 'Diapositiva anterior', next: 'Diapositiva siguiente', pause: 'Pausar carrusel',
  slides: [
    { h2: 'Playas de ensueño', p: 'Paracas, Islas Ballestas y más.', sr: ' sobre playas de ensueño', alt: 'Playas de Ica' },
    { h2: 'Dunas y aventura', p: 'Buggy, sandboard y atardeceres en Huacachina.', sr: ' sobre dunas y aventura', alt: 'Aventura en las dunas de Ica' },
    { h2: 'Cultura e historia', p: 'Líneas de Nazca, bodegas y museos.', sr: ' sobre cultura e historia', alt: 'Cultura de Ica' },
    { h2: 'Descubre Ica', p: 'Un destino lleno de vida y tradición.', sr: ' sobre descubre Ica', alt: 'Ica en general' },
  ],
  explore: 'Explora más',
  services: {
    title: 'Nuestros servicios',
    items: [
      { title: 'Alojamiento', text: 'Encuentra opciones cómodas para descansar y disfrutar cada día de tu visita a Ica.' },
      { title: 'Transporte', text: 'Muévete con facilidad entre los principales destinos y atractivos de la región.' },
      { title: 'Alimentación', text: 'Descubre sabores locales y disfruta de alternativas para acompañar tu recorrido.' },
      { title: 'Actividades', text: 'Vive experiencias culturales y aventuras para conocer Ica desde nuevas perspectivas.' },
    ],
  },
  about: {
    kicker: 'Conoce Ica con nosotros',
    title: 'Sobre nosotros',
    p1: 'IcaTurismo nace del deseo de compartir la riqueza de nuestra región y acercar a cada viajero a sus paisajes, cultura y tradiciones. Queremos ayudarte a descubrir cada rincón de Ica y hacer de tu visita una experiencia especial.',
    p2: 'Te acompañamos a explorar el destino con información útil, propuestas para todos los gustos y el cariño de quienes disfrutan mostrar lo mejor de Ica.',
    teamAria: 'Integrantes del equipo IcaTurismo',
    toggleAria: 'Voltear para mostrar u ocultar los integrantes del equipo',
    teamAlt: 'Equipo de IcaTurismo',
    hint: 'Conoce al equipo',
    teamTitle: 'Integrantes del equipo',
  },
  benefits: {
    title: '¿Por qué elegir Ica?',
    items: [
      { title: 'Playas únicas', text: 'Litoral desértico y reservas naturales como Paracas.' },
      { title: 'Paisajes de altura', text: 'Rutas de trekking entre dunas, valles y cañones.' },
      { title: 'Historia viva', text: 'Líneas de Nazca, museos y bodegas centenarias.' },
      { title: 'Aventura real', text: 'Sandboard, kitesurf y experiencias en el desierto.' },
    ],
  },
  cta: { title: 'Descubre los tesoros de Ica', text: 'Playas doradas, dunas emocionantes y cultura milenaria te esperan.' },
  destinations: {
    title: 'Nuestros Destinos',
    cards: [
      {
        badge: 'Playas', title: 'Playas de ensueño', aria: 'Ir a Playas de Ica',
        text: 'Disfruta del mar y el desierto en Paracas, Islas Ballestas y más.',
        h4a: 'Actividades', list: ['Paseos en bote', 'Avistamiento de aves', 'Kitesurf'],
        h4b: 'Recomendaciones', recs: ['Visitar en verano', 'Usar bloqueador'],
        h4c: 'Precios referenciales', head: ['Actividad', 'Precio (S/.)'],
        rows: [['Paseo a Ballestas', '80'], ['Kitesurf (1h)', '150']],
      },
      {
        badge: 'Dunas', title: 'Dunas y aventura', aria: 'Ir a las Dunas de Ica',
        text: 'Recorre el desierto de Huacachina en buggy y prueba el sandboard.',
        h4a: 'Experiencias', list: ['Paseo en buggy', 'Sandboard', 'Atardecer en el desierto'],
        h4b: 'Recomendaciones', recs: ['Usar bloqueador solar', 'Llevar agua y ropa cómoda'],
        h4c: 'Precios referenciales', head: ['Actividad', 'Desde (S/.)'],
        rows: [['Buggy y sandboard', '90'], ['Atardecer en buggy', '70']],
      },
      {
        badge: 'Cultura', title: 'Cultura e historia', aria: 'Ir a Cultura de Ica',
        text: 'Museos, líneas de Nazca, bodegas y tradiciones vivas.',
        h4a: 'Lugares', list: ['Museo de Paracas', 'Líneas de Nazca', 'Bodega Tacama'],
        h4b: 'Recomendaciones', recs: ['Visita guiada', 'Degustación de vinos'],
        h4c: 'Entradas', head: ['Sitio', 'Entrada (S/.)'],
        rows: [['Museo Paracas', '15'], ['Bodega Tacama', '25']],
      },
    ],
  },
  media: { title: 'Vive Ica y ubícanos', videoTitle: 'Video de Ica', mapTitle: 'Mapa de Ica' },
  reviews: {
    title: 'Opiniones de nuestros visitantes',
    loading: 'Cargando comentarios...',
    all: 'Ver todos los comentarios',
    formTitle: 'Deja tu comentario',
    formText: 'Comparte tu experiencia. Para publicar, debes iniciar sesión; la foto de perfil es opcional.',
    label: 'Tu comentario',
    placeholder: 'Cuéntanos cómo fue tu experiencia',
    rating: 'Tu calificación',
    star: (n) => (n === 1 ? '1 estrella' : `${n} estrellas`),
    photo: 'Agregar foto de perfil (opcional)',
    submit: 'Publicar comentario',
  },
  footer: {
    homeAria: 'IcaTurismo, volver al inicio',
    payAlt: 'Formas de pago aceptadas: Visa, Mastercard, PayPal, PagoEfectivo, Yape y Plin',
    explore: 'Explora', destinations: 'Destinos', follow: 'Síguenos', contact: 'Contacto',
    destinationsLink: 'Nuestros destinos', top: 'Volver al inicio ↑',
    bottom: 'Empresa de turismo con sede en Ica',
  },
};

const en: HomeContent = {
  metaTitle: 'IcaTurismo · Destinations in Ica',
  metaDescription: 'Beach, dune and culture deals in Ica, Peru. Book your adventure.',
  h1: 'IcaTurismo: tourist destinations in Ica, Peru',
  kicker: 'Ica · Peru',
  carouselLabel: 'Featured destinations in Ica',
  slideLabel: (n, total) => `${n} of ${total}`,
  prev: 'Previous slide', next: 'Next slide', pause: 'Pause carousel',
  slides: [
    { h2: 'Dream beaches', p: 'Paracas, Ballestas Islands and more.', sr: ' about dream beaches', alt: 'Beaches of Ica' },
    { h2: 'Dunes and adventure', p: 'Buggy, sandboarding and sunsets in Huacachina.', sr: ' about dunes and adventure', alt: 'Adventure in the dunes of Ica' },
    { h2: 'Culture and history', p: 'Nazca Lines, wineries and museums.', sr: ' about culture and history', alt: 'Culture of Ica' },
    { h2: 'Discover Ica', p: 'A destination full of life and tradition.', sr: ' about discovering Ica', alt: 'Ica overview' },
  ],
  explore: 'Explore more',
  services: {
    title: 'Our services',
    items: [
      { title: 'Accommodation', text: 'Find comfortable places to rest and enjoy every day of your visit to Ica.' },
      { title: 'Transport', text: 'Get around easily between the main destinations and attractions of the region.' },
      { title: 'Food', text: 'Discover local flavors and enjoy options to accompany your trip.' },
      { title: 'Activities', text: 'Enjoy cultural experiences and adventures to see Ica from new perspectives.' },
    ],
  },
  about: {
    kicker: 'Discover Ica with us',
    title: 'About us',
    p1: 'IcaTurismo was born from the wish to share the richness of our region and bring every traveler closer to its landscapes, culture and traditions. We want to help you discover every corner of Ica and make your visit a special experience.',
    p2: 'We go with you as you explore the destination, with useful information, proposals for every taste and the care of people who love showing the best of Ica.',
    teamAria: 'IcaTurismo team members',
    toggleAria: 'Flip to show or hide the team members',
    teamAlt: 'IcaTurismo team',
    hint: 'Meet the team',
    teamTitle: 'Team members',
  },
  benefits: {
    title: 'Why choose Ica?',
    items: [
      { title: 'Unique beaches', text: 'Desert coastline and nature reserves such as Paracas.' },
      { title: 'High-altitude landscapes', text: 'Trekking routes among dunes, valleys and canyons.' },
      { title: 'Living history', text: 'Nazca Lines, museums and centuries-old wineries.' },
      { title: 'Real adventure', text: 'Sandboarding, kitesurfing and desert experiences.' },
    ],
  },
  cta: { title: 'Discover the treasures of Ica', text: 'Golden beaches, thrilling dunes and ancient culture await you.' },
  destinations: {
    title: 'Our Destinations',
    cards: [
      {
        badge: 'Beaches', title: 'Dream beaches', aria: 'Go to Beaches of Ica',
        text: 'Enjoy the sea and the desert in Paracas, the Ballestas Islands and more.',
        h4a: 'Activities', list: ['Boat tours', 'Bird watching', 'Kitesurfing'],
        h4b: 'Recommendations', recs: ['Visit in summer', 'Wear sunscreen'],
        h4c: 'Reference prices', head: ['Activity', 'Price (S/.)'],
        rows: [['Ballestas tour', '80'], ['Kitesurfing (1h)', '150']],
      },
      {
        badge: 'Dunes', title: 'Dunes and adventure', aria: 'Go to the Dunes of Ica',
        text: 'Ride through the Huacachina desert by buggy and try sandboarding.',
        h4a: 'Experiences', list: ['Buggy ride', 'Sandboarding', 'Sunset in the desert'],
        h4b: 'Recommendations', recs: ['Wear sunscreen', 'Bring water and comfortable clothes'],
        h4c: 'Reference prices', head: ['Activity', 'From (S/.)'],
        rows: [['Buggy and sandboarding', '90'], ['Sunset buggy ride', '70']],
      },
      {
        badge: 'Culture', title: 'Culture and history', aria: 'Go to Culture of Ica',
        text: 'Museums, Nazca Lines, wineries and living traditions.',
        h4a: 'Places', list: ['Paracas Museum', 'Nazca Lines', 'Tacama Winery'],
        h4b: 'Recommendations', recs: ['Guided visit', 'Wine tasting'],
        h4c: 'Tickets', head: ['Site', 'Ticket (S/.)'],
        rows: [['Paracas Museum', '15'], ['Tacama Winery', '25']],
      },
    ],
  },
  media: { title: 'Experience Ica and find us', videoTitle: 'Video of Ica', mapTitle: 'Map of Ica' },
  reviews: {
    title: 'What our visitors say',
    loading: 'Loading comments...',
    all: 'See all comments',
    formTitle: 'Leave your comment',
    formText: 'Share your experience. To post you must log in; a profile photo is optional.',
    label: 'Your comment',
    placeholder: 'Tell us about your experience',
    rating: 'Your rating',
    star: (n) => (n === 1 ? '1 star' : `${n} stars`),
    photo: 'Add profile photo (optional)',
    submit: 'Post comment',
  },
  footer: {
    homeAria: 'IcaTurismo, back to home',
    payAlt: 'Accepted payment methods: Visa, Mastercard, PayPal, PagoEfectivo, Yape and Plin',
    explore: 'Explore', destinations: 'Destinations', follow: 'Follow us', contact: 'Contact',
    destinationsLink: 'Our destinations', top: 'Back to top ↑',
    bottom: 'Tourism company based in Ica',
  },
};

const fr: HomeContent = {
  metaTitle: 'IcaTurismo · Destinations à Ica',
  metaDescription: "Promotions plages, dunes et culture à Ica, au Pérou. Réservez votre aventure.",
  h1: 'IcaTurismo : destinations touristiques à Ica, Pérou',
  kicker: 'Ica · Pérou',
  carouselLabel: 'Destinations à la une à Ica',
  slideLabel: (n, total) => `${n} sur ${total}`,
  prev: 'Diapositive précédente', next: 'Diapositive suivante', pause: 'Mettre le carrousel en pause',
  slides: [
    { h2: 'Plages de rêve', p: 'Paracas, îles Ballestas et bien plus.', sr: ' sur les plages de rêve', alt: "Plages d'Ica" },
    { h2: 'Dunes et aventure', p: 'Buggy, sandboard et couchers de soleil à Huacachina.', sr: ' sur les dunes et l’aventure', alt: "Aventure dans les dunes d'Ica" },
    { h2: 'Culture et histoire', p: 'Lignes de Nazca, caves et musées.', sr: ' sur la culture et l’histoire', alt: "Culture d'Ica" },
    { h2: 'Découvrez Ica', p: 'Une destination pleine de vie et de traditions.', sr: ' pour découvrir Ica', alt: 'Ica en général' },
  ],
  explore: 'Explorer',
  services: {
    title: 'Nos services',
    items: [
      { title: 'Hébergement', text: 'Trouvez des options confortables pour vous reposer et profiter de chaque jour de votre séjour à Ica.' },
      { title: 'Transport', text: 'Déplacez-vous facilement entre les principales destinations et attractions de la région.' },
      { title: 'Restauration', text: 'Découvrez les saveurs locales et profitez de bonnes adresses pour accompagner votre parcours.' },
      { title: 'Activités', text: 'Vivez des expériences culturelles et des aventures pour découvrir Ica sous un autre angle.' },
    ],
  },
  about: {
    kicker: 'Découvrez Ica avec nous',
    title: 'À propos de nous',
    p1: "IcaTurismo est né du désir de partager la richesse de notre région et de rapprocher chaque voyageur de ses paysages, de sa culture et de ses traditions. Nous voulons vous aider à découvrir chaque recoin d'Ica et faire de votre visite une expérience spéciale.",
    p2: "Nous vous accompagnons dans l'exploration de la destination avec des informations utiles, des propositions pour tous les goûts et la passion de ceux qui aiment montrer le meilleur d'Ica.",
    teamAria: "Membres de l'équipe IcaTurismo",
    toggleAria: "Retourner pour afficher ou masquer les membres de l'équipe",
    teamAlt: "Équipe d'IcaTurismo",
    hint: "Rencontrez l'équipe",
    teamTitle: "Membres de l'équipe",
  },
  benefits: {
    title: 'Pourquoi choisir Ica ?',
    items: [
      { title: 'Plages uniques', text: 'Littoral désertique et réserves naturelles comme Paracas.' },
      { title: 'Paysages en altitude', text: 'Itinéraires de randonnée entre dunes, vallées et canyons.' },
      { title: 'Histoire vivante', text: 'Lignes de Nazca, musées et caves centenaires.' },
      { title: 'Vraie aventure', text: 'Sandboard, kitesurf et expériences dans le désert.' },
    ],
  },
  cta: { title: "Découvrez les trésors d'Ica", text: 'Plages dorées, dunes palpitantes et culture millénaire vous attendent.' },
  destinations: {
    title: 'Nos Destinations',
    cards: [
      {
        badge: 'Plages', title: 'Plages de rêve', aria: "Aller aux Plages d'Ica",
        text: 'Profitez de la mer et du désert à Paracas, aux îles Ballestas et ailleurs.',
        h4a: 'Activités', list: ['Balades en bateau', "Observation d'oiseaux", 'Kitesurf'],
        h4b: 'Recommandations', recs: ['Visiter en été', 'Utiliser de la crème solaire'],
        h4c: 'Prix indicatifs', head: ['Activité', 'Prix (S/.)'],
        rows: [['Excursion aux Ballestas', '80'], ['Kitesurf (1 h)', '150']],
      },
      {
        badge: 'Dunes', title: 'Dunes et aventure', aria: "Aller aux Dunes d'Ica",
        text: 'Parcourez le désert de Huacachina en buggy et essayez le sandboard.',
        h4a: 'Expériences', list: ['Balade en buggy', 'Sandboard', 'Coucher de soleil dans le désert'],
        h4b: 'Recommandations', recs: ['Utiliser de la crème solaire', "Emporter de l'eau et des vêtements confortables"],
        h4c: 'Prix indicatifs', head: ['Activité', 'À partir de (S/.)'],
        rows: [['Buggy et sandboard', '90'], ['Buggy au coucher du soleil', '70']],
      },
      {
        badge: 'Culture', title: 'Culture et histoire', aria: "Aller à la Culture d'Ica",
        text: 'Musées, lignes de Nazca, caves et traditions vivantes.',
        h4a: 'Lieux', list: ['Musée de Paracas', 'Lignes de Nazca', 'Cave Tacama'],
        h4b: 'Recommandations', recs: ['Visite guidée', 'Dégustation de vins'],
        h4c: 'Entrées', head: ['Site', 'Entrée (S/.)'],
        rows: [['Musée de Paracas', '15'], ['Cave Tacama', '25']],
      },
    ],
  },
  media: { title: 'Vivez Ica et retrouvez-nous', videoTitle: "Vidéo d'Ica", mapTitle: "Carte d'Ica" },
  reviews: {
    title: 'Avis de nos visiteurs',
    loading: 'Chargement des commentaires...',
    all: 'Voir tous les commentaires',
    formTitle: 'Laissez votre commentaire',
    formText: 'Partagez votre expérience. Pour publier, vous devez vous connecter ; la photo de profil est facultative.',
    label: 'Votre commentaire',
    placeholder: 'Racontez-nous votre expérience',
    rating: 'Votre note',
    star: (n) => (n === 1 ? '1 étoile' : `${n} étoiles`),
    photo: 'Ajouter une photo de profil (facultatif)',
    submit: 'Publier le commentaire',
  },
  footer: {
    homeAria: "IcaTurismo, retour à l'accueil",
    payAlt: 'Moyens de paiement acceptés : Visa, Mastercard, PayPal, PagoEfectivo, Yape et Plin',
    explore: 'Explorer', destinations: 'Destinations', follow: 'Suivez-nous', contact: 'Contact',
    destinationsLink: 'Nos destinations', top: "Retour en haut ↑",
    bottom: 'Entreprise de tourisme basée à Ica',
  },
};

export const home: Record<Locale, HomeContent> = { es, en, fr };
