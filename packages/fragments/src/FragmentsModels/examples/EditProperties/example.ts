/* MD
  ## Editing BIM Properties 🪑
  ---
  In this tutorial, we'll explore how to easily edit BIM properties using the Fragments Edit API. We will create, delete, edit and relate properties, register everything in a history that we can revert and more. Let’s dive in!
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as OBC from "@thatopen/components";
import Stats from "stats.js";
import * as THREE from "three";
import * as BUI from "@thatopen/ui";
// You have to import * as FRAGS from "@thatopen/fragments"
import * as FRAGS from "../../../index";

/* MD
  ### 🌎 Setting up a Simple Scene
  To get started, let's set up a basic ThreeJS scene. This will serve as the foundation for our application and allow us to visualize the 3D models effectively:
*/

const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);
const container = document.getElementById("container") as HTMLDivElement;

const world = worlds.create<
  OBC.ShadowedScene,
  OBC.OrthoPerspectiveCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.ShadowedScene(components);
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);

components.init();

world.scene.three.add(new THREE.AxesHelper());

world.camera.three.far = 10000;

world.renderer.three.shadowMap.enabled = true;
world.renderer.three.shadowMap.type = THREE.PCFSoftShadowMap;

world.scene.setup({
  shadows: {
    cascade: 1,
    resolution: 1024,
  },
});

await world.scene.updateShadows();

world.camera.controls.addEventListener("rest", async () => {
  await world.scene.updateShadows();
});

/* MD
  :::info Do I need @thatopen/components?

  Not necessarily! While @thatopen/components simplifies the process of setting up a scene, you can always use plain ThreeJS to create your own custom scene setup. It's entirely up to your preference and project requirements! 😉

  :::

  ### 🛠️ Setting Up Fragments
  Now, let's configure the Fragments library core. This will allow us to load models effortlessly and start manipulating them with ease:
*/

// You have to copy `/node_modules/@thatopen/fragments/dist/Worker/worker.mjs` to your project directory
// and provide the relative path in `workerUrl`
// We use here the internal route of the worker in the library for simplicity purposes
const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
const fragments = new FRAGS.FragmentsModels(workerUrl);
world.camera.controls.addEventListener("control", () => fragments.update());

fragments.models.list.onItemSet.add(({ value: model }) => {
  model.tiles.onItemSet.add(({ value: mesh }) => {
    if ("isMesh" in mesh) {
      const mat = mesh.material as THREE.MeshStandardMaterial[];
      if (mat[0].opacity === 1) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    }
  });
});

/* MD
  ### 📂 Loading a Fragments Model
  With the core setup complete, it's time to load a Fragments model into our scene. Fragments are optimized for fast loading and rendering, making them ideal for large-scale 3D models.

  :::info Where can I find Fragment files?

  You can use the sample Fragment files available in our repository for testing. If you have an IFC model you'd like to convert to Fragments, check out the IfcImporter tutorial for detailed instructions.

  :::
*/

const fetched = await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag");
const buffer = await fetched.arrayBuffer();
const model = await fragments.load(buffer, {
  modelId: "medium_test",
  camera: world.camera.three,
});

world.scene.three.add(model.object);
await fragments.update(true);

/* MD
  ### ✏️ Setting up the model editor

    Now we'll set up all the logic to edit its properties. 
    
      
    :::info How to edit the model?

    When building an authoring app, objects could be edited in many ways: from just moving them and changing their material, to smart logic specific to their geometry (e.g. revit system families). For that reason, it's better to encapsulate the edit logic in a class that defines HOW we want to edit the elements. That way we can build multiple "editors" that we can use across our app.

    :::
    
    In this tutorial, we'll create a general Editor that can edit, create and delete properties and edit, create and delete relations. Let's start by defining some basic types:

*/

type TableData = {
  Name: string;
  Value?: string | number | boolean;
  LocalId: number;
  ParentLocalId?: number;
  ParentName?: string;
  Type?: "relation" | "related";
};

type TableNode = {
  data: TableData;
  children?: TableNode[];
};

type AttributeType = {
  name: string;
  type: string;
  value: string;
};

/* MD
  Now, let's create our editor:
*/

