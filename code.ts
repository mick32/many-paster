figma.showUI(__html__, { width: 480, height: 320 });

const eventTypes = {
  USER_SETTINGS: 'user-settings',
  GET_USER_SETTINGS: 'get-user-settings',
  GET_SELECTED_TEXT: 'get-selected-Text',
  REPLACE_TEXT: 'replace-text',
  POST_SELECTED_TEXT: 'selected-text',
  POST_USER_SETTINGS: 'post-user-settings'
}

const nodeTypes = {
  TEXT: 'TEXT',
}

const duplicateValues = (arr: string[], times: number): string[]  => {
  let result: string[] = [];

  for (let i: number = 0; i < times; i++) {
    result = result.concat(arr);
  }

  return result;
};

const getUserData = async () => {
  return await figma.clientStorage.getAsync(eventTypes.USER_SETTINGS);
};

const saveUserData = async (data) => {
  await figma.clientStorage.setAsync(eventTypes.USER_SETTINGS, data);
};

figma.ui.onmessage = async (msg) => {
  const { replace, replaceSymbols, type, text, loopData, reverse } = msg;

  if (type === eventTypes.GET_USER_SETTINGS) {
    const settings = await getUserData();
    figma.ui.postMessage({ type: eventTypes.POST_USER_SETTINGS, settings });

    return;
  }

  if (type === eventTypes.GET_SELECTED_TEXT) {
    const selectedItems = figma.currentPage.selection
      .filter((node) => node.type === nodeTypes.TEXT)
      .sort((a, b) => {
        const aNode = a.absoluteTransform[0][2] + a.absoluteTransform[1][2];
        const bNode = b.absoluteTransform[0][2] + b.absoluteTransform[1][2];

        return aNode - bNode;
      })
      .map((node) => node.characters);

    return figma.ui.postMessage({ type: eventTypes.POST_SELECTED_TEXT, selectedItems });
  }

  if (!figma.currentPage.selection.length) {
    alert('Select layers to paste data and repeat');

    return figma.closePlugin();
  }

  let regExp: RegExp;

  if (replace) {
    const prepareRgx: string = replaceSymbols
      .split('')
      .map((item) => `\\${item}|`)
      .join('')
      .replace(/\|$/, '');
    regExp = new RegExp(`${prepareRgx}`, 'g');
  }

  if (type === eventTypes.REPLACE_TEXT) {
    await saveUserData({ text, loopData, replaceSymbols, reverse, replace });

    const selectedItems: SceneNode[] = figma.currentPage.selection
      .filter((node) => node.type === nodeTypes.TEXT)
      .sort((a, b) => {
        const aNode = a.absoluteTransform[0][2] + a.absoluteTransform[1][2];
        const bNode = b.absoluteTransform[0][2] + b.absoluteTransform[1][2];

        return aNode - bNode;
      });

    let splitedText: string[] = text.split(/\r\n|\n|\t/g).filter((text) => text.trim() !== '');

    if (reverse) {
      splitedText.reverse();
    }

    if (loopData) {
      const duplicatesTimes: number = Math.ceil(selectedItems.length / splitedText.length);
      splitedText = duplicateValues(splitedText, duplicatesTimes);
    }

    for (let i = 0; i < selectedItems.length; i++) {
      if (selectedItems[i].type !== nodeTypes.TEXT || !splitedText[i]) {
        continue;
      }

      const { fontName } = selectedItems[i];
      await figma.loadFontAsync(fontName);

      selectedItems[i].characters = splitedText[i].replace(regExp, '');
    }
  }
};

