/**
 * Bucket-List-Rank card — "where this sits in the Tenerife catalogue"
 *
 * Left-primary card (top of the page). Badge + archetype + rationale
 * + social-proof chip. Pure presentation; the ranking logic is in
 * `src/lib/personalize/scorers/bucket-list-rank.ts`.
 */

import { Award, Trophy, Sparkles, Star, Percent } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  BucketListProps,
  BucketListArchetype,
} from '@/lib/personalize/scorers/bucket-list-rank'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const ARCHETYPE_STYLE: Record<
  BucketListArchetype,
  { grad: string; bg: string; ring: string; chip: string; Icon: typeof Trophy }
> = {
  icon: {
    grad: 'from-amber-500 via-orange-500 to-rose-500',
    bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-amber-300',
    ring: 'ring-amber-300',
    chip: 'bg-amber-100 text-amber-900 ring-amber-300',
    Icon: Trophy,
  },
  'must-do': {
    grad: 'from-amber-500 to-orange-500',
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200',
    ring: 'ring-amber-200',
    chip: 'bg-amber-100 text-amber-800 ring-amber-200',
    Icon: Award,
  },
  'crowd-favorite': {
    grad: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50 border-emerald-200',
    ring: 'ring-emerald-200',
    chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    Icon: Star,
  },
  alternative: {
    grad: 'from-sky-500 to-indigo-500',
    bg: 'bg-sky-50 border-sky-200',
    ring: 'ring-sky-200',
    chip: 'bg-sky-100 text-sky-800 ring-sky-200',
    Icon: Sparkles,
  },
  unique: {
    grad: 'from-violet-500 to-fuchsia-500',
    bg: 'bg-violet-50 border-violet-200',
    ring: 'ring-violet-200',
    chip: 'bg-violet-100 text-violet-800 ring-violet-200',
    Icon: Sparkles,
  },
}

type LabelMap = Record<string, string>

