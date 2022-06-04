import { FragmentTags, TagsMap } from './base-types';

export class TagsManager {
  tags: TagsMap = {};

  addTags(fragmentId: string, tags: FragmentTags) {
    Object.keys(tags).forEach((tagName) => {
      const tagValue = this.initializeTag(tagName, tags);
      this.tags[tagName][tagValue].push(fragmentId);
    });
  }

  filter(_tags: FragmentTags) {
    return ['asdf'];
  }

  private initializeTag(tagName: string, tags: FragmentTags) {
    if (!this.tags[tagName]) {
      this.tags[tagName] = {};
    }
    const tagValue = tags[tagName];
    if (!this.tags[tagName][tagValue]) {
      this.tags[tagName][tagValue] = [];
    }
    return tagValue;
  }
}
