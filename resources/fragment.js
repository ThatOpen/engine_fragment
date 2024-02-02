import * as THREE from 'three';

class FragmentMesh extends THREE.InstancedMesh {
    constructor(geometry, material, count, fragment) {
        super(geometry, material, count);
        if (!Array.isArray(material)) {
            material = [material];
        }
        this.material = material;
        if (!geometry.index) {
            throw new Error("The geometry for fragments must be indexed!");
        }
        this.geometry = geometry;
        this.fragment = fragment;
        const size = geometry.index.count;
        if (!geometry.groups.length) {
            geometry.groups.push({
                start: 0,
                count: size,
                materialIndex: 0,
            });
        }
    }
    exportData() {
        const position = this.geometry.attributes.position.array;
        const normal = this.geometry.attributes.normal.array;
        const index = Array.from(this.geometry.index.array);
        const groups = [];
        for (const group of this.geometry.groups) {
            const index = group.materialIndex || 0;
            const { start, count } = group;
            groups.push(start, count, index);
        }
        const materials = [];
        if (Array.isArray(this.material)) {
            for (const material of this.material) {
                const opacity = material.opacity;
                const transparent = material.transparent ? 1 : 0;
                const color = new THREE.Color(material.color).toArray();
                materials.push(opacity, transparent, ...color);
            }
        }
        const matrices = Array.from(this.instanceMatrix.array);
        let colors;
        if (this.instanceColor !== null) {
            colors = Array.from(this.instanceColor.array);
        }
        else {
            colors = [];
        }
        return {
            position,
            normal,
            index,
            groups,
            materials,
            matrices,
            colors,
        };
    }
}

/*
 * Fragments are just a simple wrapper around THREE.InstancedMesh.
 * Each fragments can contain Items (identified by ItemID) which
 * are mapped to one or many instances inside this THREE.InstancedMesh.
 *
 * Fragments also implement features like instance buffer resizing and
 * hiding out of the box.
 * */
