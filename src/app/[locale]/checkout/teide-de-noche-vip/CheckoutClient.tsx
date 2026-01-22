'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface CheckoutClientProps {
  locale: string
  code: string
  date: string
  adults: number
  price: number
  currency: string
  option: string | null
}

const STORAGE_KEY = 'teide-de-noche-vip-checkout'

interface CheckoutFormData {
  nombre: string
  apellidos: string
  email: string
  telefono: string
  hotel: string
  comentarios: string
  aceptaTerminos: boolean
  aceptaPromociones: boolean
}

export function CheckoutClient({
  locale,
  code,
  date,
  adults,
  price,
  currency,
  option,
}: CheckoutClientProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<CheckoutFormData>({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    hotel: '',
    comentarios: '',
    aceptaTerminos: false,
    aceptaPromociones: false,
  })

  // Load form data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFormData(prev => ({ ...prev, ...parsed }))
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  // Save form data to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
  }, [formData])

  const total = price * adults

  const handleInputChange = (field: keyof CheckoutFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const canProceedToStep2 = true // Step 1 is always valid (just summary)
  const canProceedToStep3 = 
    formData.nombre.trim() !== '' &&
    formData.email.trim() !== '' &&
    formData.telefono.trim() !== '' &&
    formData.aceptaTerminos

  const handlePayment = () => {
    // For now, redirect to success page (mock)
    router.push(`/${locale}/checkout/success?status=mock`)
  }

  return (
    <div className="min-h-screen bg-glass-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-glass-900 mb-2">Checkout</h1>
          <p className="text-glass-600">Teide de Noche VIP</p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= step
                        ? 'bg-ocean-600 text-white'
                        : 'bg-glass-200 text-glass-500'
                    }`}
                  >
                    {step}
                  </div>
                  <div className={`mt-2 text-sm font-medium ${
                    currentStep >= step ? 'text-ocean-600' : 'text-glass-500'
                  }`}>
                    {step === 1 && 'Resumen del pedido'}
                    {step === 2 && 'Datos personales'}
                    {step === 3 && 'Medios de pago'}
                  </div>
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step ? 'bg-ocean-600' : 'bg-glass-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Step 1: Resumen del pedido */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-glass-900 mb-6">Resumen del pedido</h2>
              
              {/* Product Card */}
              <div className="border border-glass-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-glass-900 mb-2">
                  Teide de Noche VIP
                </h3>
                {option && (
                  <p className="text-sm text-glass-600 mb-4">Option: {option}</p>
                )}
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-glass-600">Fecha:</span>
                    <span className="font-medium text-glass-900">{date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-600">Personas:</span>
                    <span className="font-medium text-glass-900">{adults} adulto{adults > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-600">Precio por persona:</span>
                    <span className="font-medium text-glass-900">{price.toFixed(2)} {currency}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-glass-200">
                    <span className="text-lg font-semibold text-glass-900">Total:</span>
                    <span className="text-lg font-bold text-ocean-600">
                      {total.toFixed(2)} {currency}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors"
                >
                  Datos personales →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Datos personales */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-glass-900 mb-6">Datos personales</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-glass-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={e => handleInputChange('nombre', e.target.value)}
                    className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-glass-700 mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={e => handleInputChange('apellidos', e.target.value)}
                    className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-glass-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-glass-700 mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={e => handleInputChange('telefono', e.target.value)}
                    className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-glass-700 mb-1">
                    Hotel en Destino
                  </label>
                  <input
                    type="text"
                    value={formData.hotel}
                    onChange={e => handleInputChange('hotel', e.target.value)}
                    className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-glass-700 mb-1">
                    Comentarios
                  </label>
                  <textarea
                    value={formData.comentarios}
                    onChange={e => handleInputChange('comentarios', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    placeholder="Opcional"
                  />
                </div>

                <div className="space-y-3 pt-4">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.aceptaTerminos}
                      onChange={e => handleInputChange('aceptaTerminos', e.target.checked)}
                      className="mt-1 mr-2"
                      required
                    />
                    <span className="text-sm text-glass-700">
                      Acepto términos y condiciones *
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.aceptaPromociones}
                      onChange={e => handleInputChange('aceptaPromociones', e.target.checked)}
                      className="mt-1 mr-2"
                    />
                    <span className="text-sm text-glass-700">
                      Acepto recibir promociones
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 bg-glass-200 text-glass-700 font-medium rounded-lg hover:bg-glass-300 transition-colors"
                >
                  ← Resumen
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedToStep3}
                  className="px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Medios de pago →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Medios de pago */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-glass-900 mb-6">Medios de pago</h2>
              
              {/* Summary */}
              <div className="border border-glass-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-glass-900 mb-4">Resumen</h3>
                
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-glass-600">Actividad:</span>
                    <span className="font-medium text-glass-900">Teide de Noche VIP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-600">Fecha:</span>
                    <span className="font-medium text-glass-900">{date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-600">Personas:</span>
                    <span className="font-medium text-glass-900">{adults} adulto{adults > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-600">Nombre:</span>
                    <span className="font-medium text-glass-900">{formData.nombre} {formData.apellidos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-600">Email:</span>
                    <span className="font-medium text-glass-900">{formData.email}</span>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-glass-200">
                  <span className="text-xl font-semibold text-glass-900">Total:</span>
                  <span className="text-xl font-bold text-ocean-600">
                    {total.toFixed(2)} {currency}
                  </span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Paiement Atlantico à brancher (userId manquant). 
                  Cette page est un mock pour le moment.
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 bg-glass-200 text-glass-700 font-medium rounded-lg hover:bg-glass-300 transition-colors"
                >
                  ← Datos personales
                </button>
                <button
                  onClick={handlePayment}
                  className="px-8 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors"
                >
                  Pagar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}