class PropertyEditor {
  // Now we'll define some basic events to update the UI
  onItemCreated = new OBC.Event<void>();
  onPropertiesUpdated = new OBC.Event<TableNode[]>();
  onCategoriesUpdated = new OBC.Event<void>();

  // We will store the data config here used to retrieve the
  // properties and relations from the model
  elementConfig: FRAGS.ElementConfig = {
    data: {
      attributesDefault: true,
      relations: {
        IsDefinedBy: { attributes: true, relations: true },
        DefinesOcurrence: { attributes: false, relations: false },
      },
    },
  };

  // We'll need a reference to the currently used element and meshes
  currentElement: FRAGS.Element | null = null;
  currentMesh: THREE.Group | null = null;

  // Here we'll store the current data we are editing in the UI
  itemsDataById = new Map<number, FRAGS.ItemData>();
  updatedItems = new Set<number>();
  currentRelation: { id: number; name: string; ids: number[] } | null = null;
  currentCategory: string | null = null;
  currentAttributes: AttributeType[] = [];

  // And here we'll have a list of all categories to select
  // items by category in the UI
  allCategories: string[] = [];

  private _world: OBC.World;

  constructor(world: OBC.World) {
    this._world = world;
    this.setupEvents();
  }

  // We'll initialize the categories here because it's async,
  // so we can't do it in the constructor
  async init() {
    this.allCategories = await model.getCategories();
  }

  // We'll use this when the user clicks the "Add attribute" button in the UI
  // to add a new empty attribute to the current list of attributes
  addEmptyAttribute() {
    this.currentAttributes.push({
      name: "",
      type: "",
      value: "",
    });
  }

  // We'll use this when the user clicks the "Delete attribute" button in the UI
  // to remove the attribute from the current list of attributes
  deleteAttribute(attribute: AttributeType) {
    const index = this.currentAttributes.indexOf(attribute);
    this.currentAttributes.splice(index, 1);
  }

  // We'll use this when the user types in the "Value" input in the UI
  // to update the value of the attribute
  updateAttribute(row: Partial<TableData>, e: any) {
    if (!this.currentElement) return;
    const localId = row.LocalId as number;
    const item = this.itemsDataById.get(localId);
    if (!item) {
      throw new Error(`Item ${localId} not found`);
    }
    const attr = item[row.Name!] as FRAGS.ItemAttribute;
    attr.value = e.target.value;
    this.updatedItems.add(localId);
  }

  // We'll use this to regenerate the properties table in the UI
  updatePropertiesTable = async () => {
    if (!this.currentElement) {
      return;
    }
    this.itemsDataById.clear();
    this.updatedItems.clear();
    const data = await this.currentElement.getData();
    const rootNode = this.getTableRecursively(data);
    this.onPropertiesUpdated.trigger([rootNode]);
  };

  // We'll use this to apply all the changes to properties and relations

  async applyChanges() {
    if (!this.currentElement) {
      return;
    }

    for (const localId of this.updatedItems) {
      const item = this.itemsDataById.get(localId);
      if (!item) {
        throw new Error(`Item ${localId} not found`);
      }
      fragments.editor.setItem(model.modelId, item);
    }

    await fragments.editor.applyChanges(model.modelId);

    if (this.currentElement && this.currentMesh) {
      this.currentElement.disposeMeshes(this.currentMesh);
    }

    this.onPropertiesUpdated.trigger([]);
    this.itemsDataById.clear();

    await fragments.update(true);
    this.currentElement = null;
    this.updatePropertiesTable();
  }

  // We'll use this to create a new relation between items
  // E.g. to assign a property to a property set
  async relate() {
    if (!this.currentRelation) {
      return;
    }
    const { id, name, ids } = this.currentRelation;
    await fragments.editor.relate(model.modelId, id, name, ids);
    await fragments.editor.applyChanges(model.modelId);
    await this.updatePropertiesTable();
  }

  // We'll use this to remove a relation between items
  // E.g. to remove a property from a property set
  async unrelate() {
    if (!this.currentRelation) {
      return;
    }
    const { id, name, ids } = this.currentRelation;
    await fragments.editor.unrelate(model.modelId, id, name, ids);
    await fragments.editor.applyChanges(model.modelId);
    await this.updatePropertiesTable();
  }