let Fragment$1 = class Fragment {
    constructor(geometry, material, count) {
        this.ids = new Set();
        this.itemToInstances = new Map();
        this.instanceToItem = new Map();
        this.hiddenItems = new Set();
        this.capacity = 0;
        this.capacityOffset = 10;
        this.fragments = {};
        this._settingVisibility = false;
        this.mesh = new FragmentMesh(geometry, material, count, this);
        this.id = this.mesh.uuid;
        this.capacity = count;
        this.mesh.count = 0;
        // Maybe not necessary, because most fragments are super small
        // BVH.apply(geometry);
    }
    dispose(disposeResources = true) {
        this.clear();
        this.group = undefined;
        if (this.mesh) {
            if (disposeResources) {
                for (const mat of this.mesh.material) {
                    mat.dispose();
                }
                this.mesh.material = [];
                // BVH.dispose(this.mesh.geometry);
                this.mesh.geometry.dispose();
                this.mesh.geometry = null;
            }
            this.mesh.removeFromParent();
            this.mesh.dispose();
            this.mesh.fragment = null;
            this.mesh = null;
        }
        for (const key in this.fragments) {
            const frag = this.fragments[key];
            frag.dispose(disposeResources);
        }
        this.fragments = {};
    }
    get(itemID) {
        const instanceIDs = this.getInstancesIDs(itemID);
        if (!instanceIDs) {
            throw new Error("Item not found!");
        }
        const transforms = [];
        const colorsArray = [];
        for (const id of instanceIDs) {
            const matrix = new THREE.Matrix4();
            this.mesh.getMatrixAt(id, matrix);
            transforms.push(matrix);
            if (this.mesh.instanceColor) {
                const color = new THREE.Color();
                this.mesh.getColorAt(id, color);
            }
        }
        const colors = colorsArray.length ? colorsArray : undefined;
        return { id: itemID, transforms, colors };
    }
    getItemID(instanceID) {
        return this.instanceToItem.get(instanceID) || null;
    }
    getInstancesIDs(itemID) {
        return this.itemToInstances.get(itemID) || null;
    }
    update() {
        if (this.mesh.instanceColor) {
            this.mesh.instanceColor.needsUpdate = true;
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }
    add(items) {
        var _a;
        let size = 0;
        for (const item of items) {
            size += item.transforms.length;
        }
        const necessaryCapacity = this.mesh.count + size;
        if (necessaryCapacity > this.capacity) {
            const newMesh = new FragmentMesh(this.mesh.geometry, this.mesh.material, necessaryCapacity + this.capacityOffset, this);
            newMesh.count = this.mesh.count;
            this.capacity = size;
            const oldMesh = this.mesh;
            (_a = oldMesh.parent) === null || _a === void 0 ? void 0 : _a.add(newMesh);
            oldMesh.removeFromParent();
            this.mesh = newMesh;
            oldMesh.dispose();
        }
        for (let i = 0; i < items.length; i++) {
            const { transforms, colors, id } = items[i];
            const instances = new Set();
            this.ids.add(id);
            for (let j = 0; j < transforms.length; j++) {
                const transform = transforms[j];
                const newInstanceID = this.mesh.count;
                this.mesh.setMatrixAt(newInstanceID, transform);
                if (colors) {
                    const color = colors[j];
                    this.mesh.setColorAt(newInstanceID, color);
                }
                instances.add(newInstanceID);
                this.instanceToItem.set(newInstanceID, id);
                this.mesh.count++;
            }
            this.itemToInstances.set(id, instances);
        }
        this.update();
    }
    remove(itemsIDs) {
        if (this.mesh.count === 0) {
            return;
        }
        for (const itemID of itemsIDs) {
            const instancesToDelete = this.itemToInstances.get(itemID);
            if (instancesToDelete === undefined) {
                throw new Error("Instances not found!");
            }
            for (const instanceID of instancesToDelete) {
                if (this.mesh.count === 0)
                    throw new Error("Errow with mesh count!");
                this.putLast(instanceID);
                this.instanceToItem.delete(instanceID);
                this.mesh.count--;
            }
            this.itemToInstances.delete(itemID);
            this.ids.delete(itemID);
        }
        this.update();
    }
    clear() {
        this.hiddenItems.clear();
        this.ids.clear();
        this.instanceToItem.clear();
        this.itemToInstances.clear();
        this.mesh.count = 0;
    }
    addFragment(id, material = this.mesh.material) {
        const newGeometry = new THREE.BufferGeometry();
        const attrs = this.mesh.geometry.attributes;
        newGeometry.setAttribute("position", attrs.position);
        newGeometry.setAttribute("normal", attrs.normal);
        newGeometry.setIndex(Array.from(this.mesh.geometry.index.array));
        const newFragment = new Fragment(newGeometry, material, this.capacity);
        const items = [];
        for (const id of this.ids) {
            const item = this.get(id);
            items.push(item);
        }
        newFragment.add(items);
        newFragment.mesh.applyMatrix4(this.mesh.matrix);
        newFragment.mesh.updateMatrix();
        this.fragments[id] = newFragment;
        return this.fragments[id];
    }
    removeFragment(id) {
        const fragment = this.fragments[id];
        if (fragment) {
            fragment.dispose(false);
            delete this.fragments[id];
        }
    }
    setVisibility(visible, itemIDs = this.ids) {
        if (this._settingVisibility)
            return;
        this._settingVisibility = true;
        if (visible) {
            for (const itemID of itemIDs) {
                if (!this.hiddenItems.has(itemID)) {
                    continue;
                }
                const instances = this.itemToInstances.get(itemID);
                if (!instances)
                    throw new Error("Instances not found!");
                for (const instance of new Set(instances)) {
                    this.mesh.count++;
                    this.putLast(instance);
                }
                this.hiddenItems.delete(itemID);
            }
        }
        else {
            for (const itemID of itemIDs) {
                if (this.hiddenItems.has(itemID)) {
                    continue;
                }
                const instances = this.itemToInstances.get(itemID);
                if (!instances)
                    throw new Error("Instances not found!");
                for (const instance of new Set(instances)) {
                    this.putLast(instance);
                    this.mesh.count--;
                }
                this.hiddenItems.add(itemID);
            }
        }
        this.update();
        this._settingVisibility = false;
    }
    exportData() {
        const geometry = this.mesh.exportData();
        const ids = Array.from(this.ids);
        const id = this.id;
        return { ...geometry, ids, id };
    }
    putLast(instanceID) {
        if (this.mesh.count === 0)
            return;
        const id1 = this.instanceToItem.get(instanceID);
        const instanceID2 = this.mesh.count - 1;
        if (instanceID2 === instanceID) {
            return;
        }
        const id2 = this.instanceToItem.get(instanceID2);
        if (id1 === undefined || id2 === undefined) {
            throw new Error("Keys not found");
        }
        const instances1 = this.itemToInstances.get(id1);
        const instances2 = this.itemToInstances.get(id2);
        if (!instances1 || !instances2) {
            throw new Error("Instances not found");
        }
        if (!instances1.has(instanceID) || !instances2.has(instanceID2)) {
            throw new Error("Malformed fragment structure");
        }
        instances1.delete(instanceID);
        instances2.delete(instanceID2);
        instances1.add(instanceID2);
        instances2.add(instanceID);
        this.instanceToItem.set(instanceID, id2);
        this.instanceToItem.set(instanceID2, id1);
        const transform1 = new THREE.Matrix4();
        const transform2 = new THREE.Matrix4();
        this.mesh.getMatrixAt(instanceID, transform1);
        this.mesh.getMatrixAt(instanceID2, transform2);
        this.mesh.setMatrixAt(instanceID, transform2);
        this.mesh.setMatrixAt(instanceID2, transform1);
        if (this.mesh.instanceColor !== null) {
            const color1 = new THREE.Color();
            const color2 = new THREE.Color();
            this.mesh.getColorAt(instanceID, color1);
            this.mesh.getColorAt(instanceID2, color2);
            this.mesh.setColorAt(instanceID, color2);
            this.mesh.setColorAt(instanceID2, color1);
        }
    }
};

const SIZEOF_SHORT = 2;
const SIZEOF_INT = 4;
const FILE_IDENTIFIER_LENGTH = 4;
const SIZE_PREFIX_LENGTH = 4;

const int32 = new Int32Array(2);
const float32 = new Float32Array(int32.buffer);
const float64 = new Float64Array(int32.buffer);
const isLittleEndian = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;

var Encoding;
(function (Encoding) {
    Encoding[Encoding["UTF8_BYTES"] = 1] = "UTF8_BYTES";
    Encoding[Encoding["UTF16_STRING"] = 2] = "UTF16_STRING";
})(Encoding || (Encoding = {}));

class ByteBuffer {
    /**
     * Create a new ByteBuffer with a given array of bytes (`Uint8Array`)
     */
    constructor(bytes_) {
        this.bytes_ = bytes_;
        this.position_ = 0;
        this.text_decoder_ = new TextDecoder();
    }
    /**
     * Create and allocate a new ByteBuffer with a given size.
     */
    static allocate(byte_size) {
        return new ByteBuffer(new Uint8Array(byte_size));
    }
    clear() {
        this.position_ = 0;
    }
    /**
     * Get the underlying `Uint8Array`.
     */
    bytes() {
        return this.bytes_;
    }
    /**
     * Get the buffer's position.
     */
    position() {
        return this.position_;
    }
    /**
     * Set the buffer's position.
     */
    setPosition(position) {
        this.position_ = position;
    }
    /**
     * Get the buffer's capacity.
     */
    capacity() {
        return this.bytes_.length;
    }
    readInt8(offset) {
        return this.readUint8(offset) << 24 >> 24;
    }
    readUint8(offset) {
        return this.bytes_[offset];
    }
    readInt16(offset) {
        return this.readUint16(offset) << 16 >> 16;
    }
    readUint16(offset) {
        return this.bytes_[offset] | this.bytes_[offset + 1] << 8;
    }
    readInt32(offset) {
        return this.bytes_[offset] | this.bytes_[offset + 1] << 8 | this.bytes_[offset + 2] << 16 | this.bytes_[offset + 3] << 24;
    }
    readUint32(offset) {
        return this.readInt32(offset) >>> 0;
    }
    readInt64(offset) {
        return BigInt.asIntN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
    }
    readUint64(offset) {
        return BigInt.asUintN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
    }
    readFloat32(offset) {
        int32[0] = this.readInt32(offset);
        return float32[0];
    }
    readFloat64(offset) {
        int32[isLittleEndian ? 0 : 1] = this.readInt32(offset);
        int32[isLittleEndian ? 1 : 0] = this.readInt32(offset + 4);
        return float64[0];
    }
    writeInt8(offset, value) {
        this.bytes_[offset] = value;
    }
    writeUint8(offset, value) {
        this.bytes_[offset] = value;
    }
    writeInt16(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
    }
    writeUint16(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
    }
    writeInt32(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
        this.bytes_[offset + 2] = value >> 16;
        this.bytes_[offset + 3] = value >> 24;
    }
    writeUint32(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
        this.bytes_[offset + 2] = value >> 16;
        this.bytes_[offset + 3] = value >> 24;
    }
    writeInt64(offset, value) {
        this.writeInt32(offset, Number(BigInt.asIntN(32, value)));
        this.writeInt32(offset + 4, Number(BigInt.asIntN(32, value >> BigInt(32))));
    }
    writeUint64(offset, value) {
        this.writeUint32(offset, Number(BigInt.asUintN(32, value)));
        this.writeUint32(offset + 4, Number(BigInt.asUintN(32, value >> BigInt(32))));
    }
    writeFloat32(offset, value) {
        float32[0] = value;
        this.writeInt32(offset, int32[0]);
    }
    writeFloat64(offset, value) {
        float64[0] = value;
        this.writeInt32(offset, int32[isLittleEndian ? 0 : 1]);
        this.writeInt32(offset + 4, int32[isLittleEndian ? 1 : 0]);
    }
    /**
     * Return the file identifier.   Behavior is undefined for FlatBuffers whose
     * schema does not include a file_identifier (likely points at padding or the
     * start of a the root vtable).
     */
    getBufferIdentifier() {
        if (this.bytes_.length < this.position_ + SIZEOF_INT +
            FILE_IDENTIFIER_LENGTH) {
            throw new Error('FlatBuffers: ByteBuffer is too short to contain an identifier.');
        }
        let result = "";
        for (let i = 0; i < FILE_IDENTIFIER_LENGTH; i++) {
            result += String.fromCharCode(this.readInt8(this.position_ + SIZEOF_INT + i));
        }
        return result;
    }
    /**
     * Look up a field in the vtable, return an offset into the object, or 0 if the
     * field is not present.
     */
    __offset(bb_pos, vtable_offset) {
        const vtable = bb_pos - this.readInt32(bb_pos);
        return vtable_offset < this.readInt16(vtable) ? this.readInt16(vtable + vtable_offset) : 0;
    }
    /**
     * Initialize any Table-derived type to point to the union at the given offset.
     */
    __union(t, offset) {
        t.bb_pos = offset + this.readInt32(offset);
        t.bb = this;
        return t;
    }
    /**
     * Create a JavaScript string from UTF-8 data stored inside the FlatBuffer.
     * This allocates a new string and converts to wide chars upon each access.
     *
     * To avoid the conversion to string, pass Encoding.UTF8_BYTES as the
     * "optionalEncoding" argument. This is useful for avoiding conversion when
     * the data will just be packaged back up in another FlatBuffer later on.
     *
     * @param offset
     * @param opt_encoding Defaults to UTF16_STRING
     */
    __string(offset, opt_encoding) {
        offset += this.readInt32(offset);
        const length = this.readInt32(offset);
        offset += SIZEOF_INT;
        const utf8bytes = this.bytes_.subarray(offset, offset + length);
        if (opt_encoding === Encoding.UTF8_BYTES)
            return utf8bytes;
        else
            return this.text_decoder_.decode(utf8bytes);
    }
    /**
     * Handle unions that can contain string as its member, if a Table-derived type then initialize it,
     * if a string then return a new one
     *
     * WARNING: strings are immutable in JS so we can't change the string that the user gave us, this
     * makes the behaviour of __union_with_string different compared to __union
     */
    __union_with_string(o, offset) {
        if (typeof o === 'string') {
            return this.__string(offset);
        }
        return this.__union(o, offset);
    }
    /**
     * Retrieve the relative offset stored at "offset"
     */
    __indirect(offset) {
        return offset + this.readInt32(offset);
    }
    /**
     * Get the start of data of a vector whose offset is stored at "offset" in this object.
     */
    __vector(offset) {
        return offset + this.readInt32(offset) + SIZEOF_INT; // data starts after the length
    }
    /**
     * Get the length of a vector whose offset is stored at "offset" in this object.
     */
    __vector_len(offset) {
        return this.readInt32(offset + this.readInt32(offset));
    }
    __has_identifier(ident) {
        if (ident.length != FILE_IDENTIFIER_LENGTH) {
            throw new Error('FlatBuffers: file identifier must be length ' +
                FILE_IDENTIFIER_LENGTH);
        }
        for (let i = 0; i < FILE_IDENTIFIER_LENGTH; i++) {
            if (ident.charCodeAt(i) != this.readInt8(this.position() + SIZEOF_INT + i)) {
                return false;
            }
        }
        return true;
    }
    /**
     * A helper function for generating list for obj api
     */
    createScalarList(listAccessor, listLength) {
        const ret = [];
        for (let i = 0; i < listLength; ++i) {
            const val = listAccessor(i);
            if (val !== null) {
                ret.push(val);
            }
        }
        return ret;
    }
    /**
     * A helper function for generating list for obj api
     * @param listAccessor function that accepts an index and return data at that index
     * @param listLength listLength
     * @param res result list
     */
    createObjList(listAccessor, listLength) {
        const ret = [];
        for (let i = 0; i < listLength; ++i) {
            const val = listAccessor(i);
            if (val !== null) {
                ret.push(val.unpack());
            }
        }
        return ret;
    }
}

class Builder {
    /**
     * Create a FlatBufferBuilder.
     */
    constructor(opt_initial_size) {
        /** Minimum alignment encountered so far. */
        this.minalign = 1;
        /** The vtable for the current table. */
        this.vtable = null;
        /** The amount of fields we're actually using. */
        this.vtable_in_use = 0;
        /** Whether we are currently serializing a table. */
        this.isNested = false;
        /** Starting offset of the current struct/table. */
        this.object_start = 0;
        /** List of offsets of all vtables. */
        this.vtables = [];
        /** For the current vector being built. */
        this.vector_num_elems = 0;
        /** False omits default values from the serialized data */
        this.force_defaults = false;
        this.string_maps = null;
        this.text_encoder = new TextEncoder();
        let initial_size;
        if (!opt_initial_size) {
            initial_size = 1024;
        }
        else {
            initial_size = opt_initial_size;
        }
        /**
         * @type {ByteBuffer}
         * @private
         */
        this.bb = ByteBuffer.allocate(initial_size);
        this.space = initial_size;
    }
    clear() {
        this.bb.clear();
        this.space = this.bb.capacity();
        this.minalign = 1;
        this.vtable = null;
        this.vtable_in_use = 0;
        this.isNested = false;
        this.object_start = 0;
        this.vtables = [];
        this.vector_num_elems = 0;
        this.force_defaults = false;
        this.string_maps = null;
    }
    /**
     * In order to save space, fields that are set to their default value
     * don't get serialized into the buffer. Forcing defaults provides a
     * way to manually disable this optimization.
     *
     * @param forceDefaults true always serializes default values
     */
    forceDefaults(forceDefaults) {
        this.force_defaults = forceDefaults;
    }
    /**
     * Get the ByteBuffer representing the FlatBuffer. Only call this after you've
     * called finish(). The actual data starts at the ByteBuffer's current position,
     * not necessarily at 0.
     */
    dataBuffer() {
        return this.bb;
    }
    /**
     * Get the bytes representing the FlatBuffer. Only call this after you've
     * called finish().
     */
    asUint8Array() {
        return this.bb.bytes().subarray(this.bb.position(), this.bb.position() + this.offset());
    }
    /**
     * Prepare to write an element of `size` after `additional_bytes` have been
     * written, e.g. if you write a string, you need to align such the int length
     * field is aligned to 4 bytes, and the string data follows it directly. If all
     * you need to do is alignment, `additional_bytes` will be 0.
     *
     * @param size This is the of the new element to write
     * @param additional_bytes The padding size
     */
    prep(size, additional_bytes) {
        // Track the biggest thing we've ever aligned to.
        if (size > this.minalign) {
            this.minalign = size;
        }
        // Find the amount of alignment needed such that `size` is properly
        // aligned after `additional_bytes`
        const align_size = ((~(this.bb.capacity() - this.space + additional_bytes)) + 1) & (size - 1);
        // Reallocate the buffer if needed.
        while (this.space < align_size + size + additional_bytes) {
            const old_buf_size = this.bb.capacity();
            this.bb = Builder.growByteBuffer(this.bb);
            this.space += this.bb.capacity() - old_buf_size;
        }
        this.pad(align_size);
    }
    pad(byte_size) {
        for (let i = 0; i < byte_size; i++) {
            this.bb.writeInt8(--this.space, 0);
        }
    }
    writeInt8(value) {
        this.bb.writeInt8(this.space -= 1, value);
    }
    writeInt16(value) {
        this.bb.writeInt16(this.space -= 2, value);
    }
    writeInt32(value) {
        this.bb.writeInt32(this.space -= 4, value);
    }
    writeInt64(value) {
        this.bb.writeInt64(this.space -= 8, value);
    }
    writeFloat32(value) {
        this.bb.writeFloat32(this.space -= 4, value);
    }
    writeFloat64(value) {
        this.bb.writeFloat64(this.space -= 8, value);
    }
    /**
     * Add an `int8` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int8` to add the buffer.
     */
    addInt8(value) {
        this.prep(1, 0);
        this.writeInt8(value);
    }
    /**
     * Add an `int16` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int16` to add the buffer.
     */
    addInt16(value) {
        this.prep(2, 0);
        this.writeInt16(value);
    }
    /**
     * Add an `int32` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int32` to add the buffer.
     */
    addInt32(value) {
        this.prep(4, 0);
        this.writeInt32(value);
    }
    /**
     * Add an `int64` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int64` to add the buffer.
     */
    addInt64(value) {
        this.prep(8, 0);
        this.writeInt64(value);
    }
    /**
     * Add a `float32` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `float32` to add the buffer.
     */
    addFloat32(value) {
        this.prep(4, 0);
        this.writeFloat32(value);
    }
    /**
     * Add a `float64` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `float64` to add the buffer.
     */
    addFloat64(value) {
        this.prep(8, 0);
        this.writeFloat64(value);
    }
    addFieldInt8(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addInt8(value);
            this.slot(voffset);
        }
    }
    addFieldInt16(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addInt16(value);
            this.slot(voffset);
        }
    }
    addFieldInt32(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addInt32(value);
            this.slot(voffset);
        }
    }
    addFieldInt64(voffset, value, defaultValue) {
        if (this.force_defaults || value !== defaultValue) {
            this.addInt64(value);
            this.slot(voffset);
        }
    }
    addFieldFloat32(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addFloat32(value);
            this.slot(voffset);
        }
    }
    addFieldFloat64(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addFloat64(value);
            this.slot(voffset);
        }
    }
    addFieldOffset(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addOffset(value);
            this.slot(voffset);
        }
    }
    /**
     * Structs are stored inline, so nothing additional is being added. `d` is always 0.
     */
    addFieldStruct(voffset, value, defaultValue) {
        if (value != defaultValue) {
            this.nested(value);
            this.slot(voffset);
        }
    }
    /**
     * Structures are always stored inline, they need to be created right
     * where they're used.  You'll get this assertion failure if you
     * created it elsewhere.
     */
    nested(obj) {
        if (obj != this.offset()) {
            throw new TypeError('FlatBuffers: struct must be serialized inline.');
        }
    }
    /**
     * Should not be creating any other object, string or vector
     * while an object is being constructed
     */
    notNested() {
        if (this.isNested) {
            throw new TypeError('FlatBuffers: object serialization must not be nested.');
        }
    }
    /**
     * Set the current vtable at `voffset` to the current location in the buffer.
     */
    slot(voffset) {
        if (this.vtable !== null)
            this.vtable[voffset] = this.offset();
    }
    /**
     * @returns Offset relative to the end of the buffer.
     */
    offset() {
        return this.bb.capacity() - this.space;
    }
    /**
     * Doubles the size of the backing ByteBuffer and copies the old data towards
     * the end of the new buffer (since we build the buffer backwards).
     *
     * @param bb The current buffer with the existing data
     * @returns A new byte buffer with the old data copied
     * to it. The data is located at the end of the buffer.
     *
     * uint8Array.set() formally takes {Array<number>|ArrayBufferView}, so to pass
     * it a uint8Array we need to suppress the type check:
     * @suppress {checkTypes}
     */
    static growByteBuffer(bb) {
        const old_buf_size = bb.capacity();
        // Ensure we don't grow beyond what fits in an int.
        if (old_buf_size & 0xC0000000) {
            throw new Error('FlatBuffers: cannot grow buffer beyond 2 gigabytes.');
        }
        const new_buf_size = old_buf_size << 1;
        const nbb = ByteBuffer.allocate(new_buf_size);
        nbb.setPosition(new_buf_size - old_buf_size);
        nbb.bytes().set(bb.bytes(), new_buf_size - old_buf_size);
        return nbb;
    }
    /**
     * Adds on offset, relative to where it will be written.
     *
     * @param offset The offset to add.
     */
    addOffset(offset) {
        this.prep(SIZEOF_INT, 0); // Ensure alignment is already done.
        this.writeInt32(this.offset() - offset + SIZEOF_INT);
    }
    /**
     * Start encoding a new object in the buffer.  Users will not usually need to
     * call this directly. The FlatBuffers compiler will generate helper methods
     * that call this method internally.
     */
    startObject(numfields) {
        this.notNested();
        if (this.vtable == null) {
            this.vtable = [];
        }
        this.vtable_in_use = numfields;
        for (let i = 0; i < numfields; i++) {
            this.vtable[i] = 0; // This will push additional elements as needed
        }
        this.isNested = true;
        this.object_start = this.offset();
    }
    /**
     * Finish off writing the object that is under construction.
     *
     * @returns The offset to the object inside `dataBuffer`
     */
    endObject() {
        if (this.vtable == null || !this.isNested) {
            throw new Error('FlatBuffers: endObject called without startObject');
        }
        this.addInt32(0);
        const vtableloc = this.offset();
        // Trim trailing zeroes.
        let i = this.vtable_in_use - 1;
        // eslint-disable-next-line no-empty
        for (; i >= 0 && this.vtable[i] == 0; i--) { }
        const trimmed_size = i + 1;
        // Write out the current vtable.
        for (; i >= 0; i--) {
            // Offset relative to the start of the table.
            this.addInt16(this.vtable[i] != 0 ? vtableloc - this.vtable[i] : 0);
        }
        const standard_fields = 2; // The fields below:
        this.addInt16(vtableloc - this.object_start);
        const len = (trimmed_size + standard_fields) * SIZEOF_SHORT;
        this.addInt16(len);
        // Search for an existing vtable that matches the current one.
        let existing_vtable = 0;
        const vt1 = this.space;
        outer_loop: for (i = 0; i < this.vtables.length; i++) {
            const vt2 = this.bb.capacity() - this.vtables[i];
            if (len == this.bb.readInt16(vt2)) {
                for (let j = SIZEOF_SHORT; j < len; j += SIZEOF_SHORT) {
                    if (this.bb.readInt16(vt1 + j) != this.bb.readInt16(vt2 + j)) {
                        continue outer_loop;
                    }
                }
                existing_vtable = this.vtables[i];
                break;
            }
        }
        if (existing_vtable) {
            // Found a match:
            // Remove the current vtable.
            this.space = this.bb.capacity() - vtableloc;
            // Point table to existing vtable.
            this.bb.writeInt32(this.space, existing_vtable - vtableloc);
        }
        else {
            // No match:
            // Add the location of the current vtable to the list of vtables.
            this.vtables.push(this.offset());
            // Point table to current vtable.
            this.bb.writeInt32(this.bb.capacity() - vtableloc, this.offset() - vtableloc);
        }
        this.isNested = false;
        return vtableloc;
    }
    /**
     * Finalize a buffer, poiting to the given `root_table`.
     */
    finish(root_table, opt_file_identifier, opt_size_prefix) {
        const size_prefix = opt_size_prefix ? SIZE_PREFIX_LENGTH : 0;
        if (opt_file_identifier) {
            const file_identifier = opt_file_identifier;
            this.prep(this.minalign, SIZEOF_INT +
                FILE_IDENTIFIER_LENGTH + size_prefix);
            if (file_identifier.length != FILE_IDENTIFIER_LENGTH) {
                throw new TypeError('FlatBuffers: file identifier must be length ' +
                    FILE_IDENTIFIER_LENGTH);
            }
            for (let i = FILE_IDENTIFIER_LENGTH - 1; i >= 0; i--) {
                this.writeInt8(file_identifier.charCodeAt(i));
            }
        }
        this.prep(this.minalign, SIZEOF_INT + size_prefix);
        this.addOffset(root_table);
        if (size_prefix) {
            this.addInt32(this.bb.capacity() - this.space);
        }
        this.bb.setPosition(this.space);
    }
    /**
     * Finalize a size prefixed buffer, pointing to the given `root_table`.
     */
    finishSizePrefixed(root_table, opt_file_identifier) {
        this.finish(root_table, opt_file_identifier, true);
    }
    /**
     * This checks a required field has been set in a given table that has
     * just been constructed.
     */
    requiredField(table, field) {
        const table_start = this.bb.capacity() - table;
        const vtable_start = table_start - this.bb.readInt32(table_start);
        const ok = field < this.bb.readInt16(vtable_start) &&
            this.bb.readInt16(vtable_start + field) != 0;
        // If this fails, the caller will show what field needs to be set.
        if (!ok) {
            throw new TypeError('FlatBuffers: field ' + field + ' must be set');
        }
    }
    /**
     * Start a new array/vector of objects.  Users usually will not call
     * this directly. The FlatBuffers compiler will create a start/end
     * method for vector types in generated code.
     *
     * @param elem_size The size of each element in the array
     * @param num_elems The number of elements in the array
     * @param alignment The alignment of the array
     */
    startVector(elem_size, num_elems, alignment) {
        this.notNested();
        this.vector_num_elems = num_elems;
        this.prep(SIZEOF_INT, elem_size * num_elems);
        this.prep(alignment, elem_size * num_elems); // Just in case alignment > int.
    }
    /**
     * Finish off the creation of an array and all its elements. The array must be
     * created with `startVector`.
     *
     * @returns The offset at which the newly created array
     * starts.
     */
    endVector() {
        this.writeInt32(this.vector_num_elems);
        return this.offset();
    }
    /**
     * Encode the string `s` in the buffer using UTF-8. If the string passed has
     * already been seen, we return the offset of the already written string
     *
     * @param s The string to encode
     * @return The offset in the buffer where the encoded string starts
     */
    createSharedString(s) {
        if (!s) {
            return 0;
        }
        if (!this.string_maps) {
            this.string_maps = new Map();
        }
        if (this.string_maps.has(s)) {
            return this.string_maps.get(s);
        }
        const offset = this.createString(s);
        this.string_maps.set(s, offset);
        return offset;
    }
    /**
     * Encode the string `s` in the buffer using UTF-8. If a Uint8Array is passed
     * instead of a string, it is assumed to contain valid UTF-8 encoded data.
     *
     * @param s The string to encode
     * @return The offset in the buffer where the encoded string starts
     */
    createString(s) {
        if (s === null || s === undefined) {
            return 0;
        }
        let utf8;
        if (s instanceof Uint8Array) {
            utf8 = s;
        }
        else {
            utf8 = this.text_encoder.encode(s);
        }
        this.addInt8(0);
        this.startVector(1, utf8.length, 1);
        this.bb.setPosition(this.space -= utf8.length);
        for (let i = 0, offset = this.space, bytes = this.bb.bytes(); i < utf8.length; i++) {
            bytes[offset++] = utf8[i];
        }
        return this.endVector();
    }
    /**
     * A helper function to pack an object
     *
     * @returns offset of obj
     */
    createObjectOffset(obj) {
        if (obj === null) {
            return 0;
        }
        if (typeof obj === 'string') {
            return this.createString(obj);
        }
        else {
            return obj.pack(this);
        }
    }
    /**
     * A helper function to pack a list of object
     *
     * @returns list of offsets of each non null object
     */
    createObjectOffsetList(list) {
        const ret = [];
        for (let i = 0; i < list.length; ++i) {
            const val = list[i];
            if (val !== null) {
                ret.push(this.createObjectOffset(val));
            }
            else {
                throw new TypeError('FlatBuffers: Argument for createObjectOffsetList cannot contain null.');
            }
        }
        return ret;
    }
    createStructOffsetList(list, startFunc) {
        startFunc(this, list.length);
        this.createObjectOffsetList(list.slice().reverse());
        return this.endVector();
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
class Alignment {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsAlignment(bb, obj) {
        return (obj || new Alignment()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsAlignment(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new Alignment()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    position(index) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    positionLength() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    positionArray() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    curve(index) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.readInt32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    curveLength() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    curveArray() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? new Int32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    segment(index) {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.readInt32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    segmentLength() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    segmentArray() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? new Int32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    static startAlignment(builder) {
        builder.startObject(3);
    }
    static addPosition(builder, positionOffset) {
        builder.addFieldOffset(0, positionOffset, 0);
    }
    static createPositionVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startPositionVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addCurve(builder, curveOffset) {
        builder.addFieldOffset(1, curveOffset, 0);
    }
    static createCurveVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startCurveVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addSegment(builder, segmentOffset) {
        builder.addFieldOffset(2, segmentOffset, 0);
    }
    static createSegmentVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startSegmentVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endAlignment(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static createAlignment(builder, positionOffset, curveOffset, segmentOffset) {
        Alignment.startAlignment(builder);
        Alignment.addPosition(builder, positionOffset);
        Alignment.addCurve(builder, curveOffset);
        Alignment.addSegment(builder, segmentOffset);
        return Alignment.endAlignment(builder);
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
class Civil {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsCivil(bb, obj) {
        return (obj || new Civil()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsCivil(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new Civil()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    alignmentHorizontal(obj) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? (obj || new Alignment()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }
    alignmentVertical(obj) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? (obj || new Alignment()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }
    alignment3d(obj) {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? (obj || new Alignment()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }
    static startCivil(builder) {
        builder.startObject(3);
    }
    static addAlignmentHorizontal(builder, alignmentHorizontalOffset) {
        builder.addFieldOffset(0, alignmentHorizontalOffset, 0);
    }
    static addAlignmentVertical(builder, alignmentVerticalOffset) {
        builder.addFieldOffset(1, alignmentVerticalOffset, 0);
    }
    static addAlignment3d(builder, alignment3dOffset) {
        builder.addFieldOffset(2, alignment3dOffset, 0);
    }
    static endCivil(builder) {
        const offset = builder.endObject();
        return offset;
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
class Fragment {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsFragment(bb, obj) {
        return (obj || new Fragment()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsFragment(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new Fragment()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    position(index) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    positionLength() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    positionArray() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    normal(index) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    normalLength() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    normalArray() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    index(index) {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    indexLength() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    indexArray() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    groups(index) {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    groupsLength() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    groupsArray() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    materials(index) {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    materialsLength() {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    materialsArray() {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    matrices(index) {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    matricesLength() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    matricesArray() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    colors(index) {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    colorsLength() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    colorsArray() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    itemsSize(index) {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    itemsSizeLength() {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    itemsSizeArray() {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    ids(index) {
        const offset = this.bb.__offset(this.bb_pos, 20);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    idsLength() {
        const offset = this.bb.__offset(this.bb_pos, 20);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    idsArray() {
        const offset = this.bb.__offset(this.bb_pos, 20);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    id(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 22);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    capacity() {
        const offset = this.bb.__offset(this.bb_pos, 24);
        return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    capacityOffset() {
        const offset = this.bb.__offset(this.bb_pos, 26);
        return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    static startFragment(builder) {
        builder.startObject(12);
    }
    static addPosition(builder, positionOffset) {
        builder.addFieldOffset(0, positionOffset, 0);
    }
    static createPositionVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startPositionVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addNormal(builder, normalOffset) {
        builder.addFieldOffset(1, normalOffset, 0);
    }
    static createNormalVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startNormalVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addIndex(builder, indexOffset) {
        builder.addFieldOffset(2, indexOffset, 0);
    }
    static createIndexVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startIndexVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addGroups(builder, groupsOffset) {
        builder.addFieldOffset(3, groupsOffset, 0);
    }
    static createGroupsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startGroupsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addMaterials(builder, materialsOffset) {
        builder.addFieldOffset(4, materialsOffset, 0);
    }
    static createMaterialsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startMaterialsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addMatrices(builder, matricesOffset) {
        builder.addFieldOffset(5, matricesOffset, 0);
    }
    static createMatricesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startMatricesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addColors(builder, colorsOffset) {
        builder.addFieldOffset(6, colorsOffset, 0);
    }
    static createColorsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startColorsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addItemsSize(builder, itemsSizeOffset) {
        builder.addFieldOffset(7, itemsSizeOffset, 0);
    }
    static createItemsSizeVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startItemsSizeVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addIds(builder, idsOffset) {
        builder.addFieldOffset(8, idsOffset, 0);
    }
    static createIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addId(builder, idOffset) {
        builder.addFieldOffset(9, idOffset, 0);
    }
    static addCapacity(builder, capacity) {
        builder.addFieldInt32(10, capacity, 0);
    }
    static addCapacityOffset(builder, capacityOffset) {
        builder.addFieldInt32(11, capacityOffset, 0);
    }
    static endFragment(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static createFragment(builder, positionOffset, normalOffset, indexOffset, groupsOffset, materialsOffset, matricesOffset, colorsOffset, itemsSizeOffset, idsOffset, idOffset, capacity, capacityOffset) {
        Fragment.startFragment(builder);
        Fragment.addPosition(builder, positionOffset);
        Fragment.addNormal(builder, normalOffset);
        Fragment.addIndex(builder, indexOffset);
        Fragment.addGroups(builder, groupsOffset);
        Fragment.addMaterials(builder, materialsOffset);
        Fragment.addMatrices(builder, matricesOffset);
        Fragment.addColors(builder, colorsOffset);
        Fragment.addItemsSize(builder, itemsSizeOffset);
        Fragment.addIds(builder, idsOffset);
        Fragment.addId(builder, idOffset);
        Fragment.addCapacity(builder, capacity);
        Fragment.addCapacityOffset(builder, capacityOffset);
        return Fragment.endFragment(builder);
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
let FragmentsGroup$1 = class FragmentsGroup {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsFragmentsGroup(bb, obj) {
        return (obj || new FragmentsGroup()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsFragmentsGroup(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new FragmentsGroup()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    items(index, obj) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? (obj || new Fragment()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    itemsLength() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    civil(obj) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? (obj || new Civil()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }
    coordinationMatrix(index) {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    coordinationMatrixLength() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    coordinationMatrixArray() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    ids(index) {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    idsLength() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    idsArray() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    itemsKeys(index) {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    itemsKeysLength() {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    itemsKeysArray() {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    itemsKeysIndices(index) {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    itemsKeysIndicesLength() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    itemsKeysIndicesArray() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    itemsRels(index) {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    itemsRelsLength() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    itemsRelsArray() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    itemsRelsIndices(index) {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    itemsRelsIndicesLength() {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    itemsRelsIndicesArray() {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    fragmentKeys(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 20);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    id(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 22);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    name(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 24);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    ifcName(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 26);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    ifcDescription(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 28);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    ifcSchema(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 30);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    maxExpressId() {
        const offset = this.bb.__offset(this.bb_pos, 32);
        return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    boundingBox(index) {
        const offset = this.bb.__offset(this.bb_pos, 34);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    boundingBoxLength() {
        const offset = this.bb.__offset(this.bb_pos, 34);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    boundingBoxArray() {
        const offset = this.bb.__offset(this.bb_pos, 34);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    static startFragmentsGroup(builder) {
        builder.startObject(16);
    }
    static addItems(builder, itemsOffset) {
        builder.addFieldOffset(0, itemsOffset, 0);
    }
    static createItemsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startItemsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addCivil(builder, civilOffset) {
        builder.addFieldOffset(1, civilOffset, 0);
    }
    static addCoordinationMatrix(builder, coordinationMatrixOffset) {
        builder.addFieldOffset(2, coordinationMatrixOffset, 0);
    }
    static createCoordinationMatrixVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startCoordinationMatrixVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addIds(builder, idsOffset) {
        builder.addFieldOffset(3, idsOffset, 0);
    }
    static createIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addItemsKeys(builder, itemsKeysOffset) {
        builder.addFieldOffset(4, itemsKeysOffset, 0);
    }
    static createItemsKeysVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startItemsKeysVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addItemsKeysIndices(builder, itemsKeysIndicesOffset) {
        builder.addFieldOffset(5, itemsKeysIndicesOffset, 0);
    }
    static createItemsKeysIndicesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startItemsKeysIndicesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addItemsRels(builder, itemsRelsOffset) {
        builder.addFieldOffset(6, itemsRelsOffset, 0);
    }
    static createItemsRelsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startItemsRelsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addItemsRelsIndices(builder, itemsRelsIndicesOffset) {
        builder.addFieldOffset(7, itemsRelsIndicesOffset, 0);
    }
    static createItemsRelsIndicesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startItemsRelsIndicesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addFragmentKeys(builder, fragmentKeysOffset) {
        builder.addFieldOffset(8, fragmentKeysOffset, 0);
    }
    static addId(builder, idOffset) {
        builder.addFieldOffset(9, idOffset, 0);
    }
    static addName(builder, nameOffset) {
        builder.addFieldOffset(10, nameOffset, 0);
    }
    static addIfcName(builder, ifcNameOffset) {
        builder.addFieldOffset(11, ifcNameOffset, 0);
    }
    static addIfcDescription(builder, ifcDescriptionOffset) {
        builder.addFieldOffset(12, ifcDescriptionOffset, 0);
    }
    static addIfcSchema(builder, ifcSchemaOffset) {
        builder.addFieldOffset(13, ifcSchemaOffset, 0);
    }
    static addMaxExpressId(builder, maxExpressId) {
        builder.addFieldInt32(14, maxExpressId, 0);
    }
    static addBoundingBox(builder, boundingBoxOffset) {
        builder.addFieldOffset(15, boundingBoxOffset, 0);
    }
    static createBoundingBoxVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startBoundingBoxVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endFragmentsGroup(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static finishFragmentsGroupBuffer(builder, offset) {
        builder.finish(offset);
    }
    static finishSizePrefixedFragmentsGroupBuffer(builder, offset) {
        builder.finish(offset, undefined, true);
    }
};

// TODO: Document this
class FragmentsGroup extends THREE.Group {
    constructor() {
        super(...arguments);
        this.items = [];
        this.boundingBox = new THREE.Box3();
        this.coordinationMatrix = new THREE.Matrix4();
        // Keys are uints mapped with fragmentIDs to save memory
        this.keyFragments = {};
        // data: [expressID: number]: [keys, rels]
        // keys = fragmentKeys to which this asset belongs
        // rels = [floor, categoryid]
        this.data = {};
        this.ifcMetadata = {
            name: "",
            description: "",
            schema: "IFC2X3",
            maxExpressID: 0,
        };
    }
    getFragmentMap(expressIDs) {
        const fragmentMap = {};
        for (const expressID of expressIDs) {
            const data = this.data[expressID];
            if (!data)
                continue;
            for (const key of data[0]) {
                const fragmentID = this.keyFragments[key];
                if (!fragmentMap[fragmentID]) {
                    fragmentMap[fragmentID] = new Set();
                }
                fragmentMap[fragmentID].add(expressID);
            }
        }
        return fragmentMap;
    }
    dispose(disposeResources = true) {
        for (const fragment of this.items) {
            fragment.dispose(disposeResources);
        }
        this.coordinationMatrix = new THREE.Matrix4();
        this.keyFragments = {};
        this.data = {};
        this.properties = {};
    }
}

class IfcAlignmentData {
    constructor() {
        this.coordinates = new Float32Array(0);
        this.alignmentIndex = [];
        this.curveIndex = [];
    }
    exportData() {
        const { coordinates, alignmentIndex, curveIndex } = this;
        return { coordinates, alignmentIndex, curveIndex };
    }
}

/**
 * Object to export and import sets of fragments efficiently using the library
 * [flatbuffers](https://flatbuffers.dev/).
 */
class Serializer {
    constructor() {
        this.fragmentIDSeparator = "|";
    }
    import(bytes) {
        const buffer = new ByteBuffer(bytes);
        const fbFragmentsGroup = FragmentsGroup$1.getRootAsFragmentsGroup(buffer);
        const fragmentsGroup = this.constructFragmentGroup(fbFragmentsGroup);
        const length = fbFragmentsGroup.itemsLength();
        for (let i = 0; i < length; i++) {
            const fbFragment = fbFragmentsGroup.items(i);
            if (!fbFragment)
                continue;
            const geometry = this.constructGeometry(fbFragment);
            const materials = this.constructMaterials(fbFragment);
            const capacity = fbFragment.capacity();
            const fragment = new Fragment$1(geometry, materials, capacity);
            fragment.capacityOffset = fbFragment.capacityOffset();
            this.setInstances(fbFragment, fragment);
            this.setID(fbFragment, fragment);
            fragmentsGroup.items.push(fragment);
            fragmentsGroup.add(fragment.mesh);
        }
        return fragmentsGroup;
    }
    export(group) {
        const builder = new Builder(1024);
        const items = [];
        const G = FragmentsGroup$1;
        const F = Fragment;
        const C = Civil;
        let exportedCivil = null;
        if (group.ifcCivil) {
            const A = Alignment;
            const resultH = group.ifcCivil.horizontalAlignments.exportData();
            const posVectorH = A.createPositionVector(builder, resultH.coordinates);
            const curveVectorH = A.createSegmentVector(builder, resultH.curveIndex);
            const alignVectorH = A.createCurveVector(builder, resultH.alignmentIndex);
            A.startAlignment(builder);
            A.addPosition(builder, posVectorH);
            A.addSegment(builder, curveVectorH);
            A.addCurve(builder, alignVectorH);
            const exportedH = Alignment.endAlignment(builder);
            const resultV = group.ifcCivil.verticalAlignments.exportData();
            const posVectorV = A.createPositionVector(builder, resultV.coordinates);
            const curveVectorV = A.createSegmentVector(builder, resultV.curveIndex);
            const alignVectorV = A.createCurveVector(builder, resultV.alignmentIndex);
            A.startAlignment(builder);
            A.addPosition(builder, posVectorV);
            A.addSegment(builder, curveVectorV);
            A.addCurve(builder, alignVectorV);
            const exportedV = Alignment.endAlignment(builder);
            const resultR = group.ifcCivil.realAlignments.exportData();
            const posVectorR = A.createPositionVector(builder, resultR.coordinates);
            const curveVectorR = A.createSegmentVector(builder, resultR.curveIndex);
            const alignVectorR = A.createCurveVector(builder, resultR.alignmentIndex);
            A.startAlignment(builder);
            A.addPosition(builder, posVectorR);
            A.addSegment(builder, curveVectorR);
            A.addCurve(builder, alignVectorR);
            const exportedR = Alignment.endAlignment(builder);
            C.startCivil(builder);
            C.addAlignmentHorizontal(builder, exportedH);
            C.addAlignmentVertical(builder, exportedV);
            C.addAlignment3d(builder, exportedR);
            exportedCivil = Civil.endCivil(builder);
        }
        for (const fragment of group.items) {
            const result = fragment.exportData();
            const itemsSize = [];
            for (const itemID of fragment.ids) {
                const instances = fragment.getInstancesIDs(itemID);
                if (!instances) {
                    throw new Error("Instances not found!");
                }
                itemsSize.push(instances.size);
            }
            const posVector = F.createPositionVector(builder, result.position);
            const normalVector = F.createNormalVector(builder, result.normal);
            const indexVector = F.createIndexVector(builder, result.index);
            const groupsVector = F.createGroupsVector(builder, result.groups);
            const matsVector = F.createMaterialsVector(builder, result.materials);
            const matricesVector = F.createMatricesVector(builder, result.matrices);
            const colorsVector = F.createColorsVector(builder, result.colors);
            const idsVector = F.createIdsVector(builder, result.ids);
            const itemsSizeVector = F.createItemsSizeVector(builder, itemsSize);
            const idStr = builder.createString(result.id);
            F.startFragment(builder);
            F.addPosition(builder, posVector);
            F.addNormal(builder, normalVector);
            F.addIndex(builder, indexVector);
            F.addGroups(builder, groupsVector);
            F.addMaterials(builder, matsVector);
            F.addMatrices(builder, matricesVector);
            F.addColors(builder, colorsVector);
            F.addIds(builder, idsVector);
            F.addItemsSize(builder, itemsSizeVector);
            F.addId(builder, idStr);
            F.addCapacity(builder, fragment.capacity);
            F.addCapacityOffset(builder, fragment.capacityOffset);
            const exported = Fragment.endFragment(builder);
            items.push(exported);
        }
        const itemsVector = G.createItemsVector(builder, items);
        const matrixVector = G.createCoordinationMatrixVector(builder, group.coordinationMatrix.elements);
        let fragmentKeys = "";
        for (const key in group.keyFragments) {
            const fragmentID = group.keyFragments[key];
            if (fragmentKeys.length)
                fragmentKeys += this.fragmentIDSeparator;
            fragmentKeys += fragmentID;
        }
        const fragmentKeysRef = builder.createString(fragmentKeys);
        const keyIndices = [];
        const itemsKeys = [];
        const relsIndices = [];
        const itemsRels = [];
        const ids = [];
        let keysCounter = 0;
        let relsCounter = 0;
        for (const expressID in group.data) {
            keyIndices.push(keysCounter);
            relsIndices.push(relsCounter);
            const [keys, rels] = group.data[expressID];
            const id = parseInt(expressID, 10);
            ids.push(id);
            for (const key of keys) {
                itemsKeys.push(key);
            }
            for (const rel of rels) {
                itemsRels.push(rel);
            }
            keysCounter += keys.length;
            relsCounter += rels.length;
        }
        const groupID = builder.createString(group.uuid);
        const groupName = builder.createString(group.name);
        const ifcName = builder.createString(group.ifcMetadata.name);
        const ifcDescription = builder.createString(group.ifcMetadata.description);
        const ifcSchema = builder.createString(group.ifcMetadata.schema);
        const keysIVector = G.createItemsKeysIndicesVector(builder, keyIndices);
        const keysVector = G.createItemsKeysVector(builder, itemsKeys);
        const relsIVector = G.createItemsRelsIndicesVector(builder, relsIndices);
        const relsVector = G.createItemsRelsVector(builder, itemsRels);
        const idsVector = G.createIdsVector(builder, ids);
        const { min, max } = group.boundingBox;
        const bbox = [min.x, min.y, min.z, max.x, max.y, max.z];
        const bboxVector = G.createBoundingBoxVector(builder, bbox);
        G.startFragmentsGroup(builder);
        if (exportedCivil !== null) {
            G.addCivil(builder, exportedCivil);
        }
        G.addId(builder, groupID);
        G.addName(builder, groupName);
        G.addIfcName(builder, ifcName);
        G.addIfcDescription(builder, ifcDescription);
        G.addIfcSchema(builder, ifcSchema);
        G.addMaxExpressId(builder, group.ifcMetadata.maxExpressID);
        G.addItems(builder, itemsVector);
        G.addFragmentKeys(builder, fragmentKeysRef);
        G.addIds(builder, idsVector);
        G.addItemsKeysIndices(builder, keysIVector);
        G.addItemsKeys(builder, keysVector);
        G.addItemsRelsIndices(builder, relsIVector);
        G.addItemsRels(builder, relsVector);
        G.addCoordinationMatrix(builder, matrixVector);
        G.addBoundingBox(builder, bboxVector);
        const result = FragmentsGroup$1.endFragmentsGroup(builder);
        builder.finish(result);
        return builder.asUint8Array();
    }
    setID(fbFragment, fragment) {
        const id = fbFragment.id();
        if (id) {
            fragment.id = id;
            fragment.mesh.uuid = id;
        }
    }
    setInstances(fbFragment, fragment) {
        const matricesData = fbFragment.matricesArray();
        const colorData = fbFragment.colorsArray();
        const ids = fbFragment.idsArray();
        const itemsSize = fbFragment.itemsSizeArray();
        if (!matricesData || !ids || !itemsSize) {
            throw new Error(`Error: Can't load empty fragment!`);
        }
        const items = [];
        let offset = 0;
        for (let i = 0; i < itemsSize.length; i++) {
            const id = ids[i];
            const size = itemsSize[i];
            const transforms = [];
            const colorsArray = [];
            for (let j = 0; j < size; j++) {
                const mStart = offset * 16;
                const matrixArray = matricesData.subarray(mStart, mStart + 17);
                const transform = new THREE.Matrix4().fromArray(matrixArray);
                transforms.push(transform);
                if (colorData) {
                    const cStart = offset * 3;
                    const [r, g, b] = colorData.subarray(cStart, cStart + 4);
                    const color = new THREE.Color(r, g, b);
                    colorsArray.push(color);
                }
                offset++;
            }
            const colors = colorsArray.length ? colorsArray : undefined;
            items.push({ id, transforms, colors });
        }
        fragment.add(items);
    }
    constructMaterials(fragment) {
        const materials = fragment.materialsArray();
        const matArray = [];
        if (!materials)
            return matArray;
        for (let i = 0; i < materials.length; i += 5) {
            const opacity = materials[i];
            const transparent = Boolean(materials[i + 1]);
            const red = materials[i + 2];
            const green = materials[i + 3];
            const blue = materials[i + 4];
            const color = new THREE.Color(red, green, blue);
            const material = new THREE.MeshLambertMaterial({
                color,
                opacity,
                transparent,
            });
            matArray.push(material);
        }
        return matArray;
    }
    constructFragmentGroup(group) {
        const fragmentsGroup = new FragmentsGroup();
        const FBcivil = group.civil();
        const horizontalAlignments = new IfcAlignmentData();
        const verticalAlignments = new IfcAlignmentData();
        const realAlignments = new IfcAlignmentData();
        if (FBcivil) {
            const FBalignmentH = FBcivil.alignmentHorizontal();
            this.getAlignmentData(FBalignmentH, horizontalAlignments);
            const FBalignmentV = FBcivil.alignmentVertical();
            this.getAlignmentData(FBalignmentV, verticalAlignments);
            const FBalignment3D = FBcivil.alignment3d();
            this.getAlignmentData(FBalignment3D, realAlignments);
            fragmentsGroup.ifcCivil = {
                horizontalAlignments,
                verticalAlignments,
                realAlignments,
            };
        }
        // fragmentsGroup.ifcCivil?.horizontalAlignments
        fragmentsGroup.uuid = group.id() || fragmentsGroup.uuid;
        fragmentsGroup.name = group.name() || "";
        fragmentsGroup.ifcMetadata = {
            name: group.ifcName() || "",
            description: group.ifcDescription() || "",
            schema: group.ifcSchema() || "IFC2X3",
            maxExpressID: group.maxExpressId() || 0,
        };
        const defaultMatrix = new THREE.Matrix4().elements;
        const matrixArray = group.coordinationMatrixArray() || defaultMatrix;
        const ids = group.idsArray() || new Uint32Array();
        const keysIndices = group.itemsKeysIndicesArray() || new Uint32Array();
        const keysArray = group.itemsKeysArray() || new Uint32Array();
        const relsArray = group.itemsRelsArray() || new Uint32Array();
        const relsIndices = group.itemsRelsIndicesArray() || new Uint32Array();
        const keysIdsString = group.fragmentKeys() || "";
        const keysIdsArray = keysIdsString.split(this.fragmentIDSeparator);
        this.setGroupData(fragmentsGroup, ids, keysIndices, keysArray, 0);
        this.setGroupData(fragmentsGroup, ids, relsIndices, relsArray, 1);
        const bbox = group.boundingBoxArray() || [0, 0, 0, 0, 0, 0];
        const [minX, minY, minZ, maxX, maxY, maxZ] = bbox;
        fragmentsGroup.boundingBox.min.set(minX, minY, minZ);
        fragmentsGroup.boundingBox.max.set(maxX, maxY, maxZ);
        for (let i = 0; i < keysIdsArray.length; i++) {
            fragmentsGroup.keyFragments[i] = keysIdsArray[i];
        }
        if (matrixArray.length === 16) {
            fragmentsGroup.coordinationMatrix.fromArray(matrixArray);
        }
        return fragmentsGroup;
    }
    getAlignmentData(alignment, result) {
        if (alignment) {
            if (alignment.positionArray) {
                result.coordinates = alignment.positionArray();
                for (let j = 0; j < alignment.curveLength(); j++) {
                    result.alignmentIndex.push(alignment.curve(j));
                }
                for (let j = 0; j < alignment.segmentLength(); j++) {
                    result.curveIndex.push(alignment.segment(j));
                }
            }
        }
    }
    setGroupData(group, ids, indices, array, index) {
        for (let i = 0; i < indices.length; i++) {
            const expressID = ids[i];
            const currentIndex = indices[i];
            const nextIndex = indices[i + 1] || array.length;
            const keys = [];
            for (let j = currentIndex; j < nextIndex; j++) {
                keys.push(array[j]);
            }
            if (!group.data[expressID]) {
                group.data[expressID] = [[], []];
            }
            group.data[expressID][index] = keys;
        }
    }
    constructGeometry(fragment) {
        const position = fragment.positionArray() || new Float32Array();
        const normal = fragment.normalArray() || new Float32Array();
        const index = fragment.indexArray();
        const groups = fragment.groupsArray();
        if (!index)
            throw new Error("Index not found!");
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(Array.from(index));
        geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
        geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
        if (groups) {
            for (let i = 0; i < groups.length; i += 3) {
                const start = groups[i];
                const count = groups[i + 1];
                const materialIndex = groups[i + 2];
                geometry.addGroup(start, count, materialIndex);
            }
        }
        return geometry;
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
class StreamedGeometry {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsStreamedGeometry(bb, obj) {
        return (obj || new StreamedGeometry()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsStreamedGeometry(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new StreamedGeometry()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    geometryId(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    position(index) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    positionLength() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    positionArray() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    normal(index) {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    normalLength() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    normalArray() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    index(index) {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    indexLength() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    indexArray() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    static startStreamedGeometry(builder) {
        builder.startObject(4);
    }
    static addGeometryId(builder, geometryIdOffset) {
        builder.addFieldOffset(0, geometryIdOffset, 0);
    }
    static addPosition(builder, positionOffset) {
        builder.addFieldOffset(1, positionOffset, 0);
    }
    static createPositionVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startPositionVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addNormal(builder, normalOffset) {
        builder.addFieldOffset(2, normalOffset, 0);
    }
    static createNormalVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startNormalVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addIndex(builder, indexOffset) {
        builder.addFieldOffset(3, indexOffset, 0);
    }
    static createIndexVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startIndexVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endStreamedGeometry(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static createStreamedGeometry(builder, geometryIdOffset, positionOffset, normalOffset, indexOffset) {
        StreamedGeometry.startStreamedGeometry(builder);
        StreamedGeometry.addGeometryId(builder, geometryIdOffset);
        StreamedGeometry.addPosition(builder, positionOffset);
        StreamedGeometry.addNormal(builder, normalOffset);
        StreamedGeometry.addIndex(builder, indexOffset);
        return StreamedGeometry.endStreamedGeometry(builder);
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
class StreamedGeometries {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsStreamedGeometries(bb, obj) {
        return (obj || new StreamedGeometries()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsStreamedGeometries(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new StreamedGeometries()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    geometries(index, obj) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? (obj || new StreamedGeometry()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    geometriesLength() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    static startStreamedGeometries(builder) {
        builder.startObject(1);
    }
    static addGeometries(builder, geometriesOffset) {
        builder.addFieldOffset(0, geometriesOffset, 0);
    }
    static createGeometriesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startGeometriesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endStreamedGeometries(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static finishStreamedGeometriesBuffer(builder, offset) {
        builder.finish(offset);
    }
    static finishSizePrefixedStreamedGeometriesBuffer(builder, offset) {
        builder.finish(offset, undefined, true);
    }
    static createStreamedGeometries(builder, geometriesOffset) {
        StreamedGeometries.startStreamedGeometries(builder);
        StreamedGeometries.addGeometries(builder, geometriesOffset);
        return StreamedGeometries.endStreamedGeometries(builder);
    }
}

class StreamSerializer {
    import(bytes) {
        const buffer = new ByteBuffer(bytes);
        const fbGeoms = StreamedGeometries.getRootAsStreamedGeometries(buffer);
        const geometries = {};
        const length = fbGeoms.geometriesLength();
        for (let i = 0; i < length; i++) {
            const fbGeom = fbGeoms.geometries(i);
            if (!fbGeom)
                continue;
            const id = fbGeom.geometryId();
            if (id === null) {
                throw new Error("Error finding ID!");
            }
            const position = fbGeom.positionArray();
            const normal = fbGeom.normalArray();
            const index = fbGeom.indexArray();
            if (!position || !normal || !index) {
                continue;
            }
            geometries[id] = { position, normal, index };
        }
        return geometries;
    }
    export(geometries) {
        const builder = new Builder(1024);
        const createdGeoms = [];
        const Gs = StreamedGeometries;
        const G = StreamedGeometry;
        for (const geometryID in geometries) {
            const idStr = builder.createString(geometryID);
            const { index, position, normal } = geometries[geometryID];
            const indexVector = G.createIndexVector(builder, index);
            const posVector = G.createPositionVector(builder, position);
            const norVector = G.createNormalVector(builder, normal);
            G.startStreamedGeometry(builder);
            G.addGeometryId(builder, idStr);
            G.addIndex(builder, indexVector);
            G.addPosition(builder, posVector);
            G.addNormal(builder, norVector);
            const created = G.endStreamedGeometry(builder);
            createdGeoms.push(created);
        }
        const allGeoms = Gs.createGeometriesVector(builder, createdGeoms);
        Gs.startStreamedGeometries(builder);
        Gs.addGeometries(builder, allGeoms);
        const result = Gs.endStreamedGeometries(builder);
        builder.finish(result);
        return builder.asUint8Array();
    }
}

export { Fragment$1 as Fragment, FragmentMesh, FragmentsGroup, IfcAlignmentData, Serializer, StreamSerializer };
