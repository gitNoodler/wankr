import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './DashboardSettings.css';

const DEFAULTS = {
  headerHeight: 72,
  titleFontSize: 24,
  titleLogoSize: 48,
  titleGap: 16,
  inputPanelHeight: 72,
  inputFontSize: 14,
  inputPadding: 8,
  inputBorderRadius: 12,
  inputGap: 8,
  panelPadding: 20,
  panelBorderRadius: 12,
  contentPadding: 32,
  sidebarWidth: 350,
};

function getInitialSettings() {
  try {
    const saved = localStorage.getItem('wankr_dashboard_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULTS;
}

export default function DashboardSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const isInitialMount = useRef(true);
  const [settings, setSettings] = useState(getInitialSettings);

  const settingToCssVar = useMemo(
    () => ({
      headerHeight: '--dashboard-header-height',
      titleFontSize: '--dashboard-title-font-size',
      titleLogoSize: '--dashboard-title-logo-size',
      titleGap: '--dashboard-title-gap',
      inputPanelHeight: '--dashboard-input-height',
      inputFontSize: '--dashboard-input-font-size',
      inputPadding: '--dashboard-input-padding',
      inputBorderRadius: '--dashboard-input-border-radius',
      inputGap: '--dashboard-input-gap',
      panelPadding: '--dashboard-panel-padding',
      panelBorderRadius: '--dashboard-panel-radius',
      contentPadding: '--dashboard-content-padding',
      sidebarWidth: '--dashboard-sidebar-width',
    }),
    []
  );

  const applyCssVariables = useCallback(
    (settingsToApply) => {
      const root = document.documentElement;
      Object.keys(settingsToApply).forEach((key) => {
        const cssVar = settingToCssVar[key];
        if (!cssVar) return;
        const value = settingsToApply[key];
        if (typeof value === 'number' && !Number.isNaN(value)) {
          root.style.setProperty(cssVar, `${value}px`);
        }
      });
    },
    [settingToCssVar]
  );

  useEffect(() => {
    applyCssVariables(getInitialSettings());
  }, [applyCssVariables]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem('wankr_dashboard_settings', JSON.stringify(settings));
      applyCssVariables(settings);
    } catch {
      // ignore storage errors
    }
  }, [settings, applyCssVariables]);

  const updateSetting = (key, value) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(numValue)) return;
    setSettings((prev) => {
      if (prev[key] === numValue) return prev;
      const next = { ...prev, [key]: numValue };
      const cssVar = settingToCssVar[key];
      if (cssVar) {
        document.documentElement.style.setProperty(cssVar, `${numValue}px`);
      }
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULTS);
  };

  return (
    <div className="dashboard-settings">
      <button
        type="button"
        className="dashboard-settings-toggle"
        onClick={(e) => {
          e?.preventDefault();
          e?.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title="Dashboard Settings"
      >
        ⚙️
      </button>

      {isOpen && (
        <div className="dashboard-settings-panel">
          <div className="dashboard-settings-header">
            <h3>Dashboard Settings</h3>
            <button
              type="button"
              className="dashboard-settings-close"
              onClick={(e) => {
                e?.preventDefault();
                e?.stopPropagation();
                setIsOpen(false);
              }}
            >
              ×
            </button>
          </div>

          <div className="dashboard-settings-content">
            <div className="settings-section">
              <h4>Header & Title</h4>
              <div className="settings-control">
                <label htmlFor="wankr-settings-header-height">
                  Header Height: {settings.headerHeight}px
                </label>
                <input
                  id="wankr-settings-header-height"
                  type="range"
                  min="48"
                  max="120"
                  value={settings.headerHeight}
                  onChange={(e) => updateSetting('headerHeight', e.target.value)}
                />
              </div>
              <div className="settings-control">
                <label htmlFor="wankr-settings-title-font">
                  Title Font Size: {settings.titleFontSize}px
                </label>
                <input
                  id="wankr-settings-title-font"
                  type="range"
                  min="16"
                  max="36"
                  value={settings.titleFontSize}
                  onChange={(e) => updateSetting('titleFontSize', e.target.value)}
                />
              </div>
              <div className="settings-control">
                <label htmlFor="wankr-settings-title-logo">
                  Title Logo Size: {settings.titleLogoSize}px
                </label>
                <input
                  id="wankr-settings-title-logo"
                  type="range"
                  min="32"
                  max="80"
                  value={settings.titleLogoSize}
                  onChange={(e) => updateSetting('titleLogoSize', e.target.value)}
                />
              </div>
              <div className="settings-control">
                <label htmlFor="wankr-settings-title-gap">
                  Title Gap: {settings.titleGap}px
                </label>
                <input
                  id="wankr-settings-title-gap"
                  type="range"
                  min="8"
                  max="32"
                  value={settings.titleGap}
                  onChange={(e) => updateSetting('titleGap', e.target.value)}
                />
              </div>
            </div>

            <div className="settings-section">
              <h4>Input Panel</h4>
              <div className="settings-control">
                <label htmlFor="wankr-settings-input-height">
                  Input Height: {settings.inputPanelHeight}px
                </label>
                <input
                  id="wankr-settings-input-height"
                  type="range"
                  min="48"
                  max="120"
                  value={settings.inputPanelHeight}
                  onChange={(e) => updateSetting('inputPanelHeight', e.target.value)}
                />
              </div>
              <div className="settings-control">
                <label htmlFor="wankr-settings-input-font">
                  Input Font Size: {settings.inputFontSize}px
                </label>
                <input
                  id="wankr-settings-input-font"
                  type="range"
                  min="10"
                  max="20"
                  step="0.5"
                  value={settings.inputFontSize}
                  onChange={(e) => updateSetting('inputFontSize', e.target.value)}
                />
              </div>
              <div className="settings-control">
                <label htmlFor="wankr-settings-input-padding">
                  Input Padding: {settings.inputPadding}px
                </label>
                <input
                  id="wankr-settings-input-padding"
                  type="range"
                  min="4"
                  max="16"
                  value={settings.inputPadding}
                  onChange={(e) => updateSetting('inputPadding', e.target.value)}
                />
              </div>
              <div className="settings-control">
                <label htmlFor="wankr-settings-input-radius">
                  Input Radius: {settings.inputBorderRadius}px
                </label>
                <input
                  id="wankr-settings-input-radius"
                  type="range"
                  min="6"
                  max="20"
                  value={settings.inputBorderRadius}
                  onChange={(e) => updateSetting('inputBorderRadius', e.target.value)}
                />
              </div>
              <div className="settings-control">
                <label htmlFor="wankr-settings-input-gap">
                  Input Gap: {settings.inputGap}px
                </label>
                <input
                  id="wankr-settings-input-gap"
                  type="range"
                  min="4"
                  max="16"
                  value={settings.inputGap}
                  onChange={(e) => updateSetting('inputGap', e.target.value)}
                />
              </div>
            </div>

            <div className="settings-section">
              <h4>Layout</h4>
              <div className="settings-control">
                <label htmlFor="wankr-settings-panel-padding">
                  Panel Gap: {settings.panelPadding}px
                </label>
                <input
                  id="wankr-settings-panel-padding"
                  type="range"
                  min="8"
                  max="32"
                  value={settings.panelPadding}
                  onChange={(e) => updateSetting('panelPadding', e.target.value)}
                />
              </div>
              <div className="settings-control">
                <label htmlFor="wankr-settings-panel-radius">
                  Panel Radius: {settings.panelBorderRadius}px
                </label>
                <input
                  id="wankr-settings-panel-radius"
                  type="range"
                  min="6"
                  max="20"
                  value={settings.panelBorderRadius}
                  onChange={(e) => updateSetting('panelBorderRadius', e.target.value)}
                />
              </div>
              <div className="settings-control">
                <label htmlFor="wankr-settings-content-padding">
                  Content Padding: {settings.contentPadding}px
                </label>
                <input
                  id="wankr-settings-content-padding"
                  type="range"
                  min="16"
                  max="48"
                  value={settings.contentPadding}
                  onChange={(e) => updateSetting('contentPadding', e.target.value)}
                />
              </div>
              <div className="settings-control">
                <label htmlFor="wankr-settings-sidebar-width">
                  Sidebar Width: {settings.sidebarWidth}px
                </label>
                <input
                  id="wankr-settings-sidebar-width"
                  type="range"
                  min="260"
                  max="420"
                  value={settings.sidebarWidth}
                  onChange={(e) => updateSetting('sidebarWidth', e.target.value)}
                />
              </div>
            </div>

            <div className="settings-actions">
              <button type="button" className="settings-reset-button" onClick={resetSettings}>
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
