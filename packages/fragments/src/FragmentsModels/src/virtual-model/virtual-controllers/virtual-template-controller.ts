import {
  AnyTileBasicData,
  TileBasicData,
  TileData,
  VirtualTemplates,
} from "../virtual-meshes";

export class VirtualTemplateController {
  private readonly _templates: VirtualTemplates = new Map();

  add(code: number, template: AnyTileBasicData) {
    this._templates.set(code, template);
  }

  get(code: number) {
    const templates = this._templates.get(code);
    if (!Array.isArray(templates)) {
      return { ...templates } as TileData;
    }
    return this.getTemplateSet(templates);
  }

  private getTemplateSet(templates: TileBasicData[]) {
    const result: TileData[] = [];
    for (const template of templates) {
      const tileData = template as TileData;
      const copy = { ...tileData };
      result.push(copy);
    }
    return result;
  }
}
