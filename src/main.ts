import {
  ItemView,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  WorkspaceLeaf,
  setIcon
} from "obsidian";

const VIEW_TYPE_PROPERTY_FOLDER = "property-folder-view";

type Language = "en" | "zh";

type Relation = {
  parentProperty: string;
  parentValue: string;
  childProperty: string;
  childValue: string;
  enabled: boolean;
};

type Settings = {
  relations: Relation[];
  autoApplyParents: boolean;
  targetFolders: string[];
  ignoreFolders: string[];
  language: Language;
};

type IndexedRecord = {
  file: TFile;
  path: string;
  basename: string;
  frontmatter: Record<string, unknown>;
};

type TreeChild = {
  key: string;
  property: string;
  value: string;
  paths: Set<string>;
};

type TreeParent = {
  key: string;
  property: string;
  value: string;
  paths: Set<string>;
  children: TreeChild[];
};

type Selection = {
  type: "parent" | "child";
  key: string;
};

const SEEDED_RELATIONS: Relation[] = [
  {
    parentProperty: "Area",
    parentValue: "Writing",
    childProperty: "Task",
    childValue: "Draft article",
    enabled: true
  },
  {
    parentProperty: "Area",
    parentValue: "Research",
    childProperty: "Task",
    childValue: "Read paper",
    enabled: true
  }
];

const DEFAULT_SETTINGS: Settings = {
  relations: SEEDED_RELATIONS,
  autoApplyParents: true,
  targetFolders: [],
  ignoreFolders: [],
  language: "en"
};

const STRINGS: Record<Language, Record<string, string>> = {
  en: {
    "plugin.name": "Property Folder",
    "command.open": "Open Property Folder",
    "command.reconcile": "Reconcile Property Parents",
    "view.refreshIndex": "Refresh index",
    "view.reconcileParents": "Reconcile parents",
    "view.searchPlaceholder": "Filter properties or notes",
    "view.noRelations": "No enabled relations match the current vault index.",
    "view.addRelationsHint": "Add relation mappings in settings or seed the defaults.",
    "view.selectProperty": "Select a property value.",
    "view.noMatchingNotes": "No matching notes.",
    "settings.language.name": "Language",
    "settings.language.desc": "Set the display language for Property Folder.",
    "settings.language.zh": "中文",
    "settings.language.en": "English",
    "settings.autoApply.name": "Auto-apply parent properties",
    "settings.autoApply.desc": "When a child property value matches an enabled relation, add the configured parent property value.",
    "settings.folder.heading": "Folder filters",
    "settings.target.name": "Target folders",
    "settings.target.desc": "One vault-relative folder per line. Empty means all folders. Prefix matching only; glob patterns are not supported.",
    "settings.ignore.name": "Ignore folders",
    "settings.ignore.desc": "One vault-relative folder per line. Matching notes are excluded from the index and reconciliation.",
    "settings.relations.heading": "Relation mapping tables",
    "settings.seed.name": "Seed generic relations",
    "settings.seed.desc": "Add generic Area -> Task relations if they are missing.",
    "settings.seed.button": "Seed defaults",
    "settings.reconcile.name": "Reconcile Property Parents",
    "settings.reconcile.desc": "Backfill missing parent properties for existing notes in scope.",
    "settings.reconcile.button": "Run reconciliation",
    "settings.addTable.name": "Add parent property table",
    "settings.addTable.desc": "Create a new mapping table, then manage child property mapping rows inside it.",
    "settings.addTable.button": "Add table",
    "settings.noRelations": "No relations configured.",
    "settings.parentProperty": "Parent property",
    "settings.enabled": "Enabled",
    "settings.parentValue": "Parent value",
    "settings.childProperty": "Child property",
    "settings.childValue": "Child value",
    "settings.actions": "Actions",
    "settings.addChild": "Add child mapping",
    "settings.delete": "Delete",
    "settings.defaultParentProperty": "New parent property",
    "settings.defaultParentValue": "New parent value",
    "settings.defaultChildProperty": "Task",
    "settings.defaultChildValue": "New child value",
    "settings.lastSummary": "Last reconcile summary",
    "message.emptyRelation": "Relation fields cannot be empty.",
    "message.seeded": "Seeded {count} relation(s).",
    "message.reconcile": "Scanned {scanned}, updated {updated}, skipped {skipped}, failed {failed}.",
    "message.updateFailed": "Failed to update {path}. See the developer console for details."
  },
  zh: {
    "plugin.name": "Property Folder",
    "command.open": "打开 Property Folder",
    "command.reconcile": "回填上层属性",
    "view.refreshIndex": "刷新索引",
    "view.reconcileParents": "回填上层属性",
    "view.searchPlaceholder": "筛选属性或笔记",
    "view.noRelations": "当前索引里没有匹配的已启用映射。",
    "view.addRelationsHint": "请在设置页添加映射，或导入默认映射。",
    "view.selectProperty": "选择一个属性值。",
    "view.noMatchingNotes": "没有匹配笔记。",
    "settings.language.name": "语言",
    "settings.language.desc": "设置 Property Folder 的显示语言。",
    "settings.language.zh": "中文",
    "settings.language.en": "English",
    "settings.autoApply.name": "自动补上层属性",
    "settings.autoApply.desc": "当下层属性值命中已启用映射时，自动添加对应的上层属性值。",
    "settings.folder.heading": "文件夹过滤",
    "settings.target.name": "目标文件夹",
    "settings.target.desc": "每行一个 vault 相对文件夹。留空表示全部文件夹。仅支持前缀匹配，不支持 glob。",
    "settings.ignore.name": "忽略文件夹",
    "settings.ignore.desc": "每行一个 vault 相对文件夹。匹配的笔记会排除在索引和回填之外。",
    "settings.relations.heading": "关系映射表",
    "settings.seed.name": "导入通用映射",
    "settings.seed.desc": "如果缺失，添加通用的 Area -> Task 映射。",
    "settings.seed.button": "导入默认",
    "settings.reconcile.name": "回填上层属性",
    "settings.reconcile.desc": "为范围内已有笔记补齐缺失的上层属性。",
    "settings.reconcile.button": "运行回填",
    "settings.addTable.name": "新增 parent property 映射表",
    "settings.addTable.desc": "创建一个新的映射表，再在表内维护 child property 映射行。",
    "settings.addTable.button": "新增映射表",
    "settings.noRelations": "还没有配置映射。",
    "settings.parentProperty": "Parent property",
    "settings.enabled": "启用",
    "settings.parentValue": "Parent value",
    "settings.childProperty": "Child property",
    "settings.childValue": "Child value",
    "settings.actions": "操作",
    "settings.addChild": "新增 child 映射",
    "settings.delete": "删除",
    "settings.defaultParentProperty": "未命名Parent",
    "settings.defaultParentValue": "未命名上层",
    "settings.defaultChildProperty": "Task",
    "settings.defaultChildValue": "未命名下层",
    "settings.lastSummary": "上次回填结果",
    "message.emptyRelation": "映射字段不能为空。",
    "message.seeded": "已导入 {count} 条映射。",
    "message.reconcile": "扫描 {scanned}，更新 {updated}，跳过 {skipped}，失败 {failed}。",
    "message.updateFailed": "更新 {path} 失败。请查看开发者控制台。"
  }
};

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizePath(path: string): string {
  return normalizeText(path).replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

function coerceStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean);
  if (typeof value === "string") return value.split(/\r?\n|,/).map(normalizeText).filter(Boolean);
  return fallback.slice();
}

