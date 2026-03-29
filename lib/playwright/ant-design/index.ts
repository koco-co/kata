/**
 * Ant Design 组件交互工具 — barrel export
 */

// 组件交互
export {
  cancelPopconfirm,
  // Checkbox & Radio
  checkAntCheckbox,
  clickAntRadio,
  // Dropdown
  clickDropdownMenuItem,
  closeAntDrawer,
  closeAntModal,
  confirmAntModal,
  // Popconfirm / Popover
  confirmPopconfirm,
  // Message / Notification
  expectAntMessage,
  expectFormError,
  expectNoFormError,
  findTableRow,
  // Form
  locateFormItem,
  // Select
  selectAntOption,
  // Tabs
  switchAntTab,
  uncheckAntCheckbox,
  // Drawer
  waitForAntDrawer,
  // Modal
  waitForAntModal,
  waitForOverlay,
  // Table
  waitForTableLoaded,
} from "./interactions";

// 导航
export { navigateViaMenu } from "./navigation";
