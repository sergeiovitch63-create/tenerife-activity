export type AtlanticoClassification = {
  id: string
  code: string
  name: string
  desc: string | null
  image: string | null
  offer?: string | null
  provider?: string | null
  category?: string | null
  quota?: string | null
  duration?: string | null
  hidden?: string | null
}

export type AtlanticoGroup = {
  id: string
  code: string
  name: string
  desc: string | null
  image: string | null
  price: string | null
  ids: string | null
  duration: string | null
  category?: string | null
  images?: string[]
  video?: string | null
  longitud?: string | null
  latitud?: string | null
  canTitle?: string | null
  canDesc?: string | null
  willDo?: string | null
  faq?: string | null
  tadvisor?: string | null
  recom?: number | string
  days?: unknown[]
  discount?: number | string
  isNew?: string
  childAge?: string | null
  infantAge?: string | null
  pickup?: number | string
  intPoints?: unknown[]
  events?: unknown[]
  extras?: unknown[]
}

export type AtlanticoEvent = {
  id: string
  code: string
  name: string
  days: number[]
  times: string[]
  fak?: string | null
  pProd: string  // "0" per person | "1" per product | "2" per day | "3" unique
  route?: string | null
  desc?: string | null
  icons?: string[]
  category?: string | null
  group?: string | null
  price?: string | null
}

// Price endpoint: returns a string with pipe separators
// per-person: "ADULT|CHILD|INFANT|ADULT_COMM|CHILD_COMM|INFANT_COMM"
// per-day:    "DAYS|PRICE|COMMISSION|DAYS|PRICE|COMMISSION..."
export type ParsedPrice = {
  mode: 'per-person' | 'per-day' | 'unknown'
  adult?: number
  child?: number
  infant?: number
  adultCommission?: number
  childCommission?: number
  infantCommission?: number
  dayTiers?: Array<{ upToDays: number; price: number; commission: number }>
  raw: string
}

export type AtlanticoSession = {
  time: string
  available: string | number
  precio?: string
  bruto?: string
  sessionId?: string | number
  rcId?: string | number
  TipoReservaId?: string | number
}

export type AtlanticoLimits = {
  id: string
  code: number
  quote: string | number
  dates: {
    limit: number[]
    date: string[]
    used: number[]
    wdays: number[]
    sessions?: Record<string, AtlanticoSession[]>
  }
}

export type BookingPayload = {
  userId: string
  t_id: string       // Event (option) code
  t_group: string    // Group (tour) code
  language: 'CAS' | 'ENG' | 'FRA' | 'RUS' | 'ALE' | 'ITA'
  tourDate: string   // YYYY-MM-DD
  sesTime?: string
  adults: number
  childs: number
  infants: number
  name: string
  email: string
  phone: string
  hotel?: string
  room?: string
  mpoint?: string
  mtime?: string
  notes?: string
}
