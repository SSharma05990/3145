const STORAGE_KEY = "kitchen-stockflow-state-v8";
const MITHAI_DELIVERY_LEAD_DAYS = 7;
const MITHAI_SAFETY_BUFFER = 1;
const SUPABASE_URL = window.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";
const supabaseClient = window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("PASTE_")
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
const DEFAULT_CATEGORIES = [
  "Mithai",
  "Produce",
  "Dairy",
  "Curries",
  "Snacks",
  "Dessert",
  "Grocery",
  "Janitorial",
  "Take Out Containers",
  "Sauces"
];
const TYPE_CONFIG = {
  white_box: {
    label: "White Box",
    unit: "white box",
    priceBasis: "per_lb",
    allowedPriceBasis: ["per_lb"],
    minOrder: 1,
    fractionMode: "container",
    weightFieldLabel: "LB per white box",
    showWeightField: true,
    showPiecesField: false,
    extraFieldLabel: ""
  },
  bucket: {
    label: "Bucket",
    unit: "bucket",
    priceBasis: "per_lb",
    allowedPriceBasis: ["per_lb", "per_bucket"],
    minOrder: 1,
    fractionMode: "container",
    weightFieldLabel: "LB per bucket",
    showWeightField: true,
    showPiecesField: false,
    extraFieldLabel: ""
  },
  box: {
    label: "Box",
    unit: "box",
    priceBasis: "per_lb",
    allowedPriceBasis: ["per_lb", "per_box"],
    minOrder: 1,
    fractionMode: "container",
    weightFieldLabel: "LB per box",
    showWeightField: true,
    showPiecesField: false,
    extraFieldLabel: ""
  },
  weight: {
    label: "Weight",
    unit: "lb",
    priceBasis: "per_weight_unit",
    allowedPriceBasis: ["per_weight_unit"],
    minOrder: 0.25,
    fractionMode: "weight",
    weightFieldLabel: "",
    showWeightField: false,
    showPiecesField: false,
    extraFieldLabel: ""
  },
  packet: {
    label: "Packet",
    unit: "packet",
    priceBasis: "per_packet",
    allowedPriceBasis: ["per_packet"],
    minOrder: 1,
    fractionMode: "packet",
    weightFieldLabel: "Weight per packet",
    showWeightField: true,
    showPiecesField: true,
    extraFieldLabel: "Pieces per packet"
  },
  single_count: {
    label: "Single Count",
    unit: "piece",
    priceBasis: "per_piece",
    allowedPriceBasis: ["per_piece"],
    minOrder: 1,
    fractionMode: "count",
    weightFieldLabel: "",
    showWeightField: false,
    showPiecesField: false,
    extraFieldLabel: ""
  }
};

const state = loadState();
let realtimeChannel = null;
let refreshTimer = null;

const refs = {
  loginOverlay: document.getElementById("loginOverlay"),
  loginForm: document.getElementById("loginForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginMessage: document.getElementById("loginMessage"),
  sessionRoleLabel: document.getElementById("sessionRoleLabel"),
  logoutBtn: document.getElementById("logoutBtn"),
  navLinks: [...document.querySelectorAll(".nav-link")],
  views: [...document.querySelectorAll(".view")],
  heroMetrics: document.getElementById("heroMetrics"),
  topReorderList: document.getElementById("topReorderList"),
  topUsageList: document.getElementById("topUsageList"),
  topWasteList: document.getElementById("topWasteList"),
  businessDayLabel: document.getElementById("businessDayLabel"),
  currentDayTitle: document.getElementById("currentDayTitle"),
  dayStatusCopy: document.getElementById("dayStatusCopy"),
  prevBusinessDayBtn: document.getElementById("prevBusinessDayBtn"),
  nextBusinessDayBtn: document.getElementById("nextBusinessDayBtn"),
  dayTypeSelect: document.getElementById("dayTypeSelect"),
  specialDayTagSelect: document.getElementById("specialDayTagSelect"),
  specialEventNameInput: document.getElementById("specialEventNameInput"),
  nextBusinessDayInput: document.getElementById("nextBusinessDayInput"),
  setBusinessDayBtn: document.getElementById("setBusinessDayBtn"),
  closeDayBtn: document.getElementById("closeDayBtn"),
  dayClosureSummary: document.getElementById("dayClosureSummary"),
  forecastSummary: document.getElementById("forecastSummary"),
  forecastCards: document.getElementById("forecastCards"),
  catalogQuickStats: document.getElementById("catalogQuickStats"),
  inventoryCards: document.getElementById("inventoryCards"),
  inventoryTableBody: document.getElementById("inventoryTableBody"),
  orderingList: document.getElementById("orderingList"),
  orderingSummary: document.getElementById("orderingSummary"),
  tabletItems: document.getElementById("tabletItems"),
  recentEntries: document.getElementById("recentEntries"),
  dailySpentList: document.getElementById("dailySpentList"),
  dailyCostSummary: document.getElementById("dailyCostSummary"),
  dailyWasteList: document.getElementById("dailyWasteList"),
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  inventoryViewFilter: document.getElementById("inventoryViewFilter"),
  exportExcelBtn: document.getElementById("exportExcelBtn"),
  tabletSearch: document.getElementById("tabletSearch"),
  tabletLogoutBtn: document.getElementById("tabletLogoutBtn"),
  tabletModeBtn: document.getElementById("tabletModeBtn"),
  addCategoryForm: document.getElementById("addCategoryForm"),
  newCategoryName: document.getElementById("newCategoryName"),
  categoryChips: document.getElementById("categoryChips"),
  addProductForm: document.getElementById("addProductForm"),
  productCategory: document.getElementById("productCategory"),
  productUnitType: document.getElementById("productUnitType"),
  productPriceBasis: document.getElementById("productPriceBasis"),
  productPrice: document.getElementById("productPrice"),
  productOnHand: document.getElementById("productOnHand"),
  productIdeal: document.getElementById("productIdeal"),
  productPriceBasisWrap: document.getElementById("productPriceBasisWrap"),
  productWeightWrap: document.getElementById("productWeightWrap"),
  productPiecesWrap: document.getElementById("productPiecesWrap"),
  productWeightPerBox: document.getElementById("productWeightPerBox"),
  productPiecesPerBox: document.getElementById("productPiecesPerBox"),
  importCsvBtn: document.getElementById("importCsvBtn"),
  csvInput: document.getElementById("csvInput"),
  emptyStateTemplate: document.getElementById("emptyStateTemplate")
};

let filters = {
  search: "",
  category: "All",
  inventoryView: "all",
  tabletSearch: ""
};

bindEvents();
syncProductTypeForm();
renderApp();
initializeRemoteApp();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        items: Array.isArray(parsed.items) ? parsed.items.map(normalizeItem) : [],
        entries: Array.isArray(parsed.entries) ? parsed.entries.map(normalizeEntry) : [],
        currentDay: parsed.currentDay || getTodayIso(),
        closedDays: Array.isArray(parsed.closedDays) ? parsed.closedDays : [],
        orderQueue: Array.isArray(parsed.orderQueue) ? parsed.orderQueue.map(normalizeOrderQueueItem) : [],
        categories: Array.isArray(parsed.categories) ? parsed.categories : [...DEFAULT_CATEGORIES],
        daySnapshots: Array.isArray(parsed.daySnapshots) ? parsed.daySnapshots : [],
        currentDayContext: parsed.currentDayContext || defaultDayContext(),
        forecastOverrides: Array.isArray(parsed.forecastOverrides) ? parsed.forecastOverrides : [],
        access: normalizeAccess(parsed.access)
      };
    }
  } catch (error) {
    console.warn("Unable to load saved state", error);
  }

  return {
    items: [],
    entries: [],
    currentDay: getTodayIso(),
    closedDays: [],
    orderQueue: [],
    categories: [...DEFAULT_CATEGORIES],
    daySnapshots: [],
    currentDayContext: defaultDayContext(),
    forecastOverrides: [],
    access: normalizeAccess()
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    items: state.items,
    entries: state.entries,
    currentDay: state.currentDay,
    closedDays: state.closedDays,
    orderQueue: state.orderQueue,
    categories: state.categories,
    daySnapshots: state.daySnapshots,
    currentDayContext: state.currentDayContext,
    forecastOverrides: state.forecastOverrides,
    access: state.access
  }));
}

function bindEvents() {
  refs.loginForm.addEventListener("submit", loginUser);
  refs.logoutBtn.addEventListener("click", logoutUser);
  refs.tabletLogoutBtn.addEventListener("click", logoutUser);
  refs.navLinks.forEach((button) => {
    button.addEventListener("click", () => {
      if (!isAuthenticated()) {
        return;
      }
      openView(button.dataset.target);
    });
  });

  refs.searchInput.addEventListener("input", (event) => {
    filters.search = event.target.value.trim().toLowerCase();
    renderInventoryTable();
  });

  refs.categoryFilter.addEventListener("change", (event) => {
    filters.category = event.target.value;
    renderInventoryTable();
  });

  refs.inventoryViewFilter.addEventListener("change", (event) => {
    filters.inventoryView = event.target.value;
    renderInventoryTable();
  });

  refs.tabletSearch.addEventListener("input", (event) => {
    filters.tabletSearch = event.target.value.trim().toLowerCase();
    renderTablet();
  });

  refs.tabletModeBtn.addEventListener("click", () => {
    if (!isAuthenticated()) {
      return;
    }
    openView("tablet");
  });

  refs.productUnitType.addEventListener("change", syncProductTypeForm);
  refs.productPriceBasis.addEventListener("change", syncProductTypeForm);
  refs.addCategoryForm.addEventListener("submit", addCategoryFromForm);
  refs.addProductForm.addEventListener("submit", addProductFromForm);
  refs.importCsvBtn.addEventListener("click", importCsvItems);
  refs.exportExcelBtn.addEventListener("click", exportWorkbookToExcel);
  refs.dayTypeSelect.addEventListener("change", updateCurrentDayContext);
  refs.specialDayTagSelect.addEventListener("change", updateCurrentDayContext);
  refs.specialEventNameInput.addEventListener("input", updateCurrentDayContext);
  refs.prevBusinessDayBtn.addEventListener("click", () => moveBusinessDay(-1));
  refs.nextBusinessDayBtn.addEventListener("click", () => moveBusinessDay(1));
  refs.setBusinessDayBtn.addEventListener("click", setBusinessDayManually);
  refs.closeDayBtn.addEventListener("click", closeCurrentDay);
}

function renderApp() {
  renderAccess();
  renderBusinessDay();
  renderCategoryFilter();
  renderCategoryManager();
  renderOverview();
  renderForecastCenter();
  renderInventoryTable();
  renderOrdering();
  renderTablet();
  renderDaily();
}

function normalizeAccess(access = {}) {
  return {
    currentRole: access.currentRole || "",
    isAuthenticated: Boolean(access.isAuthenticated),
    email: access.email || ""
  };
}

function isAuthenticated() {
  return Boolean(state.access?.isAuthenticated);
}

function getCurrentRole() {
  return state.access?.currentRole || "";
}

function isManager() {
  return getCurrentRole() === "manager";
}

function isEmployee() {
  return getCurrentRole() === "employee";
}

function loginUser(event) {
  event.preventDefault();
  if (!supabaseClient) {
    refs.loginMessage.textContent = "Supabase is not configured yet. Update supabase-config.js first.";
    return;
  }
  handleLogin();
}

function logoutUser() {
  handleLogout();
}

function applyRoleNavigation() {
  const currentTarget = getActiveViewTarget();
  if (isEmployee()) {
    openView("tablet");
    return;
  }
  openView(currentTarget && currentTarget !== "tablet" ? currentTarget : "overview");
}

