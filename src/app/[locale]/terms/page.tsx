import { Section, Container } from '@/ui/components/layout'
import { Link } from '@/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/request'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'terms' })
  return buildMetadata({
    locale: locale as Locale,
    pathname: '/terms',
    title: t('title'),
    description: t('description'),
  })
}

export default async function TermsPage() {
  const t = await getTranslations({ namespace: 'terms' })

  return (
    <Section variant="default" background="default">
      <Container size="lg">
        <div className="py-12 md:py-16 max-w-3xl mx-auto prose prose-glass">
          <h1 className="text-3xl font-bold text-glass-900 mb-8">{t('title')}</h1>

          <div className="space-y-8 text-glass-700 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-glass-900 mt-6 mb-3">1. IDENTIFICATION DETAILS</h2>
              <p>
                In accordance with Article 10 of Law 34/2002, of July 11, services of the information society and
                electronic commerce, the user is informed that the owner of this website is{' '}
                <strong>Atlantic Dolphin Travel SL</strong>, established in street Fundadores de la Cooperativa 66,
                Local 10, San Miguel de Abona, 38639, Santa Cruz de Tenerife, Spain, CIF: B-38587580, Travel Agency
                legally constituted coded ID I-AV-0000092.2, telephone (+34) 922 71 66 45 and contact email{' '}
                <a href="mailto:info@atlanticoexcursiones.com" className="text-ocean-600 hover:underline">
                  info@atlanticoexcursiones.com
                </a>
                . It is registered in the Commercial Register of Tenerife, Tomo.2.003F.5, presentation: 1/60/8977, Folio
                1396, Protocol .: 2007/6581 / N / 11/10/2007, Entry Number: 1/2007 / 10.304.0 and holds License No. travel
                agency. I.AV.92.0000092.2 Also it is reported to be available to our customers the relevant complaint
                forms duly authorized by the Directorate General of Planning and Promotion of Tourism Government of the
                Canary Islands if you are interested at: Street: Fundadores de la cooperativa 66, Local 10 San Miguel de
                Abona, 38639, Santa Cruz de Tenerife, Spain
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-glass-900 mt-6 mb-3">2. CONDITIONS OF ACCESS TO THE SITES</h2>
              <p>
                The user simply by accessing this site, whatever the form of such access, consent and access to these
                conditions, which marked the regime of use of this Web Site. The owner reserves the right to alter and
                modify them at any time, to be published on the site in the last update which govern and implementation
                at each visit. If you do not accept all of these terms are not authorized to access this website and the
                content and / or services it housed must proceed to leave the site immediately. These conditions are
                likewise extendable and applicable to communications and newsletters that may be submitted if the holder
                of this web page, so the user must accept these conditions to your access and / or use.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-glass-900 mt-6 mb-3">3. OBJECT</h2>
              <p>
                This is the website of Atlantic Dolphin Travel SL, through which provides a choice of content and
                services related to their business.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-glass-900 mt-6 mb-3">4. AUTHORIZED USE OF THE SITE AND CONTENT</h2>
              <p>
                The user can only access this website and the content and services it housed if it is older and has
                sufficient legal capacity: if it appears to be a minor must have the consent of their legal
                representative or in its absence, you must leave this site immediately. The user is authorized to access
                the contents of the website whenever you make a tight thereon to right use in accordance with these
                terms, especially intellectual and industrial property rights granted by law and are detailed in the
                corresponding section of this articulated, is expressly prohibited the use thereof fraudulently illegal
                purposes, or commercially without express written permission by the owner. The Atlantic Dolphin Travel
                Agency Travel SL, reserves the right to stop at any time without prior notice to users who violate these
                conditions, the website or access the content offered.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-glass-900 mt-6 mb-3">5. DISCLAIMER</h2>
              <p>
                Atlantic Dolphin Travel SL does not guarantee the accuracy of any form content, completeness, legality,
                reliability, timeliness, reliability, accuracy, performance or availability of content and services
                offered, declining any responsibility for them, as well as damages in your case may result from improper
                use. Consequently, the content provided are for information only and are not representative of anything.
                What is said above is extended to the links, contents and opinions non-holder or not staying in this Web
                site corresponds responsibility in any case the perpetrators thereof and the owners of the sites in
                question.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-glass-900 mt-6 mb-3">6. INTELLECTUAL PROPERTY</h2>
              <p>
                Atlantic Dolphin Travel SL All rights of intellectual property arising from this Web Site reserves the
                express permission being required in writing by the Agency for any exercise and use thereof. This
                reservation of rights encompasses both the content that may be included in any format and distributed
                through this Website or when your code, design and navigation structure of the Web Site.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-glass-900 mt-6 mb-3">7. PRIVACY POLICY</h2>
              <h3 className="text-base font-medium text-glass-800 mt-4 mb-2">7.1 ADDITIONAL INFORMATION</h3>
              <p>
                ATLANTIC DOLPHIN TRAVEL, S.L. in its commitment to maximize the guarantee of Protection of Personal Data
                and the privacy of its clients has made a review of all its business processes and especially of those
                that involve the processing of personal data, adapting them to the new requirements of the regulations
                Community, General Data Protection Regulations (RGPD), implemented the appropriate security measures
                taking into account the results obtained from the risk analysis carried out and has updated its privacy
                policies and in consequence of this Legal Notice. The user and / or client guarantees that the
                information provided is true, accurate, complete and updated, being responsible for any loss or damage,
                direct or indirect, that could be caused as a result of the breach of such obligation.
              </p>
              <h3 className="text-base font-medium text-glass-800 mt-4 mb-2">7.2 RESPONSIBLE FOR TREATMENT</h3>
              <p>
                Entities belonging to ATLANTIC DOLPHIN TRAVEL, S.L., and therefore Responsible for the Treatment of data
                provided voluntarily by the user: ATLANTIC DOLPHIN TRAVEL, S.L. CIF: B38587580
              </p>
              <h3 className="text-base font-medium text-glass-800 mt-4 mb-2">7.3 PURPOSES OF PERSONAL DATA PROCESSING</h3>
              <p>
                Personal data provided voluntarily by the user will be incorporated into records of treatment owned by
                ATLANTIC DOLPHIN TRAVEL, S.L. with purposes including: processing and management of requests for
                information and/or advice, pre-contract or contract; management and control of services; sending of
                information about services and products; providing services on the website; managing contractual or
                commercial relationship; manage compliance with contractual or non-contractual obligations; manage and
                maintain a single registry of clients; offer customised products and services; and, where the User
                expressly consents, send advertising communications and commercial information.
              </p>
              <h3 className="text-base font-medium text-glass-800 mt-4 mb-2">7.4-7.9</h3>
              <p>
                For full details on data processing, retention, legitimation, recipients, international transfers,
                rights of interested parties (access, rectification, deletion, limitation, opposition, portability), and
                policy updates, please contact ATLANTIC DOLPHIN TRAVEL, S.L. at{' '}
                <a href="mailto:administracion@atlanticoexcursiones.com" className="text-ocean-600 hover:underline">
                  administracion@atlanticoexcursiones.com
                </a>{' '}
                or by letter to Calle Fundadores de la Cooperativa 66 Local 1, 38620, San Miguel de Abona, Santa Cruz de
                Tenerife. You may direct claims to the Spanish Agency for Data Protection www.agpd.es.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-glass-900 mt-6 mb-3">8. COOKIES</h2>
              <p>
                Cookies are text files that are hosted on the terminal of the visiting user with some information visit
                the page. This website informs users about the use of cookies for the sole purpose of being able to
                maintain the session between client-server, but in no case are used for collection and subsequent use of
                user information. Either way, it informs the user of the possibility in most web browsers to limit the
                use of such cookies.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-glass-900 mt-6 mb-3">9. VALIDITY</h2>
              <p>
                In the event that any provision or portion thereof of this notice is held invalid, that fact shall not
                affect the validity of the remaining.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-glass-900 mt-6 mb-3">10. CANCELLATION POLICIES</h2>
              <p>
                The cancellation policies will be those applicable by the provider in each case. You will be authorized
                to cancel the Tourist Service through the contact telephone numbers provided for this purpose.
                Cancellations must be made at least 24 hours in advance of the scheduled time for the contracted
                service, unless the service provider or the destination requires more notice. If you cancel your
                reservation before the date of provision of the service, you will be charged the corresponding
                cancellation fees, if any. Atlántico Excursiones will refund the amount paid, discounting the
                cancellation fees incurred with respect to the service provider.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-glass-900 mt-6 mb-3">11. JURISDICTION AND APPLICABLE LAW</h2>
              <p>
                The law applicable to any dispute arising in connection with this Web Site and the contents in the
                offer, shall be Spanish law. The parties agree to submit to the Courts of the city of Santa Cruz de
                Tenerife (Canary Islands, Spain), expressly waiving any other jurisdiction that may apply.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-6 border-t border-glass-200">
            <Link href="/" className="text-ocean-600 hover:underline font-medium">
              ← {t('backToHome')}
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  )
}
