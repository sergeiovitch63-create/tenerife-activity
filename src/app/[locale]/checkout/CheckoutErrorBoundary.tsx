'use client'

import { Component, type ReactNode } from 'react'
import { CheckoutPageRecoveryFallback } from './CheckoutPageRecoveryFallback'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class CheckoutErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[CHECKOUT] ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <CheckoutPageRecoveryFallback />
    }
    return this.props.children
  }
}
