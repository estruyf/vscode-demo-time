import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Save, Undo2, Search, X } from "lucide-react";
import { Loader as Spinner } from "vscrui";
import { messageHandler } from "@estruyf/vscode/dist/client";
import {
  Config,
  IDemoTimeSettings,
  ISettingsViewData,
  SETTING_CATEGORIES,
  SETTINGS_CATALOG,
  SettingCategoryId,
  SettingDefinition,
  WebViewMessages,
} from "@demotime/common";
import { Button } from "../ui/Button";
import { AppHeader } from "../layout";
import { SettingRow } from "../settings/SettingRow";
import { HighlightPreview } from "../settings/HighlightPreview";
import '../../styles/config.css';

type Values = Record<string, unknown>;

const isSame = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const matchesSearch = (definition: SettingDefinition, search: string) => {
  if (!search) {
    return true;
  }
  const category = SETTING_CATEGORIES.find((item) => item.id === definition.category);
  return [definition.label, definition.description, `${Config.root}.${definition.key}`, category?.title || '']
    .some((text) => text.toLowerCase().includes(search));
};

const SettingsView = () => {
  const [values, setValues] = useState<Values | undefined>(undefined);
  const [savedValues, setSavedValues] = useState<Values | undefined>(undefined);
  const [defaults, setDefaults] = useState<Values>({});
  const [saveStatus, setSaveStatus] = useState<{ type: "blank" | "success" | "error", text: string }>({ type: "blank", text: "" });
  const [saveLoading, setSaveLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showModifiedOnly, setShowModifiedOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SettingCategoryId>(SETTING_CATEGORIES[0].id);
  const searchRef = useRef<HTMLInputElement>(null);

  const getSettings = useCallback(() => {
    return messageHandler.request<ISettingsViewData>(WebViewMessages.toVscode.settingsView.getSettings).then((response) => {
      setValues({ ...response.settings });
      setSavedValues({ ...response.settings });
      setDefaults({ ...response.defaults });
    }).catch((error: Error) => {
      console.error("Error loading settings:", error.message);
    });
  }, []);

  const updateSetting = useCallback((key: string, value: unknown) => {
    setValues((prev) => prev ? { ...prev, [key]: value } : prev);
    setSaveStatus({ type: "blank", text: "" });
  }, []);

  const changedKeys = useMemo(() => {
    if (!values || !savedValues) {
      return [];
    }
    return SETTINGS_CATALOG.map((setting) => setting.key as string).filter((key) => !isSame(values[key], savedValues[key]));
  }, [values, savedValues]);

  const isDirty = changedKeys.length > 0;

  const isModified = useCallback(
    (definition: SettingDefinition) => {
      if (!values) {
        return false;
      }
      if (definition.secret) {
        return !!values[definition.key];
      }
      return !isSame(values[definition.key], defaults[definition.key]);
    },
    [values, defaults],
  );

  const discardChanges = () => {
    if (savedValues) {
      setValues({ ...savedValues });
    }
  };

  const saveSettings = useCallback(() => {
    if (!values || !isDirty) { return; }
    setSaveLoading(true);

    // `null` removes the setting, as `undefined` gets lost in the message
    const changed: Partial<Record<keyof IDemoTimeSettings, unknown>> = {};
    for (const key of changedKeys) {
      changed[key as keyof IDemoTimeSettings] = values[key] ?? null;
    }

    messageHandler.request(WebViewMessages.toVscode.settingsView.saveSettings, changed).then(async (value: unknown) => {
      if (typeof value === "boolean" && value) {
        // Reload, as a setting back at its default can fall back to the user settings
        await getSettings();
        setSaveStatus({ type: "success", text: "Saved" });
      } else {
        setSaveStatus({ type: "error", text: "Something went wrong" });
      }
      setSaveLoading(false);
    }).catch((error: Error) => {
      setSaveLoading(false);
      setSaveStatus({ type: "error", text: "Something went wrong" });
      console.error("Error saving settings:", error.message);
    });
  }, [values, isDirty, changedKeys, getSettings]);

  // Save with cmd+s (macOS) or ctrl+s (Windows/Linux), and search with cmd+f or ctrl+f
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        if (isDirty && !saveLoading) {
          saveSettings();
        }
      } else if (key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDirty, saveLoading, saveSettings]);

  useEffect(() => {
    getSettings();
  }, [getSettings]);

  const visibleCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return SETTING_CATEGORIES.map((category) => ({
      ...category,
      settings: SETTINGS_CATALOG.filter(
        (definition) =>
          definition.category === category.id &&
          matchesSearch(definition, query) &&
          (!showModifiedOnly || isModified(definition) || changedKeys.includes(definition.key)),
      ),
    })).filter((category) => category.settings.length > 0);
  }, [search, showModifiedOnly, isModified, changedKeys]);

  const modifiedCount = useMemo(
    () => SETTINGS_CATALOG.filter((definition) => isModified(definition)).length,
    [isModified],
  );

  // Highlight the category in view in the navigation
  useEffect(() => {
    const onScroll = () => {
      let current = visibleCategories[0]?.id;
      for (const category of visibleCategories) {
        const section = document.getElementById(`category-${category.id}`);
        if (section && section.getBoundingClientRect().top <= 160) {
          current = category.id;
        }
      }
      if (current) {
        setActiveCategory(current);
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [visibleCategories]);

  const goToCategory = (id: SettingCategoryId) => {
    document.getElementById(`category-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveCategory(id);
  };

  if (!values) {
    return <Spinner />;
  }

  return (
    <>
      {saveLoading && <Spinner />}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader
          title="Settings"
          subtitle="Demo Time settings for this workspace"
          showValidation={false}
          onToggleValidation={() => { }}
          fileControls={null}
          actionControls={
            <div className="flex items-center gap-3">
              {(isDirty || saveStatus.type !== "blank") && (
                <div className="flex items-center gap-2" role="status">
                  <div className={`w-2 h-2 rounded-full ${isDirty
                    ? "bg-yellow-800 dark:bg-yellow-300 animate-pulse"
                    : saveStatus.type === "success"
                      ? "bg-green-500"
                      : "bg-red-500"
                    }`} />
                  <span className={`text-xs ${isDirty
                    ? "text-yellow-900 dark:text-yellow-300"
                    : saveStatus.type === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-500"
                    }`}>
                    {isDirty ? `${changedKeys.length} unsaved change${changedKeys.length === 1 ? "" : "s"}` : saveStatus.text}
                  </span>
                </div>
              )}
              <Button variant="secondary" size="sm" onClick={discardChanges} icon={Undo2} disabled={!isDirty}>
                Discard
              </Button>
              <Button variant="dark" size="sm" onClick={saveSettings} icon={Save} disabled={!isDirty || saveLoading}>
                Save
              </Button>
            </div>
          }
          autoSaveStatus={undefined}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex gap-8">
          {/* Categories */}
          <nav aria-label="Setting categories" className="hidden md:block w-56 shrink-0 sticky top-28 self-start">
            <ul className="space-y-0.5">
              {SETTING_CATEGORIES.map((category) => {
                const visible = visibleCategories.find((item) => item.id === category.id);
                const hasChanges = SETTINGS_CATALOG.some((definition) => definition.category === category.id && changedKeys.includes(definition.key));
                const isActive = activeCategory === category.id && !!visible;
                return (
                  <li key={category.id}>
                    <button
                      type="button"
                      disabled={!visible}
                      onClick={() => goToCategory(category.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-sm text-left transition-colors ${isActive
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        } ${visible ? "cursor-pointer" : "opacity-40 cursor-default"}`}
                    >
                      <span className="truncate">{category.title}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {hasChanges && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" title="Unsaved changes" />}
                        <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500">{visible?.settings.length ?? 0}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <main className="flex-1 min-w-0 space-y-6">
            {/* Search and filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setSearch("")}
                  placeholder={`Search ${SETTINGS_CATALOG.length} settings`}
                  aria-label="Search settings"
                  className="w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent [&::-webkit-search-cancel-button]:hidden"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                aria-pressed={showModifiedOnly}
                onClick={() => setShowModifiedOnly((value) => !value)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer ${showModifiedOnly
                  ? "bg-demo-time-accent border-demo-time-accent text-white dark:text-black"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
              >
                Modified only ({modifiedCount})
              </button>

              {/* Categories on narrow screens */}
              <nav aria-label="Setting categories" className="md:hidden flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {visibleCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => goToCategory(category.id)}
                    className="px-2.5 py-1 rounded-full text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 whitespace-nowrap cursor-pointer"
                  >
                    {category.title}
                  </button>
                ))}
              </nav>
            </div>

            {visibleCategories.length === 0 && (
              <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                No settings match{search ? <> “{search}”</> : null}{showModifiedOnly ? " in the modified settings" : ""}.
              </div>
            )}

            {visibleCategories.map((category) => (
              <section key={category.id} id={`category-${category.id}`} aria-labelledby={`category-title-${category.id}`} className="scroll-mt-28">
                <div className="mb-3">
                  <h2 id={`category-title-${category.id}`} className="text-lg font-semibold text-gray-900 dark:text-white">{category.title}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{category.description}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  {category.id === "highlighting" && (
                    <div className="px-5 py-4">
                      <HighlightPreview
                        borderColor={String(values.highlightBorderColor ?? "")}
                        background={String(values.highlightBackground ?? "")}
                        opacity={Number(values.highlightOpacity ?? 1)}
                        blur={Number(values.highlightBlur ?? 0)}
                      />
                    </div>
                  )}

                  {category.settings.map((definition) => (
                    <SettingRow
                      key={definition.key}
                      definition={definition}
                      value={values[definition.key]}
                      defaultValue={defaults[definition.key]}
                      isModified={isModified(definition)}
                      isUnsaved={changedKeys.includes(definition.key)}
                      onChange={(value) => updateSetting(definition.key, value)}
                      onReset={() => updateSetting(definition.key, defaults[definition.key])}
                    />
                  ))}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </>
  );
};

export default SettingsView;