function cloneRelation(relation: Partial<Relation> | null | undefined): Relation {
  return {
    parentProperty: normalizeText(relation?.parentProperty),
    parentValue: normalizeText(relation?.parentValue),
    childProperty: normalizeText(relation?.childProperty),
    childValue: normalizeText(relation?.childValue),
    enabled: relation?.enabled === false ? false : true
  };
}

function sanitizeSettings(data: Partial<Settings> | null | undefined): Settings {
  return {
    relations: Array.isArray(data?.relations) ? data.relations.map(cloneRelation) : DEFAULT_SETTINGS.relations.map(cloneRelation),
    autoApplyParents: typeof data?.autoApplyParents === "boolean" ? data.autoApplyParents : DEFAULT_SETTINGS.autoApplyParents,
    targetFolders: Object.prototype.hasOwnProperty.call(data || {}, "targetFolders") ? coerceStringArray(data?.targetFolders, []) : DEFAULT_SETTINGS.targetFolders.slice(),
    ignoreFolders: Object.prototype.hasOwnProperty.call(data || {}, "ignoreFolders") ? coerceStringArray(data?.ignoreFolders, DEFAULT_SETTINGS.ignoreFolders) : DEFAULT_SETTINGS.ignoreFolders.slice(),
    language: data?.language === "zh" ? "zh" : "en"
  };
}

function relationIsComplete(relation: Relation): boolean {
  return Boolean(relation.parentProperty && relation.parentValue && relation.childProperty && relation.childValue);
}

function relationKey(property: string, value: string): string {
  return `${normalizeText(property)}\u0000${normalizeText(value)}`;
}

function childRelationKey(relation: Relation): string {
  return [
    normalizeText(relation.parentProperty),
    normalizeText(relation.parentValue),
    normalizeText(relation.childProperty),
    normalizeText(relation.childValue)
  ].join("\u0000");
}

function normalizeFrontmatterValues(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map(normalizeText).filter(Boolean);
}

function frontmatterHasValue(frontmatter: Record<string, unknown>, property: string, value: string): boolean {
  return normalizeFrontmatterValues(frontmatter[property]).includes(normalizeText(value));
}