  // We'll use this to create a new item
  async createItem() {
    if (!this.currentCategory) return;

    const data: Record<string, FRAGS.ItemAttribute> = {};
    const guid = THREE.MathUtils.generateUUID();

    for (const attribute of this.currentAttributes) {
      if (attribute.name && attribute.value) {
        data[attribute.name] = {
          type: attribute.type,
          value: attribute.value,
        };
      }
    }

    fragments.editor.createItem(model.modelId, {
      data,
      category: this.currentCategory,
      guid,
    });

    await fragments.editor.applyChanges(model.modelId);

    this.allCategories = await model.getCategories();
    this.onCategoriesUpdated.trigger();

    this.onItemCreated.trigger();
  }

  // We'll use this to delete items from the model
  async deleteItem(localId: number) {
    if (!this.currentElement) {
      return;
    }
    await fragments.editor.deleteData(model.modelId, {
      itemIds: [localId],
    });
    await fragments.editor.applyChanges(model.modelId);
    await this.updatePropertiesTable();
  }

  // This method allows us to build the property tree of a given item
  // E.g. including all it's attribtes and certain relations recursively
  // (not all relations to avoid infinite recursion)
  private getTableRecursively(data: FRAGS.ItemData, parent?: TableNode) {
    const localId = (data._localId as FRAGS.ItemAttribute).value;
    this.itemsDataById.set(localId, data);

    const currentNode: TableNode = {
      data: {
        Name: localId,
        LocalId: localId,
        Type: "related",
      },
      children: [],
    };

    if (parent) {
      parent.children!.push(currentNode);
      currentNode.data.ParentLocalId = parent.data.LocalId;
      currentNode.data.ParentName = parent.data.Name;
    }

    for (const name in data) {
      const current = data[name];
      if (Array.isArray(current)) {
        // Is rel
        const relNode: TableNode = {
          data: {
            Name: name,
            LocalId: localId,
            Type: "relation",
          },
          children: [],
        };

        currentNode.children!.push(relNode);
        for (const item of current) {
          this.getTableRecursively(item, relNode);
        }
      } else {
        // Is attribute
        if (current.value === undefined || current.value === null) {
          continue;
        }
        if (name.startsWith("_")) {
          continue;
        }
        currentNode.children!.push({
          data: {
            Name: name,
            Value: current.value,
            LocalId: localId,
          },
        });
      }
    }

    return currentNode;
  }

  // We'll use this to setup the events:
  // - Double click to select an element
  // - Escape to deselect the current element
  private setupEvents() {
    const mouse = new THREE.Vector2();
    const canvas = world.renderer!.three.domElement!;
    canvas.addEventListener("dblclick", async (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      let result: any;

      if (this.currentElement && this.currentMesh) {
        this.currentElement.disposeMeshes(this.currentMesh);
      }

      // Raycast all models, including delta models

      for (const [, model] of fragments.models.list) {
        const promises: Promise<FRAGS.RaycastResult | null>[] = [];
        promises.push(
          model.raycast({
            camera: world.camera.three,
            mouse,
            dom: world.renderer!.three.domElement!,
          }),
        );
        const results = await Promise.all(promises);
        let smallestDistance = Infinity;
        for (const current of results) {
          if (current) {
            if (current.distance < smallestDistance) {
              smallestDistance = current.distance;
              result = current;
            }
          }
        }
      }
      if (!result) {
        return;
      }

      const [element] = await fragments.editor.getElements(model.modelId, [
        result.localId,
      ]);

      this.currentElement = element;
      this.currentElement.config = this.elementConfig;

      if (!element) {
        return;
      }

      this.currentMesh = await element.getMeshes();
      this.currentMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshLambertMaterial;
          mat.depthTest = false;
          mat.color.set("gold");
        }
      });
      this._world.scene.three.add(this.currentMesh);

