import * as React from 'react';

export interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  value?: string;
  onChange?: (tabId: string) => void;
}

export function Tabs({ tabs, defaultTab, value, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab ?? tabs[0]?.id);

  const currentTab = value !== undefined ? value : activeTab;

  const handleChange = (tabId: string) => {
    if (value === undefined) {
      setActiveTab(tabId);
    }
    onChange?.(tabId);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleChange(tab.id)}
            className={[
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              currentTab === tab.id ? 'text-textPrimary' : 'text-textMuted hover:text-textPrimary',
            ].join(' ')}
          >
            {tab.label}
            {currentTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-accent" />
            )}
          </button>
        ))}
      </div>
      <div>
        {tabs.map((tab) =>
          currentTab === tab.id ? (
            <div key={tab.id} role="tabpanel">
              {tab.content}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
