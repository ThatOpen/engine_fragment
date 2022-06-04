import { FragmentData } from './mesh/base-types';
import { Fragment } from './mesh/fragment';
import { TagsManager } from './mesh/tags-manager';

export class FragmentAPI {
  tags = new TagsManager();
  list: { [fragmentID: string]: Fragment } = {};

  create(data: FragmentData) {
    const fragment = new Fragment(data);
    this.list[fragment.id] = fragment;
    this.tags.addTags(fragment.id, data.tags);
    return this.list[fragment.id];
  }

  remove(id: string) {
    const fragment = this.list[id];
    delete this.list[id];
    fragment.remove();
  }
}