      this.updatePropertiesTable();
    });

    window.addEventListener("keydown", async (event) => {
      if (event.key === "Escape") {
        if (!this.currentElement) {
          return;
        }

        if (this.currentElement && this.currentMesh) {
          this.currentElement.disposeMeshes(this.currentMesh);
        }

        this.currentElement.getRequests();

        this.currentAttributes = [];
        this.onPropertiesUpdated.trigger([]);
        this.itemsDataById.clear();
        await fragments.update(true);
        this.currentElement = null;
        this.updatePropertiesTable();
      }
    });
  }
}

/* MD
  Great! Now we just need to instantiate and initialize the editor we just built, and we'll be ready to start editing properties and relations.
*/

const editor = new PropertyEditor(world);
await editor.init();

/* MD
  ### 🧩 Adding User Interface (optional)
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

/* MD
  Now we will create various UI elements to use the logic of the editor we just made. We will start by defining a table to edit the properties of the selected element.
*/

const propertiesTable = document.createElement(
  "bim-table",
) as BUI.Table<TableData>;
propertiesTable.headersHidden = true;
propertiesTable.expanded = true;
propertiesTable.hiddenColumns = [
  "LocalId",
  "Type",
  "ParentLocalId",
  "ParentName",
];

/* MD
Now, before defining the properties table, we will define 3 modals. One for adding new items to a relation, one for creating new items and one for adding new relations. Let's start with the modal to add new items to a relation!
*/

const onCloseAddItemModal = new OBC.Event<void>();

const [addItemModal, updateAddItemModal] = BUI.Component.create<
  HTMLDialogElement,
  any
>((_) => {
  const itemIdsDropdownContainer = BUI.Component.create<HTMLDivElement>(() => {
    return BUI.html`
    <div></div>
    `;
  });

  // We'll define a function to get a list of items to select

  const updateItemIds = async (category: string | undefined) => {
    const children = [...itemIdsDropdownContainer.children];
    for (const child of children) {
      child.remove();
    }

    const itemIdsDropdown = BUI.Component.create<BUI.PanelSection>(() => {
      return BUI.html`
      <bim-dropdown label="Select items" multiple @change=${(e: any) => {
        if (!editor.currentRelation) return;
        editor.currentRelation.ids = e.target.value as number[];
      }}>
      </bim-dropdown>
      `;
    });

    itemIdsDropdownContainer.appendChild(itemIdsDropdown);

    if (!category) {
      return;
    }

    const regexp = new RegExp(category);
    const itemIdsByCategory = await model.getItemsOfCategories([regexp]);

    for (const categoryName in itemIdsByCategory) {
      const itemIds = itemIdsByCategory[categoryName];
      for (const itemId of itemIds) {
        const itemIdOption = BUI.Component.create<BUI.Option>(() => {
          return BUI.html`
          <bim-option value=${itemId} label=${itemId}></bim-option>
          `;
        });
        itemIdsDropdown.appendChild(itemIdOption);
      }
    }
  };

  // And now we'll create the dropdown to select the category of the item to add

  const categoriesDropdown = BUI.Component.create<BUI.Dropdown>(() => {
    return BUI.html`
        <bim-dropdown label="Select category" @change=${(e: any) => {
          if (e.target.value[0]) {
            updateItemIds(e.target.value[0]);
          }
        }}>
        ${editor.allCategories.map((category) => {
          return BUI.html`
          <bim-option value=${category} label=${category}>
          </bim-option>`;
        })}
        </bim-dropdown>
    `;
  });

  // Now, when closing the modal, we'll reset the data

  onCloseAddItemModal.reset();
  onCloseAddItemModal.add(() => {
    categoriesDropdown.value = [];
    updateAddItemModal();
  });

  // And now we'll return the HTML for the modal itself

  return BUI.html`
    <dialog class="blurred-dialog">
     <bim-panel style="border-radius: var(--bim-ui_size-base); width: 22rem;">
      <bim-panel-section fixed label="Add item to relation">
        ${categoriesDropdown}
        ${itemIdsDropdownContainer}
        <bim-button label="Apply" @click=${() => {
          if (editor.currentElement && editor.currentRelation) {
            editor.relate().then(() => {
              addItemModal.close();
            });
          }
        }}></bim-button>
      </bim-panel-section>
     </bim-panel> 
    </dialog>
  `;
}, {});

// Now, let's add the modal to the app and set up some last events

