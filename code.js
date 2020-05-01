var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
figma.showUI(__html__, { width: 480, height: 320 });
const eventTypes = {
    USER_SETTINGS: 'user-settings',
    GET_USER_SETTINGS: 'get-user-settings',
    GET_SELECTED_TEXT: 'get-selected-Text',
    REPLACE_TEXT: 'replace-text',
    POST_SELECTED_TEXT: 'selected-text',
    POST_USER_SETTINGS: 'post-user-settings'
};
const nodeTypes = {
    TEXT: 'TEXT',
};
const duplicateValues = (arr, times) => {
    let result = [];
    for (let i = 0; i < times; i++) {
        result = result.concat(arr);
    }
    return result;
};
const getUserData = () => __awaiter(this, void 0, void 0, function* () {
    return yield figma.clientStorage.getAsync(eventTypes.USER_SETTINGS);
});
const saveUserData = (data) => __awaiter(this, void 0, void 0, function* () {
    yield figma.clientStorage.setAsync(eventTypes.USER_SETTINGS, data);
});
figma.ui.onmessage = (msg) => __awaiter(this, void 0, void 0, function* () {
    const { replace, replaceSymbols, type, text, loopData, reverse } = msg;
    if (type === eventTypes.GET_USER_SETTINGS) {
        const settings = yield getUserData();
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
    let regExp;
    if (replace) {
        const prepareRgx = replaceSymbols
            .split('')
            .map((item) => `\\${item}|`)
            .join('')
            .replace(/\|$/, '');
        regExp = new RegExp(`${prepareRgx}`, 'g');
    }
    if (type === eventTypes.REPLACE_TEXT) {
        yield saveUserData({ text, loopData, replaceSymbols, reverse, replace });
        const selectedItems = figma.currentPage.selection
            .filter((node) => node.type === nodeTypes.TEXT)
            .sort((a, b) => {
            const aNode = a.absoluteTransform[0][2] + a.absoluteTransform[1][2];
            const bNode = b.absoluteTransform[0][2] + b.absoluteTransform[1][2];
            return aNode - bNode;
        });
        let splitedText = text.split(/\r\n|\n|\t/g).filter((text) => text.trim() !== '');
        if (reverse) {
            splitedText.reverse();
        }
        if (loopData) {
            const duplicatesTimes = Math.ceil(selectedItems.length / splitedText.length);
            splitedText = duplicateValues(splitedText, duplicatesTimes);
        }
        for (let i = 0; i < selectedItems.length; i++) {
            if (selectedItems[i].type !== nodeTypes.TEXT || !splitedText[i]) {
                continue;
            }
            const { fontName } = selectedItems[i];
            yield figma.loadFontAsync(fontName);
            selectedItems[i].characters = splitedText[i].replace(regExp, '');
        }
    }
});