function normalizedRawParentItems(value: unknown): unknown[] {
  const raw = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
  const seen = new Set<string>();
  const result: unknown[] = [];
  for (const item of raw) {
    const normalizedValue = normalizeText(item);
    if (!normalizedValue || seen.has(normalizedValue)) continue;
    seen.add(normalizedValue);
    result.push(item);
  }
  return result;
}

function buildUpdatedParentValue(currentValue: unknown, valuesToAdd: string[]): { changed: boolean; value: unknown } {
  const existingTokens = new Set(normalizeFrontmatterValues(currentValue));
  const missing: string[] = [];
  for (const value of valuesToAdd) {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue || existingTokens.has(normalizedValue)) continue;
    existingTokens.add(normalizedValue);
    missing.push(normalizedValue);
  }

  if (missing.length === 0) return { changed: false, value: currentValue };

  if (Array.isArray(currentValue)) {
    return { changed: true, value: normalizedRawParentItems(currentValue).concat(missing) };
  }

  const existingItems = normalizedRawParentItems(currentValue);
  if (existingItems.length === 0) {
    return { changed: true, value: missing.length === 1 ? missing[0] : missing.slice() };
  }

  return { changed: true, value: existingItems.concat(missing) };
}

function displayValue(value: unknown): string {
  return normalizeText(value) || "(empty)";
}

export default class PropertyFolderPlugin extends Plugin {
  settings: Settings;
  index: Map<string, IndexedRecord>;
  processingPaths: Set<string>;
  viewInstances: Set<PropertyFolderView>;
  pendingTimeouts: Set<number>;
  startupComplete: boolean;
  lastReconcileSummary: string;
  lastSettingsMessage: string;

