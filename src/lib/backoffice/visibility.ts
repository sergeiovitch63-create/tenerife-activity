/**
 * Client/Server utilities for visibility config
 */

export interface VisibilityConfig {
  hiddenGroupIds: string[]
  hiddenEventIds: string[]
}

export function isGroupVisible(groupId: string, hiddenGroupIds: string[]): boolean {
  return !hiddenGroupIds.includes(String(groupId).trim())
}

export function isEventVisible(eventId: string, hiddenEventIds: string[]): boolean {
  return !hiddenEventIds.includes(String(eventId).trim())
}
