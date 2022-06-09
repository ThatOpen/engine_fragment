import { Fragment } from './mesh/fragment';
export class FragmentList {
    constructor() {
        this.list = {};
    }
    get(id) {
        return this.list[id];
    }
    create(data) {
        this.list[data.id] = new Fragment(data);
        return this.list[data.id];
    }
    remove(id) {
        if (!this.list[id])
            return;
        this.list[id].dispose();
        delete this.list[id];
    }
    dispose() {
        Object.values(this.list).forEach((fragment) => fragment.dispose());
        this.list = {};
    }
}
//# sourceMappingURL=fragmentList.js.map