  async onload() {
    this.index = new Map();
    this.processingPaths = new Set();
    this.viewInstances = new Set();
    this.pendingTimeouts = new Set();
    this.startupComplete = false;
    this.lastReconcileSummary = "";
    this.lastSettingsMessage = "";

    await this.loadSettings();

    this.registerView(VIEW_TYPE_PROPERTY_FOLDER, (leaf) => new PropertyFolderView(leaf, this));
    this.addRibbonIcon("tags", this.t("command.open"), () => {
      void this.activateView();
    });

    this.addCommand({ id: "open-property-folder", name: this.t("command.open"), callback: () => this.activateView() });
    this.addCommand({ id: "reconcile-property-parents", name: this.t("command.reconcile"), callback: () => this.reconcileParents() });
    this.addSettingTab(new PropertyFolderSettingTab(this.app, this));

    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      if (file instanceof TFile) void this.handleMetadataChanged(file);
    }));
    this.registerEvent(this.app.vault.on("create", (file) => {
      if (file instanceof TFile) {
        this.updateFileIndex(file);
        this.refreshViews();
      }
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      this.index.delete(oldPath);
      if (file instanceof TFile) this.updateFileIndex(file);
      this.refreshViews();
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (file instanceof TFile) {
        this.index.delete(file.path);
        this.refreshViews();
      }
    }));

    this.buildFullIndex();
    this.startupComplete = true;
  }

  onunload() {
    for (const timeoutId of this.pendingTimeouts) window.clearTimeout(timeoutId);
    this.pendingTimeouts.clear();
    this.viewInstances.clear();
  }

  async loadSettings() {
    this.settings = sanitizeSettings(await this.loadData());
  }

  t(key: string, values?: Record<string, unknown>): string {
    const language = this.settings?.language === "zh" ? "zh" : "en";
    const template = STRINGS[language][key] || STRINGS.en[key] || key;
    return template.replace(/\{(\w+)\}/g, (_, name) => values?.[name] === undefined ? "" : String(values[name]));
  }

  async saveSettingsAndRefresh() {
    this.settings = sanitizeSettings(this.settings);
    await this.saveData(this.settings);
    this.buildFullIndex();
    this.refreshViews();
  }

  getEnabledRelations(): Relation[] {
    return this.settings.relations.map(cloneRelation).filter((relation) => relation.enabled !== false && relationIsComplete(relation));
  }

  normalizeFolders(folders: string[]): string[] {
    return folders.map(normalizePath).filter(Boolean);
  }

  pathStartsWithFolder(filePath: string, folderPath: string): boolean {
    const normalizedFile = normalizePath(filePath);
    const normalizedFolder = normalizePath(folderPath);
    return normalizedFile === normalizedFolder || normalizedFile.startsWith(`${normalizedFolder}/`);
  }

  isPathInScope(filePath: string): boolean {
    const targetFolders = this.normalizeFolders(this.settings.targetFolders);
    const ignoreFolders = this.normalizeFolders(this.settings.ignoreFolders);
    const inTarget = targetFolders.length === 0 || targetFolders.some((folder) => this.pathStartsWithFolder(filePath, folder));
    const ignored = ignoreFolders.some((folder) => this.pathStartsWithFolder(filePath, folder));
    return inTarget && !ignored;
  }

  isMarkdownFile(file: unknown): file is TFile {
    return file instanceof TFile && file.extension === "md";
  }

  buildFullIndex() {
    this.index.clear();
    for (const file of this.app.vault.getMarkdownFiles()) this.updateFileIndex(file);
  }

  updateFileIndex(file: TFile) {
    if (!this.isMarkdownFile(file) || !this.isPathInScope(file.path)) {
      this.index.delete(file.path);
      return;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    this.index.set(file.path, {
      file,
      path: file.path,
      basename: file.basename,
      frontmatter: cache?.frontmatter || {}
    });
  }

  scheduleIndexUpdate(file: TFile, delay = 200) {
    const timeoutId = window.setTimeout(() => {
      this.pendingTimeouts.delete(timeoutId);
      if (this.isMarkdownFile(file)) {
        this.updateFileIndex(file);
        this.refreshViews();
      }
    }, delay);
    this.pendingTimeouts.add(timeoutId);
  }

  async handleMetadataChanged(file: TFile) {
    if (!this.isMarkdownFile(file)) return;
    if (this.processingPaths.has(file.path)) return;

    if (!this.isPathInScope(file.path)) {
      this.index.delete(file.path);
      this.refreshViews();
      return;
    }

    this.updateFileIndex(file);
    this.refreshViews();

    if (!this.startupComplete || this.settings.autoApplyParents === false) return;
    await this.applyParentRelations(file, "auto");
  }

  determineParentAdditions(frontmatter: Record<string, unknown>): Map<string, string[]> {
    const additionsByParent = new Map<string, string[]>();

    for (const relation of this.getEnabledRelations()) {
      if (!frontmatterHasValue(frontmatter, relation.childProperty, relation.childValue)) continue;

      const parentTokens = new Set(normalizeFrontmatterValues(frontmatter[relation.parentProperty]));
      const parentValue = normalizeText(relation.parentValue);
      if (!parentValue || parentTokens.has(parentValue)) continue;

      if (!additionsByParent.has(relation.parentProperty)) additionsByParent.set(relation.parentProperty, []);
      const additions = additionsByParent.get(relation.parentProperty);
      if (additions && !additions.map(normalizeText).includes(parentValue)) additions.push(parentValue);
    }

    return additionsByParent;
  }

  hasMissingParents(file: TFile): boolean {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter || {};
    return this.determineParentAdditions(frontmatter).size > 0;
  }

  async applyParentRelations(file: TFile, source: string): Promise<{ status: "updated" | "skipped" | "failed"; error?: string }> {
    if (!this.isMarkdownFile(file) || !this.isPathInScope(file.path)) return { status: "skipped" };
    if (this.processingPaths.has(file.path)) return { status: "skipped" };
    if (!this.hasMissingParents(file)) return { status: "skipped" };

    this.processingPaths.add(file.path);
    let wrote = false;

    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        const additionsByParent = this.determineParentAdditions(frontmatter);
        if (additionsByParent.size === 0) return;

        for (const [parentProperty, valuesToAdd] of additionsByParent.entries()) {
          const updated = buildUpdatedParentValue(frontmatter[parentProperty], valuesToAdd);
          if (updated.changed) {
            frontmatter[parentProperty] = updated.value;
            wrote = true;
          }
        }
      });

      this.scheduleIndexUpdate(file);
      return { status: wrote ? "updated" : "skipped" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Property Folder] Failed to ${source} parent properties for ${file.path}`, error);
      this.lastSettingsMessage = this.t("message.updateFailed", { path: file.path });
      return { status: "failed", error: message };
    } finally {
      this.processingPaths.delete(file.path);
    }
  }

  async reconcileParents() {
    const summary = { scanned: 0, updated: 0, skipped: 0, failed: 0 };
    const failures: { path: string; error: string }[] = [];
    const files = this.app.vault.getMarkdownFiles().filter((file) => this.isPathInScope(file.path));

    for (const file of files) {
      summary.scanned += 1;
      const result = await this.applyParentRelations(file, "reconcile");
      if (result.status === "updated") summary.updated += 1;
      if (result.status === "skipped") summary.skipped += 1;
      if (result.status === "failed") {
        summary.failed += 1;
        failures.push({ path: file.path, error: result.error || "Unknown error" });
      }
    }

    if (failures.length > 0) console.error("[Property Folder] Reconciliation failures", failures);
    this.lastReconcileSummary = this.t("message.reconcile", summary);
    this.buildFullIndex();
    this.refreshViews();
    return summary;
  }

  buildTree(searchText: string): TreeParent[] {
    const query = normalizeText(searchText).toLowerCase();
    const parents = new Map<string, Omit<TreeParent, "children"> & { children: Map<string, TreeChild> }>();

    for (const relation of this.getEnabledRelations()) {
      const parentKey = relationKey(relation.parentProperty, relation.parentValue);
      if (!parents.has(parentKey)) {
        parents.set(parentKey, {
          key: parentKey,
          property: relation.parentProperty,
          value: relation.parentValue,
          paths: new Set(),
          children: new Map()
        });
      }

      const parent = parents.get(parentKey);
      if (!parent) continue;
      const childKey = childRelationKey(relation);
      if (!parent.children.has(childKey)) {
        parent.children.set(childKey, {
          key: childKey,
          property: relation.childProperty,
          value: relation.childValue,
          paths: new Set()
        });
      }

      const child = parent.children.get(childKey);
      if (!child) continue;
      for (const record of this.index.values()) {
        if (frontmatterHasValue(record.frontmatter, relation.childProperty, relation.childValue)) {
          child.paths.add(record.path);
          parent.paths.add(record.path);
        }
      }
    }

    return Array.from(parents.values())
      .map((parent) => ({
        ...parent,
        children: Array.from(parent.children.values()).sort((a, b) => a.value.localeCompare(b.value))
      }))
      .filter((parent) => {
        if (!query) return true;
        const parentLabel = `${parent.property} ${parent.value}`.toLowerCase();
        const childHit = parent.children.some((child) => `${child.property} ${child.value}`.toLowerCase().includes(query));
        const noteHit = Array.from(parent.paths).some((path) => path.toLowerCase().includes(query));
        return parentLabel.includes(query) || childHit || noteHit;
      })
      .sort((a, b) => a.value.localeCompare(b.value));
  }

  getRecordsForPaths(paths: Set<string>): IndexedRecord[] {
    return Array.from(paths)
      .map((path) => this.index.get(path))
      .filter(Boolean)
      .sort((a, b) => a.basename.localeCompare(b.basename) || a.path.localeCompare(b.path));
  }

  registerViewInstance(view: PropertyFolderView) {
    this.viewInstances.add(view);
  }

  unregisterViewInstance(view: PropertyFolderView) {
    this.viewInstances.delete(view);
  }

  refreshViews() {
    for (const view of this.viewInstances) view.refresh();
  }

  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_PROPERTY_FOLDER)[0];
    if (!leaf) leaf = this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE_PROPERTY_FOLDER, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  async seedInitialRelations() {
    const existing = new Set(this.settings.relations.map((relation) => childRelationKey(cloneRelation(relation))));
    let added = 0;
    for (const relation of SEEDED_RELATIONS) {
      const cloned = cloneRelation(relation);
      if (existing.has(childRelationKey(cloned))) continue;
      this.settings.relations.push(cloned);
      existing.add(childRelationKey(cloned));
      added += 1;
    }
    this.lastSettingsMessage = this.t("message.seeded", { count: added });
    await this.saveSettingsAndRefresh();
  }
}

class PropertyFolderView extends ItemView {
  plugin: PropertyFolderPlugin;
  searchText = "";
  selected: Selection | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: PropertyFolderPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_PROPERTY_FOLDER;
  }

  getDisplayText() {
    return this.plugin.t("plugin.name");
  }

  getIcon() {
    return "tags";
  }

  async onOpen() {
    this.plugin.registerViewInstance(this);
    this.render();
  }

  async onClose() {
    this.plugin.unregisterViewInstance(this);
  }

  refresh() {
    this.render();
  }

  render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("property-folder-view");

    const header = container.createDiv({ cls: "property-folder-header" });
    header.createEl("h4", { text: this.plugin.t("plugin.name") });
    const actions = header.createDiv({ cls: "property-folder-actions" });

    const refreshButton = actions.createEl("button", { cls: "clickable-icon property-folder-icon-button", attr: { "aria-label": this.plugin.t("view.refreshIndex") } });
    setIcon(refreshButton, "refresh-cw");
    refreshButton.addEventListener("click", () => {
      this.plugin.buildFullIndex();
      this.plugin.refreshViews();
    });

    const reconcileButton = actions.createEl("button", { cls: "clickable-icon property-folder-icon-button", attr: { "aria-label": this.plugin.t("view.reconcileParents") } });
    setIcon(reconcileButton, "git-merge");
    reconcileButton.addEventListener("click", () => {
      void this.plugin.reconcileParents();
    });

    const search = container.createEl("input", {
      cls: "property-folder-search",
      attr: { type: "search", placeholder: this.plugin.t("view.searchPlaceholder") }
    });
    search.value = this.searchText;
    search.addEventListener("input", (event) => {
      this.searchText = (event.target as HTMLInputElement).value;
      this.render();
    });

    const tree = this.plugin.buildTree(this.searchText);
    if (!this.selected || !this.selectionExists(this.selected, tree)) {
      this.selected = tree.length > 0 ? { type: "parent", key: tree[0].key } : null;
    }

    const body = container.createDiv({ cls: "property-folder-body" });
    const treeEl = body.createDiv({ cls: "property-folder-tree" });
    const notesEl = body.createDiv({ cls: "property-folder-notes" });

    if (tree.length === 0) {
      treeEl.createDiv({ cls: "property-folder-empty", text: this.plugin.t("view.noRelations") });
      notesEl.createDiv({ cls: "property-folder-empty", text: this.plugin.t("view.addRelationsHint") });
      return;
    }

    for (const parent of tree) this.renderParent(treeEl, parent);
    this.renderNotes(notesEl, tree);
  }

  selectionExists(selection: Selection, tree: TreeParent[]) {
    for (const parent of tree) {
      if (selection.type === "parent" && selection.key === parent.key) return true;
      if (selection.type === "child" && parent.children.some((child) => child.key === selection.key)) return true;
    }
    return false;
  }

  renderParent(container: HTMLElement, parent: TreeParent) {
    const parentRow = container.createDiv({
      cls: `property-folder-row property-folder-parent ${this.selected?.key === parent.key ? "is-selected" : ""}`
    });
    const label = parentRow.createDiv({ cls: "property-folder-row-label" });
    label.createSpan({ cls: "property-folder-property", text: `${parent.property}: ` });
    label.createSpan({ cls: "property-folder-value", text: displayValue(parent.value) });
    parentRow.createSpan({ cls: "property-folder-count", text: String(parent.paths.size) });
    parentRow.addEventListener("click", () => {
      this.selected = { type: "parent", key: parent.key };
      this.render();
    });

    const childList = container.createDiv({ cls: "property-folder-child-list" });
    for (const child of parent.children) {
      const childRow = childList.createDiv({
        cls: `property-folder-row property-folder-child ${this.selected?.key === child.key ? "is-selected" : ""}`
      });
      const childLabel = childRow.createDiv({ cls: "property-folder-row-label" });
      childLabel.createSpan({ cls: "property-folder-property", text: `${child.property}: ` });
      childLabel.createSpan({ cls: "property-folder-value", text: displayValue(child.value) });
      childRow.createSpan({ cls: "property-folder-count", text: String(child.paths.size) });
      childRow.addEventListener("click", (event) => {
        event.stopPropagation();
        this.selected = { type: "child", key: child.key };
        this.render();
      });
    }
  }

  renderNotes(container: HTMLElement, tree: TreeParent[]) {
    const selection = this.getSelectedNode(tree);
    if (!selection) {
      container.createDiv({ cls: "property-folder-empty", text: this.plugin.t("view.selectProperty") });
      return;
    }

    const title = container.createDiv({ cls: "property-folder-notes-title" });
    title.createSpan({ text: `${selection.property}: ${displayValue(selection.value)}` });
    title.createSpan({ cls: "property-folder-count", text: String(selection.paths.size) });

    const records = this.plugin.getRecordsForPaths(selection.paths);
    if (records.length === 0) {
      container.createDiv({ cls: "property-folder-empty", text: this.plugin.t("view.noMatchingNotes") });
      return;
    }

    for (const record of records) {
      const note = container.createDiv({ cls: "property-folder-note" });
      note.createDiv({ cls: "property-folder-note-title", text: record.basename });
      note.createDiv({ cls: "property-folder-note-path", text: record.path });
      note.addEventListener("click", () => {
        void this.app.workspace.getLeaf(false).openFile(record.file);
      });
    }
  }

  getSelectedNode(tree: TreeParent[]): TreeParent | TreeChild | null {
    if (!this.selected) return null;
    for (const parent of tree) {
      if (this.selected.type === "parent" && this.selected.key === parent.key) return parent;
      if (this.selected.type === "child") {
        const child = parent.children.find((candidate) => candidate.key === this.selected?.key);
        if (child) return child;
      }
    }
    return null;
  }
}

class PropertyFolderSettingTab extends PluginSettingTab {
  plugin: PropertyFolderPlugin;

  constructor(app: PropertyFolderPlugin["app"], plugin: PropertyFolderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("property-folder-settings");

    containerEl.createEl("h2", { text: this.plugin.t("plugin.name") });

    if (this.plugin.lastSettingsMessage) {
      containerEl.createDiv({ cls: "property-folder-empty", text: this.plugin.lastSettingsMessage });
    }

    if (this.plugin.lastReconcileSummary) {
      new Setting(containerEl)
        .setName(this.plugin.t("settings.lastSummary"))
        .setDesc(this.plugin.lastReconcileSummary);
    }

    new Setting(containerEl)
      .setName(this.plugin.t("settings.language.name"))
      .setDesc(this.plugin.t("settings.language.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("en", this.plugin.t("settings.language.en"))
          .addOption("zh", this.plugin.t("settings.language.zh"))
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value === "zh" ? "zh" : "en";
            await this.plugin.saveSettingsAndRefresh();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("settings.autoApply.name"))
      .setDesc(this.plugin.t("settings.autoApply.desc"))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoApplyParents !== false);
        toggle.onChange(async (value) => {
          this.plugin.settings.autoApplyParents = value;
          await this.plugin.saveSettingsAndRefresh();
          this.display();
        });
      });

    this.renderFolderSettings(containerEl);
    this.renderRelationControls(containerEl);
    this.renderRelations(containerEl);
  }

  renderFolderSettings(containerEl: HTMLElement) {
    new Setting(containerEl).setName(this.plugin.t("settings.folder.heading")).setHeading();

    new Setting(containerEl)
      .setName(this.plugin.t("settings.target.name"))
      .setDesc(this.plugin.t("settings.target.desc"))
      .addTextArea((text) => {
        text.setValue(this.plugin.settings.targetFolders.join("\n"));
        text.inputEl.rows = 3;
        text.onChange(async (value) => {
          this.plugin.settings.targetFolders = coerceStringArray(value, []);
          await this.plugin.saveSettingsAndRefresh();
        });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("settings.ignore.name"))
      .setDesc(this.plugin.t("settings.ignore.desc"))
      .addTextArea((text) => {
        text.setValue(this.plugin.settings.ignoreFolders.join("\n"));
        text.inputEl.rows = 3;
        text.onChange(async (value) => {
          this.plugin.settings.ignoreFolders = coerceStringArray(value, []);
          await this.plugin.saveSettingsAndRefresh();
        });
      });
  }

  renderRelationControls(containerEl: HTMLElement) {
    new Setting(containerEl).setName(this.plugin.t("settings.relations.heading")).setHeading();

    new Setting(containerEl)
      .setName(this.plugin.t("settings.seed.name"))
      .setDesc(this.plugin.t("settings.seed.desc"))
      .addButton((button) => {
        button.setButtonText(this.plugin.t("settings.seed.button"));
        button.onClick(async () => {
          await this.plugin.seedInitialRelations();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("settings.reconcile.name"))
      .setDesc(this.plugin.t("settings.reconcile.desc"))
      .addButton((button) => {
        button.setButtonText(this.plugin.t("settings.reconcile.button"));
        button.setCta();
        button.onClick(async () => {
          await this.plugin.reconcileParents();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName(this.plugin.t("settings.addTable.name"))
      .setDesc(this.plugin.t("settings.addTable.desc"))
      .addButton((button) => {
        button.setButtonText(this.plugin.t("settings.addTable.button"));
        button.onClick(async () => {
          this.plugin.settings.relations.push({
            parentProperty: this.uniqueDefaultParentProperty(),
            parentValue: this.plugin.t("settings.defaultParentValue"),
            childProperty: this.plugin.t("settings.defaultChildProperty"),
            childValue: this.plugin.t("settings.defaultChildValue"),
            enabled: true
          });
          await this.plugin.saveSettingsAndRefresh();
          this.display();
        });
      });
  }

  renderRelations(containerEl: HTMLElement) {
    const relationsContainer = containerEl.createDiv({ cls: "property-folder-relations" });
    if (this.plugin.settings.relations.length === 0) {
      relationsContainer.createDiv({ cls: "property-folder-empty", text: this.plugin.t("settings.noRelations") });
      return;
    }

    for (const group of this.getRelationGroups()) this.renderRelationGroup(relationsContainer, group);
  }

  getRelationGroups(): { parentProperty: string; indices: number[]; relations: { index: number; relation: Relation }[] }[] {
    const groups: { parentProperty: string; indices: number[]; relations: { index: number; relation: Relation }[] }[] = [];
    const byParentProperty = new Map<string, { parentProperty: string; indices: number[]; relations: { index: number; relation: Relation }[] }>();

    this.plugin.settings.relations.forEach((relation, index) => {
      const normalized = cloneRelation(relation);
      const parentProperty = normalized.parentProperty || "(empty)";
      if (!byParentProperty.has(parentProperty)) {
        const group = { parentProperty, indices: [], relations: [] };
        byParentProperty.set(parentProperty, group);
        groups.push(group);
      }
      const group = byParentProperty.get(parentProperty);
      if (!group) return;
      group.indices.push(index);
      group.relations.push({ index, relation: normalized });
    });

    return groups;
  }

  renderRelationGroup(container: HTMLElement, group: { parentProperty: string; indices: number[]; relations: { index: number; relation: Relation }[] }) {
    const card = container.createDiv({ cls: "property-folder-relation-card property-folder-relation-group" });
    const header = card.createDiv({ cls: "property-folder-relation-group-header" });
    this.addRelationText(header, this.plugin.t("settings.parentProperty"), group.parentProperty === "(empty)" ? "" : group.parentProperty, async (value) => {
      await this.updateGroupParentProperty(group.indices, value);
    });

    const addButton = header.createEl("button", { text: this.plugin.t("settings.addChild") });
    addButton.addEventListener("click", () => {
      void this.addChildRelation(group.parentProperty);
    });

    const table = card.createEl("table", { cls: "property-folder-relation-table" });
    const thead = table.createEl("thead");
    const headRow = thead.createEl("tr");
    [
      this.plugin.t("settings.enabled"),
      this.plugin.t("settings.parentValue"),
      this.plugin.t("settings.childProperty"),
      this.plugin.t("settings.childValue"),
      this.plugin.t("settings.actions")
    ].forEach((label) => headRow.createEl("th", { text: label }));

    const tbody = table.createEl("tbody");
    group.relations.forEach(({ index, relation }) => {
      const tr = tbody.createEl("tr");
      const enabledCell = tr.createEl("td");
      const enabled = enabledCell.createEl("input", { attr: { type: "checkbox" } });
      enabled.checked = relation.enabled !== false;
      enabled.addEventListener("change", () => {
        void this.updateRelation(index, { enabled: enabled.checked });
      });

      this.addTableTextCell(tr, relation.parentValue, async (value) => this.updateRelation(index, { parentValue: value }));
      this.addTableTextCell(tr, relation.childProperty, async (value) => this.updateRelation(index, { childProperty: value }));
      this.addTableTextCell(tr, relation.childValue, async (value) => this.updateRelation(index, { childValue: value }));

      const actionCell = tr.createEl("td");
      const deleteButton = actionCell.createEl("button", { text: this.plugin.t("settings.delete") });
      deleteButton.addClass("mod-warning");
      deleteButton.addEventListener("click", () => {
        void this.deleteRelation(index);
      });

      if (!relationIsComplete(relation)) tr.addClass("is-invalid");
    });
  }

  addRelationText(container: HTMLElement, label: string, value: string, onChange: (value: string) => Promise<void>) {
    const field = container.createDiv({ cls: "property-folder-relation-field" });
    field.createEl("label", { text: label });
    const input = field.createEl("input", { attr: { type: "text" } });
    input.value = value;
    input.addEventListener("change", () => {
      void onChange(input.value);
    });
  }

  addTableTextCell(row: HTMLElement, value: string, onChange: (value: string) => Promise<void>) {
    const cell = row.createEl("td");
    const input = cell.createEl("input", { attr: { type: "text" } });
    input.value = value;
    input.addEventListener("change", () => {
      void onChange(input.value);
    });
  }

  async addChildRelation(parentProperty: string) {
    const normalizedParentProperty = normalizeText(parentProperty);
    if (!normalizedParentProperty || normalizedParentProperty === "(empty)") {
      this.plugin.lastSettingsMessage = this.plugin.t("message.emptyRelation");
      this.display();
      return;
    }

    this.plugin.settings.relations.push({
      parentProperty: normalizedParentProperty,
      parentValue: this.plugin.t("settings.defaultParentValue"),
      childProperty: this.plugin.t("settings.defaultChildProperty"),
      childValue: this.plugin.t("settings.defaultChildValue"),
      enabled: true
    });
    await this.plugin.saveSettingsAndRefresh();
    this.display();
  }

  async deleteRelation(index: number) {
    this.plugin.settings.relations.splice(index, 1);
    await this.plugin.saveSettingsAndRefresh();
    this.display();
  }

  uniqueDefaultParentProperty(): string {
    const base = this.plugin.t("settings.defaultParentProperty");
    const existing = new Set(this.plugin.settings.relations.map((relation) => normalizeText(relation.parentProperty)));
    if (!existing.has(base)) return base;
    let counter = 2;
    while (existing.has(`${base} ${counter}`)) counter += 1;
    return `${base} ${counter}`;
  }

  async updateGroupParentProperty(indices: number[], value: string) {
    const parentProperty = normalizeText(value);
    if (!parentProperty) {
      this.plugin.lastSettingsMessage = this.plugin.t("message.emptyRelation");
      this.display();
      return;
    }

    for (const index of indices) {
      const existing = this.plugin.settings.relations[index];
      if (!existing) continue;
      this.plugin.settings.relations[index] = cloneRelation({ ...existing, parentProperty });
    }
    await this.plugin.saveSettingsAndRefresh();
    this.display();
  }

  async updateRelation(index: number, patch: Partial<Relation>) {
    const existing = this.plugin.settings.relations[index];
    if (!existing) return;

    const next = cloneRelation({ ...existing, ...patch });
    if (!relationIsComplete(next)) {
      this.plugin.lastSettingsMessage = this.plugin.t("message.emptyRelation");
      this.display();
      return;
    }

    this.plugin.settings.relations[index] = next;
    await this.plugin.saveSettingsAndRefresh();
    this.display();
  }
}
