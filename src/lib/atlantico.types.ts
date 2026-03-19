export interface ApiClassification {
  id: string
  code: string
  name: string
  desc: string
  image: string
}

export interface ApiTour {
  id: string
  code: string
  name: string
  desc: string
  image: string
  price: string
  ids: string
  duration: string
}

export interface ApiTourDetail {
  id: string
  code: string
  name: string
  category: string
  faq: string
  desc: string
  image: string
  price: string
  ids: string
  childAge: string
  infantAge: string
  duration: string
  ghygo: string
}

export interface ApiEvent {
  id: string
  code: string
  name: string
  days: number[]
  times: string[]
  pProd: string
  route: string
  desc: string
  icons: string[]
}

export interface ApiLimits {
  id: string
  code: number
  quote: string
  dates: {
    limit: number[]
    date: string[]
    used: number[]
    wdays: number[]
  }
  sessions: Record<
    string,
    Array<{
      time: string
      available: string
      precio: string
      sessionId: string
      rcId: string
      TipoReservaId: string
    }>
  >
}
