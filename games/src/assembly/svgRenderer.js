// SVGの要素をフレーム間で再利用し、座標など変わった属性だけを更新する。
export function createSvgRenderer(svg) {
    const namespace = 'http://www.w3.org/2000/svg';
    const attributes = new WeakMap();
    const cursors = new Map();

    function begin() {
        cursors.clear();
        cursors.set(svg, 0);
    }

    function make(tag, attrs = {}, value, parent = svg) {
        const index = cursors.get(parent) ?? 0;
        cursors.set(parent, index + 1);
        let node = parent.childNodes[index];
        if (!node || node.localName !== tag) {
            const replacement = document.createElementNS(namespace, tag);
            if (node) parent.replaceChild(replacement, node);
            else parent.appendChild(replacement);
            node = replacement;
        }
        const previous = attributes.get(node) ?? new Map();
        for (const key of previous.keys()) {
            if (!(key in attrs)) {
                node.removeAttribute(key);
                previous.delete(key);
            }
        }
        for (const [key, raw] of Object.entries(attrs)) {
            const next = String(raw);
            if (previous.get(key) !== next) {
                node.setAttribute(key, next);
                previous.set(key, next);
            }
        }
        attributes.set(node, previous);
        if (value !== undefined) {
            if (node.textContent !== String(value)) node.textContent = String(value);
        } else {
            cursors.set(node, 0);
        }
        return node;
    }

    function end() {
        for (const [parent, count] of cursors) {
            while (parent.childNodes.length > count) parent.lastChild.remove();
        }
        cursors.clear();
    }

    return { begin, make, end };
}
