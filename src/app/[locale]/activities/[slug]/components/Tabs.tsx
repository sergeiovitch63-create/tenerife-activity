/**
 * Tabs Component - Atlántico Style
 * Horizontal tabs with scroll to section
 */

'use client'

interface Tab {
  id: string
  label: string
  sectionId: string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  const handleTabClick = (tab: Tab) => {
    onTabChange(tab.id)
    const element = document.getElementById(tab.sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="border-b border-glass-200 sticky top-0 bg-white z-10">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className={`px-6 py-4 font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-ocean-600 text-ocean-600'
                : 'border-transparent text-glass-600 hover:text-glass-900 hover:border-glass-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
























