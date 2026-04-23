'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { useI18n } from '@/i18n/context'

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string }

export default function LocaleLink({ href, ...props }: Props) {
  const { locale } = useI18n()
  const clean = href.startsWith('/') ? href : `/${href}`
  const final = clean === '/' ? `/${locale}` : `/${locale}${clean}`
  return <Link href={final} {...props} />
}
