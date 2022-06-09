import { FragmentData } from './mesh/base-types';
import { Fragment } from './mesh/fragment';

export class FragmentList {
  private list: { [fragmentID: string]: Fragment } = {};

  get(id: string) {
    return this.list[id];
  }

  create(data: FragmentData) {
    this.list[data.id] = new Fragment(data);
    return this.list[data.id];
  }

  remove(id: string) {
    if (!this.list[id]) return;
    this.list[id].dispose();
    delete this.list[id];
  }

  dispose() {
    Object.values(this.list).forEach((fragment) => fragment.dispose());
    this.list = {};
  }
}
