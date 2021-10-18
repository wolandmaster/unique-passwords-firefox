/*
 * Unique Passwords [https://github.com/wolandmaster/unique-passwords-firefox]
 * Copyright (c) 2020-2021 Sandor Balazsi
 * This software may be distributed under the terms of the Apache 2.0 license
 */

"use strict";

const globalHashAlgorithm = document.getElementById("global-hash-algorithm");
const globalCostFactor = document.getElementById("global-cost-factor");
const globalCostFactorLabel = document.getElementById("global-cost-factor-label");
const exportSettings = document.getElementById("export-settings");
const importSettings = document.getElementById("import-settings");
const importSettingsInput = document.getElementById("import-settings-input");

async function restoreSettings() {
  const settings = await browser.storage.local.get();
  document.querySelectorAll("input:not([type=file]), select")
    .forEach(element => setInputValue(element, settings[element.id.toCamelCase()]));
  globalHashAlgorithm.dispatchEvent(new Event("input", { bubbles: true }));
  const cachedAccountsTable = document.querySelector("table");
  if (settings.cachedAccounts.length === 0) {
    cachedAccountsTable.style.display = "none";
  } else {
    settings.cachedAccounts.forEach(account => createTableRow(cachedAccountsTable, account));
  }
  document.querySelectorAll("input:not([type=file]), select")
    .forEach(element => element.addEventListener("change", saveSettings));
  document.querySelectorAll("svg")
    .forEach(element => element.addEventListener("click", deleteAccount));
}

function createTableRow(table, account) {
  let row = table.querySelector("template").content.cloneNode(true);
  row.querySelectorAll("input")
    .forEach(element => setInputValue(element, account[element.className.toCamelCase()]));
  table.querySelector("tbody").appendChild(row);
}

async function saveSettings(event) {
  let parent = event.target.parentElement;
  if (parent.tagName === "TD") {
    let cachedAccounts = await browser.storage.local.get().then(settings => settings.cachedAccounts);
    const index = parent.closest("tr").rowIndex - 1;
    cachedAccounts[index][event.target.className.toCamelCase()] = getInputValue(event.target);
    await browser.storage.local.set({ cachedAccounts });
  } else {
    await browser.storage.local.set({ [event.target.id.toCamelCase()]: getInputValue(event.target) });
  }
}

async function deleteAccount(event) {
  let row = event.target.closest("tr");
  let cachedAccounts = await browser.storage.local.get().then(settings => settings.cachedAccounts);
  cachedAccounts.splice(row.rowIndex - 1, 1);
  await browser.storage.local.set({ cachedAccounts });
  if (cachedAccounts.length === 0) {
    row.closest("table").style.display = "none";
  }
  row.parentNode.removeChild(row);
}

function getInputValue(element) {
  if (element.type === "checkbox") {
    return element.checked;
  } else if (element.type === "number") {
    return element.valueAsNumber;
  } else {
    return element.value;
  }
}

function setInputValue(element, value) {
  if (element.type === "checkbox") {
    element.checked = value;
  } else if (element.type === "number") {
    element.valueAsNumber = value;
  } else {
    element.value = value;
  }
}

function exportSettingsToJson(settings) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(
    [ JSON.stringify(settings, null, 2) ],
    { type: "application/json" }));
  a.download = "unique_passwords.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importSettingsFromJson(jsonText) {
  try {
    const json = JSON.parse(jsonText);
    fetch("scripts/schema.json")
      .then(async response => {
        const reader = new FileReader();
        reader.onload = () => {
          const schema = JSON.parse(reader.result);
          if (!tv4.validate(json, schema)) {
            alert("Failed to validate settings json schema!\n\n" + JSON.stringify(tv4.error, null, 2));
          } else {
            browser.storage.local.clear();
            browser.storage.local.set(json);
            browser.runtime.reload();
          }
        };
        reader.readAsText(await response.blob());
      });
  } catch (e) {
    alert("Failed to parse settings json!\n\n" + e.message);
  }
}

String.prototype.toCamelCase = function () {
  return this.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}

document.addEventListener("DOMContentLoaded", restoreSettings);
globalHashAlgorithm.addEventListener("input", function () {
  if (this.value === "scrypt") {
    [ globalCostFactor.style.visibility, globalCostFactorLabel.style.visibility ] = [ "visible", "visible" ];
  } else {
    [ globalCostFactor.style.visibility, globalCostFactorLabel.style.visibility ] = [ "hidden", "hidden" ];
  }
});
exportSettings.addEventListener("click", async () => exportSettingsToJson(await browser.storage.local.get()));
importSettings.addEventListener("click", () => importSettingsInput.click());
importSettingsInput.addEventListener("change", () => {
  const reader = new FileReader();
  reader.onload = () => importSettingsFromJson(reader.result);
  reader.readAsText(importSettingsInput.files[0]);
});
