/**
 * Activity Booking Skeleton - Empty skeleton for activity pages
 * Layout: tabs (left) + booking panel (right)
 * No content, only UI structure
 */

'use client'

import { useState } from 'react'
import { Tabs } from '@/app/[locale]/activities/[slug]/components/Tabs'
import { Accordion } from '@/app/[locale]/activities/[slug]/components/Accordion'
import { ActivityBookingPanel } from './ActivityBookingPanel'
import type { ActivityResolved } from '@/lib/atlantico/resolve'

interface ActivityBookingSkeletonProps {
  locale?: string
  resolved?: ActivityResolved
}

export function ActivityBookingSkeleton({ locale = 'en', resolved }: ActivityBookingSkeletonProps) {
  const [activeTab, setActiveTab] = useState('what-youll-do')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [openSection, setOpenSection] = useState<string | null>('prices')

  const tabs = [
    { id: 'what-youll-do', label: "What you'll do", sectionId: 'section-what-youll-do' },
    { id: 'description', label: 'Description', sectionId: 'section-description' },
    { id: 'details', label: 'Details', sectionId: 'section-details' },
    { id: 'cancellation', label: 'Cancellation', sectionId: 'section-cancellation' },
    { id: 'prices', label: 'Prices', sectionId: 'section-prices' },
    { id: 'reviews', label: 'Reviews', sectionId: 'section-reviews' },
  ]

  const toggleSection = (sectionId: string) => {
    setOpenSection(openSection === sectionId ? null : sectionId)
  }

  const isSectionOpen = (sectionId: string) => openSection === sectionId

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content: 2 columns layout */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Tabs + Content (2/3 width on large screens) */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content (ALL EMPTY) */}
            <div className="mt-6">
              {/* What you'll do - EMPTY */}
              <div id="section-what-youll-do" className={activeTab === 'what-youll-do' ? '' : 'hidden'}>
                <div className="min-h-[200px]"></div>
              </div>

              {/* Description - EMPTY */}
              <div id="section-description" className={activeTab === 'description' ? '' : 'hidden'}>
                <div className="min-h-[200px]"></div>
              </div>

              {/* Details - EMPTY */}
              <div id="section-details" className={activeTab === 'details' ? '' : 'hidden'}>
                <div className="min-h-[200px]"></div>
              </div>

              {/* Cancellation - EMPTY */}
              <div id="section-cancellation" className={activeTab === 'cancellation' ? '' : 'hidden'}>
                <div className="min-h-[200px]"></div>
              </div>

              {/* Prices - EMPTY */}
              <div id="section-prices" className={activeTab === 'prices' ? '' : 'hidden'}>
                <div className="min-h-[200px]"></div>
              </div>

              {/* Reviews - EMPTY */}
              <div id="section-reviews" className={activeTab === 'reviews' ? '' : 'hidden'}>
                <div className="min-h-[200px]"></div>
              </div>
            </div>
          </div>

          {/* Right Column: Manage your booking (1/3 width on large screens) */}
          <div className="lg:col-span-1" style={{ position: 'relative', zIndex: 1 }}>
            {resolved ? (
              <div className="sticky top-4" style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
                <ActivityBookingPanel
                  t_group={resolved.t_group}
                  initialEventId={resolved.t_id}
                  events={resolved.events}
                  locale={locale}
                  language={resolved.language}
                />
              </div>
            ) : (
              <div 
                className="bg-white border border-glass-200 rounded-lg p-6 shadow-lg sticky top-4"
                style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}
              >
                <h3 className="text-lg font-semibold text-glass-900 mb-6">Manage your booking</h3>
                <p className="text-glass-600">Loading booking options...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}