function renderAccess() {
  const loggedIn = isAuthenticated();
  refs.loginOverlay.classList.toggle("is-hidden", loggedIn);
  document.body.classList.toggle("employee-role", isEmployee());
  document.body.classList.toggle("manager-role", isManager());
  refs.sessionRoleLabel.textContent = loggedIn
    ? `${isManager() ? "Manager" : "Employee"} logged in${state.access.email ? ` | ${state.access.email}` : ""}`
    : "Not logged in";
  refs.logoutBtn.disabled = !loggedIn;

  refs.navLinks.forEach((button) => {
    const target = button.dataset.target;
    const managerOnly = ["overview", "catalog", "ordering", "daily"].includes(target);
    button.classList.toggle("is-hidden", isEmployee() && managerOnly);
  });

  if (!loggedIn) {
    refs.views.forEach((view) => view.classList.remove("active"));
    document.getElementById("overview").classList.add("active");
    document.body.classList.remove("tablet-mode");
    return;
  }

  applyRoleNavigation();
}

async function initializeRemoteApp() {
  if (!supabaseClient) {
    refs.loginMessage.textContent = "Update supabase-config.js with your Supabase URL and anon key.";
    renderApp();
    return;
  }

  const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      queueRemoteRefresh();
      syncAccessFromSession(session).then(() => {
        subscribeToRemoteChanges();
      });
      return;
    }

    unsubscribeFromRemoteChanges();
    state.access = normalizeAccess();
    saveState();
    renderApp();
  });

  if (!authListener) {
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    refs.loginMessage.textContent = error.message;
    return;
  }
  if (data.session?.user) {
    await syncAccessFromSession(data.session);
    await refreshRemoteState();
    subscribeToRemoteChanges();
    return;
  }
  renderApp();
}

async function handleLogin() {
  refs.loginMessage.textContent = "";
  const email = String(refs.loginEmail.value || "").trim();
  const password = String(refs.loginPassword.value || "");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    refs.loginMessage.textContent = error.message;
    return;
  }

  refs.loginForm.reset();
  await syncAccessFromSession(data.session);
  await refreshRemoteState();
  subscribeToRemoteChanges();
}

async function handleLogout() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  unsubscribeFromRemoteChanges();
  state.access = normalizeAccess();
  document.body.classList.remove("tablet-mode");
  saveState();
  renderApp();
}

async function syncAccessFromSession(session) {
  const profile = await fetchProfile(session.user.id);
  state.access = normalizeAccess({
    currentRole: profile?.role || "employee",
    isAuthenticated: true,
    email: session.user.email || ""
  });
  saveState();
  renderApp();
}

function openView(target) {
  document.body.classList.toggle("tablet-mode", target === "tablet");
  refs.navLinks.forEach((link) => link.classList.toggle("active", link.dataset.target === target));
  refs.views.forEach((view) => view.classList.toggle("active", view.id === target));
}

function getActiveViewTarget() {
  const activeView = refs.views.find((view) => view.classList.contains("active"));
  return activeView?.id || "";
}

async function fetchProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, role, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    refs.loginMessage.textContent = error.message;
    return null;
  }
  return data;
}

async function refreshRemoteState() {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }

  const [
    categoriesResult,
    itemsResult,
    entriesResult,
    orderQueueResult,
    snapshotsResult,
    overridesResult,
    closedDaysResult,
    settingsResult
  ] = await Promise.all([
    supabaseClient.from("categories").select("*").order("name"),
    supabaseClient.from("items").select("*").order("name"),
    supabaseClient.from("inventory_entries").select("*").order("created_at"),
    supabaseClient.from("order_queue").select("*").order("created_at"),
    supabaseClient.from("day_snapshots").select("*").order("business_day"),
    supabaseClient.from("forecast_overrides").select("*").order("business_day"),
    supabaseClient.from("closed_days").select("*").order("business_day"),
    supabaseClient.from("app_settings").select("*").eq("id", 1).maybeSingle()
  ]);

  const errors = [
    categoriesResult.error,
    itemsResult.error,
    entriesResult.error,
    orderQueueResult.error,
    snapshotsResult.error,
    overridesResult.error,
    closedDaysResult.error,
    settingsResult.error
  ].filter(Boolean);

  if (errors.length) {
    refs.loginMessage.textContent = errors[0].message;
    return;
  }

  state.categories = (categoriesResult.data || []).map((row) => row.name);
  state.items = (itemsResult.data || []).map(itemFromRow);
  state.entries = (entriesResult.data || []).map(entryFromRow);
  state.orderQueue = (orderQueueResult.data || []).map(orderQueueFromRow);
  state.daySnapshots = (snapshotsResult.data || []).map(daySnapshotFromRow);
  state.forecastOverrides = (overridesResult.data || []).map(overrideFromRow);
  state.closedDays = (closedDaysResult.data || []).map(closedDayFromRow);

  if (settingsResult.data) {
    state.currentDay = settingsResult.data.current_day || getTodayIso();
    state.currentDayContext = {
      dayType: settingsResult.data.day_type || "weekday",
      specialTag: settingsResult.data.special_tag || "",
      specialEventName: settingsResult.data.special_event_name || ""
    };
  }

  saveState();
  renderApp();
}

function subscribeToRemoteChanges() {
  if (!supabaseClient || realtimeChannel) {
    return;
  }

  realtimeChannel = supabaseClient.channel("inventory-live-sync");
  [
    "categories",
    "items",
    "inventory_entries",
    "order_queue",
    "day_snapshots",
    "forecast_overrides",
    "closed_days",
    "app_settings"
  ].forEach((table) => {
    realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
      queueRemoteRefresh();
    });
  });
  realtimeChannel.subscribe();
}

function unsubscribeFromRemoteChanges() {
  if (!realtimeChannel || !supabaseClient) {
    return;
  }
  supabaseClient.removeChannel(realtimeChannel);
  realtimeChannel = null;
}

function queueRemoteRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshRemoteState();
  }, 180);
}

function itemFromRow(row) {
  return normalizeItem({
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    unitType: row.unit_type,
    price: row.price,
    priceBasis: row.price_basis,
    onHand: row.on_hand,
    ideal: row.ideal,
    weightPerBox: row.weight_per_box,
    piecesPerBox: row.pieces_per_box,
    isFinishedProduct: row.is_finished_product,
    isBoxTracked: row.is_box_tracked
  });
}

function itemToRow(item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    unit_type: item.unitType,
    price: item.price,
    price_basis: item.priceBasis,
    on_hand: item.onHand,
    ideal: item.ideal,
    weight_per_box: item.weightPerBox,
    pieces_per_box: item.piecesPerBox,
    is_finished_product: item.isFinishedProduct,
    is_box_tracked: item.isBoxTracked
  };
}

function entryFromRow(row) {
  return normalizeEntry({
    id: row.id,
    itemId: row.item_id,
    delta: row.delta,
    inventoryDelta: row.inventory_delta,
    type: row.type,
    date: row.business_day,
    timestamp: row.created_at
  });
}

function orderQueueFromRow(row) {
  return normalizeOrderQueueItem({
    id: row.id,
    itemId: row.item_id,
    qty: row.qty,
    source: row.source,
    date: row.business_day,
    timestamp: row.created_at
  });
}

function daySnapshotFromRow(row) {
  return {
    id: row.id,
    date: row.business_day,
    itemId: row.item_id,
    openingQty: Number(row.opening_qty) || 0,
    usedQty: Number(row.used_qty) || 0,
    wastedQty: Number(row.wasted_qty) || 0,
    closingQty: Number(row.closing_qty) || 0,
    dayType: row.day_type || "",
    specialTag: row.special_tag || "",
    specialEventName: row.special_event_name || ""
  };
}

function overrideFromRow(row) {
  return {
    id: row.id,
    date: row.business_day,
    itemId: row.item_id,
    overrideIdeal: Number(row.override_ideal) || 0,
    reason: row.reason || "",
    eventName: row.event_name || "",
    eventDate: row.event_date || "",
    note: row.note || ""
  };
}

function closedDayFromRow(row) {
  return {
    date: row.business_day,
    usageCost: Number(row.usage_cost) || 0,
    wasteCost: Number(row.waste_cost) || 0,
    orderLines: Number(row.order_lines) || 0
  };
}

async function getCurrentUserId() {
  if (!supabaseClient) {
    return null;
  }
  const { data } = await supabaseClient.auth.getUser();
  return data.user?.id || null;
}

async function syncAppSettingsRemote() {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }
  const { error } = await supabaseClient.from("app_settings").upsert({
    id: 1,
    current_day: state.currentDay,
    day_type: state.currentDayContext?.dayType || "weekday",
    special_tag: state.currentDayContext?.specialTag || "",
    special_event_name: state.currentDayContext?.specialEventName || ""
  });
  if (error) {
    console.warn(error.message);
  }
}

async function upsertItemRemote(item) {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }
  const { error } = await supabaseClient.from("items").upsert(itemToRow(item));
  if (error) {
    console.warn(error.message);
  }
}

async function upsertItemsRemote(items) {
  if (!supabaseClient || !isAuthenticated() || !items.length) {
    return;
  }
  const { error } = await supabaseClient.from("items").upsert(items.map(itemToRow));
  if (error) {
    console.warn(error.message);
  }
}

async function deleteItemRemote(itemId) {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }
  const { error } = await supabaseClient.from("items").delete().eq("id", itemId);
  if (error) {
    console.warn(error.message);
  }
}

async function insertEntryRemote(entry) {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }
  const userId = await getCurrentUserId();
  const { error } = await supabaseClient.from("inventory_entries").insert({
    id: entry.id,
    item_id: entry.itemId,
    delta: entry.delta,
    inventory_delta: entry.inventoryDelta,
    type: entry.type,
    business_day: entry.date,
    created_by: userId,
    created_at: entry.timestamp
  });
  if (error) {
    console.warn(error.message);
  }
}

async function deleteEntryRemote(entryId) {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }
  const { error } = await supabaseClient.from("inventory_entries").delete().eq("id", entryId);
  if (error) {
    console.warn(error.message);
  }
}

async function insertOrderQueueRemote(entry) {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }
  const userId = await getCurrentUserId();
  const { error } = await supabaseClient.from("order_queue").insert({
    id: entry.id,
    item_id: entry.itemId,
    qty: entry.qty,
    source: entry.source,
    business_day: entry.date,
    created_by: userId,
    created_at: entry.timestamp || new Date().toISOString()
  });
  if (error) {
    console.warn(error.message);
  }
}

async function deleteOrderQueueRemote(entryId) {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }
  const { error } = await supabaseClient.from("order_queue").delete().eq("id", entryId);
  if (error) {
    console.warn(error.message);
  }
}

async function clearOrderQueueRemote() {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }
  const { error } = await supabaseClient.from("order_queue").delete().neq("id", "");
  if (error) {
    console.warn(error.message);
  }
}

async function insertDaySnapshotsRemote(snapshots) {
  if (!supabaseClient || !isAuthenticated() || !snapshots.length) {
    return;
  }
  const { error } = await supabaseClient.from("day_snapshots").insert(
    snapshots.map((snapshot) => ({
      business_day: snapshot.date,
      item_id: snapshot.itemId,
      opening_qty: snapshot.openingQty,
      used_qty: snapshot.usedQty,
      wasted_qty: snapshot.wastedQty,
      closing_qty: snapshot.closingQty,
      day_type: snapshot.dayType,
      special_tag: snapshot.specialTag,
      special_event_name: snapshot.specialEventName
    }))
  );
  if (error) {
    console.warn(error.message);
  }
}

async function upsertClosedDayRemote(day) {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }
  const { error } = await supabaseClient.from("closed_days").upsert({
    business_day: day.date,
    usage_cost: day.usageCost,
    waste_cost: day.wasteCost,
    order_lines: day.orderLines
  });
  if (error) {
    console.warn(error.message);
  }
}