document.body.appendChild(addItemModal);

addItemModal.addEventListener("close", () => {
  onCloseAddItemModal.trigger();
});

editor.onCategoriesUpdated.add(() => {
  updateAddItemModal();
});

/* MD
  Now, let's create the modal to create new items. It will be a form that allows users to set arbitrary attributes for the new item.
*/

const onCloseCreateItemModal = new OBC.Event<void>();

const [createItemModal, updateCreateItemModal] = BUI.Component.create<
  HTMLDialogElement,
  any
>((_) => {
  // We'll start by creating a container for the form
  const formContainer = BUI.Component.create<HTMLDivElement>(() => {
    return BUI.html`
    <div style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
    `;
  });

  // We'll add an empty attribute if there are no attributes yet

  if (editor.currentAttributes.length === 0) {
    editor.addEmptyAttribute();
  }

  // And now we'll create a form entry for each attribute

  for (const attribute of editor.currentAttributes) {
    const entry = BUI.Component.create<HTMLDivElement>(() => {
      return BUI.html`
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <bim-text-input placeholder="Name" value=${attribute.name} @input=${(
          e: any,
        ) => {
          attribute.name = e.target.value;
        }}></bim-text-input>
        <bim-text-input placeholder="Type" value=${attribute.type} @input=${(
          e: any,
        ) => {
          attribute.type = e.target.value;
        }}></bim-text-input>
        <bim-text-input placeholder="Value" value=${attribute.value} @input=${(
          e: any,
        ) => {
          attribute.value = e.target.value;
        }}></bim-text-input>
        <bim-button icon="material-symbols:delete" @click=${() => {
          editor.deleteAttribute(attribute);
          updateCreateItemModal();
        }}></bim-button>
      </div>
      `;
    });
    formContainer.appendChild(entry);
  }

  // Now, when closing the modal, we'll reset the data

  onCloseCreateItemModal.reset();
  onCloseCreateItemModal.add(() => {
    editor.currentAttributes = [];
    updateCreateItemModal();
  });

  // And now we'll return the HTML for the modal itself

  return BUI.html`
    <dialog class="blurred-dialog">
     <bim-panel style="border-radius: var(--bim-ui_size-base); width: 22rem;">
         
      <bim-panel-section fixed label="Create new element">

      <bim-text-input label="Category" @input=${(e: any) => {
        editor.currentCategory = e.target.value as string;
      }}></bim-text-input>
        
        ${formContainer}
        <bim-button label="Add attribute" icon="ic:baseline-add" @click=${() => {
          editor.addEmptyAttribute();
          updateCreateItemModal();
        }}></bim-button>
        <bim-button label="Apply" @click=${() => {
          editor.createItem();
        }}></bim-button>
      </bim-panel-section>
     </bim-panel> 
    </dialog>
  `;
}, {});

// Now, let's add the modal to the app and set up some last events

document.body.appendChild(createItemModal);

editor.onItemCreated.add(() => {
  createItemModal.close();
});

createItemModal.addEventListener("close", () => {
  onCloseCreateItemModal.trigger();
});

editor.onCategoriesUpdated.add(() => {
  updateCreateItemModal();
});

/* MD
  Now let's create the modal to add new relations. It will be a form that allows users to select the category of the items to relate and the items themselves.
*/

const onCloseAddRelationModal = new OBC.Event<void>();

const [addRelationModal, updateAddRelationModal] = BUI.Component.create<
  HTMLDialogElement,
  any