export function BucketListRankCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as BucketListProps
  const labels: LabelMap = (TRANSLATIONS[locale] ?? TRANSLATIONS.fr) as LabelMap
  const style = ARCHETYPE_STYLE[props.archetype]
  const { Icon } = style

  const rationale =
    labels[props.rationaleKey] ?? labels.rationale_general

  const taValue = props.tripAdvisor != null ? props.tripAdvisor.toFixed(1) : null
  const recomValue = props.recom != null ? Math.round(props.recom) : null

  return (
    <div className={`rounded-2xl border p-5 ${style.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 rounded-xl bg-gradient-to-br ${style.grad} p-2.5 shadow-sm`}>
          <Icon className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${style.chip}`}
            >
              {labels[`archetype_${props.archetype}`]}
            </span>
            {taValue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200">
                <Star className="h-3 w-3 fill-current" strokeWidth={2} />
                {taValue}
              </span>
            )}
            {recomValue != null && recomValue >= 85 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200">
                <Percent className="h-3 w-3" strokeWidth={2.5} />
                {recomValue}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base font-semibold text-neutral-900">
            {labels[`title_${props.archetype}`] ?? labels.title_general}
          </h3>
          <p className="mt-1 text-sm leading-snug text-neutral-700">
            {rationale}
          </p>
        </div>
      </div>
    </div>
  )
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    archetype_icon: 'Icône',
    archetype_must_do: 'Incontournable',
    'archetype_must-do': 'Incontournable',
    'archetype_crowd-favorite': 'Coup de cœur',
    archetype_alternative: 'Alternative',
    archetype_unique: 'Singulier',

    title_icon: 'Un symbole de Tenerife',
    'title_must-do': 'À ne pas manquer',
    'title_crowd-favorite': 'Plébiscité',
    title_alternative: 'L\'autre option maline',
    title_unique: 'Un angle distinctif',
    title_general: 'Place dans le catalogue',

    rationale_general: 'Un choix qui se défend dans l\'île.',
    'rationale_teide-summit': 'Le Teide : plus haut sommet d\'Espagne, point de mire de l\'île.',
    'rationale_whale-watching': 'Observation des cétacés résidents — l\'un des meilleurs spots au monde.',
    'rationale_siam-park': 'Parc aquatique classé premier au monde, année après année.',
    'rationale_loro-parque': 'Zoo emblématique du nord, figure parmi les meilleurs d\'Europe.',
    'rationale_masca-ravine': 'Le ravin de Masca — décor spectaculaire entre montagne et océan.',
    'rationale_paragliding-signature': 'Vol depuis un site de réputation mondiale pour le parapente.',
    'rationale_sunset-catamaran': 'Catamaran au coucher du soleil — le cliché emblématique du sud.',
    'rationale_stargazing-dinner': 'Dîner sous les étoiles au Teide, ciel classé UNESCO.',
    'rationale_volcanic-caving': 'Descente en tube de lave — expérience rare et locale.',
    'rationale_high-altitude-vineyard': 'Vignoble parmi les plus hauts d\'Europe.',
    rationale_alternative: 'Moins exposé, très bien noté — le choix des connaisseurs.',
    rationale_unique: 'Une proposition distincte qui sort des sentiers battus.',
  },
  en: {
    archetype_icon: 'Icon',
    'archetype_must-do': 'Must-do',
    'archetype_crowd-favorite': 'Crowd favourite',
    archetype_alternative: 'Alternative',
    archetype_unique: 'Distinctive',

    title_icon: 'A Tenerife signature',
    'title_must-do': 'You\'d regret skipping this',
    'title_crowd-favorite': 'Widely loved',
    title_alternative: 'The smart other pick',
    title_unique: 'A distinctive angle',
    title_general: 'Where it sits in the catalogue',

    rationale_general: 'A choice that holds up on the island.',
    'rationale_teide-summit': 'Mount Teide — Spain\'s highest peak and the island\'s defining landmark.',
    'rationale_whale-watching': 'Year-round resident cetaceans — one of the world\'s top spots.',
    'rationale_siam-park': 'Water park routinely ranked #1 in the world.',
    'rationale_loro-parque': 'Flagship north-island zoo, among Europe\'s best.',
    'rationale_masca-ravine': 'The Masca ravine — a dramatic hike between mountain and sea.',
    'rationale_paragliding-signature': 'Flying from a site with a global paragliding reputation.',
    'rationale_sunset-catamaran': 'Sunset catamaran — the postcard south-coast shot.',
    'rationale_stargazing-dinner': 'Dinner under Teide\'s UNESCO-protected night sky.',
    'rationale_volcanic-caving': 'Descend a lava tube — a rare and local experience.',
    'rationale_high-altitude-vineyard': 'Among Europe\'s highest vineyards.',
    rationale_alternative: 'Less spotlighted, very well rated — the insider pick.',
    rationale_unique: 'A distinctive offer off the usual circuit.',
  },
  es: {
    archetype_icon: 'Icono',
    'archetype_must-do': 'Imprescindible',
    'archetype_crowd-favorite': 'Muy popular',
    archetype_alternative: 'Alternativa',
    archetype_unique: 'Distintiva',

    title_icon: 'Un símbolo de Tenerife',
    'title_must-do': 'No te lo puedes perder',
    'title_crowd-favorite': 'Muy valorada',
    title_alternative: 'La otra opción inteligente',
    title_unique: 'Un ángulo distintivo',
    title_general: 'Su lugar en el catálogo',

    rationale_general: 'Una elección sólida en la isla.',
    'rationale_teide-summit': 'El Teide: la cumbre más alta de España, icono insular.',
    'rationale_whale-watching': 'Cetáceos residentes todo el año — uno de los mejores lugares del mundo.',
    'rationale_siam-park': 'Parque acuático clasificado número uno del mundo, año tras año.',
    'rationale_loro-parque': 'Zoo emblemático del norte, entre los mejores de Europa.',
    'rationale_masca-ravine': 'El barranco de Masca — escenario espectacular entre montaña y océano.',
    'rationale_paragliding-signature': 'Vuelo desde un enclave de referencia mundial.',
    'rationale_sunset-catamaran': 'Catamarán al atardecer — la postal del sur.',
    'rationale_stargazing-dinner': 'Cena bajo el cielo estrellado del Teide, reserva UNESCO.',
    'rationale_volcanic-caving': 'Descender un tubo volcánico — experiencia poco frecuente.',
    'rationale_high-altitude-vineyard': 'Entre los viñedos más altos de Europa.',
    rationale_alternative: 'Menos expuesto, muy bien valorado — la elección del que sabe.',
    rationale_unique: 'Una propuesta distinta, fuera del circuito habitual.',
  },
  de: {
    archetype_icon: 'Ikone',
    'archetype_must-do': 'Pflichtprogramm',
    'archetype_crowd-favorite': 'Publikumsliebling',
    archetype_alternative: 'Alternative',
    archetype_unique: 'Markant',

    title_icon: 'Ein Teneriffa-Wahrzeichen',
    'title_must-do': 'Nicht verpassen',
    'title_crowd-favorite': 'Breit beliebt',
    title_alternative: 'Die clevere Alternative',
    title_unique: 'Ein markanter Blickwinkel',
    title_general: 'Einordnung im Angebot',

    rationale_general: 'Eine stimmige Wahl auf der Insel.',
    'rationale_teide-summit': 'Der Teide — Spaniens höchster Gipfel, Wahrzeichen der Insel.',
    'rationale_whale-watching': 'Ganzjährig ansässige Wale — einer der besten Spots weltweit.',
    'rationale_siam-park': 'Wasserpark, regelmäßig als Nr. 1 der Welt ausgezeichnet.',
    'rationale_loro-parque': 'Flaggschiff-Zoo im Norden, unter Europas besten.',
    'rationale_masca-ravine': 'Die Masca-Schlucht — dramatische Wanderung zwischen Berg und Meer.',
    'rationale_paragliding-signature': 'Starten an einem weltweit bekannten Gleitschirm-Spot.',
    'rationale_sunset-catamaran': 'Katamaran zum Sonnenuntergang — das Postkartenmotiv des Südens.',
    'rationale_stargazing-dinner': 'Sternenmenü am Teide, UNESCO-geschützter Nachthimmel.',
    'rationale_volcanic-caving': 'Abstieg in eine Lavaröhre — seltenes, lokales Erlebnis.',
    'rationale_high-altitude-vineyard': 'Eines der höchstgelegenen Weingüter Europas.',
    rationale_alternative: 'Weniger im Rampenlicht, sehr gut bewertet — Insidertipp.',
    rationale_unique: 'Ein markantes Angebot abseits der üblichen Routen.',
  },
  it: {
    archetype_icon: 'Icona',
    'archetype_must-do': 'Da non perdere',
    'archetype_crowd-favorite': 'Amatissima',
    archetype_alternative: 'Alternativa',
    archetype_unique: 'Distintiva',

    title_icon: 'Un simbolo di Tenerife',
    'title_must-do': 'Imperdibile',
    'title_crowd-favorite': 'Plebiscitata',
    title_alternative: 'L\'altra scelta intelligente',
    title_unique: 'Un taglio distintivo',
    title_general: 'La sua posizione nel catalogo',

    rationale_general: 'Una scelta che tiene il suo posto sull\'isola.',
    'rationale_teide-summit': 'Il Teide — vetta più alta di Spagna, icona dell\'isola.',
    'rationale_whale-watching': 'Cetacei residenti tutto l\'anno — tra i migliori spot al mondo.',
    'rationale_siam-park': 'Parco acquatico classificato n°1 al mondo, anno dopo anno.',
    'rationale_loro-parque': 'Zoo emblematico del nord, tra i migliori d\'Europa.',
    'rationale_masca-ravine': 'La gola di Masca — scenografia spettacolare tra monte e oceano.',
    'rationale_paragliding-signature': 'Volo da un sito di fama mondiale per il parapendio.',
    'rationale_sunset-catamaran': 'Catamarano al tramonto — la cartolina del sud.',
    'rationale_stargazing-dinner': 'Cena sotto le stelle al Teide, cielo patrimonio UNESCO.',
    'rationale_volcanic-caving': 'Discesa in un tubo lavico — esperienza rara e locale.',
    'rationale_high-altitude-vineyard': 'Tra i vigneti più alti d\'Europa.',
    rationale_alternative: 'Meno esposta, molto ben valutata — la scelta degli intenditori.',
    rationale_unique: 'Una proposta distinta, fuori dai circuiti soliti.',
  },
  ru: {
    archetype_icon: 'Икона',
    'archetype_must-do': 'Обязательно',
    'archetype_crowd-favorite': 'Всеобщий фаворит',
    archetype_alternative: 'Альтернатива',
    archetype_unique: 'Особая',

    title_icon: 'Символ Тенерифе',
    'title_must-do': 'Пропустить — пожалеть',
    'title_crowd-favorite': 'Любимица публики',
    title_alternative: 'Умный альтернативный выбор',
    title_unique: 'Особый ракурс',
    title_general: 'Место в каталоге',

    rationale_general: 'Надёжный выбор на острове.',
    'rationale_teide-summit': 'Тейде — высочайшая вершина Испании, символ острова.',
    'rationale_whale-watching': 'Киты и дельфины круглый год — одно из лучших мест в мире.',
    'rationale_siam-park': 'Аквапарк, год за годом признаваемый №1 в мире.',
    'rationale_loro-parque': 'Флагманский зоопарк севера, один из лучших в Европе.',
    'rationale_masca-ravine': 'Ущелье Маска — драматичный маршрут между горой и океаном.',
    'rationale_paragliding-signature': 'Полёт с точки мировой известности для парапланеризма.',
    'rationale_sunset-catamaran': 'Катамаран на закате — открыточный юг острова.',
    'rationale_stargazing-dinner': 'Ужин под звёздным небом Тейде, небо ЮНЕСКО.',
    'rationale_volcanic-caving': 'Спуск в лавовую трубу — редкое и локальное переживание.',
    'rationale_high-altitude-vineyard': 'Один из самых высокогорных виноградников Европы.',
    rationale_alternative: 'В тени, но высоко оценена — выбор знатоков.',
    rationale_unique: 'Особое предложение вне привычных маршрутов.',
  },
}