async function upsertForecastOverrideRemote(payloadFields) {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }
  const userId = await getCurrentUserId();
  const { error } = await supabaseClient.from("forecast_overrides").upsert({
    business_day: payloadFields.date,
    item_id: payloadFields.itemId,
    override_ideal: payloadFields.overrideIdeal,
    reason: payloadFields.reason,
    event_name: payloadFields.eventName,
    event_date: payloadFields.eventDate || null,
    note: payloadFields.note,
    created_by: userId
  }, { onConflict: "business_day,item_id" });
  if (error) {
    console.warn(error.message);
  }
}

async function upsertCategoryRemote(categoryName) {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }
  const { error } = await supabaseClient.from("categories").upsert({ name: categoryName });
  if (error) {
    console.warn(error.message);
  }
}

async function deleteCategoryRemote(categoryName) {
  if (!supabaseClient || !isAuthenticated()) {
    return;
  }
  const { error } = await supabaseClient.from("categories").delete().eq("name", categoryName);
  if (error) {
    console.warn(error.message);
  }
}

function renderBusinessDay() {
  const day = getBusinessDay();
  refs.businessDayLabel.textContent = `Business Day`;
  refs.currentDayTitle.textContent = formatDateLabel(day);
  refs.nextBusinessDayInput.value = getNextDayIso(day);
  refs.dayTypeSelect.value = state.currentDayContext?.dayType || "weekday";
  refs.specialDayTagSelect.value = state.currentDayContext?.specialTag || "";
  refs.specialEventNameInput.value = state.currentDayContext?.specialEventName || "";
  refs.dayStatusCopy.textContent = state.closedDays.length
    ? `Last closed: ${formatDateLabel(state.closedDays[state.closedDays.length - 1].date)}`
    : "Close the day when service ends, then start a clean new day.";
}

function defaultDayContext() {
  return {
    dayType: "weekday",
    specialTag: "",
    specialEventName: ""
  };
}

function updateCurrentDayContext() {
  state.currentDayContext = {
    dayType: refs.dayTypeSelect.value || "weekday",
    specialTag: refs.specialDayTagSelect.value || "",
    specialEventName: String(refs.specialEventNameInput.value || "").trim()
  };
  saveState();
  syncAppSettingsRemote();
}

function renderOverview() {
  const metrics = getMetrics();

  refs.heroMetrics.innerHTML = [
    metricCard("Business day", formatDateCompact(getBusinessDay()), "Current working date"),
    metricCard("Inventory value", formatCurrency(metrics.totalInventoryValue), "Current on-hand value"),
    metricCard("Order amount", formatCurrency(metrics.totalOrderCost), "Current order queue value"),
    metricCard("Today's usage + waste", formatCurrency(metrics.todayConsumptionCost + metrics.todayWasteCost), "Combined daily movement")
  ].join("");

  renderList(
    refs.dayClosureSummary,
    state.closedDays.slice(-3).reverse().map((day) =>
      listCard(
        formatDateLabel(day.date),
        `${formatCurrency(day.usageCost)} usage | ${formatCurrency(day.wasteCost)} waste`,
        `<span class="pill">${formatNumber(day.orderLines)} orders</span>`
      )
    )
  );

  renderList(
    refs.topReorderList,
    getReorderItems().slice(0, 8).map((item) =>
      listCard(
        item.name,
        `${item.category} | Need ${formatOrderQuantity(item.recommendedOrderQty, item)}`,
        `<span class="pill warning">${formatCurrency(getItemLineCost(item.recommendedOrderQty, item))}</span>`
      )
    )
  );

  renderList(
    refs.topUsageList,
    getDailyRowsByType("consumed").slice(0, 8).map((row) =>
      listCard(
        row.name,
        `${formatUsageTotal(row)} consumed today`,
        `<span class="pill">${formatCurrency(row.cost)}</span>`
      )
    )
  );

  renderList(
    refs.topWasteList,
    getDailyRowsByType("wasted").slice(0, 8).map((row) =>
      listCard(
        row.name,
        `${formatUsageTotal(row)} wasted today`,
        `<span class="pill waste">${formatCurrency(row.cost)}</span>`
      )
    )
  );
}

function renderForecastCenter() {
  const mithaiItems = state.items.filter((item) => item.category === "Mithai");
  const forecastRows = mithaiItems.map((item) => ({
    item,
    forecast: getForecastSuggestion(item),
    override: getForecastOverride(item.id)
  }));
  const suggestedOrderTotal = forecastRows.reduce((sum, row) => sum + getSuggestedOrderQty(row.item, row.forecast, row.override), 0);
  const suggestedOrderValue = forecastRows.reduce((sum, row) => sum + getItemLineCost(getSuggestedOrderQty(row.item, row.forecast, row.override), row.item), 0);

  refs.forecastSummary.innerHTML = [
    metricCard("Mithai items", formatNumber(forecastRows.length), "Tracked in daily forecasting"),
    metricCard("Suggested order qty", formatNumber(suggestedOrderTotal), "Recommended to order today"),
    metricCard("Suggested order value", formatCurrency(suggestedOrderValue), "Estimated mithai order amount"),
    metricCard("Lead time", `${MITHAI_DELIVERY_LEAD_DAYS} days`, "Weekly mithai delivery cadence")
  ].join("");

  renderList(
    refs.forecastCards,
    forecastRows.map(({ item, forecast, override }) => forecastCard(item, forecast, override))
  );

  refs.forecastCards.querySelectorAll("[data-save-forecast]").forEach((button) => {
    button.addEventListener("click", () => saveForecastOverride(button.dataset.saveForecast));
  });
  refs.forecastCards.querySelectorAll("[data-toggle-override]").forEach((button) => {
    button.addEventListener("click", () => toggleForecastOverride(button.dataset.toggleOverride));
  });
  refs.forecastCards.querySelectorAll("[data-forecast-field='reason']").forEach((select) => {
    select.addEventListener("change", () => syncForecastOverrideFields(select.dataset.forecastId));
  });
  refs.forecastCards.querySelectorAll("[data-forecast-id]").forEach((node) => {
    syncForecastOverrideFields(node.dataset.forecastId);
  });
}

