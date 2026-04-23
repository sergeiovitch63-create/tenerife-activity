/**
 * Weather Advisory card — "Check the day before"
 *
 * Pure presentational. Scoring + advisory-building lives in
 * `src/lib/personalize/scorers/weather-advisory.ts` so it runs server-side.
 */

import {
  CloudRain, Wind, Waves, Eye, Mountain, CloudSun, ExternalLink,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type { Advisory, AdvisoryIconName } from '@/lib/personalize/scorers/weather-advisory'

const ICON_MAP: Record<AdvisoryIconName, LucideIcon> = {
  CloudRain,
  Wind,
  Waves,
  Eye,
  Mountain,
  CloudSun,
}

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

export function WeatherAdvisoryCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as { advisories: Advisory[] }
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr
  const links = CHECK_LINKS[locale] ?? CHECK_LINKS.fr

  return (
    <div className="rounded-3xl border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 p-2.5 shadow-sm">
          <CloudSun className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-900">{labels.title}</h3>
          <p className="mt-0.5 text-sm text-neutral-600">{labels.subtitle}</p>

          <ul className="mt-4 space-y-2.5">
            {props.advisories.map((adv) => {
              const Icon = ICON_MAP[adv.icon] ?? CloudSun
              const text = labels[adv.textKey] ?? adv.textKey
              const link = adv.checkLinkKey ? links[adv.checkLinkKey] : null
              return (
                <li key={adv.key} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 rounded-lg bg-white p-1.5 border border-sky-100">
                    <Icon className="h-4 w-4 text-sky-600" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-800">{text}</p>
                    {link && (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          <p className="mt-4 text-xs text-neutral-500">{labels.cancellationNote}</p>
        </div>
      </div>
    </div>
  )
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'À surveiller la veille',
    subtitle: 'Les conditions qui comptent vraiment pour cette activité.',
    windParagliding: 'Parapente : vol annulé si le vent dépasse ~25 km/h ou tourne défavorablement. Décision prise le matin même.',
    windGeneral: 'Une mer houleuse peut entraîner l\'annulation du départ ou un itinéraire raccourci.',
    waves: 'Conditions de mer : en cas de houle importante, le mal de mer est possible — le prestataire peut adapter le parcours.',
    visibility: 'Visibilité en altitude : nuages bas ou brume (calima) peuvent masquer la vue — vérifiez la webcam du Teide avant de partir.',
    rain: 'En cas de pluie soutenue, l\'activité peut être reportée. Vérifiez la prévision AEMET la veille.',
    altitudeWeather: 'Haute altitude : neige possible en hiver, températures négatives la nuit. Consultez AEMET pour Las Cañadas.',
    cancellationNote: 'En cas d\'annulation pour cause météo, vous récupérez 100 % du montant versé.',
  },
  en: {
    title: 'Check the day before',
    subtitle: 'The conditions that really matter for this activity.',
    windParagliding: 'Paragliding: flight cancelled above ~25 km/h wind or unfavorable direction. Decision made on the morning.',
    windGeneral: 'Rough seas can lead to cancellation or a shortened route.',
    waves: 'Sea conditions: heavy swell can trigger seasickness — the provider may adapt the route.',
    visibility: 'Altitude visibility: low clouds or calima haze can block the view — check the Teide webcam before leaving.',
    rain: 'Heavy rain may force postponement. Check the AEMET forecast the day before.',
    altitudeWeather: 'High altitude: snow possible in winter, sub-zero nights. Check AEMET for Las Cañadas.',
    cancellationNote: 'If the activity is cancelled due to weather, you get a 100% refund.',
  },
  es: {
    title: 'Revisa la víspera',
    subtitle: 'Las condiciones que realmente importan para esta actividad.',
    windParagliding: 'Parapente: vuelo cancelado si el viento supera ~25 km/h o rola en mala dirección. Decisión la misma mañana.',
    windGeneral: 'Mar gruesa puede llevar a la cancelación o a un recorrido más corto.',
    waves: 'Condiciones de mar: con marejada, puede aparecer mareo — el operador puede adaptar el recorrido.',
    visibility: 'Visibilidad en altitud: nubes bajas o calima pueden tapar la vista — consulta la webcam del Teide antes de salir.',
    rain: 'Lluvia intensa puede aplazar la actividad. Revisa la previsión AEMET el día anterior.',
    altitudeWeather: 'Gran altitud: nieve posible en invierno, temperaturas bajo cero por la noche. Consulta AEMET para Las Cañadas.',
    cancellationNote: 'Si la actividad se cancela por meteorología, recuperas el 100% del importe.',
  },
  de: {
    title: 'Am Vortag prüfen',
    subtitle: 'Die Bedingungen, die für diese Aktivität wirklich zählen.',
    windParagliding: 'Gleitschirm: Flug abgesagt bei Wind über ~25 km/h oder ungünstiger Richtung. Entscheidung am Morgen.',
    windGeneral: 'Raue See kann zur Absage oder zu einer verkürzten Route führen.',
    waves: 'Seebedingungen: Bei starkem Seegang ist Seekrankheit möglich — der Anbieter kann die Route anpassen.',
    visibility: 'Sicht in der Höhe: tiefe Wolken oder Calima können die Sicht verdecken — prüfen Sie die Teide-Webcam.',
    rain: 'Starker Regen kann zur Verschiebung führen. Prüfen Sie die AEMET-Prognose am Vortag.',
    altitudeWeather: 'Große Höhe: Schnee im Winter möglich, Minusgrade in der Nacht. AEMET für Las Cañadas prüfen.',
    cancellationNote: 'Wird die Aktivität wegen Wetter abgesagt, gibt es eine 100%-Erstattung.',
  },
  it: {
    title: 'Da controllare la sera prima',
    subtitle: 'Le condizioni che contano davvero per questa attività.',
    windParagliding: 'Parapendio: volo annullato con vento oltre ~25 km/h o direzione sfavorevole. Decisione al mattino.',
    windGeneral: 'Mare mosso può portare ad annullamento o percorso ridotto.',
    waves: 'Condizioni del mare: con onda forte può insorgere mal di mare — l\'operatore può adattare il percorso.',
    visibility: 'Visibilità in quota: nuvole basse o calima possono coprire la vista — controlla la webcam del Teide.',
    rain: 'Pioggia intensa può far rinviare l\'attività. Controlla le previsioni AEMET il giorno prima.',
    altitudeWeather: 'Alta quota: neve possibile d\'inverno, temperature sotto zero di notte. Consulta AEMET per Las Cañadas.',
    cancellationNote: 'Se l\'attività viene annullata per meteo, ti rimborsiamo il 100%.',
  },
  ru: {
    title: 'Проверьте накануне',
    subtitle: 'Что действительно важно для этой активности.',
    windParagliding: 'Парапланеризм: полёт отменяется при ветре более ~25 км/ч или неудачном направлении. Решение принимают утром.',
    windGeneral: 'При сильной волне возможна отмена или сокращение маршрута.',
    waves: 'Состояние моря: при большой волне может укачать — оператор скорректирует маршрут.',
    visibility: 'Видимость на высоте: низкие облака или калима могут скрыть вид — проверьте веб-камеру Тейде.',
    rain: 'Сильный дождь может привести к переносу. Проверьте прогноз AEMET накануне.',
    altitudeWeather: 'Большая высота: зимой возможен снег, ночью мороз. Смотрите AEMET по Las Cañadas.',
    cancellationNote: 'При отмене из-за погоды вы получаете 100%-й возврат средств.',
  },
}

const CHECK_LINKS: Record<string, Record<string, { label: string; url: string }>> = {
  fr: {
    aemet: { label: 'Prévision AEMET', url: 'https://www.aemet.es/fr/eltiempo/prediccion/municipios/santa-cruz-de-tenerife-id38038' },
    marine: { label: 'Prévision marine Windy', url: 'https://www.windy.com/-Waves-waves?waves,28.273,-16.643,8' },
    windyTeide: { label: 'Vue Teide Windy', url: 'https://www.windy.com/-Clouds-clouds?clouds,28.273,-16.643,9' },
    windyParagliding: { label: 'Vents parapente Windy', url: 'https://www.windy.com/-Wind-gusts-gust?gust,28.273,-16.643,10' },
  },
  en: {
    aemet: { label: 'AEMET forecast', url: 'https://www.aemet.es/en/eltiempo/prediccion/municipios/santa-cruz-de-tenerife-id38038' },
    marine: { label: 'Marine forecast (Windy)', url: 'https://www.windy.com/-Waves-waves?waves,28.273,-16.643,8' },
    windyTeide: { label: 'Teide view (Windy)', url: 'https://www.windy.com/-Clouds-clouds?clouds,28.273,-16.643,9' },
    windyParagliding: { label: 'Paragliding wind (Windy)', url: 'https://www.windy.com/-Wind-gusts-gust?gust,28.273,-16.643,10' },
  },
  es: {
    aemet: { label: 'Previsión AEMET', url: 'https://www.aemet.es/es/eltiempo/prediccion/municipios/santa-cruz-de-tenerife-id38038' },
    marine: { label: 'Previsión marítima Windy', url: 'https://www.windy.com/-Waves-waves?waves,28.273,-16.643,8' },
    windyTeide: { label: 'Vista Teide (Windy)', url: 'https://www.windy.com/-Clouds-clouds?clouds,28.273,-16.643,9' },
    windyParagliding: { label: 'Viento parapente (Windy)', url: 'https://www.windy.com/-Wind-gusts-gust?gust,28.273,-16.643,10' },
  },
  de: {
    aemet: { label: 'AEMET-Prognose', url: 'https://www.aemet.es/en/eltiempo/prediccion/municipios/santa-cruz-de-tenerife-id38038' },
    marine: { label: 'Seewetter (Windy)', url: 'https://www.windy.com/-Waves-waves?waves,28.273,-16.643,8' },
    windyTeide: { label: 'Teide-Blick (Windy)', url: 'https://www.windy.com/-Clouds-clouds?clouds,28.273,-16.643,9' },
    windyParagliding: { label: 'Gleitschirm-Wind (Windy)', url: 'https://www.windy.com/-Wind-gusts-gust?gust,28.273,-16.643,10' },
  },
  it: {
    aemet: { label: 'Previsioni AEMET', url: 'https://www.aemet.es/en/eltiempo/prediccion/municipios/santa-cruz-de-tenerife-id38038' },
    marine: { label: 'Previsioni marine (Windy)', url: 'https://www.windy.com/-Waves-waves?waves,28.273,-16.643,8' },
    windyTeide: { label: 'Teide (Windy)', url: 'https://www.windy.com/-Clouds-clouds?clouds,28.273,-16.643,9' },
    windyParagliding: { label: 'Vento parapendio (Windy)', url: 'https://www.windy.com/-Wind-gusts-gust?gust,28.273,-16.643,10' },
  },
  ru: {
    aemet: { label: 'Прогноз AEMET', url: 'https://www.aemet.es/en/eltiempo/prediccion/municipios/santa-cruz-de-tenerife-id38038' },
    marine: { label: 'Морской прогноз Windy', url: 'https://www.windy.com/-Waves-waves?waves,28.273,-16.643,8' },
    windyTeide: { label: 'Вид Тейде (Windy)', url: 'https://www.windy.com/-Clouds-clouds?clouds,28.273,-16.643,9' },
    windyParagliding: { label: 'Ветер для парапланеризма', url: 'https://www.windy.com/-Wind-gusts-gust?gust,28.273,-16.643,10' },
  },
}
