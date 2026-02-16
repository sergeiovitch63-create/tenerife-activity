/**
 * Booking Panel Component - Atlántico Style
 * Sticky right panel with options, language, price, and book button
 */

'use client'

import { useState } from 'react'

interface Event {
  id: string
  title?: string
  price?: {
    adult?: number | null
    child?: number | null
    infant?: number | null
  }
}

interface BookingPanelProps {
  events: Event[]
  defaultPrice?: number | null
}

export function BookingPanel({ events, defaultPrice }: BookingPanelProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    events.length > 0 ? events[0].id : null
  )
  const [selectedLanguage, setSelectedLanguage] = useState('en')

  const selectedEvent = events.find((e) => e.id === selectedEventId)
  const adultPrice = selectedEvent?.price?.adult || defaultPrice || null

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
  ]

  return (
    <div className="lg:sticky lg:top-8">
      <div className="bg-white border border-glass-200 rounded-lg p-6 shadow-lg">
        <h3 className="text-xl font-bold text-glass-900 mb-6">Manage your booking</h3>

        {/* Options (Radio buttons) */}
        {events.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-glass-700 mb-3">
              Select Option
            </label>
            <div className="space-y-2">
              {events.map((event) => {
                const eventTitle = event.title || `Option ${event.id}`
                const eventPrice = event.price?.adult
                return (
                  <label
                    key={event.id}
                    className="flex items-start p-3 border border-glass-200 rounded-lg cursor-pointer hover:border-ocean-300 transition-colors"
                  >
                    <input
                      type="radio"
                      name="event-option"
                      value={event.id}
                      checked={selectedEventId === event.id}
                      onChange={() => setSelectedEventId(event.id)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-glass-900">{eventTitle}</div>
                      {eventPrice !== null && eventPrice !== undefined && eventPrice > 0 && (
                        <div className="text-sm text-glass-600">€{eventPrice} per adult</div>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Language Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-glass-700 mb-2">
            Client Language
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Total Price */}
        <div className="mb-6 p-4 bg-glass-50 rounded-lg">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-glass-600">Total</span>
            <div className="text-right">
              {adultPrice !== null ? (
                <div className="text-3xl font-bold text-ocean-600">€{adultPrice}</div>
              ) : (
                <div className="text-lg text-glass-500">Price on request</div>
              )}
              <div className="text-xs text-glass-500 mt-1">per adult</div>
            </div>
          </div>
        </div>

        {/* Book Button */}
        <button
          className="w-full px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={adultPrice === null}
        >
          Book now
        </button>
        <p className="mt-2 text-xs text-center text-glass-500">
          Booking functionality coming soon
        </p>
      </div>
    </div>
  )
}
