>((_) => {
  // We'll start by creating a container for the dropdown to select the items
  const itemIdsDropdownContainer = BUI.Component.create<HTMLDivElement>(() => {
    return BUI.html`
    <div></div>
    `;
  });

  // We'll create a input to set the name of the relation

  const relationNameInput = BUI.Component.create<BUI.PanelSection>(() => {
    return BUI.html`
    <bim-text-input label="Relation name" @input=${(e: any) => {
      if (!editor.currentRelation) return;
      editor.currentRelation.name = e.target.value as string;
    }}>
    </bim-text-input>
    `;
  });

  // We'll define a function to get a list of items to select

  const updateItemIds = async (category: string | undefined) => {
    const children = [...itemIdsDropdownContainer.children];
    for (const child of children) {
      child.remove();
    }

    const itemIdsDropdown = BUI.Component.create<BUI.PanelSection>(() => {
      return BUI.html`
      <bim-dropdown label="Select items" multiple @change=${(e: any) => {
        if (!editor.currentRelation) return;
        editor.currentRelation.ids = e.target.value as number[];
      }}>
      </bim-dropdown>
      `;
    });

    itemIdsDropdownContainer.appendChild(itemIdsDropdown);

    if (!category) {
      return;
    }

    const regexp = new RegExp(category);
    const itemIdsByCategory = await model.getItemsOfCategories([regexp]);

    for (const categoryName in itemIdsByCategory) {
      const itemIds = itemIdsByCategory[categoryName];
      for (const itemId of itemIds) {
        const itemIdOption = BUI.Component.create<BUI.Option>(() => {
          return BUI.html`
          <bim-option value=${itemId} label=${itemId}></bim-option>
          `;
        });
        itemIdsDropdown.appendChild(itemIdOption);
      }
    }
  };

  // And now we'll create the dropdown to select the category of the item to relate

  const categoriesDropdown = BUI.Component.create<BUI.Dropdown>(() => {
    return BUI.html`
        <bim-dropdown label="Select category" @change=${(e: any) => {
          if (e.target.value[0]) {
            updateItemIds(e.target.value[0]);
          }
        }}>
        ${editor.allCategories.map((category) => {
          return BUI.html`<bim-option value=${category} label=${category}></bim-option>`;
        })}
        </bim-dropdown>
    `;
  });

  // Now, when closing the modal, we'll reset the data

  onCloseAddItemModal.reset();
  onCloseAddRelationModal.add(() => {
    categoriesDropdown.value = [];
    updateAddRelationModal();
  });

  // And now we'll return the HTML for the modal itself

  return BUI.html`
    <dialog class="blurred-dialog">
     <bim-panel style="border-radius: var(--bim-ui_size-base); width: 22rem;">
      <bim-panel-section fixed label="Add new relation">
        ${relationNameInput}
        ${categoriesDropdown}
        ${itemIdsDropdownContainer}
        <bim-button label="Create relation" @click=${() => {
          if (editor.currentElement && editor.currentRelation) {
            editor.elementConfig.data.relations[editor.currentRelation.name] = {
              attributes: true,
              relations: true,
            };
            editor.relate().then(() => {
              addRelationModal.close();
            });
          }
        }}></bim-button>
      </bim-panel-section>
     </bim-panel> 
    </dialog>
  `;
}, {});

// Now, let's add the modal to the app and set up some last events

document.body.appendChild(addRelationModal);

addRelationModal.addEventListener("close", () => {
  onCloseAddRelationModal.trigger();
});

/* MD
  And now, we can finally define the properties table
*/

propertiesTable.dataTransform = {
  Name: (value: any, row: Partial<TableData>) => {
    if (!row.Name || row.Name[0] === "_") {
      return value;
    }

    if (row.Type === "relation") {
      return BUI.html`
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <bim-label>${value}</bim-label>
          <bim-button icon="ic:baseline-plus" style="border: 1px solid var(--bim-ui_main-base); transform: scale(0.8);" @click=${() => {
            // Add existing item to relation
            editor.currentRelation = {
              id: row.LocalId as number,
              name: value,
              ids: [],
            };
            addItemModal.showModal();
          }}></bim-button>
        </div>
      `;
    }

    if (row.Type === "related") {
      return BUI.html`
        <div style="display: flex; align-items: center;">
          <bim-label>${value}</bim-label>
          ${
            row.ParentLocalId !== undefined
              ? BUI.html`<bim-button icon="ic:baseline-close" style="transform: scale(0.8);" @click=${() => {
                  // Remove this item from relation
                  if (editor.currentElement) {
                    editor.currentRelation = {
                      id: row.ParentLocalId as number,
                      name: row.ParentName as string,
                      ids: [row.LocalId as number],
                    };
                    editor.unrelate();
                  }
                }}></bim-button>

                <bim-button icon="material-symbols:delete" style="transform: scale(0.8);" @click=${() => {
                  // Remove this item entirely
                  if (editor.currentElement) {
                    editor.deleteItem(row.LocalId as number);
                  }
                }}></bim-button>
              `
              : ""
          }

          <bim-button icon="flowbite:paper-clip-outline" style="transform: scale(0.8);" @click=${() => {
            // Add new relation
            if (editor.currentElement) {
              editor.currentRelation = {
                id: row.LocalId as number,
                name: value,
                ids: [],
              };
              addRelationModal.showModal();
            }
          }}></bim-button>
          
        </div>
      `;
    }

    return value;
  },
  Value: (value: any, row: Partial<TableData>) => {
    if (!row.Name || row.Name[0] === "_") {
      return value;
    }

    if (typeof value === "string") {
      return BUI.html`<bim-text-input value=${value} @input=${(e: any) => {
        editor.updateAttribute(row, e);
      }}></bim-text-input>`;
    }

    if (typeof value === "number") {
      return BUI.html`<bim-number-input value=${value} @change=${(e: any) => {
        editor.updateAttribute(row, e);
      }}></bim-number-input>`;
    }

    return BUI.html`<bim-checkbox ?checked=${value} @change=${(e: any) => {
      editor.updateAttribute(row, e);
    }}></bim-checkbox>`;
  },
};

