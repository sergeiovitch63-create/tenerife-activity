import { Link } from '@/navigation'
import { Container } from '@/ui/components/layout'
import { getTranslations } from 'next-intl/server'
import { whatsappUrl, contactEmail } from '@/config/contact'

interface FooterProps {
  locale: string
}

export async function Footer({ locale }: FooterProps) {
  const tNav = await getTranslations('nav')
  const tCommon = await getTranslations('common')
  const tContact = await getTranslations('contact')

  return (
    <footer className="w-full bg-glass-900 text-glass-300 border-t border-glass-800">
      <Container size="lg" padding={true}>
        <div className="py-8 md:py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            {/* Copyright */}
            <div className="text-sm">
              <p>&copy; {new Date().getFullYear()} {tCommon('siteName')}</p>
            </div>

            {/* Links */}
            <nav className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <Link
                href="/must-see"
                className="text-sm text-glass-400 hover:text-glass-200 transition-colors"
              >
                {tNav('mustSee')}
              </Link>
              <Link
                href="/contact"
                className="text-sm text-glass-400 hover:text-glass-200 transition-colors"
              >
                {tNav('contact')}
              </Link>
              {/* Contact Info */}
              <div className="flex items-center gap-4 text-sm">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-glass-400 hover:text-glass-200 transition-colors"
                >
                  {tContact('whatsapp')}
                </a>
                <span className="text-glass-600">·</span>
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-glass-400 hover:text-glass-200 transition-colors"
                >
                  {contactEmail}
                </a>
              </div>
            </nav>
          </div>

          {/* Trust Line */}
          <div className="mt-6 pt-6 border-t border-glass-800">
            <p className="text-xs text-glass-500 text-center">
              {tNav('trustLine')}
            </p>
          </div>
        </div>
      </Container>
    </footer>
  )
}
