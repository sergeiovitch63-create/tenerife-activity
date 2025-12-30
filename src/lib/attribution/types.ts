/**
 * Attribution types for commission/affiliate tracking
 */

export interface UTMParams {
  source?: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
}

export interface Attribution {
  clickId?: string
  utm?: UTMParams
  firstTouchTimestamp: number
  lastTouchTimestamp: number
}







