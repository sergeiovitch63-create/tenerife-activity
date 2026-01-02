import Link from 'next/link'
import { useLocale } from 'next-intl'

interface LocaleLinkProps extends Omit<React.ComponentProps<typeof Link>, 'href'> {
  href: string
  children: React.ReactNode
}

/**
 * Locale-aware Link component that automatically prefixes hrefs with the current locale
 */
export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const locale = useLocale()
  
  // If href already starts with a locale, use it as-is
  // Otherwise, prefix with current locale
  const localeHref = href.startsWith('/') && !href.startsWith(`/${locale}/`) && href !== '/'
    ? `/${locale}${href}`
    : href === '/'
    ? `/${locale}`
    : href

  return <Link href={localeHref} {...props} />
}








