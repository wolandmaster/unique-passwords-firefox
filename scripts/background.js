/*
 * Unique Passwords
 * Copyright (c) 2020, Sandor Balazsi <sandor.balazsi@gmail.com>
 * This software may be distributed under the terms of the Apache 2.0 license.
 */

"use strict";

let popupParameters;

browser.menus.create({
  id: "unique-passwords",
  title: "Unique Passwords",
  contexts: [ "password" ]
});

browser.menus.onClicked.addListener(async (info, tab) => {
  popupParameters = {
    tabId: tab.id,
    frameId: info.frameId,
    passwordInputId: info.targetElementId,
    pageUrl: info.pageUrl
  };
  browser.pageAction.show(tab.id);
  await browser.pageAction.openPopup();
  await browser.pageAction.hide(tab.id);
});

browser.runtime.onMessage.addListener(async (msg) => {
  if (msg === "getPopupParameters") {
    return popupParameters;
  }
});