figma.showUI(__html__, { width: 480, height: 320 });

const duplicateValues = (arr, times) => {
  let result = [];

  for (let i = 0; i < times; i++) {
    result = result.concat(arr);
  }

  return result;
};

const getUserData = async () => {
  return await figma.clientStorage.getAsync('user-settings');
};

const saveUserData = async (data) => {
  await figma.clientStorage.setAsync('user-settings', data);
};

figma.ui.onmessage = async (msg) => {
  const { replace, replaceSymbols, type, text, loopData, reverse } = msg;

  if (type === 'getUserSettings') {
    const settings = await getUserData();
    figma.ui.postMessage({ type: 'userSettings', settings });

    return;
  }

  if (type === 'getSelectedText') {
    const selectedItems = figma.currentPage.selection
      .filter((node) => node.type === 'TEXT')
      .sort((a, b) => {
        const aNode = a.absoluteTransform[0][2] + a.absoluteTransform[1][2];
        const bNode = b.absoluteTransform[0][2] + b.absoluteTransform[1][2];

        return aNode - bNode;
      })
      .map((node) => node.characters);

    return figma.ui.postMessage({ type: 'selectedText', selectedItems });
  }

  if (!figma.currentPage.selection.length) {
    alert('Select layers to paste data and repeat');

    return figma.closePlugin();
  }

  let regExp;

  if (replace) {
    const prepareRgx = replaceSymbols
      .split('')
      .map((item) => `\\${item}|`)
      .join('')
      .replace(/\|$/, '');
    regExp = new RegExp(`${prepareRgx}`, 'g');
  }

  if (type === 'replace-text') {
    await saveUserData({ text, loopData, replaceSymbols, reverse, replace });

    const selectedItems = figma.currentPage.selection
      .filter((node) => node.type === 'TEXT')
      .sort((a, b) => {
        const aNode = a.absoluteTransform[0][2] + a.absoluteTransform[1][2];
        const bNode = b.absoluteTransform[0][2] + b.absoluteTransform[1][2];

        return aNode - bNode;
      });

    let splitText = text.split(/\r\n|\n|\t/g).filter((text) => text.trim() !== '');

    if (reverse) {
      splitText.reverse();
    }

    if (loopData) {
      const duplicateLength = Math.ceil(selectedItems.length / splitText.length);
      splitText = duplicateValues(splitText, duplicateLength);
    }

    for (let i = 0; i < selectedItems.length; i++) {
      if (selectedItems[i].type !== 'TEXT' || !splitText[i]) {
        continue;
      }

      const { fontName } = selectedItems[i];
      await figma.loadFontAsync(fontName);

      selectedItems[i].characters = splitText[i].replace(regExp, '');
    }
  }
};