function renderInventoryTable() {
  const items = getFilteredItems(filters.search, filters.category, filters.inventoryView);

  refs.catalogQuickStats.innerHTML = [
    metricCard("Showing", formatNumber(items.length), "Items in the current filter"),
    metricCard("Needs reorder", formatNumber(getReorderItems().length), "Items below ideal"),
    metricCard("Queued to order", formatNumber(getOrderRows().length), "Items currently in order section"),
    metricCard("Inventory value", formatCurrency(getMetrics().totalInventoryValue), "Value of inventory on hand")
  ].join("");

  renderList(
    refs.inventoryCards,
    items.slice(0, 12).map((item) => managerItemCard(item))
  );

  refs.inventoryCards.querySelectorAll("[data-save-item]").forEach((button) => {
    button.addEventListener("click", () => saveManagerCard(button.dataset.saveItem));
  });
  refs.inventoryCards.querySelectorAll("[data-delete-item]").forEach((button) => {
    button.addEventListener("click", () => deleteInventoryItem(button.dataset.deleteItem));
  });
  refs.inventoryCards.querySelectorAll("[data-add-order]").forEach((button) => {
    button.addEventListener("click", () => {
      addToOrderQueue(button.dataset.addOrder, Number(button.dataset.qty) || 0, "manager");
    });
  });
  refs.inventoryCards.querySelectorAll("[data-add-custom-order]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = refs.inventoryCards.querySelector(`[data-order-input="${button.dataset.addCustomOrder}"]`);
      const qty = Number(input?.value) || 0;
      if (qty > 0) {
        addToOrderQueue(button.dataset.addCustomOrder, qty, "manager");
        if (input) {
          input.value = "";
        }
      }
    });
  });

  if (!items.length) {
    refs.inventoryTableBody.innerHTML = `<tr><td colspan="11">${refs.emptyStateTemplate.innerHTML}</td></tr>`;
    return;
  }

  refs.inventoryTableBody.innerHTML = items.slice(0, 300).map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.name)}</strong><br>
        <span class="helper">${itemMetaLabel(item)}</span>
      </td>
      <td>${escapeHtml(item.category)}</td>
      <td>${escapeHtml(item.unitType)}</td>
      <td>${formatPriceDisplay(item)}</td>
      <td><input class="qty-input" type="number" min="0" step="0.01" value="${item.onHand}" data-field="onHand" data-id="${item.id}"></td>
      <td><input class="qty-input" type="number" min="0" step="0.01" value="${item.ideal}" data-field="ideal" data-id="${item.id}"></td>
      <td>${formatOrderQuantity(getRecommendedOrderQty(item), item)}</td>
      <td>${formatEntryTotal(getEntryTotal(item.id, "consumed"), item)}</td>
      <td>${formatEntryTotal(getEntryTotal(item.id, "wasted"), item)}</td>
      <td>${item.weightPerBox ? `${formatNumber(item.weightPerBox)} kg` : "-"}</td>
      <td>${item.piecesPerBox ? formatNumber(item.piecesPerBox) : "-"}</td>
    </tr>
  `).join("");

  refs.inventoryTableBody.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", (event) => {
      const item = state.items.find((entry) => entry.id === event.target.dataset.id);
      if (!item) {
        return;
      }
      item[event.target.dataset.field] = Math.max(0, Number(event.target.value) || 0);
      saveState();
      upsertItemRemote(item);
      renderApp();
    });
  });
}

function renderOrdering() {
  const rows = getOrderRows();
  const metrics = getMetrics();

  renderList(
    refs.orderingList,
    rows.map((row) => orderingCard(row))
  );

  refs.orderingSummary.innerHTML = [
    statCard("Order lines", formatNumber(rows.length), "Items currently in the order section"),
    statCard("Units to buy", formatNumber(metrics.totalUnitsToOrder), "Combined recommended and manual quantity"),
    statCard("Order amount", formatCurrency(metrics.totalOrderCost), "Estimated order value")
  ].join("");

  refs.orderingList.querySelectorAll("[data-toggle-ordering-override]").forEach((button) => {
    button.addEventListener("click", () => toggleOrderingOverride(button.dataset.toggleOrderingOverride));
  });
  refs.orderingList.querySelectorAll("[data-save-ordering-override]").forEach((button) => {
    button.addEventListener("click", () => saveOrderingOverride(button.dataset.saveOrderingOverride));
  });
  refs.orderingList.querySelectorAll("[data-ordering-field='reason']").forEach((select) => {
    select.addEventListener("change", () => syncOrderingOverrideFields(select.dataset.orderingId));
  });
  refs.orderingList.querySelectorAll("[data-ordering-override-box]").forEach((node) => {
    syncOrderingOverrideFields(node.dataset.orderingOverrideBox);
  });
}

function renderTablet() {
  const items = getFilteredItems(filters.tabletSearch, "All", "all").slice(0, 24);

  renderList(
    refs.tabletItems,
    items.map((item) => `
      <article class="tablet-card">
        <div class="tablet-card-top">
          <h4>${escapeHtml(item.name)}</h4>
          <p>${escapeHtml(item.category)} | On hand ${formatNumber(item.onHand)} ${item.unit}${item.weightPerBox ? ` | ${formatNumber(item.weightPerBox)} lb per ${item.unit}` : ""}${item.piecesPerBox ? ` | ${formatNumber(item.piecesPerBox)} pcs per ${item.unit}` : ""}</p>
        </div>
        <div class="tablet-status-strip">
          <div class="tablet-status-pill">
            <span>Used today</span>
            <strong>${formatEntryTotal(getEntryTotal(item.id, "consumed"), item)}</strong>
          </div>
          <div class="tablet-status-pill">
            <span>Wasted today</span>
            <strong>${formatEntryTotal(getEntryTotal(item.id, "wasted"), item)}</strong>
          </div>
          <div class="tablet-status-pill">
            <span>In order</span>
            <strong>${formatOrderQuantity(getManualOrderQty(item.id), item)}</strong>
          </div>
        </div>
        <div class="tablet-action-grid">
          <button class="tablet-action-btn use" data-type="consumed" data-adjust="1" data-id="${item.id}">Use 1</button>
          <button class="tablet-action-btn use" data-type="consumed" data-adjust="0.5" data-id="${item.id}">Use 1/2</button>
          <button class="tablet-action-btn use" data-type="consumed" data-adjust="0.25" data-id="${item.id}">Use 1/4</button>
          <button class="tablet-action-btn use" data-type="consumed" data-adjust="0.3333" data-id="${item.id}">Use 1/3</button>
          <button class="tablet-action-btn add" data-type="restocked" data-adjust="1" data-id="${item.id}">${getTabletAddLabel(item, 1)}</button>
          <button class="tablet-action-btn add" data-type="restocked" data-adjust="0.5" data-id="${item.id}">${getTabletAddLabel(item, 0.5)}</button>
          <button class="tablet-action-btn waste" data-type="wasted" data-adjust="1" data-id="${item.id}">Waste 1</button>
        </div>
        <div class="tablet-custom-row">
          <input class="tablet-custom-input" type="number" step="0.01" min="0" placeholder="Custom qty" data-custom-qty="${item.id}">
          <button class="tablet-secondary-btn" data-custom-action="consumed" data-custom-id="${item.id}">Use Custom</button>
          <button class="tablet-secondary-btn" data-custom-action="wasted" data-custom-id="${item.id}">Waste Custom</button>
          <button class="tablet-secondary-btn" data-custom-action="restocked" data-custom-id="${item.id}">Add Custom</button>
          <button class="tablet-secondary-btn" data-custom-order="${item.id}">Order Custom</button>
        </div>
        <button class="tablet-undo-btn" data-undo-previous="${item.id}">Undo Previous</button>
      </article>
    `)
  );

  refs.tabletItems.querySelectorAll("[data-adjust]").forEach((button) => {
    button.addEventListener("click", () => {
      recordInventoryMovement(
        button.dataset.id,
        Number(button.dataset.adjust),
        button.dataset.type || "consumed"
      );
    });
  });

  refs.tabletItems.querySelectorAll("[data-order-item]").forEach((button) => {
    button.addEventListener("click", () => {
      addToOrderQueue(button.dataset.orderItem, Number(button.dataset.orderQty) || 0, "tablet");
    });
  });
  refs.tabletItems.querySelectorAll("[data-custom-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = refs.tabletItems.querySelector(`[data-custom-qty="${button.dataset.customId}"]`);
      const qty = Number(input?.value) || 0;
      if (qty > 0) {
        recordInventoryMovement(button.dataset.customId, qty, button.dataset.customAction);
        if (input) {
          input.value = "";
        }
      }
    });
  });
  refs.tabletItems.querySelectorAll("[data-custom-order]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = refs.tabletItems.querySelector(`[data-custom-qty="${button.dataset.customOrder}"]`);
      const qty = Number(input?.value) || 0;
      if (qty > 0) {
        addToOrderQueue(button.dataset.customOrder, qty, "tablet");
        if (input) {
          input.value = "";
        }
      }
    });
  });
  refs.tabletItems.querySelectorAll("[data-undo-previous]").forEach((button) => {
    button.addEventListener("click", () => {
      undoPreviousTabletAction(button.dataset.undoPrevious);
    });
  });

  const recent = [...state.entries]
    .filter((entry) => entry.date === getBusinessDay())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 12)
    .map((entry) => {
      const item = state.items.find((candidate) => candidate.id === entry.itemId);
      if (!item) {
        return null;
      }

      return listCard(
        item.name,
        `${formatTime(entry.timestamp)} | ${entry.type} ${formatSignedEntry(entry, item)}`,
        `<button class="mini-btn" data-remove="${entry.id}">Undo</button>`
      );
    })
    .filter(Boolean);

  renderList(refs.recentEntries, recent);
  refs.recentEntries.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => undoEntry(button.dataset.remove));
  });
}

function renderDaily() {
  const usageRows = getDailyRowsByType("consumed");
  const wasteRows = getDailyRowsByType("wasted");
  const metrics = getMetrics();

  renderList(
    refs.dailySpentList,
    usageRows.slice(0, 18).map((row) =>
      listCard(
        row.name,
        `${formatUsageTotal(row)} used | ${row.category}`,
        `<span class="pill">${formatCurrency(row.cost)}</span>`
      )
    )
  );

  refs.dailyCostSummary.innerHTML = [
    statCard("Usage cost", formatCurrency(metrics.todayConsumptionCost), "Based on items used"),
    statCard("Waste cost", formatCurrency(metrics.todayWasteCost), "Finished products and stock written off"),
    statCard("Order amount", formatCurrency(metrics.totalOrderCost), "Current order section total"),
    statCard("Current stock value", formatCurrency(metrics.totalInventoryValue), "Value remaining on hand")
  ].join("");

  renderList(
    refs.dailyWasteList,
    wasteRows.slice(0, 18).map((row) =>
      listCard(
        row.name,
        `${formatUsageTotal(row)} wasted | ${row.category}`,
        `<span class="pill waste">${formatCurrency(row.cost)}</span>`
      )
    )
  );
}

function renderCategoryFilter() {
  const categories = ["All", ...getCategoryOptions()];
  refs.categoryFilter.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");
  refs.categoryFilter.value = filters.category;

  refs.productCategory.innerHTML = getCategoryOptions()
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");
}

function renderCategoryManager() {
  renderList(
    refs.categoryChips,
    getCategoryOptions().map((category) => `
      <button class="fraction-chip remove-chip" data-delete-category="${escapeHtml(category)}">${escapeHtml(category)} x</button>
    `)
  );

  refs.categoryChips.querySelectorAll("[data-delete-category]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteCategory(button.dataset.deleteCategory);
    });
  });
}

function getFilteredItems(search, category, inventoryView = "all") {
  return state.items.filter((item) => {
    const matchesSearch = !search || `${item.name} ${item.category}`.toLowerCase().includes(search);
    const matchesCategory = category === "All" || item.category === category;
    const target = getOrderingTarget(item);
    const matchesView =
      inventoryView === "all" ||
      (inventoryView === "low" && item.onHand < target.targetIdeal) ||
      (inventoryView === "box" && item.unitType === "box") ||
      (inventoryView === "finished" && item.isFinishedProduct);
    return matchesSearch && matchesCategory && matchesView;
  });
}

function getReorderItems() {
  return state.items
    .map((item) => {
      const target = getOrderingTarget(item);
      return {
        ...item,
        targetIdeal: target.targetIdeal,
        recommendedOrderQty: getRecommendedOrderQty(item, target)
      };
    })
    .filter((item) => item.recommendedOrderQty > 0)
    .sort((a, b) => (b.recommendedOrderQty * b.price) - (a.recommendedOrderQty * a.price));
}

function getOrderRows() {
  const queueByItem = new Map();

  state.orderQueue
    .filter((entry) => entry.date === getBusinessDay())
    .forEach((entry) => {
      queueByItem.set(entry.itemId, (queueByItem.get(entry.itemId) || 0) + entry.qty);
    });

  const itemIds = new Set([
    ...getReorderItems().map((item) => item.id),
    ...queueByItem.keys()
  ]);

  return [...itemIds]
    .map((itemId) => {
      const item = state.items.find((candidate) => candidate.id === itemId);
      if (!item) {
        return null;
      }

      const target = getOrderingTarget(item);
      const recommendedQty = getRecommendedOrderQty(item, target);
      const manualQty = queueByItem.get(itemId) || 0;
      const totalQty = recommendedQty + manualQty;
      if (totalQty <= 0) {
        return null;
      }

      return {
        ...item,
        targetIdeal: target.targetIdeal,
        baseIdeal: target.baseIdeal,
        suggestedIdeal: target.suggestedIdeal,
        hasForecast: target.hasForecast,
        explanation: target.explanation,
        override: target.override,
        recommendedQty,
        manualQty,
        totalQty
      };
    })
    .filter(Boolean)
    .sort((a, b) => getItemLineCost(b.totalQty, b) - getItemLineCost(a.totalQty, a));
}

function getDailyRowsByType(type) {
  const totals = new Map();

  state.entries
    .filter((entry) => entry.date === getBusinessDay() && entry.type === type)
    .forEach((entry) => {
      totals.set(entry.itemId, (totals.get(entry.itemId) || 0) + entry.delta);
    });

  return [...totals.entries()]
    .map(([itemId, total]) => {
      const item = state.items.find((candidate) => candidate.id === itemId);
      if (!item || total <= 0) {
        return null;
      }

      return {
        ...item,
        total,
        cost: getItemLineCost(getEntryInventoryDeltaTotal(itemId, type), item)
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.cost - a.cost);
}

function getEntryTotal(itemId, type) {
  return state.entries
    .filter((entry) => entry.date === getBusinessDay() && entry.itemId === itemId && entry.type === type)
    .reduce((sum, entry) => sum + entry.delta, 0);
}

function getEntryInventoryDeltaTotal(itemId, type) {
  return state.entries
    .filter((entry) => entry.date === getBusinessDay() && entry.itemId === itemId && entry.type === type)
    .reduce((sum, entry) => sum + getInventoryDelta(entry), 0);
}

function getMetrics() {
  const usageRows = getDailyRowsByType("consumed");
  const wasteRows = getDailyRowsByType("wasted");
  const orderRows = getOrderRows();

  return {
    totalInventoryValue: state.items.reduce((sum, item) => sum + getItemLineCost(item.onHand, item), 0),
    totalUnitsToOrder: orderRows.reduce((sum, row) => sum + row.totalQty, 0),
    totalOrderCost: orderRows.reduce((sum, row) => sum + getItemLineCost(row.totalQty, row), 0),
    todayConsumptionCost: usageRows.reduce((sum, row) => sum + row.cost, 0),
    todayWasteCost: wasteRows.reduce((sum, row) => sum + row.cost, 0)
  };
}

function recordInventoryMovement(itemId, delta, type = "consumed") {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item || delta === 0) {
    return;
  }

  const inventoryDelta = computeInventoryDelta(item, delta);
  if (type !== "restocked" && delta > 0 && item.onHand < inventoryDelta) {
    return;
  }

  item.onHand = type === "restocked"
    ? item.onHand + inventoryDelta
    : Math.max(0, item.onHand - inventoryDelta);
  state.entries.push({
    id: crypto.randomUUID(),
    itemId,
    delta,
    inventoryDelta,
    type,
    date: getBusinessDay(),
    timestamp: new Date().toISOString()
  });
  saveState();
  insertEntryRemote(state.entries[state.entries.length - 1]);
  upsertItemRemote(item);
  renderApp();
}

function undoEntry(entryId) {
  const entryIndex = state.entries.findIndex((entry) => entry.id === entryId);
  if (entryIndex === -1) {
    return;
  }

  const entry = state.entries[entryIndex];
  const item = state.items.find((candidate) => candidate.id === entry.itemId);
  if (item) {
    const inventoryDelta = getInventoryDelta(entry);
    item.onHand = entry.type === "restocked"
      ? Math.max(0, item.onHand - inventoryDelta)
      : item.onHand + inventoryDelta;
    upsertItemRemote(item);
  }

  state.entries.splice(entryIndex, 1);
  saveState();
  deleteEntryRemote(entry.id);
  renderApp();
}

function addToOrderQueue(itemId, qty, source) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  const orderQty = qty > 0 ? qty : getMinimumOrderQty(item);
  state.orderQueue.push({
    id: crypto.randomUUID(),
    itemId,
    qty: orderQty,
    source,
    date: getBusinessDay(),
    timestamp: new Date().toISOString()
  });
  saveState();
  insertOrderQueueRemote(state.orderQueue[state.orderQueue.length - 1]);
  renderApp();
}

function undoPreviousTabletAction(itemId) {
  const lastEntry = [...state.entries]
    .filter((entry) => entry.itemId === itemId && entry.date === getBusinessDay())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  const lastOrder = [...state.orderQueue]
    .filter((entry) => entry.itemId === itemId && entry.date === getBusinessDay())
    .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))[0];

  if (!lastEntry && !lastOrder) {
    return;
  }

  const lastEntryTime = lastEntry?.timestamp || "";
  const lastOrderTime = lastOrder?.timestamp || "";

  if (lastEntry && (!lastOrder || lastEntryTime >= lastOrderTime)) {
    undoEntry(lastEntry.id);
    return;
  }

  state.orderQueue = state.orderQueue.filter((entry) => entry.id !== lastOrder.id);
  saveState();
  deleteOrderQueueRemote(lastOrder.id);
  renderApp();
}

function deleteInventoryItem(itemId) {
  state.items = state.items.filter((item) => item.id !== itemId);
  state.entries = state.entries.filter((entry) => entry.itemId !== itemId);
  state.orderQueue = state.orderQueue.filter((entry) => entry.itemId !== itemId);
  saveState();
  deleteItemRemote(itemId);
  renderApp();
}

function importCsvItems() {
  const parsedRows = parseCsv(refs.csvInput.value.trim());
  if (!parsedRows.length) {
    return;
  }

  parsedRows.forEach((row) => {
    if (!row.name) {
      return;
    }

    const unit = row.unit || "unit";
    state.items.unshift(normalizeItem({
      id: crypto.randomUUID(),
      name: row.name,
      category: row.category || "Uncategorized",
      unit,
      unitType: row.unitType || inferUnitType(unit),
      price: Number(row.price) || 0,
      priceBasis: row.priceBasis || getTypeConfig(row.unitType || inferUnitType(unit)).priceBasis,
      onHand: Number(row.onHand) || 0,
      ideal: Number(row.ideal) || 0,
      weightPerBox: Number(row.weightPerBox) || 0,
      piecesPerBox: Number(row.piecesPerBox) || 0,
      isFinishedProduct: toBoolean(row.isFinishedProduct),
      isBoxTracked: toBoolean(row.isBoxTracked) || isLikelyBoxUnit(unit)
    }));
  });

  saveState();
  upsertItemsRemote(state.items);
  renderApp();
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    return headers.reduce((record, header, index) => {
      record[header] = values[index] || "";
      return record;
    }, {});
  });
}

function generateSeedItems(count) {
  const categories = ["Produce", "Protein", "Dry Storage", "Dairy", "Frozen", "Prep", "Bakery", "Beverage"];
  const adjectives = ["Prime", "Fresh", "House", "Reserve", "Chef", "Daily", "Select", "Signature", "Classic", "Crisp"];
  const nouns = ["Tomatoes", "Chicken", "Broth", "Pasta", "Spinach", "Butter", "Salmon", "Rice", "Herbs", "Buns"];
  const units = ["kg", "box", "pack", "L", "tray", "bag", "unit", "can"];

  return Array.from({ length: count }, (_, index) => {
    const category = categories[index % categories.length];
    const adjective = adjectives[index % adjectives.length];
    const noun = nouns[index % nouns.length];
    const unit = units[index % units.length];
    const price = Number((((index % 37) + 3) * 1.15).toFixed(2));
    const ideal = 10 + (index % 24);
    const onHand = Math.max(0, ideal - (index % 9));

    return {
      id: crypto.randomUUID(),
      name: `${adjective} ${noun} ${index + 1}`,
      category,
      unit,
      unitType: inferUnitType(unit),
      price,
      priceBasis: getTypeConfig(inferUnitType(unit)).priceBasis,
      onHand,
      ideal,
      weightPerBox: isLikelyBoxUnit(unit) ? Number((4 + (index % 8)).toFixed(2)) : 0,
      piecesPerBox: isLikelyBoxUnit(unit) ? 100 : 0,
      isBoxTracked: isLikelyBoxUnit(unit),
      isFinishedProduct: category === "Prep" || category === "Bakery"
    };
  });
}

function normalizeItem(item) {
  return {
    ...item,
    price: Number(item.price) || 0,
    priceBasis: item.priceBasis || getTypeConfig(item.unitType || inferUnitType(item.unit || "")).priceBasis,
    onHand: Number(item.onHand) || 0,
    ideal: Number(item.ideal) || 0,
    unitType: item.unitType || inferUnitType(item.unit || ""),
    weightPerBox: Number(item.weightPerBox) || 0,
    piecesPerBox: Number(item.piecesPerBox) || 0,
    isFinishedProduct: Boolean(item.isFinishedProduct),
    isBoxTracked: Boolean(item.isBoxTracked) || isLikelyBoxUnit(item.unit || "")
  };
}

function normalizeEntry(entry) {
  return {
    ...entry,
    delta: Number(entry.delta) || 0,
    inventoryDelta: entry.inventoryDelta == null ? Number(entry.delta) || 0 : Number(entry.inventoryDelta) || 0,
    type: entry.type || "consumed"
  };
}

function normalizeOrderQueueItem(entry) {
  return {
    ...entry,
    qty: Number(entry.qty) || 0,
    timestamp: entry.timestamp || ""
  };
}

function getManualOrderQty(itemId) {
  return state.orderQueue
    .filter((entry) => entry.date === getBusinessDay() && entry.itemId === itemId)
    .reduce((sum, entry) => sum + entry.qty, 0);
}

function renderList(container, items) {
  container.innerHTML = items.length ? items.join("") : refs.emptyStateTemplate.innerHTML;
}

function metricCard(label, value, helper) {
  return `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <span>${helper}</span>
    </article>
  `;
}

function statCard(label, value, helper) {
  return `
    <article class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <span>${helper}</span>
    </article>
  `;
}

function listCard(title, meta, actions) {
  return `
    <article class="list-card">
      <div>
        <h4>${escapeHtml(title)}</h4>
        <p class="list-meta">${escapeHtml(meta)}</p>
      </div>
      <div>${actions}</div>
    </article>
  `;
}

function orderingCard(row) {
  const overrideOpen = Boolean(row.override);
  const visibleOverrideIdeal = row.override?.overrideIdeal || 0;
  return `
    <article class="forecast-card ordering-card">
      <div>
        <h4>${escapeHtml(row.name)}</h4>
        <p class="inventory-manager-meta">${escapeHtml(row.category)} | ${escapeHtml(getTypeLabel(row.unitType))} | ${row.hasForecast ? "AI-linked reorder" : "Current ideal reorder"}</p>
      </div>
      <div class="forecast-stats">
        <div class="forecast-stat">
          <span>Current ideal</span>
          <strong>${formatNumber(row.baseIdeal)} ${row.unit}</strong>
        </div>
        <div class="forecast-stat">
          <span>Suggested ideal</span>
          <strong>${formatNumber(row.suggestedIdeal)} ${row.unit}</strong>
        </div>
        <div class="forecast-stat">
          <span>Manager override ideal</span>
          <strong>${visibleOverrideIdeal ? `${formatNumber(visibleOverrideIdeal)} ${row.unit}` : "None"}</strong>
        </div>
        <div class="forecast-stat">
          <span>Target ideal used</span>
          <strong>${formatNumber(row.targetIdeal)} ${row.unit}</strong>
        </div>
        <div class="forecast-stat">
          <span>On hand</span>
          <strong>${formatNumber(row.onHand)} ${row.unit}</strong>
        </div>
        <div class="forecast-stat">
          <span>AI / recommended order</span>
          <strong>${formatOrderQuantity(row.recommendedQty, row)}</strong>
        </div>
        <div class="forecast-stat">
          <span>Manual add in queue</span>
          <strong>${formatOrderQuantity(row.manualQty, row)}</strong>
        </div>
        <div class="forecast-stat">
          <span>Total order in queue</span>
          <strong>${formatOrderQuantity(row.totalQty, row)}</strong>
        </div>
        <div class="forecast-stat">
          <span>Order value</span>
          <strong>${formatCurrency(getItemLineCost(row.totalQty, row))}</strong>
        </div>
      </div>
      <p class="forecast-reason">${escapeHtml(row.hasForecast ? `${row.explanation} Reorder queue is currently using ${formatNumber(row.targetIdeal)} ${row.unit}${visibleOverrideIdeal ? " from the manager override" : " as the active target ideal"}.` : row.explanation)}</p>
      ${row.hasForecast ? `
        <div class="forecast-actions">
          <div class="fraction-row">
            <button class="mini-btn" data-toggle-ordering-override="${row.id}">Manager Override ideal</button>
            ${row.override ? `<span class="pill">Override saved</span>` : ""}
          </div>
          <div class="forecast-override-box ${overrideOpen ? "" : "is-hidden"}" data-ordering-override-box="${row.id}">
            <div class="forecast-input-row">
              <label>Manager Override ideal
                <input type="number" step="0.01" min="0" data-ordering-field="overrideIdeal" data-ordering-id="${row.id}" value="${row.targetIdeal}">
              </label>
              <label>Override reason
                <select data-ordering-field="reason" data-ordering-id="${row.id}">
                  <option value="personal_belief" ${row.override?.reason === "personal_belief" ? "selected" : ""}>Personal belief/inaccurate forecast</option>
                  <option value="large_order" ${row.override?.reason === "large_order" ? "selected" : ""}>Large Order</option>
                  <option value="special_event" ${row.override?.reason === "special_event" ? "selected" : ""}>Special Event</option>
                  <option value="other" ${row.override?.reason === "other" ? "selected" : ""}>Other</option>
                </select>
              </label>
            </div>
            <div class="forecast-input-row is-hidden" data-ordering-special-event-fields="${row.id}">
              <label>Special event/holiday name
                <input type="text" data-ordering-field="eventName" data-ordering-id="${row.id}" value="${escapeHtml(row.override?.eventName || "")}" placeholder="What event?">
              </label>
              <label>Date
                <input type="date" data-ordering-field="eventDate" data-ordering-id="${row.id}" value="${escapeHtml(row.override?.eventDate || getBusinessDay())}">
              </label>
            </div>
            <div class="forecast-input-row is-hidden" data-ordering-manager-note-fields="${row.id}">
              <label>Manager note
                <input type="text" data-ordering-field="note" data-ordering-id="${row.id}" value="${escapeHtml(row.override?.note || "")}" placeholder="Why are you overriding?">
              </label>
            </div>
            <div class="fraction-row">
              <button class="mini-btn" data-save-ordering-override="${row.id}">Save Override</button>
            </div>
          </div>
        </div>
      ` : ""}
    </article>
  `;
}

function managerItemCard(item) {
  const recommendedQty = getRecommendedOrderQty(item);
  const orderAmount = getItemLineCost(recommendedQty, item);
  const inventoryValue = getItemLineCost(item.onHand, item);

  return `
    <article class="inventory-manager-card">
      <div>
        <h4>${escapeHtml(item.name)}</h4>
        <p class="inventory-manager-meta">${escapeHtml(item.category)} | ${escapeHtml(getTypeLabel(item.unitType))} | ${escapeHtml(item.unit)} | ${escapeHtml(getPriceBasisLabel(item.priceBasis))}</p>
      </div>
      <div class="inline-badges">
        <span class="pill warning">Order ${formatOrderQuantity(recommendedQty, item)}</span>
        <span class="pill">${formatCurrency(orderAmount)}</span>
        <span class="pill">Inventory ${formatCurrency(inventoryValue)}</span>
      </div>
      <div class="inventory-manager-fields">
        <label>On hand<input type="number" step="0.01" min="0" data-card-field="onHand" data-card-id="${item.id}" value="${item.onHand}"></label>
        <label>Ideal<input type="number" step="0.01" min="0" data-card-field="ideal" data-card-id="${item.id}" value="${item.ideal}"></label>
        <label>Price<input type="number" step="0.01" min="0" data-card-field="price" data-card-id="${item.id}" value="${item.price}"></label>
        <label>${escapeHtml(getPiecesFieldLabel(item))}<input type="number" step="0.01" min="0" data-card-field="piecesPerBox" data-card-id="${item.id}" value="${item.piecesPerBox || 0}"></label>
      </div>
      <div class="inventory-manager-actions">
        <div class="custom-qty-row">
          <input type="number" step="0.01" min="0" placeholder="Order qty" data-order-input="${item.id}">
          <button class="mini-btn" data-add-order="${item.id}" data-qty="${getMinimumOrderQty(item)}">Add Min Order</button>
          <button class="mini-btn" data-add-custom-order="${item.id}">Add Custom Order</button>
        </div>
        <div class="fraction-row">
          <button class="mini-btn" data-save-item="${item.id}">Save</button>
          <button class="mini-btn danger-btn" data-delete-item="${item.id}">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function forecastCard(item, forecast, override) {
  const effectiveIdeal = override?.overrideIdeal ?? forecast.suggestedIdeal;
  const suggestedOrderQty = getSuggestedOrderQty(item, forecast, override);
  const suggestedOrderValue = getItemLineCost(suggestedOrderQty, item);
  const overrideOpen = Boolean(override);

  return `
    <article class="forecast-card">
      <div>
        <h4>${escapeHtml(item.name)}</h4>
        <p class="inventory-manager-meta">${escapeHtml(item.category)} | ${escapeHtml(getTypeLabel(item.unitType))} | Weekly Mithai delivery</p>
      </div>
      <div class="forecast-stats">
        <div class="forecast-stat">
          <span>Ideal quantity:</span>
          <strong>${formatNumber(forecast.suggestedIdeal)} ${item.unit}</strong>
        </div>
        <div class="forecast-stat">
          <span>On hand:</span>
          <strong>${formatNumber(item.onHand)} ${item.unit}</strong>
        </div>
        <div class="forecast-stat">
          <span>Order today:</span>
          <strong>${formatOrderQuantity(suggestedOrderQty, item)}</strong>
        </div>
        <div class="forecast-stat">
          <span>Value of inventory:</span>
          <strong>${formatCurrency(getItemLineCost(item.onHand, item))}</strong>
        </div>
        <div class="forecast-stat">
          <span>Value of inventory to order:</span>
          <strong>${formatCurrency(suggestedOrderValue)}</strong>
        </div>
        <div class="forecast-stat">
          <span>Last 7 days avg use:</span>
          <strong>${formatNumber(forecast.avgDailyUsage)} ${item.unit}</strong>
        </div>
        <div class="forecast-stat">
          <span>Safety Buffer:</span>
          <strong>${formatNumber(forecast.safetyBuffer)} ${item.unit}</strong>
        </div>
      </div>
      <p class="forecast-reason">${escapeHtml(forecast.explanation)}</p>
      <div class="forecast-actions">
        <div class="fraction-row">
          <button class="mini-btn" data-toggle-override="${item.id}">Manager Override ideal</button>
          ${override ? `<span class="pill">Override saved</span>` : ""}
        </div>
        <div class="forecast-override-box ${overrideOpen ? "" : "is-hidden"}" data-override-box="${item.id}">
          <div class="forecast-input-row">
            <label>Manager Override ideal
              <input type="number" step="0.01" min="0" data-forecast-field="overrideIdeal" data-forecast-id="${item.id}" value="${effectiveIdeal}">
            </label>
            <label>Override reason
              <select data-forecast-field="reason" data-forecast-id="${item.id}">
                <option value="personal_belief" ${override?.reason === "personal_belief" ? "selected" : ""}>Personal belief/inaccurate forecast</option>
                <option value="large_order" ${override?.reason === "large_order" ? "selected" : ""}>Large Order</option>
                <option value="special_event" ${override?.reason === "special_event" ? "selected" : ""}>Special Event</option>
                <option value="other" ${override?.reason === "other" ? "selected" : ""}>Other</option>
              </select>
            </label>
          </div>
          <div class="forecast-input-row is-hidden" data-special-event-fields="${item.id}">
            <label>Special event/holiday name
              <input type="text" data-forecast-field="eventName" data-forecast-id="${item.id}" value="${escapeHtml(override?.eventName || "")}" placeholder="What event?">
            </label>
            <label>Date
              <input type="date" data-forecast-field="eventDate" data-forecast-id="${item.id}" value="${escapeHtml(override?.eventDate || getBusinessDay())}">
            </label>
          </div>
          <div class="forecast-input-row is-hidden" data-manager-note-fields="${item.id}">
            <label>Manager note
              <input type="text" data-forecast-field="note" data-forecast-id="${item.id}" value="${escapeHtml(override?.note || "")}" placeholder="Why are you overriding?">
            </label>
          </div>
          <div class="fraction-row">
            <button class="mini-btn" data-save-forecast="${item.id}">Save Override</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function itemMetaLabel(item) {
  const tags = [getTypeLabel(item.unitType), item.unit];
  if (item.isBoxTracked) {
    tags.push("box tracked");
  }
  if (item.weightPerBox) {
    tags.push(`${formatNumber(item.weightPerBox)} lb per ${item.unit}`);
  }
  if (item.piecesPerBox) {
    tags.push(`${formatNumber(item.piecesPerBox)} pcs per ${item.unit}`);
  }
  if (item.isFinishedProduct) {
    tags.push("finished product");
  }
  return escapeHtml(tags.join(" | "));
}

function isLikelyBoxUnit(unit) {
  return ["case", "tray", "box", "carton"].includes(String(unit).toLowerCase());
}

function inferUnitType(unit) {
  const value = String(unit).toLowerCase();
  if (["kg", "g", "lb", "oz", "l", "ml"].includes(value)) {
    return "weight";
  }
  if (["packet", "pack"].includes(value)) {
    return "packet";
  }
  if (value === "white box") {
    return "white_box";
  }
  if (value === "bucket") {
    return "bucket";
  }
  if (value === "piece" || value === "single count") {
    return "single_count";
  }
  if (isLikelyBoxUnit(value)) {
    return "box";
  }
  return "single_count";
}

function toBoolean(value) {
  return ["true", "yes", "1"].includes(String(value).toLowerCase());
}

function syncProductTypeForm() {
  const config = getTypeConfig(refs.productUnitType.value);
  const currentPriceBasis = refs.productPriceBasis.value;
  refs.productPriceBasis.innerHTML = config.allowedPriceBasis
    .map((basis) => `<option value="${basis}">${escapeHtml(getPriceBasisOptionLabel(basis, config))}</option>`)
    .join("");
  refs.productPriceBasis.value = config.allowedPriceBasis.includes(currentPriceBasis)
    ? currentPriceBasis
    : config.priceBasis;
  refs.productOnHand.placeholder = `${config.label} quantity on hand`;
  refs.productIdeal.placeholder = `Ideal ${config.label.toLowerCase()} quantity`;
  refs.productPrice.placeholder = `Price per ${getPriceBasisLabel(refs.productPriceBasis.value)}`;
  refs.productWeightPerBox.placeholder = config.weightFieldLabel || "Not needed for this type";
  refs.productPiecesPerBox.placeholder = config.extraFieldLabel || "Optional extra detail";
  refs.productWeightWrap.classList.toggle("is-hidden", !config.showWeightField || !shouldShowWeightField(config, refs.productPriceBasis.value));
  refs.productPiecesWrap.classList.toggle("is-hidden", !config.showPiecesField);
  if (!shouldShowWeightField(config, refs.productPriceBasis.value)) {
    refs.productWeightPerBox.value = "";
  }
  if (!config.showPiecesField) {
    refs.productPiecesPerBox.value = "";
  }
}

function saveManagerCard(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  const inputs = [...refs.inventoryCards.querySelectorAll(`[data-card-id="${itemId}"]`)];
  inputs.forEach((input) => {
    item[input.dataset.cardField] = Math.max(0, Number(input.value) || 0);
  });
  saveState();
  upsertItemRemote(item);
  renderApp();
}

function addProductFromForm(event) {
  event.preventDefault();

  const form = new FormData(refs.addProductForm);
  const unitType = form.get("productUnitType");
  const config = getTypeConfig(unitType);
  const item = normalizeItem({
    id: crypto.randomUUID(),
    name: String(form.get("productName") || "").trim(),
    category: String(form.get("productCategory") || "").trim(),
    unit: config.unit,
    unitType,
    price: Number(form.get("productPrice")) || 0,
    priceBasis: String(form.get("productPriceBasis") || config.priceBasis),
    onHand: Number(form.get("productOnHand")) || 0,
    ideal: Number(form.get("productIdeal")) || 0,
    weightPerBox: Number(form.get("productWeightPerBox")) || 0,
    piecesPerBox: Number(form.get("productPiecesPerBox")) || 0,
    isFinishedProduct: form.get("productFinished") === "on",
    isBoxTracked: ["white_box", "bucket", "box"].includes(unitType)
  });

  if (!item.name || !item.category) {
    return;
  }

  state.items.unshift(item);
  refs.addProductForm.reset();
  syncProductTypeForm();
  saveState();
  upsertItemRemote(item);
  renderApp();
}

function addCategoryFromForm(event) {
  event.preventDefault();
  const newCategory = String(refs.newCategoryName.value || "").trim();
  if (!newCategory) {
    return;
  }

  const existing = new Set(getCategoryOptions().map((category) => category.toLowerCase()));
  if (!existing.has(newCategory.toLowerCase())) {
    state.categories.push(newCategory);
    state.categories.sort((a, b) => a.localeCompare(b));
  }

  refs.addCategoryForm.reset();
  saveState();
  upsertCategoryRemote(newCategory);
  renderApp();
}

function deleteCategory(categoryName) {
  const isUsed = state.items.some((item) => item.category === categoryName);
  if (isUsed) {
    return;
  }

  state.categories = state.categories.filter((category) => category !== categoryName);
  if (filters.category === categoryName) {
    filters.category = "All";
  }
  saveState();
  deleteCategoryRemote(categoryName);
  renderApp();
}

function getTypeConfig(unitType) {
  return TYPE_CONFIG[unitType] || TYPE_CONFIG.single_count;
}

function getTypeLabel(unitType) {
  return getTypeConfig(unitType).label;
}

function shouldShowWeightField(config, priceBasis) {
  if (!config.showWeightField) {
    return false;
  }
  return priceBasis === "per_lb" || priceBasis === "per_kg" || priceBasis === "per_weight_unit";
}

function getPriceBasisOptionLabel(priceBasis, config) {
  const labels = {
    per_lb: `Price per lb`,
    per_kg: `Price per kg`,
    per_bucket: `Price per ${config.unit}`,
    per_box: `Price per ${config.unit}`,
    per_packet: `Price per packet`,
    per_piece: `Price per piece`,
    per_weight_unit: `Price per ${config.unit === "lb" ? "lb" : config.unit}`
  };
  return labels[priceBasis] || `Price per ${config.unit}`;
}

function isContainerType(item) {
  return ["white_box", "bucket", "box"].includes(item.unitType);
}

function getCategoryOptions() {
  return [...new Set([...(state.categories || DEFAULT_CATEGORIES), ...state.items.map((item) => item.category)])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function getForecastSuggestion(item) {
  return getForecastSuggestionForDay(item, getBusinessDay());
}

function getOrderingTarget(item) {
  if (item.category === "Mithai") {
    const forecast = getForecastSuggestion(item);
    const override = getForecastOverride(item.id);
    return {
      baseIdeal: item.ideal,
      suggestedIdeal: forecast.suggestedIdeal,
      targetIdeal: override?.overrideIdeal ?? forecast.suggestedIdeal,
      explanation: forecast.explanation,
      override,
      hasForecast: true
    };
  }

  return {
    baseIdeal: item.ideal,
    suggestedIdeal: item.ideal,
    targetIdeal: item.ideal,
    explanation: "Using the current ideal quantity for reorder planning.",
    override: null,
    hasForecast: false
  };
}

function getSuggestedOrderQty(item, forecast, override) {
  const targetIdeal = override?.overrideIdeal ?? forecast.suggestedIdeal;
  const shortfall = Math.max(targetIdeal - item.onHand, 0);
  if (shortfall <= 0) {
    return 0;
  }
  if (isContainerType(item) || item.unitType === "packet") {
    return Math.max(1, Number(Math.ceil(shortfall)));
  }
  return Number(shortfall.toFixed(2));
}

function getEventMultiplier(context = state.currentDayContext || defaultDayContext()) {
  let multiplier = 1;

  if (context.dayType === "weekend") {
    multiplier += 0.1;
  }
  if (context.dayType === "stat_holiday") {
    multiplier += 0.2;
  }
  if (context.specialTag === "indian_holiday" || context.specialTag === "religious_holiday") {
    multiplier += 0.25;
  }
  if (context.specialTag === "christmas") {
    multiplier += 0.15;
  }
  if (context.specialTag === "weekend") {
    multiplier += 0.1;
  }

  return Number(multiplier.toFixed(2));
}

function buildForecastExplanation(avgDailyUsage, safetyBuffer, eventMultiplier, context = state.currentDayContext || defaultDayContext()) {
  const tags = [];
  if (context.dayType) {
    tags.push(context.dayType.replaceAll("_", " "));
  }
  if (context.specialTag) {
    tags.push(context.specialTag.replaceAll("_", " "));
  }
  if (context.specialEventName) {
    tags.push(context.specialEventName);
  }

  return `7-day avg use ${formatNumber(avgDailyUsage)} x ${MITHAI_DELIVERY_LEAD_DAYS}-day Mithai lead time, plus ${formatNumber(safetyBuffer)} tray buffer${eventMultiplier > 1 ? ` and ${formatNumber(eventMultiplier)}x demand uplift` : ""}${tags.length ? ` for ${tags.join(", ")}` : ""}.`;
}

function getForecastSuggestionForDay(item, day) {
  const context = getDayContextForDay(day);
  const recentSnapshots = [...state.daySnapshots]
    .filter((snapshot) => snapshot.itemId === item.id && snapshot.date <= day)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  const totalUsed = recentSnapshots.reduce((sum, snapshot) => sum + (Number(snapshot.usedQty) || 0), 0);
  const avgDailyUsage = recentSnapshots.length ? totalUsed / recentSnapshots.length : Math.max(item.ideal / MITHAI_DELIVERY_LEAD_DAYS, 0);
  const eventMultiplier = getEventMultiplier(context);
  const safetyBuffer = isContainerType(item) ? MITHAI_SAFETY_BUFFER : 0.5;
  const suggestedIdealRaw = (avgDailyUsage * MITHAI_DELIVERY_LEAD_DAYS * eventMultiplier) + safetyBuffer;
  const suggestedIdeal = isContainerType(item)
    ? Math.max(1, Number(Math.ceil(suggestedIdealRaw)))
    : Number(suggestedIdealRaw.toFixed(2));

  return {
    avgDailyUsage,
    safetyBuffer,
    eventMultiplier,
    suggestedIdeal,
    explanation: buildForecastExplanation(avgDailyUsage, safetyBuffer, eventMultiplier, context)
  };
}

function getDayContextForDay(day) {
  if (day === getBusinessDay()) {
    return state.currentDayContext || defaultDayContext();
  }

  const snapshot = state.daySnapshots.find((entry) => entry.date === day);
  if (!snapshot) {
    return defaultDayContext();
  }

  return {
    dayType: snapshot.dayType || "weekday",
    specialTag: snapshot.specialTag || "",
    specialEventName: snapshot.specialEventName || ""
  };
}

function getForecastOverride(itemId) {
  return state.forecastOverrides.find((entry) => entry.date === getBusinessDay() && entry.itemId === itemId) || null;
}

function getForecastOverrideForDay(itemId, day) {
  return state.forecastOverrides.find((entry) => entry.date === day && entry.itemId === itemId) || null;
}

function saveForecastOverride(itemId) {
  const overrideIdeal = Number(readForecastField(itemId, "overrideIdeal")) || 0;
  const reason = readForecastField(itemId, "reason") || "personal_belief";
  const eventName = readForecastField(itemId, "eventName") || "";
  const eventDate = readForecastField(itemId, "eventDate") || "";
  const note = readForecastField(itemId, "note") || "";
  saveForecastOverridePayload(itemId, {
    overrideIdeal,
    reason,
    eventName,
    eventDate,
    note
  });
}

function saveForecastOverridePayload(itemId, payloadFields) {
  const existingIndex = state.forecastOverrides.findIndex((entry) => entry.date === getBusinessDay() && entry.itemId === itemId);
  const payload = {
    date: getBusinessDay(),
    itemId,
    ...payloadFields
  };

  if (existingIndex >= 0) {
    state.forecastOverrides[existingIndex] = payload;
  } else {
    state.forecastOverrides.push(payload);
  }

  const item = state.items.find((entry) => entry.id === itemId);
  if (item && payloadFields.overrideIdeal > 0) {
    item.ideal = payloadFields.overrideIdeal;
    upsertItemRemote(item);
  }

  saveState();
  upsertForecastOverrideRemote(payload);
  renderApp();
}

function readForecastField(itemId, field) {
  const node = refs.forecastCards.querySelector(`[data-forecast-id="${itemId}"][data-forecast-field="${field}"]`);
  return node ? node.value : "";
}

function toggleForecastOverride(itemId) {
  const box = refs.forecastCards.querySelector(`[data-override-box="${itemId}"]`);
  if (!box) {
    return;
  }
  box.classList.toggle("is-hidden");
}

function toggleOrderingOverride(itemId) {
  const box = refs.orderingList.querySelector(`[data-ordering-override-box="${itemId}"]`);
  if (!box) {
    return;
  }
  box.classList.toggle("is-hidden");
}

function syncForecastOverrideFields(itemId) {
  const reason = readForecastField(itemId, "reason");
  const specialFields = refs.forecastCards.querySelector(`[data-special-event-fields="${itemId}"]`);
  const noteFields = refs.forecastCards.querySelector(`[data-manager-note-fields="${itemId}"]`);

  if (specialFields) {
    specialFields.classList.toggle("is-hidden", reason !== "special_event");
  }
  if (noteFields) {
    noteFields.classList.toggle("is-hidden", reason !== "personal_belief" && reason !== "other");
  }
}

function syncOrderingOverrideFields(itemId) {
  const reason = readOrderingField(itemId, "reason");
  const specialFields = refs.orderingList.querySelector(`[data-ordering-special-event-fields="${itemId}"]`);
  const noteFields = refs.orderingList.querySelector(`[data-ordering-manager-note-fields="${itemId}"]`);

  if (specialFields) {
    specialFields.classList.toggle("is-hidden", reason !== "special_event");
  }
  if (noteFields) {
    noteFields.classList.toggle("is-hidden", reason !== "personal_belief" && reason !== "other");
  }
}

function readOrderingField(itemId, field) {
  const node = refs.orderingList.querySelector(`[data-ordering-id="${itemId}"][data-ordering-field="${field}"]`);
  return node ? node.value : "";
}

function saveOrderingOverride(itemId) {
  const overrideIdeal = Number(readOrderingField(itemId, "overrideIdeal")) || 0;
  const reason = readOrderingField(itemId, "reason") || "personal_belief";
  const eventName = readOrderingField(itemId, "eventName") || "";
  const eventDate = readOrderingField(itemId, "eventDate") || "";
  const note = readOrderingField(itemId, "note") || "";
  saveForecastOverridePayload(itemId, {
    overrideIdeal,
    reason,
    eventName,
    eventDate,
    note
  });
}

function getOpeningQtyForDay(itemId, day) {
  const previousSnapshot = [...state.daySnapshots]
    .filter((snapshot) => snapshot.itemId === itemId && snapshot.date < day)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  if (previousSnapshot) {
    return Number(previousSnapshot.closingQty) || 0;
  }

  const item = state.items.find((entry) => entry.id === itemId);
  return item ? (Number(item.onHand) + getEntryInventoryDeltaTotal(itemId, "consumed") + getEntryInventoryDeltaTotal(itemId, "wasted")) : 0;
}

function getRecommendedOrderQty(item, target = null) {
  const effectiveTarget = target?.targetIdeal ?? item.ideal;
  const shortfall = Math.max(effectiveTarget - item.onHand, 0);
  return getRecommendedOrderQtyFromShortfall(item, shortfall);
}

function getRecommendedOrderQtyFromShortfall(item, shortfall) {
  if (shortfall <= 0) {
    return 0;
  }

  if (["white_box", "bucket", "box"].includes(item.unitType) || isLikelyBoxUnit(item.unit)) {
    return Math.max(1, Number(Math.ceil(shortfall)));
  }

  if (item.unitType === "packet") {
    return Math.max(1, Number(Math.ceil(shortfall)));
  }

  return Number(shortfall.toFixed(2));
}

function getMinimumOrderQty(item) {
  if (["white_box", "bucket", "box", "packet"].includes(item.unitType) || isLikelyBoxUnit(item.unit)) {
    return 1;
  }
  return Math.max(1, Number(Math.ceil(getRecommendedOrderQty(item) || 1)));
}

function getItemUnitCost(item) {
  if ((item.priceBasis === "per_lb" || item.priceBasis === "per_kg") && item.weightPerBox > 0) {
    return item.price * item.weightPerBox;
  }
  return item.price;
}

function getItemLineCost(qty, item) {
  return qty * getItemUnitCost(item);
}

function computeInventoryDelta(item, delta) {
  if (["white_box", "bucket", "box"].includes(item.unitType) && item.piecesPerBox > 0) {
    return delta / item.piecesPerBox;
  }
  return delta;
}

function getInventoryDelta(entry) {
  return entry.inventoryDelta == null ? entry.delta : entry.inventoryDelta;
}

function formatEntryTotal(total, item) {
  if (["white_box", "bucket", "box"].includes(item.unitType) && item.piecesPerBox > 0) {
    return `${formatNumber(total)} pcs`;
  }
  return `${formatNumber(total)} ${item.unit}`;
}

function formatUsageTotal(row) {
  if (["white_box", "bucket", "box"].includes(row.unitType) && row.piecesPerBox > 0) {
    return `${formatNumber(row.total)} pcs`;
  }
  return `${formatNumber(row.total)} ${row.unit}`;
}

function formatOrderQuantity(qty, item) {
  if (!qty) {
    return `0 ${item.unit}`;
  }
  if (item.unitType === "box" || item.unitType === "packet" || isLikelyBoxUnit(item.unit)) {
    return `${formatNumber(qty)} ${item.unit}`;
  }
  return `${formatNumber(qty)} ${item.unit}`;
}

function formatPriceDisplay(item) {
  return `${formatCurrency(item.price)} / ${getPriceBasisLabel(item.priceBasis)}`;
}

function getPriceBasisLabel(priceBasis) {
  const labels = {
    per_unit: "unit",
    per_lb: "lb",
    per_kg: "kg",
    per_bucket: "bucket",
    per_box: "box",
    per_packet: "packet",
    per_piece: "piece",
    per_weight_unit: "lb"
  };
  return labels[priceBasis] || "unit";
}

function formatSignedEntry(entry, item) {
  const label = ["white_box", "bucket", "box"].includes(item.unitType) && item.piecesPerBox > 0 ? "pcs" : item.unit;
  return `${formatSignedNumber(entry.delta)} ${label}`;
}

function getTabletAddLabel(item, amount) {
  if (["white_box", "bucket", "box"].includes(item.unitType)) {
    return `Add ${formatNumber(amount)} ${item.unit}`;
  }
  return `Add ${formatNumber(amount)}`;
}

function getDefaultUseAmount(item) {
  if (["white_box", "bucket", "box"].includes(item.unitType) && item.piecesPerBox > 0) {
    return 10;
  }
  return 1;
}

function getDefaultUndoAmount(item) {
  return -getDefaultUseAmount(item);
}

function getMovementLabel(item, amount) {
  const absoluteAmount = Math.abs(amount);
  if (["white_box", "bucket", "box"].includes(item.unitType) && item.piecesPerBox > 0) {
    return `${formatNumber(absoluteAmount)} pcs`;
  }
  return `${formatNumber(absoluteAmount)}`;
}

function getPiecesFieldLabel(item) {
  if (item.unitType === "packet") {
    return "Pieces / packet";
  }
  if (["white_box", "bucket", "box"].includes(item.unitType)) {
    return `Pieces / ${item.unit}`;
  }
  return "Pieces";
}

function closeCurrentDay() {
  const metrics = getMetrics();
  const day = getBusinessDay();
  const nextDay = refs.nextBusinessDayInput.value || getNextDayIso(day);
  const dayContext = { ...(state.currentDayContext || defaultDayContext()) };
  const newSnapshots = [];

  state.items.forEach((item) => {
    const snapshot = {
      date: day,
      itemId: item.id,
      openingQty: getOpeningQtyForDay(item.id, day),
      usedQty: getEntryInventoryDeltaTotal(item.id, "consumed"),
      wastedQty: getEntryInventoryDeltaTotal(item.id, "wasted"),
      closingQty: item.onHand,
      dayType: dayContext.dayType,
      specialTag: dayContext.specialTag,
      specialEventName: dayContext.specialEventName
    };
    state.daySnapshots.push(snapshot);
    newSnapshots.push(snapshot);
  });

  const closedDay = {
    date: day,
    usageCost: metrics.todayConsumptionCost,
    wasteCost: metrics.todayWasteCost,
    orderLines: getOrderRows().length
  };
  state.closedDays.push(closedDay);
  state.currentDay = nextDay;
  state.orderQueue = [];
  state.currentDayContext = defaultDayContext();
  saveState();
  insertDaySnapshotsRemote(newSnapshots);
  upsertClosedDayRemote(closedDay);
  clearOrderQueueRemote();
  syncAppSettingsRemote();
  renderApp();
}

function setBusinessDayManually() {
  if (!refs.nextBusinessDayInput.value) {
    return;
  }

  state.currentDay = refs.nextBusinessDayInput.value;
  saveState();
  syncAppSettingsRemote();
  renderApp();
}

function moveBusinessDay(direction) {
  const currentDay = getBusinessDay();
  const knownDays = getKnownBusinessDays();
  const currentIndex = knownDays.indexOf(currentDay);

  if (currentIndex >= 0) {
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < knownDays.length) {
      state.currentDay = knownDays[nextIndex];
      saveState();
      syncAppSettingsRemote();
      renderApp();
      return;
    }
  }

  state.currentDay = shiftIsoDay(currentDay, direction);
  saveState();
  syncAppSettingsRemote();
  renderApp();
}

function getKnownBusinessDays() {
  return [...new Set([
    ...state.closedDays.map((day) => day.date),
    ...state.daySnapshots.map((snapshot) => snapshot.date),
    state.currentDay
  ])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function exportWorkbookToExcel() {
  const currentTargets = state.items.map((item) => {
    const target = getOrderingTarget(item);
    return { item, target };
  });
  const dailyHistoryRows = [...state.daySnapshots]
    .sort((a, b) => a.date.localeCompare(b.date) || a.itemId.localeCompare(b.itemId))
    .map((snapshot) => {
      const item = state.items.find((candidate) => candidate.id === snapshot.itemId);
      if (!item) {
        return null;
      }
      const forecast = getForecastSuggestionForDay(item, snapshot.date);
      const override = getForecastOverrideForDay(item.id, snapshot.date);
      const targetIdeal = override?.overrideIdeal ?? forecast.suggestedIdeal ?? item.ideal;
      return {
        Date: snapshot.date,
        Item: item.name,
        Category: item.category,
        Type: getTypeLabel(item.unitType),
        "Opening Qty": snapshot.openingQty,
        "Used Qty": snapshot.usedQty,
        "Wasted Qty": snapshot.wastedQty,
        "Closing Qty / On Hand": snapshot.closingQty,
        "Current Ideal": item.ideal,
        "AI Suggested Ideal": forecast.suggestedIdeal,
        "Manager Override Ideal": override?.overrideIdeal || "",
        "Target Ideal Used": targetIdeal,
        "AI Recommended Order Qty": getRecommendedOrderQtyFromShortfall(item, Math.max(targetIdeal - (Number(snapshot.closingQty) || 0), 0)),
        "Override Reason": override?.reason || "",
        "Override Event Name": override?.eventName || "",
        "Override Event Date": override?.eventDate || "",
        "Manager Note": override?.note || "",
        Explanation: forecast.explanation,
        "Day Type": snapshot.dayType,
        "Special Tag": snapshot.specialTag,
        "Special Event Name": snapshot.specialEventName
      };
    })
    .filter(Boolean);

  const worksheets = [
    {
      name: "Summary",
      rows: [
        {
          "Business Day": getBusinessDay(),
          "Total Items": state.items.length,
          "Total Categories": getCategoryOptions().length,
          "Inventory Value": getMetrics().totalInventoryValue,
          "Current Order Value": getMetrics().totalOrderCost,
          "Today Usage Cost": getMetrics().todayConsumptionCost,
          "Today Waste Cost": getMetrics().todayWasteCost,
          "Closed Days": state.closedDays.length,
          "Saved Overrides": state.forecastOverrides.length
        }
      ]
    },
    {
      name: "Master Inventory",
      rows: currentTargets.map(({ item, target }) => {
        return {
          "Product Name": item.name,
          Category: item.category,
          Type: getTypeLabel(item.unitType),
          Unit: item.unit,
          "Price Basis": getPriceBasisLabel(item.priceBasis),
          Price: item.price,
          "On Hand": item.onHand,
          "Current Ideal": item.ideal,
          "Suggested Ideal": target.suggestedIdeal,
          "Manager Override Ideal": target.override?.overrideIdeal || "",
          "Target Ideal Used": target.targetIdeal,
          "Recommended Order Qty": getRecommendedOrderQty(item, target),
          "Inventory Value": getItemLineCost(item.onHand, item),
          "AI Explanation": target.explanation,
          "Override Reason": target.override?.reason || "",
          "Override Event Name": target.override?.eventName || "",
          "Override Event Date": target.override?.eventDate || "",
          "Manager Note": target.override?.note || "",
          "Weight Per Container": item.weightPerBox || "",
          "Pieces Per Container": item.piecesPerBox || "",
          "Finished Product": item.isFinishedProduct ? "Yes" : "No"
        };
      })
    },
    {
      name: "Reorder Queue",
      rows: getOrderRows().map((row) => ({
        "Product Name": row.name,
        Category: row.category,
        "Current Ideal": row.baseIdeal,
        "Suggested Ideal": row.suggestedIdeal,
        "Manager Override Ideal": row.override?.overrideIdeal || "",
        "Target Ideal Used": row.targetIdeal,
        "On Hand": row.onHand,
        "Recommended Order Qty": row.recommendedQty,
        "Manual Queue Qty": row.manualQty,
        "Total Order Qty": row.totalQty,
        "Order Value": getItemLineCost(row.totalQty, row),
        "Override Reason": row.override?.reason || "",
        "Override Event Name": row.override?.eventName || "",
        "Override Event Date": row.override?.eventDate || "",
        "Manager Note": row.override?.note || "",
        Explanation: row.hasForecast ? row.explanation : "Current ideal reorder"
      }))
    },
    {
      name: "Daily Product History",
      rows: dailyHistoryRows
    },
    {
      name: "Daily Entries Raw",
      rows: state.entries.map((entry) => {
        const item = state.items.find((candidate) => candidate.id === entry.itemId);
        return {
          Date: entry.date,
          Timestamp: entry.timestamp,
          Item: item?.name || entry.itemId,
          Category: item?.category || "",
          Type: entry.type,
          Quantity: entry.delta,
          "Inventory Delta": getInventoryDelta(entry),
          Unit: item?.unit || ""
        };
      })
    },
    {
      name: "Day Snapshots Raw",
      rows: state.daySnapshots.map((snapshot) => {
        const item = state.items.find((candidate) => candidate.id === snapshot.itemId);
        return {
          Date: snapshot.date,
          Item: item?.name || snapshot.itemId,
          Category: item?.category || "",
          "Opening Qty": snapshot.openingQty,
          "Used Qty": snapshot.usedQty,
          "Wasted Qty": snapshot.wastedQty,
          "Closing Qty": snapshot.closingQty,
          "Day Type": snapshot.dayType,
          "Special Tag": snapshot.specialTag,
          "Special Event Name": snapshot.specialEventName
        };
      })
    },
    {
      name: "Day Tags",
      rows: getKnownBusinessDays().map((day) => {
        const context = getDayContextForDay(day);
        return {
          Date: day,
          "Day Type": context.dayType,
          "Special Tag": context.specialTag,
          "Special Event Name": context.specialEventName
        };
      })
    },
    {
      name: "Forecast Overrides",
      rows: state.forecastOverrides.map((override) => {
        const item = state.items.find((candidate) => candidate.id === override.itemId);
        return {
          Date: override.date,
          Item: item?.name || override.itemId,
          Category: item?.category || "",
          "Override Ideal": override.overrideIdeal,
          Reason: override.reason,
          "Event Name": override.eventName || "",
          "Event Date": override.eventDate || "",
          Note: override.note || ""
        };
      })
    },
    {
      name: "Reorder Queue Raw",
      rows: state.orderQueue.map((entry) => {
        const item = state.items.find((candidate) => candidate.id === entry.itemId);
        return {
          Date: entry.date,
          Timestamp: entry.timestamp || "",
          Item: item?.name || entry.itemId,
          Category: item?.category || "",
          Qty: entry.qty,
          Source: entry.source || ""
        };
      })
    },
    {
      name: "Closed Days",
      rows: state.closedDays.map((day) => ({
        Date: day.date,
        "Usage Cost": day.usageCost,
        "Waste Cost": day.wasteCost,
        "Order Lines": day.orderLines
      }))
    },
    {
      name: "Categories",
      rows: getCategoryOptions().map((category) => ({ Category: category }))
    }
  ];

  const workbookXml = buildSpreadsheetWorkbookXml(worksheets);
  const blob = new Blob([workbookXml], { type: "application/vnd.ms-excel" });
  const fileName = `kitchen-stockflow-export-${getBusinessDay()}.xls`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildSpreadsheetWorkbookXml(worksheets) {
  const sheetXml = worksheets.map((sheet) => buildWorksheetXml(sheet.name, sheet.rows)).join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#E8D8C3" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  ${sheetXml}
</Workbook>`;
}

function buildWorksheetXml(name, rows) {
  const headers = rows.length ? Object.keys(rows[0]) : ["No Data"];
  const headerRow = `<Row>${headers.map((header) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`).join("")}</Row>`;
  const bodyRows = rows.length
    ? rows.map((row) => `<Row>${headers.map((header) => buildCellXml(row[header])).join("")}</Row>`).join("")
    : `<Row><Cell><Data ss:Type="String">No data available</Data></Cell></Row>`;

  return `
  <Worksheet ss:Name="${escapeXml(name).slice(0, 31)}">
    <Table>
      ${headerRow}
      ${bodyRows}
    </Table>
  </Worksheet>`;
}

function buildCellXml(value) {
  if (value === null || value === undefined || value === "") {
    return `<Cell><Data ss:Type="String"></Data></Cell>`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-CA", { maximumFractionDigits: 2 }).format(value);
}

function formatSignedNumber(value) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value)}`;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDateLabel(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateCompact(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric"
  });
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getBusinessDay() {
  return state.currentDay || getTodayIso();
}

function getNextDayIso(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function shiftIsoDay(dateString, direction) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + direction);
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
