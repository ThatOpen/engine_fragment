interface ReferenceAttr {
  value: number;
  type: 5;
}

interface AttrValue {
  value: string | boolean | number;
  type: number;
  name?: string;
}

export interface RawEntityAttrs {
  [name: string]:
    | AttrValue
    | ReferenceAttr
    | AttrValue[]
    | ReferenceAttr[]
    | null;
}
