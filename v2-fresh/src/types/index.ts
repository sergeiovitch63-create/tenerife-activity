export type CartItem = {
  itemId: string
  // Atlantico references
  groupCode: string    // t_group
  eventCode: string    // t_id
  activityTitle: string
  optionTitle: string
  activityImage: string | null
  // Booking payload
  date: string         // YYYY-MM-DD
  timeSlot?: string
  adults: number
  children: number
  infants: number
  unitAdult: number
  unitChild: number
  unitInfant: number
}
