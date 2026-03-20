/**
 * Maps vibe slugs to translation keys
 * Example: 'vip-tours' -> 'vipTours'
 */
export function vibeSlugToTranslationKey(slug: string): string {
  // Convert kebab-case to camelCase
  return slug
    .split('-')
    .map((word, index) => {
      if (index === 0) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join('')
}

/**
 * Get translated vibe title (for server components)
 * @param slug - Vibe slug (e.g., 'vip-tours')
 * @param t - Translation function from getTranslations('vibes')
 * @param fallback - Fallback title if translation not found
 */
export function getTranslatedVibeTitle(
  slug: string,
  t: (key: string) => string,
  fallback: string
): string {
  const translationKey = vibeSlugToTranslationKey(slug)
  return t(translationKey) || fallback
}

const VIBE_TAGLINES_BY_LOCALE: Record<string, Record<string, string>> = {
  fr: {
    'adventure-nature': "Connectez-vous au côté sauvage de Tenerife",
    'theme-parks': "Des aventures familiales inoubliables vous attendent",
    'tickets-attractions': "Évitez les files d'attente, optimisez votre temps",
    'bus-excursions': "Découvrez l'île avec confort et style",
    'boat-trips-cruises': "Prenez le large pour des moments océaniques inoubliables",
    'shows-entertainment': "Des soirées remplies de spectacles de haut niveau",
    'water-sports': "Plongez dans des aventures aquatiques palpitantes",
    'cable-car-observatory': "Prenez de la hauteur et contemplez les étoiles",
    'diving-fishing': "Explorez les profondeurs ou lancez votre ligne",
    'vip-tours': "Accès exclusif aux expériences les plus prisées de Tenerife",
    'gastronomy-tastings': "Savourez les saveurs authentiques des Canaries",
    'car-rental': "La liberté d'explorer à votre rythme",
    'bike-rental': "Pédalez à travers des itinéraires panoramiques",
  },
  es: {
    'adventure-nature': 'Conecta con el lado salvaje de Tenerife',
    'theme-parks': 'Te esperan aventuras familiares inolvidables',
    'tickets-attractions': 'Evita las colas y aprovecha tu tiempo',
    'bus-excursions': 'Descubre la isla con comodidad y estilo',
    'boat-trips-cruises': 'Navega hacia momentos inolvidables en el océano',
    'shows-entertainment': 'Noches llenas de espectáculos de primer nivel',
    'water-sports': 'Sumérgete en emocionantes aventuras acuáticas',
    'cable-car-observatory': 'Llega más alto y contempla las estrellas',
    'diving-fishing': 'Explora las profundidades o lanza tu caña',
    'vip-tours': 'Acceso exclusivo a las experiencias más deseadas de Tenerife',
    'gastronomy-tastings': 'Saborea los auténticos sabores de Canarias',
    'car-rental': 'Libertad para explorar a tu ritmo',
    'bike-rental': 'Pedalea por rutas panorámicas',
  },
  de: {
    'adventure-nature': 'Entdecke Teneriffas wilde Seite',
    'theme-parks': 'Unvergessliche Familienabenteuer warten auf dich',
    'tickets-attractions': 'Warteschlangen vermeiden, Zeit optimal nutzen',
    'bus-excursions': 'Entdecke die Insel komfortabel und stilvoll',
    'boat-trips-cruises': 'Setz die Segel für unvergessliche Momente auf dem Meer',
    'shows-entertainment': 'Abende voller erstklassiger Unterhaltung',
    'water-sports': 'Tauche ein in spannende Wasserabenteuer',
    'cable-car-observatory': 'Höhen erreichen und die Sterne beobachten',
    'diving-fishing': 'Erkunde die Tiefe oder wirf die Angel aus',
    'vip-tours': 'Exklusiver Zugang zu Teneriffas begehrtesten Erlebnissen',
    'gastronomy-tastings': 'Genieße die authentischen Aromen der Kanaren',
    'car-rental': 'Freiheit, die Insel im eigenen Tempo zu erkunden',
    'bike-rental': 'Fahre auf landschaftlich schönen Routen',
  },
  it: {
    'adventure-nature': 'Connettiti al lato selvaggio di Tenerife',
    'theme-parks': 'Avventure in famiglia indimenticabili ti aspettano',
    'tickets-attractions': 'Salta le code e sfrutta al massimo il tuo tempo',
    'bus-excursions': "Scopri l'isola con comfort e stile",
    'boat-trips-cruises': 'Salpa verso momenti oceanici indimenticabili',
    'shows-entertainment': 'Serate ricche di spettacoli di alto livello',
    'water-sports': 'Tuffati in emozionanti avventure acquatiche',
    'cable-car-observatory': 'Raggiungi nuove altezze e osserva le stelle',
    'diving-fishing': 'Esplora i fondali o lancia la tua lenza',
    'vip-tours': "Accesso esclusivo alle esperienze più ambite di Tenerife",
    'gastronomy-tastings': 'Assapora i sapori autentici delle Canarie',
    'car-rental': 'Libertà di esplorare al tuo ritmo',
    'bike-rental': 'Pedala tra percorsi panoramici',
  },
  ru: {
    'adventure-nature': 'Откройте дикую сторону Тенерифе',
    'theme-parks': 'Незабываемые семейные приключения ждут вас',
    'tickets-attractions': 'Без очередей, максимум впечатлений',
    'bus-excursions': 'Откройте остров с комфортом и стилем',
    'boat-trips-cruises': 'Отправляйтесь в море за незабываемыми моментами',
    'shows-entertainment': 'Вечера с шоу мирового уровня',
    'water-sports': 'Погрузитесь в захватывающие водные приключения',
    'cable-car-observatory': 'Поднимитесь выше и взгляните на звезды',
    'diving-fishing': 'Исследуйте глубины или отправьтесь на рыбалку',
    'vip-tours': 'Эксклюзивный доступ к лучшим впечатлениям Тенерифе',
    'gastronomy-tastings': 'Попробуйте подлинные вкусы Канарских островов',
    'car-rental': 'Свобода путешествовать в своем ритме',
    'bike-rental': 'Прокатитесь по живописным маршрутам',
  },
  pl: {
    'adventure-nature': 'Poczuj dziką stronę Teneryfy',
    'theme-parks': 'Niezapomniane rodzinne przygody czekają',
    'tickets-attractions': 'Omijaj kolejki i maksymalnie wykorzystaj czas',
    'bus-excursions': 'Odkrywaj wyspę wygodnie i stylowo',
    'boat-trips-cruises': 'Wypłyń po niezapomniane chwile na oceanie',
    'shows-entertainment': 'Wieczory pełne widowisk na najwyższym poziomie',
    'water-sports': 'Zanurz się w ekscytujących wodnych przygodach',
    'cable-car-observatory': 'Wznieś się wyżej i podziwiaj gwiazdy',
    'diving-fishing': 'Odkrywaj głębiny lub zarzuć wędkę',
    'vip-tours': 'Ekskluzywny dostęp do najbardziej pożądanych atrakcji Teneryfy',
    'gastronomy-tastings': 'Poznaj autentyczne smaki Wysp Kanaryjskich',
    'car-rental': 'Swoboda odkrywania we własnym tempie',
    'bike-rental': 'Pedałuj po malowniczych trasach',
  },
}

/**
 * Translate vibe tagline by locale.
 * nl/pt intentionally fallback to English/original as requested.
 */
export function getTranslatedVibeTagline(
  slug: string,
  locale: string,
  fallback?: string
): string {
  const byLocale = VIBE_TAGLINES_BY_LOCALE[locale]
  if (byLocale && byLocale[slug]) return byLocale[slug]
  return fallback || ''
}

