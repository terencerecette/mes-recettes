import React from 'react';
import { BookOpen, Cloud, Refrigerator, ShoppingBasket, UtensilsCrossed } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'recipes', label: 'Mes recettes', icon: BookOpen },
  { id: 'frigo', label: 'Frigo', icon: Refrigerator },
  { id: 'shopping', label: 'Courses', icon: ShoppingBasket },
  { id: 'sync', label: 'Synchro', icon: Cloud },
];

export default function Navigation({
  activeTab,
  onSelectTab,
  shoppingUncheckedCount,
  isSyncActive,
  recipesCount,
}) {
  return (
    <>
      {/* Barre latérale PC / Tablette */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64 md:flex-col border-r border-[#EAE5DD] bg-white z-30">
        <div className="flex items-center gap-3 px-6 pt-7 pb-6 border-b border-[#EAE5DD]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C85A32] text-white shadow-soft">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-semibold leading-tight text-[#26211D]">
              Mes recettes
            </h1>
            <p className="text-xs text-[#70675F]">Carnet de cuisine</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-5" aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition ${
                  active
                    ? 'bg-[#C85A32]/10 text-[#C85A32] font-semibold'
                    : 'text-[#70675F] hover:bg-[#FAF8F5] hover:text-[#26211D]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-5 w-5 ${active ? 'text-[#C85A32]' : 'text-[#70675F]'}`}
                  />
                  <span>{item.label}</span>
                </span>

                {item.id === 'recipes' && recipesCount > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      active
                        ? 'bg-[#C85A32]/15 text-[#C85A32]'
                        : 'bg-[#F3EFE8] text-[#70675F]'
                    }`}
                  >
                    {recipesCount}
                  </span>
                )}

                {item.id === 'shopping' && shoppingUncheckedCount > 0 && (
                  <span className="rounded-full bg-[#C85A32] px-2 py-0.5 text-xs font-semibold text-white">
                    {shoppingUncheckedCount}
                  </span>
                )}

                {item.id === 'sync' && (
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isSyncActive ? 'bg-[#4A7C59]' : 'bg-[#D5CDC2]'
                    }`}
                    title={isSyncActive ? 'Synchronisé' : 'Mode local'}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#EAE5DD] px-5 py-4">
          <div className="flex items-center gap-2 text-xs text-[#70675F]">
            <span
              className={`h-2 w-2 rounded-full ${
                isSyncActive ? 'bg-[#4A7C59]' : 'bg-[#D5CDC2]'
              }`}
            />
            <span>{isSyncActive ? 'Synchro Supabase active' : 'Mode local actif'}</span>
          </div>
        </div>
      </aside>

      {/* Barre de navigation fixe en bas sur mobile */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#EAE5DD] bg-white/95 backdrop-blur-md"
        style={{ paddingBottom: 'max(0.45rem, env(safe-area-inset-bottom))' }}
        aria-label="Navigation mobile"
      >
        <div className="grid grid-cols-4 gap-1 px-2 pt-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 px-1 transition ${
                  active ? 'text-[#C85A32]' : 'text-[#70675F]'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.9} />
                  {item.id === 'shopping' && shoppingUncheckedCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-[#C85A32] px-1 text-[10px] font-bold text-white">
                      {shoppingUncheckedCount > 99 ? '99+' : shoppingUncheckedCount}
                    </span>
                  )}
                  {item.id === 'sync' && isSyncActive && (
                    <span className="absolute -top-0.5 -right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#4A7C59]" />
                  )}
                </div>
                <span
                  className={`mt-1 text-[11px] leading-none ${
                    active ? 'font-semibold' : 'font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
