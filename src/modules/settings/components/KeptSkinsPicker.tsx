import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";

import { badgeFill, Combobox, useComboboxFilter } from "@/components";
import { m } from "@/i18n";
import type { ChampionSkin } from "@/lib/tauri";
import { twMerge } from "@/utils";

import { leagueInstallQueries, useLoadedSettings, useUpdateSettings } from "../api";

/** The most skins the search lists at once, out of the thousands an install holds. */
const SHOWN_SKINS = 50;

/** One skin of the search, keyed by its champion and id. */
interface SkinOption {
  readonly key: string;
  readonly champion: string;
  readonly id: number;
  readonly label: string;
}

/**
 * The skins that base skins leaves unchanged, as chips in a field that searches every skin of
 * the install by name, chromas included.
 */
export function KeptSkinsPicker() {
  const settings = useLoadedSettings();
  const update = useUpdateSettings();
  const { data: skins } = useQuery(leagueInstallQueries.championSkins(settings.leaguePath));
  const filter = useComboboxFilter();
  const field = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");

  const kept = settings.builtinMods.keptSkins;
  const options = useMemo(() => (skins ?? []).map(skinOption), [skins]);
  const selected = useMemo(
    () => options.filter((option) => kept?.[option.champion]?.includes(option.id)),
    [options, kept],
  );

  return (
    <Combobox.Root<SkinOption, true>
      multiple
      items={options}
      limit={SHOWN_SKINS}
      value={selected}
      onValueChange={(next) => {
        update({ builtinMods: { ...settings.builtinMods, keptSkins: keptSkins(next) } });
        setQuery("");
      }}
      inputValue={query}
      onInputValueChange={setQuery}
      filter={(option, search) => filter.contains(option, search, (item) => item.label)}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.key}
      isItemEqualToValue={(option, chosen) => option.key === chosen.key}
    >
      <Combobox.Chips
        ref={field}
        data-ui="KeptSkinsPicker"
        className={twMerge(
          "min-h-10 w-full items-center rounded-md border border-surface-500 bg-surface-700 px-1.5 py-1.5 transition-colors",
          /* DS-HOVER */
          "focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500 hover:border-accent-hover",
        )}
      >
        <Combobox.Value>
          {(chips: SkinOption[]) =>
            chips.map((option) => (
              <Combobox.Chip
                key={option.key}
                aria-label={option.label}
                className={twMerge(
                  "gap-1 rounded-sm py-0.5 pr-1 pl-1.5 text-meta select-none",
                  badgeFill.champion,
                )}
              >
                {option.label}
                {/* DS-VEIL */}
                <Combobox.ChipRemove
                  aria-label={m.common_chip_remove_action({ label: option.label })}
                  className="rounded-full text-current hover:bg-surface-veil hover:text-current"
                />
              </Combobox.Chip>
            ))
          }
        </Combobox.Value>
        <Combobox.Input
          aria-label={m.settings_builtins_kept_skins_title()}
          placeholder={
            selected.length === 0 ? m.settings_builtins_kept_skins_placeholder() : undefined
          }
          className="h-6 min-w-24 flex-1 rounded-none border-0 bg-transparent px-1.5 hover:border-transparent focus:border-transparent focus:ring-0"
        />
      </Combobox.Chips>
      <Combobox.Content
        anchor={field}
        positionerClassName="w-(--anchor-width)"
        className="max-h-72 select-none"
      >
        <Combobox.Empty>{m.settings_builtins_kept_skins_empty()}</Combobox.Empty>
        <Combobox.List>
          {(option: SkinOption) => (
            <Combobox.Item key={option.key} value={option}>
              <span className="min-w-0 truncate">{option.label}</span>
            </Combobox.Item>
          )}
        </Combobox.List>
      </Combobox.Content>
    </Combobox.Root>
  );
}

function skinOption(skin: ChampionSkin): SkinOption {
  return {
    key: `${skin.champion}:${String(skin.id)}`,
    champion: skin.champion,
    id: skin.id,
    label: skin.name ?? `${skin.champion} ${String(skin.id)}`,
  };
}

/** The `keptSkins` setting that holds `options`, by champion. */
function keptSkins(options: readonly SkinOption[]): Record<string, number[]> {
  const kept: Record<string, number[]> = {};
  for (const option of options) {
    (kept[option.champion] ??= []).push(option.id);
  }
  return kept;
}
