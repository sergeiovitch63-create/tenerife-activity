/**
 * Multi-activity booking card — sidebar CTA.
 *
 * Compact card for the right-inline slot (inside the booking sidebar).
 * Promotes platform-level benefits of assembling a multi-activity stay
 * without fabricating discount %. Scorer + pairing logic live in
 * `src/lib/personalize/scorers/multi-booking.ts`.
 */

import { Layers, CheckCircle2, ArrowRight } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  MultiBookingProps,
  MultiBookingPairing,
  MultiBookingBenefitKey,
} from '@/lib/personalize/scorers/multi-booking'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

export function MultiBookingCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as MultiBookingProps
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr

  const pairingText = labels[`pairing_${props.pairing}`] ?? labels.pairing_generic
  const headline = interpolate(labels.headline, { count: props.suggestedCount })

  return (
    <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-sky-50 p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 p-2 shadow-sm">
          <Layers className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">{labels.title}</h3>
          <p className="mt-0.5 text-xs leading-snug text-neutral-700">{headline}</p>
        </div>
      </div>

      <p className="mt-3 text-xs italic text-indigo-800/90">{pairingText}</p>

      <ul className="mt-3 space-y-1.5">
        {props.benefits.map((benefitKey) => (
          <li key={benefitKey} className="flex items-start gap-2 text-xs text-neutral-800">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-indigo-500" strokeWidth={2.5} />
            <span>{labels[`benefit_${benefitKey}`] ?? benefitKey}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-100"
      >
        {labels.ctaAdd}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </div>
  )
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

// Widen the label bag type so dynamic keys (pairing_*, benefit_*) resolve.
type LabelBag = Record<string, string>

const TRANSLATIONS: Record<string, LabelBag> = {
  fr: {
    title: 'Composez votre séjour',
    headline: '{count} activités = un séjour coordonné de bout en bout.',
    ctaAdd: 'Ajouter à mon séjour',

    // Pairing suggestions
    pairing_adventureRelax: 'Astuce : enchaînez adrénaline et journée détente sur la plage.',
    pairing_familyDay: 'Astuce : associez une sortie famille à un parc ou un catamaran.',
    pairing_romanticWeek: 'Astuce : combinez coucher de soleil et dîner les yeux dans les yeux.',
    pairing_natureGastro: 'Astuce : associez nature et dégustation locale.',
    pairing_wildlifeWalk: 'Astuce : combinez faune et promenade côtière.',
    pairing_cultureFood: 'Astuce : visitez un village puis savourez une cuisine locale.',
    pairing_sunsetNext: 'Astuce : planifiez une journée tranquille avant la soirée étoilée.',
    pairing_generic: 'Astuce : associez cette activité à une expérience complémentaire.',

    // Benefits
    benefit_groupedConfirmation: 'Toutes vos réservations sur un seul compte.',
    benefit_coordinatedTransfers: 'Transferts coordonnés entre activités.',
    benefit_prioritySupport: 'Support prioritaire, un seul interlocuteur.',
    benefit_perActivityCancellation: 'Annulation gratuite, activité par activité.',
  },
  en: {
    title: 'Build your stay',
    headline: '{count} activities = one coordinated trip, end to end.',
    ctaAdd: 'Add to my trip',
    pairing_adventureRelax: 'Tip: pair adrenaline with a relaxed beach day after.',
    pairing_familyDay: 'Tip: combine a family outing with a park or catamaran day.',
    pairing_romanticWeek: 'Tip: pair sunset with a quiet dinner for two.',
    pairing_natureGastro: 'Tip: mix nature with a local tasting stop.',
    pairing_wildlifeWalk: 'Tip: pair wildlife watching with a coastal walk.',
    pairing_cultureFood: 'Tip: visit a village then savour the local cuisine.',
    pairing_sunsetNext: 'Tip: plan an easy day before the stargazing night.',
    pairing_generic: 'Tip: pair this activity with a complementary experience.',
    benefit_groupedConfirmation: 'All your bookings on a single account.',
    benefit_coordinatedTransfers: 'Coordinated transfers between activities.',
    benefit_prioritySupport: 'Priority support, one single contact.',
    benefit_perActivityCancellation: 'Free cancellation, per activity.',
  },
  es: {
    title: 'Construye tu viaje',
    headline: '{count} actividades = un viaje coordinado de principio a fin.',
    ctaAdd: 'Añadir a mi viaje',
    pairing_adventureRelax: 'Consejo: combina adrenalina con un día de playa al día siguiente.',
    pairing_familyDay: 'Consejo: combina una salida en familia con un parque o catamarán.',
    pairing_romanticWeek: 'Consejo: combina atardecer y cena para dos.',
    pairing_natureGastro: 'Consejo: combina naturaleza con una cata local.',
    pairing_wildlifeWalk: 'Consejo: combina fauna con paseo costero.',
    pairing_cultureFood: 'Consejo: visita un pueblo y disfruta la gastronomía local.',
    pairing_sunsetNext: 'Consejo: planifica un día tranquilo antes de la noche estrellada.',
    pairing_generic: 'Consejo: combina esta actividad con una experiencia complementaria.',
    benefit_groupedConfirmation: 'Todas tus reservas en una sola cuenta.',
    benefit_coordinatedTransfers: 'Traslados coordinados entre actividades.',
    benefit_prioritySupport: 'Soporte prioritario, un único interlocutor.',
    benefit_perActivityCancellation: 'Cancelación gratuita, actividad por actividad.',
  },
  de: {
    title: 'Stellen Sie Ihren Aufenthalt zusammen',
    headline: '{count} Aktivitäten = eine rundum koordinierte Reise.',
    ctaAdd: 'Zur Reise hinzufügen',
    pairing_adventureRelax: 'Tipp: Adrenalin mit einem entspannten Strandtag kombinieren.',
    pairing_familyDay: 'Tipp: Familienausflug mit Park- oder Katamarantag verbinden.',
    pairing_romanticWeek: 'Tipp: Sonnenuntergang mit einem ruhigen Dinner zu zweit.',
    pairing_natureGastro: 'Tipp: Natur mit einer lokalen Verkostung kombinieren.',
    pairing_wildlifeWalk: 'Tipp: Tierbeobachtung mit einem Küstenspaziergang.',
    pairing_cultureFood: 'Tipp: Dorf besuchen und lokale Küche genießen.',
    pairing_sunsetNext: 'Tipp: Planen Sie einen ruhigen Tag vor der Sternennacht.',
    pairing_generic: 'Tipp: Diese Aktivität mit einer passenden Ergänzung kombinieren.',
    benefit_groupedConfirmation: 'Alle Buchungen in einem einzigen Konto.',
    benefit_coordinatedTransfers: 'Koordinierte Transfers zwischen den Aktivitäten.',
    benefit_prioritySupport: 'Priority-Support, ein einziger Ansprechpartner.',
    benefit_perActivityCancellation: 'Kostenlose Stornierung, Aktivität für Aktivität.',
  },
  it: {
    title: 'Componi il tuo viaggio',
    headline: '{count} attività = un viaggio coordinato dall\'inizio alla fine.',
    ctaAdd: 'Aggiungi al mio viaggio',
    pairing_adventureRelax: 'Consiglio: alterna adrenalina e una giornata rilassata in spiaggia.',
    pairing_familyDay: 'Consiglio: abbina un\'uscita in famiglia a un parco o catamarano.',
    pairing_romanticWeek: 'Consiglio: unisci tramonto e cena per due.',
    pairing_natureGastro: 'Consiglio: unisci natura e degustazione locale.',
    pairing_wildlifeWalk: 'Consiglio: fauna e passeggiata costiera.',
    pairing_cultureFood: 'Consiglio: visita un borgo e assapora la cucina locale.',
    pairing_sunsetNext: 'Consiglio: pianifica una giornata tranquilla prima della serata stellata.',
    pairing_generic: 'Consiglio: abbina questa attività a un\'esperienza complementare.',
    benefit_groupedConfirmation: 'Tutte le prenotazioni in un unico account.',
    benefit_coordinatedTransfers: 'Trasferimenti coordinati tra attività.',
    benefit_prioritySupport: 'Supporto prioritario, un unico referente.',
    benefit_perActivityCancellation: 'Cancellazione gratuita, per ogni attività.',
  },
  ru: {
    title: 'Составьте свой отпуск',
    headline: '{count} активности = скоординированная поездка от начала до конца.',
    ctaAdd: 'Добавить в поездку',
    pairing_adventureRelax: 'Совет: чередуйте адреналин и расслабленный день на пляже.',
    pairing_familyDay: 'Совет: семейная вылазка плюс парк или катамаран.',
    pairing_romanticWeek: 'Совет: закат и тихий ужин на двоих.',
    pairing_natureGastro: 'Совет: природа и местная дегустация.',
    pairing_wildlifeWalk: 'Совет: наблюдение за фауной и прогулка по побережью.',
    pairing_cultureFood: 'Совет: деревня и местная кухня.',
    pairing_sunsetNext: 'Совет: спокойный день перед звёздной ночью.',
    pairing_generic: 'Совет: добавьте дополняющее впечатление.',
    benefit_groupedConfirmation: 'Все бронирования в одном аккаунте.',
    benefit_coordinatedTransfers: 'Скоординированные трансферы между активностями.',
    benefit_prioritySupport: 'Приоритетная поддержка, один контакт.',
    benefit_perActivityCancellation: 'Бесплатная отмена по каждой активности.',
  },
}
