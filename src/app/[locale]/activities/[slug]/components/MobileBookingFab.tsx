/**
 * Mobile Booking Floating Action Button
 * 
 * Floating CTA button visible only on mobile that scrolls to the booking widget.
 * Hides when user is already in the booking section (using Intersection Observer).
 */

'use client'

import { useState, useEffect } from 'react'

export function MobileBookingFab() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const bookingSection = document.getElementById('booking-widget')
    if (!bookingSection) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Hide button when booking section is visible (user is already there)
          setIsVisible(!entry.isIntersecting)
        })
      },
      {
        threshold: 0.3, // Hide when 30% of booking section is visible
        rootMargin: '-100px 0px', // Add margin to trigger earlier
      }
    )

    observer.observe(bookingSection)

    return () => {
      observer.disconnect()
    }
  }, [])

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-widget')
    if (bookingSection) {
      // Smooth scroll with offset for header (header is now static, but add small margin for visual spacing)
      const headerOffset = 20 // Small visual spacing
      const elementPosition = bookingSection.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <button
      onClick={scrollToBooking}
      className="fixed bottom-6 right-6 z-40 lg:hidden px-6 py-3 bg-ocean-600 text-white font-semibold rounded-full shadow-lg hover:bg-ocean-700 active:bg-ocean-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
      aria-label="Scroll to booking section"
    >
      Booking
    </button>
  )
}