/* MD
  Next, let's create a function to export the edited model.
*/

const exportModel = async () => {
  await fragments.editor.save(model.modelId);
  window.setTimeout(async () => {
    const exportedBuffer = await model.getBuffer();
    const exportedBytes = new Uint8Array(exportedBuffer);
    const exportedBlob = new Blob([exportedBytes]);
    const exportedUrl = URL.createObjectURL(exportedBlob);
    const exportedLink = document.createElement("a");
    exportedLink.href = exportedUrl;
    exportedLink.download = "exported.frag";
    document.body.appendChild(exportedLink);
    exportedLink.click();
    document.body.removeChild(exportedLink);
    URL.revokeObjectURL(exportedUrl);
  }, 1000);
};

/* MD
  Let's define the last pieces of UI and put them all together.
*/

const updateTableButton = BUI.Component.create<BUI.Button>(() => {
  return BUI.html`
    <bim-button label="Apply changes" @click=${() => {
      editor.applyChanges();
    }}></bim-button>
  `;
});

editor.onPropertiesUpdated.add((data) => {
  propertiesTable.data = data;
  const tableVisible = propertiesTable.data.length > 0;
  updateTableButton.style.display = tableVisible ? "block" : "none";
});

const [panel] = BUI.Component.create<BUI.PanelSection, any>((_) => {
  return BUI.html`
    <bim-panel style="min-width: 25rem;" id="controls-panel" active label="Element Editor" class="options-menu">
      <bim-panel-section label="Controls">
      <bim-button label="Save" @click=${exportModel}></bim-button>
      <bim-button label="Create new item" @click=${() => {
        createItemModal.showModal();
      }}></bim-button>
      ${updateTableButton}
        ${propertiesTable}
      </bim-panel-section>
    </bim-panel>
  `;
}, {});

document.body.append(panel);

/* MD
  And we will make some logic that adds a button to the screen when the user is visiting our app from their phone, allowing to show or hide the menu. Otherwise, the menu would make the app unusable.
*/

const button = BUI.Component.create<BUI.PanelSection>(() => {
  const onClick = () => {
    if (panel.classList.contains("options-menu-visible")) {
      panel.classList.remove("options-menu-visible");
    } else {
      panel.classList.add("options-menu-visible");
    }
  };

  return BUI.html`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${onClick}>
    </bim-button>
  `;
});

document.body.append(button);

/* MD
  ### ⏱️ Measuring the performance (optional)
  We'll use the [Stats.js](https://github.com/mrdoob/stats.js) to measure the performance of our app. We will add it to the top left corner of the viewport. This way, we'll make sure that the memory consumption and the FPS of our app are under control.
*/

const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.left = "0px";
stats.dom.style.zIndex = "unset";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());

/* MD
  ### 🎉 Congratulations!
  You've successfully learned how to edit delete and create BIM properties using the Fragments Properties API! 🚀
*/
