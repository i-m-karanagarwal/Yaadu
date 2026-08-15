"use client";

export type TabId = "home" | "bills" | "shopping" | "reminders";

type Props = {
  active: TabId;
  onChange: (tab: TabId) => void;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "bills", label: "Bills" },
  { id: "shopping", label: "Shopping" },
  { id: "reminders", label: "Reminders" },
];

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-10 border-t border-stone-200 bg-white/95 backdrop-blur"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-3xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex-1 py-3 text-center text-xs font-medium transition ${
              active === tab.id
                ? "text-amber-700"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {tab.label}
            {active === tab.id ? (
              <span className="mx-auto mt-1 block h-0.5 w-8 rounded-full bg-amber-600" />
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  );
}
